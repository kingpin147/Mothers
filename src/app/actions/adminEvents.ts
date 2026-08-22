"use server";

import { db } from "@/db";
import { event, booking, person, creditEntry, auditLog, eventCategory } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function getAdminEvents() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "owner" && role !== "manager" && role !== "host")) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const events = await db
    .select()
    .from(event)
    .orderBy(desc(event.startsAt));

  return { success: true, events };
}

export async function createAdminEvent(data: {
  title: string;
  categoryId?: string;
  description?: string;
  neighbourhood: string;
  venueName: string;
  meetingPoint: string;
  startsAt: Date;
  endsAt: Date;
  creditCost: number;
  capacityMember: number;
  capacityGuest: number;
  minToConfirm?: number;
  isSignature?: boolean;
}) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  if (!role || (role !== "owner" && role !== "manager")) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  const slug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Date.now().toString().slice(-4)}`;

  const inserted = await db
    .insert(event)
    .values({
      title: data.title,
      slug,
      categoryId: data.categoryId || null,
      description: data.description || "A curated club gathering for mothers in Barcelona.",
      neighbourhood: data.neighbourhood || "Barcelona",
      venueName: data.venueName,
      meetingPoint: data.meetingPoint,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      creditCost: data.creditCost,
      capacityMember: data.capacityMember,
      capacityGuest: data.capacityGuest,
      minToConfirm: data.minToConfirm || 4,
      isSignature: !!data.isSignature,
      isFreeWalk: data.creditCost === 0,
      status: "published_pending",
      hostAdminId: adminId,
    })
    .returning();

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "create_event",
    entity: "event",
    entityId: inserted[0].id,
    after: { title: data.title, creditCost: data.creditCost },
  });

  return { success: true, eventId: inserted[0].id };
}

export async function confirmEventDecision(eventId: string) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  if (!role || (role !== "owner" && role !== "manager")) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(event)
      .set({
        status: "confirmed",
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(event.id, eventId));

    // Update all held bookings for this event to confirmed
    await tx
      .update(booking)
      .set({
        status: "confirmed",
        updatedAt: new Date(),
      })
      .where(and(eq(booking.eventId, eventId), eq(booking.status, "held")));

    await tx.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "confirm_event",
      entity: "event",
      entityId: eventId,
    });
  });

  return { success: true };
}

export async function cancelEventDecision(eventId: string, cancelReason?: string) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  if (!role || (role !== "owner" && role !== "manager")) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  await db.transaction(async (tx) => {
    const ev = await tx.query.event.findFirst({
      where: eq(event.id, eventId),
    });
    if (!ev) throw new Error("EVENT_NOT_FOUND");

    await tx
      .update(event)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: cancelReason || "Cancelled by club",
        updatedAt: new Date(),
      })
      .where(eq(event.id, eventId));

    // Fetch all active bookings to refund credits
    const activeBookings = await tx
      .select()
      .from(booking)
      .where(
        and(
          eq(booking.eventId, eventId),
          sql`status IN ('held', 'confirmed')`
        )
      );

    for (const b of activeBookings) {
      await tx
        .update(booking)
        .set({
          status: "cancelled_event",
          updatedAt: new Date(),
        })
        .where(eq(booking.id, b.id));

      if (b.memberId && b.creditsCharged > 0) {
        await tx.insert(creditEntry).values({
          memberId: b.memberId,
          amount: b.creditsCharged,
          type: "return_cancellation",
          sourceType: "event",
          sourceId: eventId,
          reason: `Auto refund: ${ev.title} cancelled by club`,
        });
      }
    }

    await tx.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "cancel_event",
      entity: "event",
      entityId: eventId,
      after: { reason: cancelReason },
    });
  });

  return { success: true };
}
