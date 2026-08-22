"use server";

import { db } from "@/db";
import {
  event,
  booking,
  eventPass,
  person,
  member,
  creditEntry,
  auditLog
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import crypto from "crypto";

async function verifyAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "owner" && role !== "manager" && role !== "host")) {
    throw new Error("UNAUTHORIZED_ADMIN");
  }
  return { adminId: session?.user?.id, role };
}

// ─── 1. EVENT ATTENDEES & TICKETING ROSTER ─────────────────────────────────

export async function getEventAttendees(eventId: string) {
  await verifyAdmin();

  // 1. Fetch Member Bookings
  const memberBookings = await db
    .select({
      id: booking.id,
      memberId: booking.memberId,
      status: booking.status,
      creditsCharged: booking.creditsCharged,
      createdAt: booking.createdAt,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phoneE164,
    })
    .from(booking)
    .innerJoin(member, eq(booking.memberId, member.id))
    .innerJoin(person, eq(member.personId, person.id))
    .where(eq(booking.eventId, eventId))
    .orderBy(desc(booking.createdAt));

  // 2. Fetch Guest Event Passes
  const guestPasses = await db
    .select({
      id: eventPass.id,
      status: eventPass.status,
      ticketTokenHash: eventPass.ticketTokenHash,
      pricePaidCents: eventPass.priceCents,
      createdAt: eventPass.purchasedAt,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
    })
    .from(eventPass)
    .innerJoin(person, eq(eventPass.personId, person.id))
    .where(eq(eventPass.eventId, eventId))
    .orderBy(desc(eventPass.purchasedAt));

  return {
    success: true,
    memberBookings,
    guestPasses,
  };
}

// ─── 2. ADMIN MARK ATTENDANCE (CHECK-IN / NO-SHOW) ──────────────────────────

export async function adminMarkAttendance(
  type: "member" | "guest",
  id: string,
  status: "attended" | "no_show" | "confirmed" | "released"
) {
  const { adminId } = await verifyAdmin();

  if (type === "member") {
    await db
      .update(booking)
      .set({ status, updatedAt: new Date() })
      .where(eq(booking.id, id));
  } else {
    const passStatus = status === "attended" ? "used" : status === "released" ? "refunded" : "paid";
    await db
      .update(eventPass)
      .set({ status: passStatus, updatedAt: new Date() })
      .where(eq(eventPass.id, id));
  }

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: `mark_attendance_${status}`,
    entity: type === "member" ? "booking" : "event_pass",
    entityId: id,
  });

  return { success: true };
}

// ─── 3. ADMIN MANUAL BOOKING / COMPLIMENTARY SEAT ───────────────────────────

export async function adminManualBookMember(data: {
  eventId: string;
  memberId: string;
  deductCredits: boolean;
  notes?: string;
}) {
  const { adminId } = await verifyAdmin();

  const ev = await db.query.event.findFirst({
    where: eq(event.id, data.eventId),
  });
  if (!ev) return { success: false, error: "EVENT_NOT_FOUND" };

  const targetMember = await db.query.member.findFirst({
    where: eq(member.id, data.memberId),
  });
  if (!targetMember) return { success: false, error: "MEMBER_NOT_FOUND" };

  await db.transaction(async (tx) => {
    const creditsToCharge = data.deductCredits ? ev.creditCost : 0;

    if (creditsToCharge > 0) {
      await tx.insert(creditEntry).values({
        memberId: data.memberId,
        amount: -creditsToCharge,
        type: "spend",
        sourceType: "event",
        sourceId: ev.id,
        reason: `Admin Booking: ${ev.title}`,
      });
    }

    const insertedBooking = await tx
      .insert(booking)
      .values({
        eventId: data.eventId,
        personId: targetMember.personId,
        memberId: data.memberId,
        kind: "member",
        creditsCharged: creditsToCharge,
        status: "confirmed",
      })
      .returning();

    await tx.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "manual_booking_created",
      entity: "booking",
      entityId: insertedBooking[0].id,
      after: { eventId: data.eventId, memberId: data.memberId, deductCredits: data.deductCredits },
    });
  });

  return { success: true };
}

// ─── 4. ADMIN ISSUE GUEST PASS DIRECTLY ──────────────────────────────────────

export async function adminIssueGuestPass(data: {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
}) {
  const { adminId } = await verifyAdmin();
  const cleanEmail = data.email.toLowerCase().trim();

  // 1. Find or create Person
  let p = await db.query.person.findFirst({
    where: eq(person.email, cleanEmail),
  });

  if (!p) {
    const createdPerson = await db
      .insert(person)
      .values({
        firstName: data.firstName,
        lastName: data.lastName,
        email: cleanEmail,
        isMother: true,
        source: "admin_guest_pass",
      })
      .returning();
    p = createdPerson[0];
  }

  // 2. Generate 32-byte cryptographic token
  const ticketToken = crypto.randomBytes(32).toString("hex");
  const ticketTokenHash = crypto.createHash("sha256").update(ticketToken).digest("hex");
  const creditExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const createdPass = await db
    .insert(eventPass)
    .values({
      eventId: data.eventId,
      personId: p.id,
      ticketTokenHash,
      priceCents: 3500,
      status: "paid",
      creditExpiresAt,
    })
    .returning();

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "admin_guest_pass_issued",
    entity: "event_pass",
    entityId: createdPass[0].id,
    after: { email: cleanEmail, eventId: data.eventId },
  });

  return {
    success: true,
    ticketToken,
    ticketUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/ticket/${ticketToken}`,
  };
}

// ─── 5. MEMBER CREDIT LEDGER DETAIL & STATUS OVERRIDE ────────────────────────

export async function getMemberLedgerDetails(memberId: string) {
  await verifyAdmin();

  const entries = await db
    .select()
    .from(creditEntry)
    .where(eq(creditEntry.memberId, memberId))
    .orderBy(desc(creditEntry.createdAt));

  const totalBalance = entries.reduce((sum, e) => sum + e.amount, 0);

  return {
    success: true,
    entries,
    totalBalance,
  };
}

export async function adminUpdateMemberStatus(
  memberId: string,
  status: "active" | "paused" | "past_due" | "cancelled_at_period_end" | "lapsed"
) {
  const { adminId } = await verifyAdmin();

  await db
    .update(member)
    .set({ status, updatedAt: new Date() })
    .where(eq(member.id, memberId));

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: `update_member_status_${status}`,
    entity: "member",
    entityId: memberId,
    after: { status },
  });

  return { success: true };
}
