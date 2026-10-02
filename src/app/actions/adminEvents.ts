"use server";

import { db } from "@/db";
import { event, booking, person, auditLog, eventCategory, eventStage, stage, member, mediaAsset } from "@/db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { refundPersonCredits, refundBookingCredits } from "@/lib/ledger";

export async function publishAdminEvent(eventId: string) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "host", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  const existing = await db.select().from(event).where(eq(event.id, eventId));
  if (existing.length === 0) {
    return { success: false, error: "EVENT_NOT_FOUND" };
  }
  const ev = existing[0];

  // Validation Criteria per Backend & Admin Briefs:
  if (!ev.title || !ev.venueName || !ev.meetingPoint || !ev.startsAt || !ev.endsAt) {
    return { success: false, error: "Missing required fields (title, venue, meeting point, dates)." };
  }

  if (new Date(ev.startsAt).getTime() <= Date.now()) {
    return { success: false, error: "Cannot publish an event with a date in the past." };
  }

  if (ev.capacityMember < 0) {
    return { success: false, error: "Member capacity cannot be negative." };
  }

  const totalCap = ev.capacityMember;
  if (totalCap > 0 && ev.minToConfirm > totalCap) {
    return { success: false, error: "Minimum to confirm cannot exceed event room capacity." };
  }

  // If minToConfirm is 0, skips pending and goes directly to confirmed (§4.3)
  const targetStatus = (ev.minToConfirm || 0) === 0 ? "confirmed" : "published_pending";
  const now = new Date();

  // Compute T-schedule defaults if not already present
  const starts = new Date(ev.startsAt);
  let decisionAt = ev.decisionAt;
  if (!decisionAt) {
    const t7Default = new Date(starts.getTime() - 7 * 86400000);
    decisionAt = t7Default > now ? t7Default : new Date(Math.min(starts.getTime() - 3600000, Math.max(now.getTime() + 3600000, starts.getTime() - 2 * 86400000)));
  }

  await db.update(event).set({
    status: targetStatus,
    publishedAt: now,
    confirmedAt: targetStatus === "confirmed" ? now : ev.confirmedAt,
    decisionAt,
    updatedAt: now,
  }).where(eq(event.id, eventId));

  await db.insert(auditLog).values({
    actorId: adminId || "admin",
    actorType: "admin",
    action: "event.publish",
    entity: "event",
    entityId: eventId,
    before: { status: ev.status },
    after: { status: targetStatus, publishedAt: now },
  });

  return { success: true, status: targetStatus };
}

export async function getAdminEvents() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "host", "super_admin", "read_only"];
  if (!role || !allowed.includes(role)) {
    return { success: false, error: "UNAUTHORIZED", events: [] };
  }

  try {
    const eventsData = await db
      .select({
        event: event,
        categoryName: eventCategory.name,
        imageUrl: mediaAsset.publicUrl,
        bookingsCount: sql<number>`count(CASE WHEN ${booking.status} IN ('held', 'confirmed') THEN 1 END)::int`,
        memberBookingsCount: sql<number>`count(CASE WHEN ${booking.status} IN ('held', 'confirmed') AND ${booking.kind} = 'member' THEN 1 END)::int`,
        guestBookingsCount: sql<number>`count(CASE WHEN ${booking.status} IN ('held', 'confirmed') AND (${booking.kind} = 'non_member' OR ${booking.kind} = 'guest') THEN 1 END)::int`,
        totalHistoricalBookings: sql<number>`count(${booking.id})::int`,
      })
      .from(event)
      .leftJoin(eventCategory, eq(event.categoryId, eventCategory.id))
      .leftJoin(mediaAsset, eq(event.imageId, mediaAsset.id))
      .leftJoin(booking, eq(booking.eventId, event.id))
      .groupBy(event.id, eventCategory.name, mediaAsset.publicUrl)
      .orderBy(desc(event.startsAt));

    const stageLinks = await db
      .select({
        eventId: eventStage.eventId,
        labelEn: stage.labelEn,
      })
      .from(eventStage)
      .innerJoin(stage, eq(eventStage.stageId, stage.id));

    const stagesMap: Record<string, string[]> = {};
    for (const sl of stageLinks) {
      if (!stagesMap[sl.eventId]) stagesMap[sl.eventId] = [];
      stagesMap[sl.eventId].push(sl.labelEn);
    }

    // Auto-complete any events whose date has passed so DB stays up-to-date
    const now = new Date();
    const pastEventIds = eventsData
      .filter(e => (e.event.status === "confirmed" || e.event.status === "published_pending") &&
        (e.event.endsAt ? new Date(e.event.endsAt) < now : new Date(e.event.startsAt) < now))
      .map(e => e.event.id);

    if (pastEventIds.length > 0) {
      try {
        await db.update(event).set({
          status: "completed",
          updatedAt: now,
        }).where(inArray(event.id, pastEventIds));
      } catch (err) {
        console.warn("Could not auto-complete past events:", err);
      }
    }

    const events = eventsData.map(e => {
      const isPast = pastEventIds.includes(e.event.id) || e.event.status === "completed";
      return {
        ...e.event,
        status: isPast && e.event.status !== "cancelled" ? "completed" : e.event.status,
        categoryName: e.categoryName,
        bookingsCount: e.bookingsCount,
        memberBookingsCount: e.memberBookingsCount,
        guestBookingsCount: e.guestBookingsCount,
        totalHistoricalBookings: e.totalHistoricalBookings,
        targetStages: stagesMap[e.event.id] || [],
      };
    });

    return { success: true, events };
  } catch (err: any) {
    console.error("getAdminEvents error:", err?.message || err);
    return { success: false, error: err?.message || "Failed to load admin events", events: [] };
  }
}

export async function createAdminEvent(data: {
  title: string;
  categoryId?: string;
  category?: string;
  partnerId?: string;
  host?: string;
  description?: string;
  neighbourhood: string;
  venueName: string;
  meetingPoint: string;
  startsAt: Date;
  endsAt: Date;
  creditCost: number;
  capacityMember: number;
  minToConfirm?: number;
  isSignature?: boolean;
  status?: "draft" | "published_pending";
  languages?: string[];
  decisionAt?: Date;
  publishedAt?: Date;
  targetStages?: string[];
  nonMemberCreditCost?: number;
  needsHost?: boolean;
  nonMemberOpensAt?: Date | null;
  imageId?: string | null;
}) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "host", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  // Resolve categoryId if category name/string is supplied
  let resolvedCategoryId = data.categoryId || null;
  if (!resolvedCategoryId && data.category) {
    const allCats = await db.select().from(eventCategory);
    const catLower = data.category.toLowerCase();
    const found = allCats.find(c => c.name.toLowerCase().includes(catLower) || c.slug.toLowerCase().includes(catLower));
    if (found) {
      resolvedCategoryId = found.id;
    }
  }

  const totalCap = data.capacityMember;
  if (totalCap > 0 && (data.minToConfirm || 0) > totalCap) {
    return { success: false, error: "Minimum to confirm cannot exceed event room capacity." };
  }

  const slug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Date.now().toString().slice(-4)}`;

    const now = new Date();
    let safeDecisionAt = data.decisionAt;
    if (!safeDecisionAt && data.minToConfirm && data.minToConfirm > 0 && data.status !== "draft") {
      const t7 = new Date(data.startsAt.getTime() - 7 * 86400000);
      safeDecisionAt = t7 > now ? t7 : new Date(Math.min(data.startsAt.getTime() - 3600000, Math.max(now.getTime() + 3600000, data.startsAt.getTime() - 2 * 86400000)));
    }

    const inserted = await db
      .insert(event)
      .values({
        title: data.title,
        slug,
        categoryId: resolvedCategoryId,
        description: data.description || "A curated club gathering for mothers in Barcelona.",
        neighbourhood: data.neighbourhood || "Barcelona",
        venueName: data.venueName,
        meetingPoint: data.meetingPoint,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        creditCost: data.creditCost,
        memberCredits: data.creditCost,
        nonMemberCredits: data.nonMemberCreditCost !== undefined ? data.nonMemberCreditCost : data.creditCost,
        capacityMember: data.capacityMember,
        minToConfirm: data.minToConfirm !== undefined ? data.minToConfirm : 0,
        isSignature: !!data.isSignature || (data.category?.toLowerCase().includes("signature") ?? false),
        isFreeWalk: data.creditCost === 0,
        needsHost: !!data.needsHost,
        nonMemberOpensAt: data.nonMemberOpensAt === undefined ? null : data.nonMemberOpensAt,
        imageId: data.imageId || null,
        partnerId: data.partnerId || data.host || null,
        status: data.status === "draft" ? "draft" : (data.minToConfirm === 0 ? "confirmed" : "published_pending"),
        languages: data.languages || [],
        decisionAt: safeDecisionAt,
        publishedAt: data.status === "draft" ? undefined : new Date(),
        confirmedAt: data.status !== "draft" && data.minToConfirm === 0 ? new Date() : undefined,
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
  category?: string;
  partnerId?: string;
  host?: string;
  description?: string;
  neighbourhood?: string;
  venueName?: string;
  meetingPoint?: string;
  startsAt?: Date;
  endsAt?: Date;
  creditCost?: number;
  capacityMember?: number;
  minToConfirm?: number;
  isSignature?: boolean;
  languages?: string[];
  targetStages?: string[];
  decisionAt?: Date | null;
  changeNote?: string;
  nonMemberCreditCost?: number;
  needsHost?: boolean;
  nonMemberOpensAt?: Date | null;
  imageId?: string | null;
  status?: "draft" | "published_pending" | "confirmed" | "completed" | "cancelled";
}) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "host", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  const existing = await db.query.event.findFirst({
    where: eq(event.id, eventId),
  });
  if (!existing) return { success: false, error: "EVENT_NOT_FOUND" };

  const timeChanged = data.startsAt && new Date(data.startsAt).getTime() !== new Date(existing.startsAt).getTime();
  const venueChanged = (data.venueName && data.venueName !== existing.venueName) || (data.meetingPoint && data.meetingPoint !== existing.meetingPoint);

  const newMemberCap = data.capacityMember !== undefined ? data.capacityMember : existing.capacityMember;
  const newMinConfirm = data.minToConfirm !== undefined ? data.minToConfirm : existing.minToConfirm;
  
  const totalCap = newMemberCap;
  if (totalCap > 0 && newMinConfirm > totalCap) {
    return { success: false, error: "Minimum to confirm cannot exceed event room capacity." };
  }

  // Resolve categoryId if category name/string is supplied
  let resolvedCategoryId = data.categoryId;
  if (resolvedCategoryId === undefined && data.category) {
    const allCats = await db.select().from(eventCategory);
    const catLower = data.category.toLowerCase();
    const found = allCats.find(c => c.name.toLowerCase().includes(catLower) || c.slug.toLowerCase().includes(catLower));
    if (found) {
      resolvedCategoryId = found.id;
    }
  }

  const isSig = data.isSignature !== undefined
    ? data.isSignature
    : (data.category?.toLowerCase().includes("signature") ?? existing.isSignature);

  await db
    .update(event)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(resolvedCategoryId !== undefined && { categoryId: resolvedCategoryId || null }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.neighbourhood !== undefined && { neighbourhood: data.neighbourhood }),
      ...(data.venueName !== undefined && { venueName: data.venueName }),
      ...(data.meetingPoint !== undefined && { meetingPoint: data.meetingPoint }),
      ...(data.startsAt !== undefined && { startsAt: data.startsAt }),
      ...(data.endsAt !== undefined && { endsAt: data.endsAt }),
      ...(data.creditCost !== undefined && {
        creditCost: data.creditCost,
        memberCredits: data.creditCost,
        nonMemberCredits: data.nonMemberCreditCost !== undefined ? data.nonMemberCreditCost : data.creditCost,
        isFreeWalk: data.creditCost === 0,
      }),
      ...(data.nonMemberCreditCost !== undefined && { nonMemberCredits: data.nonMemberCreditCost }),
      ...(data.capacityMember !== undefined && { capacityMember: data.capacityMember }),
      ...(data.minToConfirm !== undefined && { minToConfirm: data.minToConfirm }),
      ...(data.needsHost !== undefined && { needsHost: data.needsHost }),
      ...(data.nonMemberOpensAt !== undefined && { nonMemberOpensAt: data.nonMemberOpensAt }),
      ...(data.imageId !== undefined && { imageId: data.imageId }),
      ...(isSig !== undefined && { isSignature: isSig }),
      ...((data.partnerId !== undefined || data.host !== undefined) && { partnerId: data.partnerId || data.host || null }),
      ...(data.languages !== undefined && { languages: data.languages }),
      ...(data.decisionAt !== undefined && { decisionAt: data.decisionAt }),
      ...(data.status !== undefined && {
        status: data.status,
        ...(data.status !== "draft" && !existing.publishedAt && { publishedAt: new Date() }),
      }),
      updatedAt: new Date(),
    })
    .where(eq(event.id, eventId));

  if (data.targetStages !== undefined) {
    await db.delete(eventStage).where(eq(eventStage.eventId, eventId));
    if (data.targetStages.length > 0) {
      const allStages = await db.select().from(stage);
      const stagesToInsert = [];
      for (const sName of data.targetStages) {
        const found = allStages.find(
          (st) =>
            st.labelEn.toLowerCase().includes(sName.toLowerCase()) ||
            st.key.toLowerCase().includes(sName.toLowerCase())
        );
        if (found) {
          stagesToInsert.push({ eventId, stageId: found.id });
        }
      }
      if (stagesToInsert.length > 0) {
        await db.insert(eventStage).values(stagesToInsert);
      }
    }
  }

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "update_event",
    entity: "event",
    entityId: eventId,
    before: { startsAt: existing.startsAt, venueName: existing.venueName, meetingPoint: existing.meetingPoint },
    after: { ...data, changeNote: data.changeNote },
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
              ${data.changeNote ? `<p style="font-size: 14.5px; line-height: 1.5; font-style: italic; background: rgba(123,31,44,0.06); padding: 10px 14px; border-left: 2px solid #7b1f2c;">"${data.changeNote}"</p>` : ''}
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
  const allowed = ["owner", "manager", "host", "super_admin"];
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
  const allowed = ["owner", "manager", "host", "super_admin"];
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

    // 1. Fetch all active bookings to refund credits
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

      if (b.creditsCharged > 0 && b.personId) {
        await refundBookingCredits(b, b.creditsCharged, tx);
      }

      if (p && p.email) {
        const { queueAndSendEmail } = await import("@/lib/brevo");
        
        await queueAndSendEmail({
          personId: p.id,
          toEmail: p.email,
          toName: p.firstName || "Member",
          templateKey: "event_cancelled",
          dedupeKey: `event_cancel_${eventId}_${b.id}_${Date.now().toString().slice(0, 8)}`,
          subject: `Update regarding ${ev.title}`,
          htmlContent: `
<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background-color:#efeae1;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efeae1;">
<tr>
<td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;">
<tr>
<td class="px" style="padding:22px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:27px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0 0 16px;">Hello <span style="color:#7b1f2c;">${p.firstName || 'Member'}</span>,</p>
<p style="margin:0 0 16px;">We're sorry — <strong style="font-weight:normal;color:#7b1f2c;">${ev.title}</strong> will not run. We would rather cancel than seat you at a table of three that was meant to hold ten.</p>
<p style="margin:0;">You do not need to do anything. Your credits have been returned to your account.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
          `,
          isTransactional: true,
        });
      }
    }

    // 2. Resolve any bookings on this event awaiting replacement (§5 & §7.3)
    const pendingReturns = await tx.query.booking.findMany({
      where: and(
        eq(booking.eventId, eventId),
        eq(booking.pendingReturnState, "awaiting_replacement")
      ),
    });

    for (const pb of pendingReturns) {
      await tx
        .update(booking)
        .set({
          pendingReturnState: "settled_returned",
          updatedAt: new Date(),
        })
        .where(eq(booking.id, pb.id));

      if (pb.pendingReturnCredits > 0 && pb.personId) {
        await refundBookingCredits(pb, pb.pendingReturnCredits, tx);
      }
    }

    await tx.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "cancel_event",
      entity: "event",
      entityId: eventId,
      after: { reason: cancelReason, refundedBookingsCount: activeBookingsWithPerson.length },
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

  // Get target stages
  const stageRows = await db
    .select({
      labelEn: stage.labelEn,
      key: stage.key,
    })
    .from(eventStage)
    .innerJoin(stage, eq(eventStage.stageId, stage.id))
    .where(eq(eventStage.eventId, eventId));

  const targetStages = stageRows.map((s) => s.labelEn);

  let imageUrl = null;
  if (ev.imageId) {
    const asset = await db.query.mediaAsset.findFirst({
      where: eq(mediaAsset.id, ev.imageId),
    });
    if (asset) imageUrl = asset.publicUrl;
  }

  return { 
    success: true, 
    event: { ...ev, targetStages, imageUrl }, 
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

