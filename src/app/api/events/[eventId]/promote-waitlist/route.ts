import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { booking, eventWaitlist } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { asc } from "drizzle-orm";

/**
 * POST /api/events/:eventId/promote-waitlist
 * Promotes the first eligible waitlist entry to a confirmed booking.
 * Called after a guest releases their pass or a member cancels.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

    // Find the first un-offered waitlist entry for this event
    const nextEntry = await db.query.eventWaitlist.findFirst({
      where: and(
        eq(eventWaitlist.eventId, eventId),
        sql`${eventWaitlist.offeredAt} IS NULL`
      ),
      orderBy: asc(eventWaitlist.position),
    });

    if (!nextEntry) {
      return NextResponse.json({ promoted: false, message: "No waitlist entries" });
    }

    // Mark the waitlist entry as offered (24h expiry)
    const offerExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db
      .update(eventWaitlist)
      .set({ offeredAt: new Date(), offerExpiresAt })
      .where(eq(eventWaitlist.id, nextEntry.id));

    // Create a held booking for the waitlisted person
    const [newBooking] = await db
      .insert(booking)
      .values({
        personId: nextEntry.personId,
        eventId,
        kind: "member",
        status: "held",
        creditsCharged: 0,
        bookedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      promoted: true,
      bookingId: newBooking.id,
      personId: nextEntry.personId,
    });
  } catch (error: any) {
    console.error("Waitlist promotion error:", error);
    return NextResponse.json(
      { error: error?.message || "PROMOTION_FAILED" },
      { status: 500 }
    );
  }
}
