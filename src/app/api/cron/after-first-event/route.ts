import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { booking, event, person, jobRun } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendAfterFirstEventEmail } from "@/lib/brevo";
import { sanitizeErrorMessage } from "@/lib/errors";

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let emailsSent = 0;

  try {
    // Find bookings for events that occurred yesterday (between 12h and 36h ago) where status is 'attended' and not no-show
    const yesterdayBookings = await db
      .select({
        bookingId: booking.id,
        personId: booking.personId,
        eventId: booking.eventId,
        eventTitle: event.title,
        personEmail: person.email,
        personFirstName: person.firstName,
      })
      .from(booking)
      .innerJoin(event, eq(booking.eventId, event.id))
      .innerJoin(person, eq(booking.personId, person.id))
      .where(
        and(
          eq(booking.status, "attended"),
          eq(booking.noShow, false),
          sql`${event.startsAt} >= NOW() - INTERVAL '36 hours'`,
          sql`${event.startsAt} <= NOW() - INTERVAL '12 hours'`
        )
      );

    for (const b of yesterdayBookings) {
      // Check if this was their very first attended event
      const priorAttended = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(booking)
        .innerJoin(event, eq(booking.eventId, event.id))
        .where(
          and(
            eq(booking.personId, b.personId),
            eq(booking.status, "attended"),
            eq(booking.noShow, false),
            sql`${event.startsAt} < NOW() - INTERVAL '36 hours'`
          )
        );

      const count = priorAttended[0]?.count || 0;
      if (count === 0 && b.personEmail) {
        await sendAfterFirstEventEmail({
          personId: b.personId,
          email: b.personEmail,
          firstName: b.personFirstName || "Friend",
          eventTitle: b.eventTitle,
        }).catch((err) => console.error("Failed to send after-first-event email:", err));
        emailsSent++;
      }
    }

    await db.insert(jobRun).values({
      jobKey: "after_first_event",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { emailsSent },
    });

    return NextResponse.json({ success: true, emailsSent });
  } catch (error: any) {
    console.error("after-first-event cron error:", error);
    await db.insert(jobRun).values({
      jobKey: "after_first_event",
      outcome: "failed",
      startedAt,
      finishedAt: new Date(),
      error: error.message,
    });
    return NextResponse.json({ error: sanitizeErrorMessage(error, "CRON_FAILED") }, { status: 500 });
  }
}
