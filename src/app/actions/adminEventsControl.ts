"use server";

import { db } from "@/db";
import {
  event,
  booking,
  eventPass,
  person,
  member,
  creditEntry,
  auditLog,
  eventWaitlist,
  adminUser
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import { z } from "zod";

async function verifyAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const adminId = session?.user?.id;
  const allowed = ["owner", "manager", "host", "super_admin"];

  if (!adminId || !role || !allowed.includes(role)) {
    throw new Error("UNAUTHORIZED_ADMIN");
  }
  return { adminId, role };
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

export async function getEventRosterDetail(eventId: string) {
  await verifyAdmin();

  const ev = await db.query.event.findFirst({
    where: eq(event.id, eventId),
  });
  if (!ev) return { success: false, error: "EVENT_NOT_FOUND" };

  let hostUser = null;
  if (ev.hostAdminId) {
    const hostAdmin = await db.query.adminUser.findFirst({
      where: eq(adminUser.id, ev.hostAdminId),
    });
    if (hostAdmin) hostUser = { email: hostAdmin.email };
  }

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

  const guestPasses = await db
    .select({
      id: eventPass.id,
      status: eventPass.status,
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

  const waitlist = await db
    .select({
      id: eventWaitlist.id,
      position: eventWaitlist.position,
      joinedAt: eventWaitlist.createdAt,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
    })
    .from(eventWaitlist)
    .innerJoin(person, eq(eventWaitlist.personId, person.id))
    .where(eq(eventWaitlist.eventId, eventId))
    .orderBy(eventWaitlist.position);

  return {
    success: true,
    event: ev,
    hostUser,
    memberBookings,
    guestPasses,
    waitlist,
  };
}

const adminMarkAttendanceSchema = z.object({
  type: z.enum(["member", "guest"]),
  id: z.string().uuid(),
  status: z.enum(["attended", "no_show", "confirmed", "released"]),
});

// ─── 2. ADMIN MARK ATTENDANCE (CHECK-IN / NO-SHOW) ──────────────────────────

export async function adminMarkAttendance(
  type: "member" | "guest",
  id: string,
  status: "attended" | "no_show" | "confirmed" | "released"
) {
  const parsed = adminMarkAttendanceSchema.safeParse({ type, id, status });
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };
  ({ type, id, status } = parsed.data);

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

const adminManualBookSchema = z.object({
  eventId: z.string().uuid(),
  memberId: z.string().uuid(),
  deductCredits: z.boolean(),
  notes: z.string().optional(),
});

// ─── 3. ADMIN MANUAL BOOKING / COMPLIMENTARY SEAT ───────────────────────────

export async function adminManualBookMember(data: {
  eventId: string;
  memberId: string;
  deductCredits: boolean;
  notes?: string;
}) {
  const parsed = adminManualBookSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };
  const validData = parsed.data;

  const { adminId } = await verifyAdmin();

  const ev = await db.query.event.findFirst({
    where: eq(event.id, validData.eventId),
  });
  if (!ev) return { success: false, error: "EVENT_NOT_FOUND" };

  const targetMember = await db.query.member.findFirst({
    where: eq(member.id, validData.memberId),
  });
  if (!targetMember) return { success: false, error: "MEMBER_NOT_FOUND" };

  await db.transaction(async (tx) => {
    const creditsToCharge = validData.deductCredits ? ev.creditCost : 0;

    if (creditsToCharge > 0) {
      await tx.insert(creditEntry).values({
        memberId: validData.memberId,
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
        eventId: validData.eventId,
        personId: targetMember.personId,
        memberId: validData.memberId,
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
      after: { eventId: validData.eventId, memberId: validData.memberId, deductCredits: validData.deductCredits },
    });
  });

  return { success: true };
}

const adminIssueGuestPassSchema = z.object({
  eventId: z.string().uuid(),
  firstName: z.string().min(1).trim(),
  lastName: z.string().trim().default(""),
  email: z.string().email().toLowerCase().trim(),
});

// ─── 4. ADMIN ISSUE GUEST PASS DIRECTLY ──────────────────────────────────────

export async function adminIssueGuestPass(data: {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
}) {
  const parsed = adminIssueGuestPassSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };
  const validData = parsed.data;

  const { adminId } = await verifyAdmin();
  const cleanEmail = validData.email;

  // 1. Find or create Person
  let p = await db.query.person.findFirst({
    where: eq(person.email, cleanEmail),
  });

  if (!p) {
    const createdPerson = await db
      .insert(person)
      .values({
        firstName: validData.firstName,
        lastName: validData.lastName,
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
      eventId: validData.eventId,
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
    after: { email: cleanEmail, eventId: validData.eventId },
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

import { adjustCredits } from "@/lib/ledger";

const adjustCreditsSchema = z.object({
  memberId: z.string().uuid(),
  amount: z.number(),
  reason: z.string().min(1).trim(),
});

export async function adjustCreditsAction(data: {
  memberId: string;
  amount: number;
  reason: string;
}) {
  const parsed = adjustCreditsSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };
  const validData = parsed.data;

  const { adminId } = await verifyAdmin();

  try {
    const result = await adjustCredits({
      memberId: validData.memberId,
      amount: validData.amount,
      reason: validData.reason,
      actorAdminId: adminId,
    });
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, error: error?.message || "ADJUSTMENT_FAILED" };
  }
}

