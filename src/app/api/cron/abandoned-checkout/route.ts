import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { booking, event, person, jobRun, auditLog, eventWaitlist } from "@/db/schema";
import { eq, and, sql, asc } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";
import { queueAndSendEmail } from "@/lib/brevo";

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let remindersSent = 0;
  let holdsCleaned = 0;

  try {
    // 1. Release all expired held bookings where held_until <= NOW() (F-17)
    const expiredHolds = await db
      .select({
        id: booking.id,
        eventId: booking.eventId,
        personId: booking.personId,
        heldUntil: booking.heldUntil,
      })
      .from(booking)
      .where(
        and(
          eq(booking.status, "held"),
          sql`held_until IS NOT NULL AND held_until <= NOW()`
        )
      );

    for (const hold of expiredHolds) {
      await db
        .update(booking)
        .set({
          status: "released",
          releaseReason: "hold_expired",
          releasedAt: new Date(),
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(booking.id, hold.id));
      holdsCleaned++;
    }

    // 2. Advance expired waitlist offers to next mother in queue (F-07)
    const expiredOffers = await db
      .select({
        id: eventWaitlist.id,
        eventId: eventWaitlist.eventId,
        personId: eventWaitlist.personId,
        position: eventWaitlist.position,
      })
      .from(eventWaitlist)
      .where(
        and(
          sql`${eventWaitlist.offeredAt} IS NOT NULL`,
          sql`${eventWaitlist.offerExpiresAt} IS NOT NULL AND ${eventWaitlist.offerExpiresAt} <= NOW()`,
          sql`${eventWaitlist.acceptedAt} IS NULL`,
          sql`${eventWaitlist.expiredAt} IS NULL`
        )
      );

    const { sendPlaceStillOpenEmail } = await import("@/lib/brevo");

    for (const offer of expiredOffers) {
      // Mark current offer as expired
      await db
        .update(eventWaitlist)
        .set({ expiredAt: new Date() })
        .where(eq(eventWaitlist.id, offer.id));

      // Find next in line for this event
      const nextWaitlist = await db.query.eventWaitlist.findFirst({
        where: and(
          eq(eventWaitlist.eventId, offer.eventId),
          sql`${eventWaitlist.position} > ${offer.position}`,
          sql`${eventWaitlist.acceptedAt} IS NULL`,
          sql`${eventWaitlist.expiredAt} IS NULL`
        ),
        orderBy: asc(eventWaitlist.position),
      });

      const ev = await db.query.event.findFirst({
        where: eq(event.id, offer.eventId),
      });

      if (ev && new Date(ev.startsAt) > new Date()) {
        const msUntilEvent = new Date(ev.startsAt).getTime() - Date.now();
        const hoursUntilEvent = msUntilEvent / (1000 * 60 * 60);

        if (hoursUntilEvent <= 24) {
          // Less than 24h out: broadcast offer to ALL remaining unexpired waitlist entries
          const remainingWaitlist = await db.query.eventWaitlist.findMany({
            where: and(
              eq(eventWaitlist.eventId, offer.eventId),
              sql`${eventWaitlist.acceptedAt} IS NULL`,
              sql`${eventWaitlist.expiredAt} IS NULL`
            ),
          });

          const offerExpiresAt = new Date(ev.startsAt);
          for (const wl of remainingWaitlist) {
            await db
              .update(eventWaitlist)
              .set({ offeredAt: new Date(), offerExpiresAt })
              .where(eq(eventWaitlist.id, wl.id));

            const waitingPerson = await db.query.person.findFirst({
              where: eq(person.id, wl.personId),
            });

            if (waitingPerson) {
              await sendPlaceStillOpenEmail({
                personId: waitingPerson.id,
                email: waitingPerson.email,
                firstName: waitingPerson.firstName || "Friend",
                eventTitle: ev.title,
                eventId: ev.id,
              }).catch((err) => console.error("Error broadcasting waitlist offer email:", err));
            }
          }
        } else if (nextWaitlist) {
          // More than 24h out: offer next in line for 12 hours
          const offerExpiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

          await db
            .update(eventWaitlist)
            .set({ offeredAt: new Date(), offerExpiresAt })
            .where(eq(eventWaitlist.id, nextWaitlist.id));

          const nextPerson = await db.query.person.findFirst({
            where: eq(person.id, nextWaitlist.personId),
          });

          if (nextPerson) {
            await sendPlaceStillOpenEmail({
              personId: nextPerson.id,
              email: nextPerson.email,
              firstName: nextPerson.firstName || "Friend",
              eventTitle: ev.title,
              eventId: ev.id,
            }).catch((err) => console.error("Error sending waitlist pass-on email:", err));
          }
        }
      }
    }

    // 3. Send Place Still Open reminder ONLY to holds that expired (releaseReason = 'hold_expired') (F-17)
    const abandonedCandidates = await db
      .select({
        bookingId: booking.id,
        personId: booking.personId,
        eventId: booking.eventId,
        createdAt: booking.createdAt,
        personEmail: person.email,
        personFirstName: person.firstName,
        eventTitle: event.title,
        eventStartsAt: event.startsAt,
        eventStatus: event.status,
      })
      .from(booking)
      .innerJoin(event, eq(booking.eventId, event.id))
      .innerJoin(person, eq(booking.personId, person.id))
      .where(
        and(
          eq(booking.status, "released"),
          eq(booking.releaseReason, "hold_expired"),
          sql`${booking.releasedAt} IS NOT NULL`,
          sql`${booking.createdAt} >= NOW() - INTERVAL '24 hours'`,
          sql`${booking.createdAt} <= NOW() - INTERVAL '30 minutes'`,
          sql`${event.startsAt} > NOW()`,
          sql`${event.status} IN ('confirmed', 'published_pending')`
        )
      );

    for (const cand of abandonedCandidates) {
      // Ensure the mother hasn't subsequently confirmed another booking for this event
      const activeBooking = await db.query.booking.findFirst({
        where: and(
          eq(booking.personId, cand.personId),
          eq(booking.eventId, cand.eventId),
          sql`${booking.status} IN ('held', 'confirmed')`
        ),
      });

      if (activeBooking) continue;

      try {
        await sendPlaceStillOpenEmail({
          personId: cand.personId,
          email: cand.personEmail,
          firstName: cand.personFirstName || "Friend",
          eventTitle: cand.eventTitle,
          eventId: cand.eventId,
        });
        remindersSent++;
      } catch (sendErr) {
        console.warn(`[abandoned-checkout] Failed to send reminder to ${cand.personEmail}:`, sendErr);
      }
    }

    await db.insert(jobRun).values({
      jobKey: "abandoned_checkout_cleaner",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { holdsCleaned, remindersSent },
    });

    return NextResponse.json({
      success: true,
      holdsCleaned,
      remindersSent,
    });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "abandoned_checkout_cleaner",
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
