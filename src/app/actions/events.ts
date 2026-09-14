"use server";

import { db } from "@/db";
import { event, eventCategory, booking, auditLog, eventWaitlist, member, partner, eventChangeLog, eventPass, guestRsvp, eventStage } from "@/db/schema";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

// ─── 1. GET PUBLIC EVENTS & DYNAMIC CATEGORIES ─────────────────────────────

export async function getPublicEvents() {
  try {
    const session = await auth();
    const personId = session?.user?.id;
    let creditBalance = 0;
    
    // Run independent database queries in parallel for high performance
    const [categories, events, bookingsCount, userBookings, userWaitlists, memberRec] = await Promise.all([
      db.select().from(eventCategory).orderBy(asc(eventCategory.sortOrder)),
      db
        .select({
          id: event.id,
          title: event.title,
          slug: event.slug,
          categoryId: event.categoryId,
          categoryName: eventCategory.name,
          categorySlug: eventCategory.slug,
          stage: eventCategory.stageAffinity,
          description: event.description,
          neighbourhood: event.neighbourhood,
          venueName: event.venueName,
          meetingPoint: event.meetingPoint,
          partnerId: event.partnerId,
          partnerName: partner.name,
          partnerSlug: partner.id,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          creditCost: event.creditCost,
          guestPriceCents: event.guestPriceCents,
          capacityMember: event.capacityMember,
          capacityGuest: event.capacityGuest,
          minToConfirm: event.minToConfirm,
          isSignature: event.isSignature,
          isFreeWalk: event.isFreeWalk,
          status: event.status,
          childcare: event.childcare,
          languages: event.languages,
          showEventPassCta: event.showEventPassCta,
          guestOpenAt: event.guestOpenAt,
          guestCloseAt: event.guestCloseAt,
          cancelReason: event.cancelReason,
        })
        .from(event)
        .leftJoin(eventCategory, eq(event.categoryId, eventCategory.id))
        .leftJoin(partner, eq(event.partnerId, partner.id))
        .where(
          sql`${event.status} IN ('published_pending', 'confirmed', 'completed', 'cancelled')`
        )
        .orderBy(asc(event.startsAt)),
      db
        .select({
          eventId: booking.eventId,
          kind: booking.kind,
          count: sql<number>`count(*)::int`,
        })
        .from(booking)
        .where(sql`${booking.status} IN ('held', 'confirmed')`)
        .groupBy(booking.eventId, booking.kind),
      personId
        ? db
            .select({
              eventId: booking.eventId,
              status: booking.status,
              createdAt: booking.createdAt,
              updatedAt: booking.updatedAt,
              creditsCharged: booking.creditsCharged,
            })
            .from(booking)
            .where(eq(booking.personId, personId))
        : Promise.resolve([]),
      personId
        ? db
            .select({
              eventId: eventWaitlist.eventId,
              createdAt: eventWaitlist.createdAt,
              position: eventWaitlist.position,
            })
            .from(eventWaitlist)
            .where(eq(eventWaitlist.personId, personId))
        : Promise.resolve([]),
      personId
        ? db.query.member.findFirst({
            where: eq(member.personId, personId),
          })
        : Promise.resolve(null),
    ]);

    const memberBookingsMap = new Map<string, number>();
    const guestBookingsMap = new Map<string, number>();
    for (const b of bookingsCount) {
      if (b.eventId) {
        if (b.kind === "member") memberBookingsMap.set(b.eventId, b.count);
        else if (b.kind === "guest") guestBookingsMap.set(b.eventId, b.count);
      }
    }
    
    // User statuses
    const userBookingsMap = new Map<string, any>();
    const userWaitlistMap = new Map<string, any>();
    
    if (personId) {
      for (const b of userBookings) {
        const existing = userBookingsMap.get(b.eventId!);
        if (!existing || b.createdAt! > existing.createdAt!) {
          userBookingsMap.set(b.eventId!, b);
        }
      }

      for (const w of userWaitlists) {
        userWaitlistMap.set(w.eventId!, w);
      }
      
      if (memberRec) {
        const { creditEntry } = await import("@/db/schema");
        const creditEntries = await db
          .select()
          .from(creditEntry)
          .where(eq(creditEntry.memberId, memberRec.id));
        creditBalance = creditEntries.reduce((sum, entry) => sum + entry.amount, 0);
      }
    }

    const formattedEvents = events.map((ev) => {
      const starts = new Date(ev.startsAt);
      const ends = ev.endsAt ? new Date(ev.endsAt) : null;

      const dateStr = starts.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const startTimeStr = starts.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const endTimeStr = ends ? ends.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }) : "";

      const bookedMember = memberBookingsMap.get(ev.id) || 0;
      const bookedGuest = guestBookingsMap.get(ev.id) || 0;
      const placesTaken = bookedMember + bookedGuest;

      const memberCap = ev.capacityMember || 0;
      const guestCap = ev.capacityGuest || 0;
      const capSum = memberCap + guestCap;
      const capacityTotal = capSum > 0 ? capSum : null;
      const capacityRemaining = capacityTotal !== null ? Math.max(0, capacityTotal - placesTaken) : null;
      const isFull = capacityTotal !== null && capacityTotal > 0 && capacityRemaining !== null && capacityRemaining <= 0;
      const isGuestFull = guestCap > 0 && bookedGuest >= guestCap;

      const audienceType = ev.childcare === "adults_only" ? "moms_only" : "moms_child";
      
      let userStatus: Record<string, any> | null = null;
      if (personId) {
        const ub = userBookingsMap.get(ev.id);
        const uw = userWaitlistMap.get(ev.id);
        if (ub) {
          userStatus = {
            isBooked: ub.status === "held" || ub.status === "confirmed",
            isRefunded: ub.status === "released",
            bookedAt: ub.createdAt,
            refundedAt: ub.status === "released" ? ub.updatedAt : null,
            creditsCharged: ub.creditsCharged,
          };
        }
        if (uw) {
          if (!userStatus) userStatus = {};
          userStatus.isWaitlisted = true;
          userStatus.waitlistPosition = uw.position;
          userStatus.waitlistCreatedAt = uw.createdAt;
        }
      }

      return {
        ...ev,
        partnerName: ev.partnerName || ev.partnerId || null,
        partnerSlug: ev.partnerSlug || (ev.partnerId && ev.partnerId.length < 50 ? ev.partnerId.toLowerCase().replace(/[^a-z0-9]+/g, "-") : null),
        category: ev.categoryName || "Easy connection",
        stage: ev.stage || "All Stages",
        dateStr,
        timeStr: ends ? `${startTimeStr} – ${endTimeStr}` : startTimeStr,
        placesTaken,
        bookedMember,
        bookedGuest,
        capacityTotal,
        capacityRemaining,
        isFull,
        isGuestFull,
        audienceType,
        languages: ev.languages || ["es", "en"],
        userStatus,
      };
    });

    return {
      success: true,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        stageAffinity: c.stageAffinity,
      })),
      events: formattedEvents,
      creditBalance,
    };
  } catch (error: any) {
    console.error("getPublicEvents error:", error);
    return { success: false, categories: [], events: [], creditBalance: 0, error: error?.message };
  }
}

// ─── 2. CATEGORY MANAGEMENT ACTIONS ─────────────────────────────────────────

export async function getEventCategories() {
  const categories = await db
    .select()
    .from(eventCategory)
    .orderBy(asc(eventCategory.sortOrder));

  return { success: true, categories };
}

export async function createEventCategory(data: {
  name: string;
  stageAffinity?: string;
  sortOrder?: number;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const inserted = await db
    .insert(eventCategory)
    .values({
      name: data.name,
      slug,
      stageAffinity: data.stageAffinity || "All Stages",
      sortOrder: data.sortOrder || 10,
    })
    .returning();

  return { success: true, category: inserted[0] };
}

export async function deleteEventCategory(categoryId: string) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  await db.delete(eventCategory).where(eq(eventCategory.id, categoryId));

  return { success: true };
}

export async function deleteEvent(eventId: string) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const allowed = ["owner", "manager", "super_admin", "host"];
    if (!role || !allowed.includes(role)) {
      return { success: false, error: "UNAUTHORIZED_ADMIN" };
    }

    // Verify if event has active held/confirmed bookings
    const activeBookings = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(booking)
      .where(and(eq(booking.eventId, eventId), sql`status IN ('held', 'confirmed')`));

    if (activeBookings[0]?.count > 0) {
      return { success: false, error: "Cannot archive an event with active bookings. Cancel the event and refund attendees first." };
    }

    await db.transaction(async (tx) => {
      // 1. Delete associated logs, waitlists, and references
      await tx.delete(eventChangeLog).where(eq(eventChangeLog.eventId, eventId));
      await tx.delete(eventWaitlist).where(eq(eventWaitlist.eventId, eventId));
      await tx.delete(guestRsvp).where(eq(guestRsvp.eventId, eventId));
      await tx.delete(eventStage).where(eq(eventStage.eventId, eventId));
      
      // 2. Delete non-active/refunded bookings and passes if any
      await tx.delete(booking).where(eq(booking.eventId, eventId));
      await tx.delete(eventPass).where(eq(eventPass.eventId, eventId));

      // 3. Delete the event record
      await tx.delete(event).where(eq(event.id, eventId));

      // 4. Write audit log
      await tx.insert(auditLog).values({
        actorId: session?.user?.id || null,
        actorType: "admin",
        action: "archive_event",
        entity: "event",
        entityId: eventId,
        after: { archivedAt: new Date() },
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error("deleteEvent error:", error);
    return { success: false, error: error?.message || "Failed to archive event" };
  }
}

// ─── 3. GET SINGLE PUBLIC EVENT BY ID ────────────────────────────────────────

export async function getPublicEventById(id: string) {
  try {
    const rows = await db
      .select({
        id: event.id,
        title: event.title,
        slug: event.slug,
        categoryId: event.categoryId,
        categoryName: eventCategory.name,
        description: event.description,
        neighbourhood: event.neighbourhood,
        venueName: event.venueName,
        meetingPoint: event.meetingPoint,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        creditCost: event.creditCost,
        guestPriceCents: event.guestPriceCents,
        capacityMember: event.capacityMember,
        capacityGuest: event.capacityGuest,
        minToConfirm: event.minToConfirm,
        isSignature: event.isSignature,
        isFreeWalk: event.isFreeWalk,
        status: event.status,
        stageAffinity: eventCategory.stageAffinity,
        guestOpenAt: event.guestOpenAt,
        guestCloseAt: event.guestCloseAt,
        childcare: event.childcare,
        languages: event.languages,
      })
      .from(event)
      .leftJoin(eventCategory, eq(event.categoryId, eventCategory.id))
      .where(eq(event.id, id))
      .limit(1);

    if (!rows.length) return { success: false, error: "EVENT_NOT_FOUND" };

    const ev = rows[0];
    const starts = new Date(ev.startsAt);
    const ends = new Date(ev.endsAt);

    const dateStr = starts.toLocaleDateString("en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    const timeStr = `${starts.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} – ${ends.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

    // Count active bookings for this event
    const [memberCount, guestCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(booking)
        .where(and(eq(booking.eventId, id), eq(booking.kind, "member"), sql`${booking.status} IN ('held','confirmed')`)),
      db.select({ count: sql<number>`count(*)::int` }).from(booking)
        .where(and(eq(booking.eventId, id), eq(booking.kind, "guest"), sql`${booking.status} IN ('held','confirmed')`)),
    ]);

    const bookedMember = Number(memberCount[0]?.count || 0);
    const bookedGuest = Number(guestCount[0]?.count || 0);
    const placesTaken = bookedMember + bookedGuest;

    const memberCap = ev.capacityMember || 0;
    const guestCap = ev.capacityGuest || 0;
    const capSum = memberCap + guestCap;
    const capacityTotal = capSum > 0 ? capSum : null;
    const capacityRemaining = capacityTotal !== null ? Math.max(0, capacityTotal - placesTaken) : null;
    const isFull = capacityTotal !== null && capacityTotal > 0 && capacityRemaining !== null && capacityRemaining <= 0;
    const isGuestFull = guestCap > 0 && bookedGuest >= guestCap;
    const spotsRemaining = capacityRemaining;

    // Guest pass eligibility: confirmed, non-signature, ≤18 credits, inside guest window, not full, and not guest full
    const now = new Date();
    let guestPassEligible =
      ev.status === "confirmed" &&
      !ev.isSignature &&
      ev.creditCost <= 18 &&
      !isGuestFull &&
      !isFull;

    if (guestPassEligible) {
      if (ev.guestOpenAt && now < new Date(ev.guestOpenAt)) {
        guestPassEligible = false;
      } else if (ev.guestCloseAt && now > new Date(ev.guestCloseAt)) {
        guestPassEligible = false;
      } else if (!ev.guestOpenAt && !ev.guestCloseAt) {
        const daysUntil = Math.round((starts.getTime() - now.getTime()) / 86400000);
        if (daysUntil < 2 || daysUntil > 14) {
          guestPassEligible = false;
        }
      }
    }

    const daysUntil = Math.round((starts.getTime() - now.getTime()) / 86400000);

    return {
      success: true,
      event: {
        ...ev,
        dateStr,
        timeStr,
        bookedMember,
        bookedGuest,
        placesTaken,
        capacityTotal,
        capacityRemaining,
        spotsRemaining,
        isFull,
        isGuestFull,
        daysUntil,
        guestPassEligible,
        audienceType: ev.childcare === "adults_only" ? "moms_only" : "moms_child",
        languages: ev.languages || ["es", "en"],
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "FETCH_FAILED" };
  }
}
