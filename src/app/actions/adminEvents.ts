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

export async function updateAdminEvent(eventId: string, data: {
  title?: string;
  categoryId?: string;
  description?: string;
  neighbourhood?: string;
  venueName?: string;
  meetingPoint?: string;
  startsAt?: Date;
  endsAt?: Date;
  creditCost?: number;
  capacityMember?: number;
  capacityGuest?: number;
  minToConfirm?: number;
  isSignature?: boolean;
}) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  if (!role || (role !== "owner" && role !== "manager")) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  const existing = await db.query.event.findFirst({
    where: eq(event.id, eventId),
  });
  if (!existing) return { success: false, error: "EVENT_NOT_FOUND" };

  const timeChanged = data.startsAt && new Date(data.startsAt).getTime() !== new Date(existing.startsAt).getTime();
  const venueChanged = (data.venueName && data.venueName !== existing.venueName) || (data.meetingPoint && data.meetingPoint !== existing.meetingPoint);

  await db
    .update(event)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.neighbourhood !== undefined && { neighbourhood: data.neighbourhood }),
      ...(data.venueName !== undefined && { venueName: data.venueName }),
      ...(data.meetingPoint !== undefined && { meetingPoint: data.meetingPoint }),
      ...(data.startsAt !== undefined && { startsAt: data.startsAt }),
      ...(data.endsAt !== undefined && { endsAt: data.endsAt }),
      ...(data.creditCost !== undefined && { creditCost: data.creditCost, isFreeWalk: data.creditCost === 0 }),
      ...(data.capacityMember !== undefined && { capacityMember: data.capacityMember }),
      ...(data.capacityGuest !== undefined && { capacityGuest: data.capacityGuest }),
      ...(data.minToConfirm !== undefined && { minToConfirm: data.minToConfirm }),
      ...(data.isSignature !== undefined && { isSignature: !!data.isSignature }),
      updatedAt: new Date(),
    })
    .where(eq(event.id, eventId));

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "update_event",
    entity: "event",
    entityId: eventId,
    before: { startsAt: existing.startsAt, venueName: existing.venueName, meetingPoint: existing.meetingPoint },
    after: data,
  });

  // If date/time/venue changed on an active event with bookings, notify all booked attendees (Dev Brief §3.5b)
  if (timeChanged || venueChanged) {
    try {
      const activeBookings = await db
        .select({
          bookingId: booking.id,
          personId: booking.personId,
          email: person.email,
          firstName: person.firstName,
          lastName: person.lastName,
        })
        .from(booking)
        .leftJoin(person, eq(booking.personId, person.id))
        .where(
          and(
            eq(booking.eventId, eventId),
            sql`${booking.status} IN ('held', 'confirmed')`
          )
        );

      const { queueAndSendEmail } = await import("@/lib/brevo");
      const eventTitle = data.title || existing.title;
      const newStartsAt = data.startsAt ? new Date(data.startsAt) : new Date(existing.startsAt);
      const dateFormatted = newStartsAt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

      for (const b of activeBookings) {
        if (!b.email || !b.personId) continue;
        await queueAndSendEmail({
          personId: b.personId,
          toEmail: b.email,
          toName: `${b.firstName || "Member"} ${b.lastName || ""}`.trim(),
          templateKey: "event_details_updated",
          dedupeKey: `event_update_${eventId}_${b.bookingId}_${Date.now().toString().slice(0, 8)}`,
          subject: `Update regarding ${eventTitle}`,
          htmlContent: `
            <div style="font-family: Georgia, serif; color: #39292a; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8efe2; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px;">
              <h2 style="font-size: 22px; color: #7b1f2c; margin-top: 0;">Important update for ${eventTitle}</h2>
              <p style="font-size: 15px; line-height: 1.6;">Dear ${b.firstName || "Member"},</p>
              <p style="font-size: 15px; line-height: 1.6;">We have updated the schedule or location details for this gathering:</p>
              <div style="background: #ffffff; padding: 16px; border-radius: 4px; border-left: 3px solid #7b1f2c; margin: 16px 0;">
                <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>New Date & Time:</strong> ${dateFormatted}</p>
                <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Venue:</strong> ${data.venueName || existing.venueName}</p>
                <p style="margin: 0; font-size: 14px;"><strong>Meeting Point:</strong> ${data.meetingPoint || existing.meetingPoint}</p>
              </div>
              <p style="font-size: 14px; line-height: 1.5; color: rgba(57,41,42,0.8);">If the new schedule no longer works for you, you can release your place anytime from your account without penalty, and all credits will be returned to your balance.</p>
              <p style="font-size: 14px; margin-top: 24px;">Warmly,<br/><strong>The Mothers Barcelona</strong></p>
            </div>
          `,
          isTransactional: true,
        });
      }
    } catch (notifyErr) {
      console.error("Failed to dispatch event update notifications:", notifyErr);
    }
  }

  return { success: true };
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

export async function duplicateAdminEvent(eventId: string) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  if (!role || (role !== "owner" && role !== "manager")) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  const orig = await db.query.event.findFirst({
    where: eq(event.id, eventId),
  });

  if (!orig) {
    return { success: false, error: "EVENT_NOT_FOUND" };
  }

  // Schedule for 7 days after the original event by default
  const startsAt = new Date(new Date(orig.startsAt).getTime() + 7 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(new Date(orig.endsAt).getTime() + 7 * 24 * 60 * 60 * 1000);
  const title = `${orig.title} (Copy)`;
  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Date.now().toString().slice(-4)}`;

  const inserted = await db
    .insert(event)
    .values({
      title,
      slug,
      categoryId: orig.categoryId,
      description: orig.description,
      neighbourhood: orig.neighbourhood,
      venueName: orig.venueName,
      meetingPoint: orig.meetingPoint,
      startsAt,
      endsAt,
      creditCost: orig.creditCost,
      capacityMember: orig.capacityMember,
      capacityGuest: orig.capacityGuest,
      minToConfirm: orig.minToConfirm,
      isSignature: orig.isSignature,
      isFreeWalk: orig.isFreeWalk,
      status: "published_pending",
      hostAdminId: adminId,
    })
    .returning();

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "duplicate_event",
    entity: "event",
    entityId: inserted[0].id,
    after: { originalEventId: eventId, newEventId: inserted[0].id },
  });

  return { success: true, eventId: inserted[0].id };
}
