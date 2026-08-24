import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { event, booking, person, member, jobRun, auditLog } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";
import { queueAndSendEmail } from "@/lib/brevo";

/**
 * Complete Events Cron (§4.3, §8)
 * 
 * - Mark confirmed events where ends_at < NOW() as "completed"
 * - Queue "After Your Event" email to all attendees the following morning
 * - Only completed events can have attendance marked
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let completed = 0;
  let emailsQueued = 0;

  try {
    // Find confirmed events that have ended
    const finishedEvents = await db
      .select()
      .from(event)
      .where(
        and(
          eq(event.status, "confirmed"),
          sql`ends_at < NOW()`
        )
      );

    for (const ev of finishedEvents) {
      // Mark as completed
      await db
        .update(event)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(event.id, ev.id));

      await db.insert(auditLog).values({
        actorType: "system",
        action: "complete_event",
        entity: "event",
        entityId: ev.id,
        after: { title: ev.title, endsAt: ev.endsAt },
      });

      completed++;

      // Queue "After Your Event" email to all attendees
      const attendeeBookings = await db
        .select({
          bookingId: booking.id,
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
            sql`booking.status IN ('confirmed', 'attended')`
          )
        );

      for (const attendee of attendeeBookings) {
        const subject =
          attendee.locale === "es"
            ? `Gracias por asistir: ${ev.title} — The Mothers`
            : `Thank you for attending: ${ev.title} — The Mothers`;

        const htmlContent = `
          <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
            <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; margin: 0 0 16px;">
              ${attendee.locale === "es" ? "Después de tu evento" : "After Your Event"}
            </h2>
            <p style="font-size: 15px; line-height: 1.6;">
              ${
                attendee.locale === "es"
                  ? `Hola ${attendee.firstName}, esperamos que hayas disfrutado de <strong>${ev.title}</strong>. Nos encantaría verte en nuestros próximos eventos.`
                  : `Hi ${attendee.firstName}, we hope you enjoyed <strong>${ev.title}</strong>. We'd love to see you at our upcoming events.`
              }
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/events" style="background-color: #7b1f2c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 15px; display: inline-block;">
                ${attendee.locale === "es" ? "Ver Próximos Eventos →" : "View Upcoming Events →"}
              </a>
            </div>
            <p style="font-size: 13px; color: rgba(57,41,42,0.6); margin-top: 24px;">
              The Mothers · Barcelona · hello@themothers.cc
            </p>
          </div>
        `;

        await queueAndSendEmail({
          personId: attendee.personId,
          toEmail: attendee.email,
          toName: `${attendee.firstName} ${attendee.lastName}`,
          templateKey: "after_your_event",
          dedupeKey: `after_event_${ev.id}_${attendee.personId}`,
          subject,
          htmlContent,
          isTransactional: false,
          marketingOptIn: true, // Promotional — requires consent
        });

        emailsQueued++;
      }
    }

    await db.insert(jobRun).values({
      jobKey: "complete_events",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { completed, emailsQueued },
    });

    return NextResponse.json({ success: true, completed, emailsQueued });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "complete_events",
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
