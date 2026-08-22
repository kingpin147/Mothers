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
      .where(sql`${event.status} IN ('published_pending', 'confirmed')`)
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
  if (!role || (role !== "owner" && role !== "manager")) {
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
  if (!role || (role !== "owner" && role !== "manager")) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  await db.delete(event).where(eq(event.id, eventId));

  return { success: true };
}
