"use server";

import { db } from "@/db";
import { event, booking, person, eventCategory } from "@/db/schema";
import { eq, and, sql, desc, asc, gte, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function createMotherGathering(data: {
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  neighbourhood: string;
  venueName: string;
  meetingPoint: string;
  googleMapsUrl?: string;
  capacity?: number;
  languages?: string[];
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "AUTH_REQUIRED" };
  }
  const personId = session.user.id;

  const personRecord = await db.query.person.findFirst({
    where: eq(person.id, personId),
  });
  if (!personRecord) {
    return { success: false, error: "ACCOUNT_NOT_FOUND" };
  }
  if (personRecord.isSuspended) {
    return { success: false, error: "ACCOUNT_SUSPENDED" };
  }

  // Check 1: Must have attended at least 3 events
  const attendedCountRes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(booking)
    .where(and(eq(booking.personId, personId), eq(booking.status, "attended")));
  const attendedCount = attendedCountRes[0]?.count || 0;

  if (attendedCount < 3) {
    return {
      success: false,
      error: "ATTENDANCE_REQUIREMENT_NOT_MET",
      message: "You must have attended at least 3 gatherings to organize your own.",
    };
  }

  // Check 2: Max 2 upcoming active gatherings
  const upcomingGatheringsRes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(event)
    .where(
      and(
        eq(event.gatheringHostPersonId, personId),
        eq(event.isGathering, true),
        gte(event.startsAt, new Date()),
        sql`${event.status} IN ('published_pending', 'confirmed')`
      )
    );
  const activeCount = upcomingGatheringsRes[0]?.count || 0;
  if (activeCount >= 2) {
    return {
      success: false,
      error: "MAX_ACTIVE_GATHERINGS_REACHED",
      message: "You can have at most 2 upcoming gatherings active at once.",
    };
  }

  // Check 3: Capacity capped at 10 (default 6)
  const capacity = Math.min(Math.max(data.capacity || 6, 2), 10);

  // Check 4: Approved gatherings count for the 2-event review rule
  const approvedPastRes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(event)
    .where(
      and(
        eq(event.gatheringHostPersonId, personId),
        eq(event.isGathering, true),
        eq(event.status, "completed")
      )
    );
  const approvedPast = approvedPastRes[0]?.count || 0;
  // First 2 checked by team, subsequent ones publish immediately
  const status = approvedPast >= 2 ? "confirmed" : "published_pending";

  // Category fallback
  let defaultCategory = await db.query.eventCategory.findFirst({
    where: eq(eventCategory.slug, "community"),
  });
  if (!defaultCategory) {
    defaultCategory = await db.query.eventCategory.findFirst();
  }

  const baseSlug = data.title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

  const [newEvent] = await db
    .insert(event)
    .values({
      title: data.title.trim(),
      slug,
      description: data.description.trim(),
      categoryId: defaultCategory?.id || null,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      venueName: data.venueName.trim(),
      meetingPoint: data.meetingPoint.trim(),
      googleMapsUrl: data.googleMapsUrl?.trim() || null,
      neighbourhood: data.neighbourhood.trim(),
      capacityMember: capacity,
      minToConfirm: 0,
      creditCost: 0,
      memberCredits: 0,
      nonMemberCredits: 0,
      isFreeWalk: true,
      isGathering: true,
      gatheringHostPersonId: personId,
      partnerId: `mother:${personRecord.email}`,
      languages: data.languages || ["English", "Spanish"],
      status,
      cancellationWindowHours: 24,
      publishedAt: status === "confirmed" ? new Date() : null,
    })
    .returning();

  try {
    const { sendEventSubmittedEmail, sendNewEventToCheckEmail } = await import("@/lib/brevo");
    await sendEventSubmittedEmail({
      personId,
      email: personRecord.email,
      firstName: personRecord.firstName || "Mother",
      eventTitle: data.title.trim(),
      eventDate: new Date(data.startsAt).toLocaleDateString(),
      neighbourhood: data.neighbourhood.trim(),
      isLive: status === "confirmed",
      locale: personRecord.locale || "en",
    });

    if (status === "published_pending") {
      await sendNewEventToCheckEmail({
        creatorName: personRecord.firstName || "Mother",
        creatorEmail: personRecord.email,
        eventTitle: data.title.trim(),
        eventDate: new Date(data.startsAt).toLocaleDateString(),
        eventTime: new Date(data.startsAt).toLocaleTimeString(),
        neighbourhood: data.neighbourhood.trim(),
        spots: capacity,
      });
    }
  } catch (err) {
    console.error("[createMotherGathering] Failed to send event submitted emails:", err);
  }

  return { success: true, event: newEvent, isPendingReview: status === "published_pending" };
}

export async function getMotherGatherings() {
  return await db
    .select({
      id: event.id,
      slug: event.slug,
      title: event.title,
      description: event.description,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      venueName: event.venueName,
      neighbourhood: event.neighbourhood,
      googleMapsUrl: event.googleMapsUrl,
      capacityMember: event.capacityMember,
      hostPersonId: event.gatheringHostPersonId,
      hostFirstName: person.firstName,
      hostNeighbourhood: event.neighbourhood,
      status: event.status,
    })
    .from(event)
    .innerJoin(person, eq(event.gatheringHostPersonId, person.id))
    .where(
      and(
        eq(event.isGathering, true),
        eq(event.status, "confirmed"),
        gte(event.startsAt, new Date())
      )
    )
    .orderBy(asc(event.startsAt))
    .limit(10);
}

export async function getMyOrganizedGatherings() {
  const session = await auth();
  if (!session?.user?.id) return [];
  const personId = session.user.id;

  return await db
    .select({
      id: event.id,
      slug: event.slug,
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      venueName: event.venueName,
      neighbourhood: event.neighbourhood,
      capacityMember: event.capacityMember,
      status: event.status,
    })
    .from(event)
    .where(and(eq(event.isGathering, true), eq(event.gatheringHostPersonId, personId)))
    .orderBy(desc(event.startsAt));
}
