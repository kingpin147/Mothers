"use server";

import { db } from "@/db";
import { event, eventCategory, booking, auditLog } from "@/db/schema";
import { eq, desc, asc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

// ─── 1. GET PUBLIC EVENTS & DYNAMIC CATEGORIES ─────────────────────────────

export async function getPublicEvents() {
  try {
    // 1. Fetch categories
    const categories = await db
      .select()
      .from(eventCategory)
      .orderBy(asc(eventCategory.sortOrder));

    // 2. Fetch active events with category
    const events = await db
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
      })
      .from(event)
      .leftJoin(eventCategory, eq(event.categoryId, eventCategory.id))
      .where(sql`${event.status} IN ('published_pending', 'confirmed', 'completed')`)
      .orderBy(asc(event.startsAt));

    // 3. Count confirmed & held bookings per event
    const bookingsCount = await db
      .select({
        eventId: booking.eventId,
        count: sql<number>`count(*)::int`,
      })
      .from(booking)
      .where(sql`${booking.status} IN ('held', 'confirmed')`)
      .groupBy(booking.eventId);

    const countMap = new Map<string, number>();
    for (const b of bookingsCount) {
      if (b.eventId) countMap.set(b.eventId, b.count);
    }

    const formattedEvents = events.map((ev) => {
      const starts = new Date(ev.startsAt);
      const ends = new Date(ev.endsAt);

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
      const endTimeStr = ends.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        ...ev,
        category: ev.categoryName || "General",
        stage: ev.stage || "All Stages",
        dateStr,
        timeStr: `${startTimeStr} – ${endTimeStr}`,
        bookedMember: countMap.get(ev.id) || 0,
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
    };
  } catch (error: any) {
    console.error("getPublicEvents error:", error);
    return { success: false, categories: [], events: [], error: error?.message };
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

export async function deleteEvent(eventId: string) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  await db.delete(event).where(eq(event.id, eventId));

  return { success: true };
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
    const spotsRemaining = ev.capacityMember - bookedMember;

    // Guest pass eligibility: confirmed, non-signature, ≤18 credits, T-14 to T-2
    const daysUntil = Math.round((starts.getTime() - Date.now()) / 86400000);
    const guestPassEligible =
      ev.status === "confirmed" &&
      !ev.isSignature &&
      ev.creditCost <= 18 &&
      daysUntil >= 2 &&
      daysUntil <= 14;

    return {
      success: true,
      event: {
        ...ev,
        dateStr,
        timeStr,
        bookedMember,
        bookedGuest,
        spotsRemaining,
        daysUntil,
        guestPassEligible,
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "FETCH_FAILED" };
  }
}
