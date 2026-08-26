"use server";

import { db } from "@/db";
import { member, person, creditEntry, booking, event, eventCategory, eventPass } from "@/db/schema";
import { eq, desc, and, sql, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" });

export async function getAccountData() {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "AUTH_REQUIRED" };
  }

  const personId = (session.user as any).personId || session.user.id;
  const memberId = (session.user as any).memberId;

  if (!memberId) {
    return { success: false, error: "NOT_A_MEMBER" };
  }

  try {
    // Fetch member record
    const memberRecord = await db.query.member.findFirst({
      where: eq(member.id, memberId),
    });

    if (!memberRecord) {
      return { success: false, error: "MEMBER_NOT_FOUND" };
    }

    // Fetch person record
    const personRecord = await db.query.person.findFirst({
      where: eq(person.id, personId),
    });

    // Fetch current credit balance (sum of all entries)
    const creditRows = await db
      .select({
        total: sql<number>`COALESCE(SUM(amount), 0)`,
      })
      .from(creditEntry)
      .where(eq(creditEntry.memberId, memberId));

    const currentBalance = Number(creditRows[0]?.total || 0);

    // Fetch credit ledger (FIFO ordered, most recent last)
    const ledger = await db
      .select({
        id: creditEntry.id,
        amount: creditEntry.amount,
        type: creditEntry.type,
        reason: creditEntry.reason,
        expiresAt: creditEntry.expiresAt,
        createdAt: creditEntry.createdAt,
      })
      .from(creditEntry)
      .where(eq(creditEntry.memberId, memberId))
      .orderBy(asc(creditEntry.createdAt));

    // Fetch upcoming bookings
    const upcomingBookings = await db
      .select({
        id: booking.id,
        eventId: booking.eventId,
        eventTitle: event.title,
        eventDate: event.startsAt,
        eventLocation: event.neighbourhood,
        status: booking.status,
        creditsCharged: booking.creditsCharged,
      })
      .from(booking)
      .innerJoin(event, eq(booking.eventId, event.id))
      .where(
        and(
          eq(booking.memberId, memberId),
          sql`${event.startsAt} > NOW()`,
          sql`${booking.status} IN ('held', 'confirmed')`
        )
      )
      .orderBy(asc(event.startsAt))
      .limit(5);

    // Fetch godmother referral details
    const godmotherStats = await db
      .select({
        totalCreditsEarned: sql<number>`COALESCE(SUM(CASE WHEN type = 'godmother' THEN amount ELSE 0 END), 0)`,
      })
      .from(creditEntry)
      .where(eq(creditEntry.memberId, memberId));

    return {
      success: true,
      member: {
        id: memberRecord.id,
        firstName: personRecord?.firstName || "",
        lastName: personRecord?.lastName || "",
        phone: personRecord?.phoneE164 || "",
        status: memberRecord.status,
        stage: memberRecord.stage,
        neighbourhood: memberRecord.neighbourhood,
        monthlyPriceCents: memberRecord.monthlyPriceCents,
        joiningFeePaidCents: memberRecord.joiningFeePaidCents,
        pausedUntil: memberRecord.pausedUntil ? memberRecord.pausedUntil.toISOString() : null,
        cancelAtPeriodEnd: memberRecord.cancelAtPeriodEnd,
        currentPeriodEnd: memberRecord.currentPeriodEnd ? memberRecord.currentPeriodEnd.toISOString() : null,
      },
      credits: {
        available: Math.max(0, currentBalance),
        ledger: ledger,
      },
      bookings: upcomingBookings,
      godmother: {
        totalCreditsEarned: Number(godmotherStats[0]?.totalCreditsEarned || 0),
      },
    };
  } catch (error: any) {
    console.error("getAccountData error:", error);
    return { success: false, error: error?.message || "ACCOUNT_LOAD_FAILED" };
  }
}

export async function pauseMembership() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };
  const memberId = (session.user as any).memberId;
  if (!memberId) return { success: false, error: "NOT_A_MEMBER" };

  try {
    const memberRecord = await db.query.member.findFirst({ where: eq(member.id, memberId) });
    if (!memberRecord) return { success: false, error: "MEMBER_NOT_FOUND" };
    if (memberRecord.pausedUntil && new Date(memberRecord.pausedUntil) > new Date()) {
      return { success: false, error: "ALREADY_PAUSED" };
    }
    // Pause for 1 month
    const pausedUntil = new Date();
    pausedUntil.setMonth(pausedUntil.getMonth() + 1);
    await db.update(member)
      .set({ pausedUntil, updatedAt: new Date() })
      .where(eq(member.id, memberId));
    return { success: true, pausedUntil };
  } catch (e: any) {
    return { success: false, error: e?.message || "PAUSE_FAILED" };
  }
}

export async function updatePersonDetails(data: { firstName: string; lastName: string; phone?: string; stage?: string; neighbourhood?: string }) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };
  const personId = (session.user as any).personId || session.user.id;
  const memberId = (session.user as any).memberId;
  try {
    await db.update(person)
      .set({ firstName: data.firstName, lastName: data.lastName, phoneE164: data.phone || null, updatedAt: new Date() })
      .where(eq(person.id, personId));
    if (memberId && data.stage !== undefined) {
      await db.update(member)
        .set({ stage: data.stage, neighbourhood: data.neighbourhood || null, updatedAt: new Date() })
        .where(eq(member.id, memberId));
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "UPDATE_FAILED" };
  }
}

export async function cancelMembership() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };
  const memberId = (session.user as any).memberId;
  if (!memberId) return { success: false, error: "NOT_A_MEMBER" };

  try {
    const memberRecord = await db.query.member.findFirst({ where: eq(member.id, memberId) });
    if (!memberRecord) return { success: false, error: "MEMBER_NOT_FOUND" };
    if (memberRecord.cancelAtPeriodEnd) return { success: false, error: "ALREADY_CANCELLING" };

    // If Stripe subscription exists, set cancel_at_period_end via Stripe
    if (memberRecord.stripeSubscriptionId) {
      await stripe.subscriptions.update(memberRecord.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Always update DB flag regardless (Stripe webhook will also do this,
    // but we update optimistically so UI reflects immediately)
    await db.update(member)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(member.id, memberId));

    return {
      success: true,
      currentPeriodEnd: memberRecord.currentPeriodEnd?.toISOString() ?? null,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "CANCEL_FAILED" };
  }
}
