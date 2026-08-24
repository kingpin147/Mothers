import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  eventWaitlist,
  application,
  person,
  member,
  jobRun,
  auditLog,
} from "@/db/schema";
import { eq, and, sql, asc } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";
import { queueAndSendEmail } from "@/lib/brevo";

/**
 * Expire Offers Cron (§7.4, §4.2, §8)
 * 
 * 1. Expire waitlist offers past offer_expires_at → promote next in line
 * 2. Expire accepted applications past accept_expires_at (72h) → free the place
 * 3. Send 48-hour reminder for expiring payment links
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let waitlistExpired = 0;
  let waitlistPromoted = 0;
  let applicationsExpired = 0;
  let reminders48h = 0;

  try {
    // ── 1. EXPIRE WAITLIST OFFERS ───────────────────────────────────────────
    const expiredOffers = await db
      .select()
      .from(eventWaitlist)
      .where(
        and(
          sql`offered_at IS NOT NULL`,
          sql`accepted_at IS NULL`,
          sql`expired_at IS NULL`,
          sql`offer_expires_at IS NOT NULL AND offer_expires_at <= NOW()`
        )
      );

    for (const offer of expiredOffers) {
      await db
        .update(eventWaitlist)
        .set({ expiredAt: new Date() })
        .where(eq(eventWaitlist.id, offer.id));

      waitlistExpired++;

      // Promote next person in line for the same event
      const nextInLine = await db
        .select()
        .from(eventWaitlist)
        .where(
          and(
            eq(eventWaitlist.eventId, offer.eventId),
            sql`offered_at IS NULL AND expired_at IS NULL AND accepted_at IS NULL`,
            sql`position > ${offer.position}`
          )
        )
        .orderBy(asc(eventWaitlist.position))
        .limit(1);

      if (nextInLine.length > 0) {
        // Determine expiry: 24h normally, 2h if within 48h of event
        const offerExpiresAt = new Date(
          Date.now() + 24 * 60 * 60 * 1000
        );

        await db
          .update(eventWaitlist)
          .set({
            offeredAt: new Date(),
            offerExpiresAt,
          })
          .where(eq(eventWaitlist.id, nextInLine[0].id));

        waitlistPromoted++;
      }

      await db.insert(auditLog).values({
        actorType: "system",
        action: "expire_waitlist_offer",
        entity: "event_waitlist",
        entityId: offer.id,
        after: { eventId: offer.eventId, position: offer.position },
      });
    }

    // ── 2. EXPIRE 72-HOUR APPLICATION PAYMENT LINKS ─────────────────────────
    const expiredApps = await db
      .select()
      .from(application)
      .where(
        and(
          eq(application.status, "accepted"),
          sql`accept_expires_at IS NOT NULL AND accept_expires_at <= NOW()`
        )
      );

    for (const app of expiredApps) {
      await db
        .update(application)
        .set({
          status: "expired",
          updatedAt: new Date(),
        })
        .where(eq(application.id, app.id));

      // Also revert member status if it was set to accepted_awaiting_payment
      await db
        .update(member)
        .set({
          status: "lapsed",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(member.personId, app.personId),
            eq(member.status, "accepted_awaiting_payment")
          )
        );

      await db.insert(auditLog).values({
        actorType: "system",
        action: "expire_application_payment",
        entity: "application",
        entityId: app.id,
        after: { previousStatus: "accepted", newStatus: "expired" },
      });

      applicationsExpired++;
    }

    // ── 3. SEND 48-HOUR REMINDER FOR EXPIRING PAYMENT LINKS ─────────────────
    const appsNeedingReminder = await db
      .select({
        appId: application.id,
        personId: application.personId,
        acceptExpiresAt: application.acceptExpiresAt,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        locale: person.locale,
        paymentLinkToken: application.paymentLinkToken,
      })
      .from(application)
      .innerJoin(person, eq(application.personId, person.id))
      .where(
        and(
          eq(application.status, "accepted"),
          // Between 24h and 48h remaining (send reminder at ~48h mark)
          sql`accept_expires_at IS NOT NULL`,
          sql`accept_expires_at > NOW()`,
          sql`accept_expires_at <= NOW() + INTERVAL '48 hours'`,
          sql`accept_expires_at > NOW() + INTERVAL '24 hours'`
        )
      );

    for (const app of appsNeedingReminder) {
      const activationUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/membership/activate/${app.paymentLinkToken}`;
      const subject =
        app.locale === "es"
          ? "Recordatorio: Tu plaza caduca en 48h — The Mothers"
          : "Reminder: Your spot expires in 48h — The Mothers";

      const htmlContent = `
        <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
          <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 24px;">
            ${app.locale === "es" ? "Tu plaza te espera" : "Your spot is waiting"}
          </h2>
          <p style="font-size: 15px; line-height: 1.6;">
            ${
              app.locale === "es"
                ? `Hola ${app.firstName}, tu enlace de activación caduca en menos de 48 horas. No pierdas tu cuota fundadora de 29€/mes.`
                : `Hi ${app.firstName}, your activation link expires in less than 48 hours. Don't miss your founding rate of €29/month.`
            }
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${activationUrl}" style="background-color: #7b1f2c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 16px; display: inline-block;">
              ${app.locale === "es" ? "Completar mi Membresía →" : "Complete My Membership →"}
            </a>
          </div>
          <p style="font-size: 13px; color: rgba(57,41,42,0.6);">
            The Mothers · Barcelona · hello@themothers.cc
          </p>
        </div>
      `;

      await queueAndSendEmail({
        personId: app.personId,
        toEmail: app.email,
        toName: `${app.firstName} ${app.lastName}`,
        templateKey: "payment_reminder_48h",
        dedupeKey: `reminder_48h_${app.appId}`,
        subject,
        htmlContent,
        isTransactional: true,
      });

      reminders48h++;
    }

    await db.insert(jobRun).values({
      jobKey: "expire_offers",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: {
        waitlistExpired,
        waitlistPromoted,
        applicationsExpired,
        reminders48h,
      },
    });

    return NextResponse.json({
      success: true,
      waitlistExpired,
      waitlistPromoted,
      applicationsExpired,
      reminders48h,
    });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "expire_offers",
      outcome: "failed",
      startedAt,
      finishedAt: new Date(),
      error: error?.message || "Unknown error",
    });

    return NextResponse.json(
      { error: error?.message || "CRON_FAILED" },
      { status: 500 }
    );
  }
}
