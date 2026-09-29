"use server";

import { db } from "@/db";
import {
  event,
  booking,
  person,
  member,
  creditBatch,
  auditLog,
  eventWaitlist,
  adminUser,
  guestRsvp
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  spendPersonCreditsFIFO,
  refundPersonCredits,
  getPersonWalletBalance,
} from "@/lib/ledger";
import crypto from "crypto";
import { z } from "zod";
import { getAppUrl } from "@/lib/urls";

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
    .where(
      and(
        eq(booking.eventId, eventId),
        sql`${booking.status} IN ('held', 'confirmed', 'attended', 'no_show')`
      )
    )
    .orderBy(desc(booking.createdAt));

  // 2. Fetch Free Open List RSVPs
  const guestRsvps = await db
    .select({
      id: guestRsvp.id,
      eventId: guestRsvp.eventId,
      firstName: guestRsvp.firstName,
      lastName: guestRsvp.lastName,
      email: guestRsvp.email,
      whatsappE164: guestRsvp.whatsappE164,
      attendedAt: guestRsvp.attendedAt,
      createdAt: guestRsvp.createdAt,
    })
    .from(guestRsvp)
    .where(eq(guestRsvp.eventId, eventId))
    .orderBy(desc(guestRsvp.createdAt));

  return {
    success: true,
    memberBookings,
    guestPasses: [],
    guestRsvps,
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
    .where(
      and(
        eq(booking.eventId, eventId),
        sql`${booking.status} IN ('held', 'confirmed', 'attended', 'no_show', 'released', 'cancelled_event')`
      )
    )
    .orderBy(desc(booking.createdAt));

  const guestRsvps = await db
    .select({
      id: guestRsvp.id,
      eventId: guestRsvp.eventId,
      firstName: guestRsvp.firstName,
      lastName: guestRsvp.lastName,
      email: guestRsvp.email,
      whatsappE164: guestRsvp.whatsappE164,
      attendedAt: guestRsvp.attendedAt,
      createdAt: guestRsvp.createdAt,
    })
    .from(guestRsvp)
    .where(eq(guestRsvp.eventId, eventId))
    .orderBy(desc(guestRsvp.createdAt));

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
    guestPasses: [],
    guestRsvps,
    waitlist,
  };
}

const adminMarkAttendanceSchema = z.object({
  type: z.enum(["member", "rsvp"]),
  id: z.string().min(1),
  status: z.enum(["attended", "no_show", "confirmed", "released"]),
});

// ─── 2. ADMIN MARK ATTENDANCE (CHECK-IN / NO-SHOW) ──────────────────────────

export async function adminMarkAttendance(
  type: "member" | "rsvp",
  id: string,
  status: "attended" | "no_show" | "confirmed" | "released"
) {
  const parsed = adminMarkAttendanceSchema.safeParse({ type, id, status });
  if (!parsed.success) { console.error("Parse Error:", parsed.error); return { success: false, error: "INVALID_INPUT" }; }
  ({ type, id, status } = parsed.data);

  const { adminId } = await verifyAdmin();

  if (type === "member") {
    await db
      .update(booking)
      .set({ status, updatedAt: new Date() })
      .where(eq(booking.id, id));
  } else if (type === "rsvp") {
    await db
      .update(guestRsvp)
      .set({
        attendedAt: status === "attended" ? new Date() : null,
      })
      .where(eq(guestRsvp.id, id));
  }

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: `mark_attendance_${status}`,
    entity: type === "member" ? "booking" : "guest_rsvp",
    entityId: id,
  });

  return { success: true };
}

export async function adminRemoveGuestRsvp(rsvpId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminId } = await verifyAdmin();
    await db.delete(guestRsvp).where(eq(guestRsvp.id, rsvpId));

    await db.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "admin_remove_guest_rsvp",
      entity: "guest_rsvp",
      entityId: rsvpId,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to remove RSVP" };
  }
}

export async function adminAddGuestRsvp(rawData: {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsappE164?: string;
}) {
  const { adminId } = await verifyAdmin();
  const parsed = z.object({
    eventId: z.string().min(1),
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().email("Invalid email").toLowerCase(),
    whatsappE164: z.string().trim().optional(),
  }).safeParse(rawData);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const existing = await db.query.guestRsvp.findFirst({
    where: and(
      eq(guestRsvp.eventId, parsed.data.eventId),
      eq(guestRsvp.email, parsed.data.email)
    ),
  });

  if (existing) {
    return { success: false, error: "This email is already registered on the open list for this event." };
  }

  const [inserted] = await db.insert(guestRsvp).values({
    eventId: parsed.data.eventId,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
    whatsappE164: parsed.data.whatsappE164 || null,
  }).returning();

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "admin_add_guest_rsvp",
    entity: "guest_rsvp",
    entityId: inserted.id,
    after: { eventId: parsed.data.eventId, email: parsed.data.email },
  });

  return { success: true };
}

const adminManualBookSchema = z.object({
  eventId: z.string().min(1),
  memberId: z.string().min(1),
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
  if (!parsed.success) { console.error("Parse Error:", parsed.error); return { success: false, error: "INVALID_INPUT" }; }
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
      await spendPersonCreditsFIFO(targetMember.personId, creditsToCharge, tx);
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

// ─── 4. MEMBER CREDIT LEDGER DETAIL & STATUS OVERRIDE ────────────────────────

export async function getMemberLedgerDetails(memberId: string) {
  await verifyAdmin();

  const mem = await db.query.member.findFirst({ where: eq(member.id, memberId) });
  if (!mem) return { success: false, error: "MEMBER_NOT_FOUND", entries: [], totalBalance: 0 };

  const personId = mem.personId;

  const [batches, bookingSpends] = await Promise.all([
    db
      .select()
      .from(creditBatch)
      .where(eq(creditBatch.personId, personId)),
    db
      .select({
        id: booking.id,
        creditsCharged: booking.creditsCharged,
        bookedAt: booking.bookedAt,
        createdAt: booking.createdAt,
        eventTitle: event.title,
      })
      .from(booking)
      .innerJoin(event, eq(booking.eventId, event.id))
      .where(
        and(
          eq(booking.personId, personId),
          sql`${booking.creditsCharged} > 0`
        )
      ),
  ]);

  const entries = [
    ...batches.map((b) => ({
      id: b.id,
      amount: b.amount,
      type: b.source,
      reason: b.source === "subscription" ? "Monthly subscription grant" :
              b.source === "godmother" ? "Godmother reward" :
              b.source === "refund" ? "Booking refund" :
              b.source === "topup" ? "Credit top-up" :
              b.source === "admin_adjustment" ? "Admin adjustment" : b.source,
      expiresAt: b.expiresAt,
      createdAt: b.createdAt || b.purchasedAt,
    })),
    ...bookingSpends.map((bk) => ({
      id: bk.id,
      amount: -bk.creditsCharged,
      type: "spend",
      reason: `Booking: ${bk.eventTitle}`,
      expiresAt: null,
      createdAt: bk.bookedAt || bk.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalBalance = await getPersonWalletBalance(personId);

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

const adjustCreditsSchema = z.object({
  memberId: z.string().min(1),
  amount: z.number(),
  reason: z.string().min(1).trim(),
});

export async function adjustCreditsAction(data: {
  memberId: string;
  amount: number;
  reason: string;
}) {
  const parsed = adjustCreditsSchema.safeParse(data);
  if (!parsed.success) { console.error("Parse Error:", parsed.error); return { success: false, error: "INVALID_INPUT" }; }
  const validData = parsed.data;

  const { adminId } = await verifyAdmin();

  try {
    const { adjustCredits } = await import("@/lib/ledger");
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

export async function adminCancelMemberBooking(bookingId: string) {
  const { adminId } = await verifyAdmin();
  if (!bookingId) return { success: false, error: "INVALID_INPUT" };

  try {
    await db.transaction(async (tx) => {
      const b = await tx.query.booking.findFirst({
        where: eq(booking.id, bookingId),
      });
      if (!b) throw new Error("Booking not found");
      if (b.status === "released" || b.status === "cancelled_event") throw new Error("Already cancelled");

      await tx.update(booking).set({ status: "released", releasedAt: new Date() }).where(eq(booking.id, bookingId));

      if (b.creditsCharged > 0 && b.personId) {
        await refundPersonCredits(b.personId, b.creditsCharged, null, tx);
      }

      await tx.insert(auditLog).values({
        actorId: adminId,
        actorType: "admin",
        action: "manual_booking_cancelled",
        entity: "booking",
        entityId: b.id,
      });
    });

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/admin/events");
    revalidatePath("/events");
    revalidatePath("/account");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "CANCEL_FAILED" };
  }
}
