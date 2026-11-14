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

        const eventDateStr = new Date(ev.startsAt).toLocaleDateString(
          isEs ? "es-ES" : isFr ? "fr-FR" : "en-GB",
          { weekday: "long", day: "numeric", month: "long" }
        );
        const eventTimeStr = new Date(ev.startsAt).toLocaleTimeString(
          isEs ? "es-ES" : "en-GB",
          { hour: "2-digit", minute: "2-digit" }
        );
        const hostLine = ev.hostPersonId
          ? (isEs ? "Tu anfitriona te estará esperando." : isFr ? "Votre hôte vous attendra." : "Your host is waiting for you.")
          : "";
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ev.meetingPoint || ev.venueName}, Barcelona`)}`;

        const { renderEmailTemplate } = await import("@/lib/email-renderer");
        const rendered = renderEmailTemplate(
          "Email - Meeting-Point Reminder",
          {
            first_name: attendee.firstName || "Friend",
            event_title: ev.title,
            host_line: hostLine,
            event_date: eventDateStr,
            event_time: eventTimeStr,
            meeting_point: ev.meetingPoint || ev.venueName || "Barcelona",
            attendee_count: attendees.length,
            maps_url: mapsUrl,
          },
          attendee.locale
        );

        await queueAndSendEmail({
          personId: attendee.personId,
          toEmail: attendee.email,
          toName: `${attendee.firstName} ${attendee.lastName}`,
          templateKey: "event_reminder_t1",
          dedupeKey: `reminder_t1_${ev.id}_${attendee.personId}`,
          subject: rendered.subject && rendered.subject !== "The Mothers" ? rendered.subject : subject,
          htmlContent: rendered.html,
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
