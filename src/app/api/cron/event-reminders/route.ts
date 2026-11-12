import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { event, booking, person, jobRun } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";
import { queueAndSendEmail } from "@/lib/brevo";

/**
 * Event Reminders Cron (§8)
 * 
 * - T-3: Free walk WhatsApp/email confirmation
 * - T-1: Meeting point reveal + general reminder to all booked members
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let t3Reminders = 0;
  let t1Reminders = 0;

  try {
    // ── T-3 REMINDERS: 3-day event confirmation ────────────────────────────
    const t3Events = await db
      .select()
      .from(event)
      .where(
        and(
          sql`status IN ('confirmed', 'published_pending')`,
          sql`starts_at > NOW() + INTERVAL '36 hours'`,
          sql`starts_at <= NOW() + INTERVAL '84 hours'`
        )
      );

    for (const ev of t3Events) {
      const attendees = await db
        .select({
          personId: booking.personId,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          locale: person.locale,
          whatsapp: person.whatsappE164,
        })
        .from(booking)
        .innerJoin(person, eq(booking.personId, person.id))
        .where(
          and(
            eq(booking.eventId, ev.id),
            sql`booking.status IN ('held', 'confirmed')`
          )
        );

      for (const attendee of attendees) {
        const subject =
          attendee.locale === "es"
            ? `Confirmación: ${ev.title} en 3 días — The Mothers`
            : `Confirmation: ${ev.title} in 3 days — The Mothers`;

        const htmlContent = `
          <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
            <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 24px;">
              ${attendee.locale === "es" ? "Tu evento se acerca" : "Your event is coming up"}
            </h2>
            <p style="font-size: 15px; line-height: 1.6;">
              ${
                attendee.locale === "es"
                  ? `Hola ${attendee.firstName}, te recordamos que <strong>${ev.title}</strong> es en 3 días. El punto de encuentro se compartirá mañana.`
                  : `Hi ${attendee.firstName}, just a reminder that <strong>${ev.title}</strong> is in 3 days. The meeting point will be shared tomorrow.`
              }
            </p>
            <div style="background: #fff; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 14px;">
              <div>📅 <strong>${new Date(ev.startsAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</strong></div>
              <div>📍 <strong>${ev.venueName}</strong>, ${ev.neighbourhood}</div>
            </div>
            <p style="font-size: 13px; color: rgba(57,41,42,0.6);">
              The Mothers · Barcelona · hello@themothers.cc
            </p>
          </div>
        `;

        await queueAndSendEmail({
          personId: attendee.personId,
          toEmail: attendee.email,
          toName: `${attendee.firstName} ${attendee.lastName}`,
          templateKey: "event_reminder_t3",
          dedupeKey: `reminder_t3_${ev.id}_${attendee.personId}`,
          subject,
          htmlContent,
          isTransactional: true,
        });

        t3Reminders++;
      }
    }

    // ── T-1 REMINDERS: Meeting point + general reminder ─────────────────────
    // Capture events in next 36 hours so once-daily morning cron doesn't miss next evening's events
    const t1Events = await db
      .select()
      .from(event)
      .where(
        and(
          eq(event.status, "confirmed"),
          sql`starts_at > NOW()`,
          sql`starts_at <= NOW() + INTERVAL '36 hours'`
        )
      );

    const now = new Date();
    const todayMadrid = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(now);

    for (const ev of t1Events) {
      const evDateMadrid = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(ev.startsAt));
      const isToday = todayMadrid === evDateMadrid;

      const attendees = await db
        .select({
          personId: booking.personId,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          locale: person.locale,
        })
        .from(booking)
        .innerJoin(person, eq(booking.personId, person.id))
        .where(
          and(
            eq(booking.eventId, ev.id),
            sql`booking.status IN ('held', 'confirmed')`
          )
        );

      for (const attendee of attendees) {
        const isEs = attendee.locale === "es";
        const isFr = attendee.locale === "fr";

        const subject = isToday
          ? (isEs
              ? `Hoy: ${ev.title} — Punto de encuentro — The Mothers`
              : isFr
              ? `Aujourd'hui : ${ev.title} — Point de rencontre — The Mothers`
              : `Today: ${ev.title} — Meeting Point — The Mothers`)
          : (isEs
              ? `Mañana: ${ev.title} — Punto de encuentro — The Mothers`
              : isFr
              ? `Demain : ${ev.title} — Point de rencontre — The Mothers`
              : `Tomorrow: ${ev.title} — Meeting Point — The Mothers`);

        const heading = isToday
          ? (isEs ? "¡Nos vemos hoy!" : isFr ? "À tout à l'heure !" : "See you today!")
          : (isEs ? "¡Nos vemos mañana!" : isFr ? "À demain !" : "See you tomorrow!");

        const introText = isToday
          ? (isEs
              ? `Hola ${attendee.firstName}, aquí tienes los detalles para <strong>${ev.title}</strong> hoy.`
              : isFr
              ? `Bonjour ${attendee.firstName}, voici les détails pour <strong>${ev.title}</strong> aujourd'hui.`
              : `Hi ${attendee.firstName}, here are the details for <strong>${ev.title}</strong> today.`)
          : (isEs
              ? `Hola ${attendee.firstName}, aquí tienes los detalles para <strong>${ev.title}</strong>.`
              : isFr
              ? `Bonjour ${attendee.firstName}, voici les détails pour <strong>${ev.title}</strong>.`
              : `Hi ${attendee.firstName}, here are the details for <strong>${ev.title}</strong>.`);

        const htmlContent = `
          <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
            <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 24px;">
              ${heading}
            </h2>
            <p style="font-size: 15px; line-height: 1.6;">
              ${introText}
            </p>
            <div style="background: #E8F1E9; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 14px;">
              <div>📅 <strong>${new Date(ev.startsAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · ${new Date(ev.startsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</strong></div>
              <div>📍 <strong>${ev.venueName}</strong></div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(57,41,42,0.16);">
                🗺️ <strong>${isEs ? "Punto de encuentro" : isFr ? "Point de rencontre" : "Meeting Point"}:</strong> ${ev.meetingPoint}
              </div>
            </div>
            <p style="font-size: 13px; color: rgba(57,41,42,0.6);">
              The Mothers · Barcelona · hello@themothers.cc
            </p>
          </div>
        `;

        await queueAndSendEmail({
          personId: attendee.personId,
          toEmail: attendee.email,
          toName: `${attendee.firstName} ${attendee.lastName}`,
          templateKey: "event_reminder_t1",
          dedupeKey: `reminder_t1_${ev.id}_${attendee.personId}`,
          subject,
          htmlContent,
          isTransactional: true,
        });

        t1Reminders++;
      }
    }

    await db.insert(jobRun).values({
      jobKey: "event_reminders",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { t3Reminders, t1Reminders },
    });

    return NextResponse.json({ success: true, t3Reminders, t1Reminders });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "event_reminders",
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
