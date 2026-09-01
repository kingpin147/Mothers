"use server";

import { db } from "@/db";
import { event, booking, person, creditEntry, auditLog, eventCategory, eventStage, stage, member } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function getAdminEvents() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "host", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const eventsData = await db
    .select({
      event: event,
      bookingsCount: sql<number>`count(CASE WHEN ${booking.status} IN ('held', 'confirmed') THEN 1 END)::int`
    })
    .from(event)
    .leftJoin(booking, eq(booking.eventId, event.id))
    .groupBy(event.id)
    .orderBy(desc(event.startsAt));

  const events = eventsData.map(e => ({
    ...e.event,
    bookingsCount: e.bookingsCount
  }));

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
  capacityGuestGathering?: number;
  minToConfirm?: number;
  isSignature?: boolean;
  status?: "draft" | "published_pending";
  languages?: string[];
  showEventPassCta?: boolean;
  guestOpenAt?: Date;
  guestCloseAt?: Date;
  decisionAt?: Date;
  publishedAt?: Date;
  targetStages?: string[];
}) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
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
      capacityGuestGathering: data.capacityGuestGathering,
      minToConfirm: data.minToConfirm || 4,
      isSignature: !!data.isSignature,
      isFreeWalk: data.creditCost === 0,
      showEventPassCta: !!data.showEventPassCta,
      status: data.status || "published_pending",
      languages: data.languages || [],
      guestOpenAt: data.guestOpenAt,
      guestCloseAt: data.guestCloseAt,
      decisionAt: data.decisionAt,
      publishedAt: data.status === "published_pending" ? new Date() : undefined,
      hostAdminId: adminId,
    })
    .returning();

  const newEventId = inserted[0].id;

  if (data.targetStages && data.targetStages.length > 0) {
    const allStages = await db.select().from(stage);
    const stagesToInsert = [];
    for (const sName of data.targetStages) {
      const found = allStages.find(st => st.labelEn.toLowerCase().includes(sName.toLowerCase()) || st.key.toLowerCase().includes(sName.toLowerCase()));
      if (found) {
        stagesToInsert.push({ eventId: newEventId, stageId: found.id });
      }
    }
    if (stagesToInsert.length > 0) {
      await db.insert(eventStage).values(stagesToInsert);
    }
  }

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "create_event",
    entity: "event",
    entityId: newEventId,
    after: { title: data.title, creditCost: data.creditCost, status: data.status },
  });

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/events");
  revalidatePath("/admin/events");

  return { success: true, eventId: newEventId };
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
  capacityGuestGathering?: number;
  minToConfirm?: number;
  isSignature?: boolean;
  showEventPassCta?: boolean;
  languages?: string[];
}) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
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
      ...(data.capacityGuestGathering !== undefined && { capacityGuestGathering: data.capacityGuestGathering }),
      ...(data.minToConfirm !== undefined && { minToConfirm: data.minToConfirm }),
      ...(data.isSignature !== undefined && { isSignature: !!data.isSignature }),
      ...(data.showEventPassCta !== undefined && { showEventPassCta: !!data.showEventPassCta }),
      ...(data.languages !== undefined && { languages: data.languages }),
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

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/events");
  revalidatePath("/admin/events");

  return { success: true };
}

export async function confirmEventDecision(eventId: string) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
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

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/events");
  revalidatePath("/admin/events");

  return { success: true };
}

export async function cancelEventDecision(eventId: string, cancelReason?: string) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
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
    const activeBookingsWithPerson = await tx
      .select({
        booking: booking,
        person: person,
      })
      .from(booking)
      .leftJoin(person, eq(booking.personId, person.id))
      .where(
        and(
          eq(booking.eventId, eventId),
          sql`${booking.status} IN ('held', 'confirmed')`
        )
      );

    for (const row of activeBookingsWithPerson) {
      const b = row.booking;
      const p = row.person;
      
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

      if (p && p.email) {
        const { queueAndSendEmail } = await import("@/lib/brevo");
        
        // Members get the member template, guests get the guest template
        if (b.memberId) {
          await queueAndSendEmail({
            personId: p.id,
            toEmail: p.email,
            toName: p.firstName || "Member",
            templateKey: "event_cancelled",
            dedupeKey: `event_cancel_${eventId}_${b.id}_${Date.now().toString().slice(0, 8)}`,
            subject: `Update regarding ${ev.title}`,
            htmlContent: `
              <div style="font-family: Georgia, serif; color: #39292a; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8efe2; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px;">
                <h2 style="font-size: 22px; color: #7b1f2c; margin-top: 0;">Important update for ${ev.title}</h2>
                <p style="font-size: 15px; line-height: 1.6;">Dear ${p.firstName || "Member"},</p>
                <p style="font-size: 15px; line-height: 1.6;">We're sorry to let you know that we've had to cancel <strong>${ev.title}</strong>.</p>
                <p style="font-size: 15px; line-height: 1.6;">Your ${b.creditsCharged} credits have been returned in full to your account and are ready to use for future gatherings.</p>
                <p style="font-size: 14px; margin-top: 24px;">Warmly,<br/><strong>The Mothers Barcelona</strong></p>
              </div>
            `,
            isTransactional: true,
          });
        } else {
          await queueAndSendEmail({
            personId: p.id,
            toEmail: p.email,
            toName: p.firstName || "Guest",
            templateKey: "event_cancelled_guest",
            dedupeKey: `event_cancel_guest_${eventId}_${b.id}_${Date.now().toString().slice(0, 8)}`,
            subject: `Update regarding ${ev.title}`,
            htmlContent: `
              <div style="font-family: Georgia, serif; color: #39292a; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8efe2; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px;">
                <h2 style="font-size: 22px; color: #7b1f2c; margin-top: 0;">Important update for ${ev.title}</h2>
                <p style="font-size: 15px; line-height: 1.6;">Dear ${p.firstName || "Guest"},</p>
                <p style="font-size: 15px; line-height: 1.6;">We're sorry to let you know that we've had to cancel <strong>${ev.title}</strong>.</p>
                <p style="font-size: 15px; line-height: 1.6;">Our team has initiated a full refund for your guest pass. Please allow 3–5 days for the funds to appear on your statement.</p>
                <p style="font-size: 14px; margin-top: 24px;">Warmly,<br/><strong>The Mothers Barcelona</strong></p>
              </div>
            `,
            isTransactional: true,
          });
        }
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

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/events");
  revalidatePath("/admin/events");

  return { success: true };
}

export async function duplicateAdminEvent(eventId: string) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
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

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/events");
  revalidatePath("/admin/events");

  return { success: true, eventId: inserted[0].id };
}

export async function getEventRoster(eventId: string) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "host", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  const ev = await db.query.event.findFirst({
    where: eq(event.id, eventId),
  });

  if (!ev) return { success: false, error: "EVENT_NOT_FOUND" };

  // Get active bookings (held, confirmed, attended)
  const bookingsWithPerson = await db
    .select({
      booking: booking,
      person: person,
      member: member,
    })
    .from(booking)
    .innerJoin(person, eq(booking.personId, person.id))
    .leftJoin(member, eq(booking.memberId, member.id))
    .where(
      and(
        eq(booking.eventId, eventId),
        sql`${booking.status} IN ('held', 'confirmed', 'attended')`
      )
    )
    .orderBy(desc(booking.bookedAt));

  // Get recently released bookings (for audit / waitlist reference)
  const releasedBookings = await db
    .select({
      booking: booking,
      person: person,
    })
    .from(booking)
    .innerJoin(person, eq(booking.personId, person.id))
    .where(
      and(
        eq(booking.eventId, eventId),
        eq(booking.status, "released")
      )
    )
    .orderBy(desc(booking.releasedAt));

  // Get waitlist
  const { eventWaitlist } = await import("@/db/schema");
  const waitlist = await db
    .select({
      waitlist: eventWaitlist,
      person: person,
    })
    .from(eventWaitlist)
    .innerJoin(person, eq(eventWaitlist.personId, person.id))
    .where(eq(eventWaitlist.eventId, eventId))
    .orderBy(eventWaitlist.createdAt);

  return { 
    success: true, 
    event: ev, 
    bookings: bookingsWithPerson, 
    released: releasedBookings, 
    waitlist 
  };
}

export async function markAttendance(bookingId: string, attended: boolean) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "host", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  await db
    .update(booking)
    .set({
      status: attended ? "attended" : "confirmed", // if unchecked, revert to confirmed
      attendedAt: attended ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(booking.id, bookingId));

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/events");

  return { success: true };
}
