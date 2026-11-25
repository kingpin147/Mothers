"use server";

import { db } from "@/db";
import { community, event, person, booking } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export interface CommunityEventInput {
  title: string;
  description: string;
  startsAt: string; // ISO
  durationMinutes: number;
  capacity: number;
  locationName: string;
  locationAddress: string;
  googleMapsUrl?: string;
  priceCents: number; // 0 for free, or > 0 in cents (e.g. 2400 for €24)
  isCommunityOnly: boolean;
  bookingCutoffHours: number;
}

async function getCommunityForPerson(personId: string) {
  let [comm] = await db
    .select()
    .from(community)
    .where(eq(community.contactPersonId, personId))
    .limit(1);

  if (!comm) {
    // Also check by person email
    const [user] = await db
      .select({ email: person.email })
      .from(person)
      .where(eq(person.id, personId))
      .limit(1);

    if (user?.email) {
      const [commByEmail] = await db
        .select()
        .from(community)
        .where(eq(community.contactEmail, user.email))
        .limit(1);
      if (commByEmail) {
        comm = commByEmail;
        // Backfill contactPersonId so future queries are linked directly
        try {
          await db
            .update(community)
            .set({ contactPersonId: personId })
            .where(eq(community.id, comm.id));
        } catch (e) {
          console.warn("Failed to backfill contactPersonId:", e);
        }
      }
    }
  }

  return comm || null;
}

export async function getCommunityPortalDataAction() {
  const session = await auth();
  const personId = (session?.user as any)?.personId || session?.user?.id;
  if (!personId) {
    throw new Error("UNAUTHORIZED");
  }

  const comm = await getCommunityForPerson(personId);
  if (!comm) {
    return { community: null, events: [] };
  }

  const events = await db
    .select()
    .from(event)
    .where(eq(event.communityId, comm.id))
    .orderBy(desc(event.startsAt));

  return { community: comm, events };
}

export async function createCommunityEventAction(input: CommunityEventInput) {
  const session = await auth();
  const personId = (session?.user as any)?.personId || session?.user?.id;
  if (!personId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const comm = await getCommunityForPerson(personId);
  if (!comm || !comm.approved) {
    return { success: false, error: "COMMUNITY_NOT_APPROVED" };
  }

  // Check 1: Paid event requires connected Stripe account (CM-05)
  if (input.priceCents > 0 && !comm.stripeAccountId) {
    return { success: false, error: "STRIPE_ACCOUNT_REQUIRED" };
  }

  // Check 2: "Only my community" allowed only for communities, not workshops (CM-07)
  if (input.isCommunityOnly && comm.type === "workshop") {
    return { success: false, error: "WORKSHOPS_CANNOT_BE_COMMUNITY_ONLY" };
  }

  // Check 3: Free event fee card-on-file requirement (FF-04)
  if (input.priceCents === 0) {
    const isPastAllowance =
      (comm.type === "community" && comm.freeEventsThisMonth >= 2) ||
      comm.type === "workshop";

    if (isPastAllowance && !comm.stripeCardOnFile) {
      return { success: false, error: "CARD_ON_FILE_REQUIRED" };
    }
  }

  const startDate = new Date(input.startsAt);
  const durationMs = (input.durationMinutes || 90) * 60 * 1000;
  const endDate = new Date(startDate.getTime() + durationMs);

  const baseSlug = input.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
  const slug = `${baseSlug || "event"}-${randomSuffix}`;

  // Create event
  const [created] = await db
    .insert(event)
    .values({
      title: input.title,
      slug,
      description: input.description,
      startsAt: startDate,
      endsAt: endDate,
      venueName: input.locationName,
      meetingPoint: input.locationAddress,
      googleMapsUrl: input.googleMapsUrl?.trim() || null,
      neighbourhood: comm.name,
      capacityMember: input.capacity || 12,
      minToConfirm: 2,
      creditCost: 1,
      memberCredits: 0,
      priceCents: input.priceCents || 0,
      communityId: comm.id,
      isCommunityOnly: Boolean(input.isCommunityOnly),
      bookingCutoffHours: input.bookingCutoffHours || 3,
      status: comm.publishesWithoutReview ? "confirmed" : "published_pending",
      hostPersonId: personId,
    })
    .returning({ id: event.id });

  // Update free events counter if free
  if (input.priceCents === 0) {
    await db
      .update(community)
      .set({ freeEventsThisMonth: comm.freeEventsThisMonth + 1 })
      .where(eq(community.id, comm.id));
  }

  return { success: true, eventId: created.id };
}

export async function connectStripeAccountAction() {
  const session = await auth();
  const personId = (session?.user as any)?.personId || session?.user?.id;
  if (!personId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const comm = await getCommunityForPerson(personId);
  if (!comm) {
    return { success: false, error: "COMMUNITY_NOT_FOUND" };
  }

  // Connect mock Stripe account ID for demo/UAT flow
  const mockStripeId = `acct_mothers_${comm.slug.replace(/[^a-z0-9]/g, "").slice(0, 12)}`;
  await db
    .update(community)
    .set({ stripeAccountId: mockStripeId, stripeCardOnFile: true })
    .where(eq(community.id, comm.id));

  return { success: true, stripeAccountId: mockStripeId };
}

export async function getEventAttendeesAction(eventId: string) {
  const session = await auth();
  const personId = (session?.user as any)?.personId || session?.user?.id;
  if (!personId) {
    throw new Error("UNAUTHORIZED");
  }

  const comm = await getCommunityForPerson(personId);
  if (!comm) {
    throw new Error("COMMUNITY_NOT_FOUND");
  }

  // Verify event belongs to this community
  const [ev] = await db
    .select()
    .from(event)
    .where(and(eq(event.id, eventId), eq(event.communityId, comm.id)))
    .limit(1);

  if (!ev) {
    throw new Error("EVENT_NOT_FOUND");
  }

  // STRICT PRIVACY RULE (§11 / CM-03):
  // Return FIRST NAME and STAGE only. Never return email, phone or surname.
  const bookings = await db
    .select({
      id: booking.id,
      firstName: person.firstName,
      profileData: person.profileData,
      status: booking.status,
    })
    .from(booking)
    .innerJoin(person, eq(booking.personId, person.id))
    .where(
      and(
        eq(booking.eventId, eventId),
        sql`${booking.status} IN ('confirmed', 'attended', 'held')`
      )
    );

  return bookings.map((b) => {
    const rawStages = b.profileData?.stages;
    const stageLabel = (rawStages && rawStages.length > 0)
      ? rawStages.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(", ")
      : "Babies";
    return {
      id: b.id,
      name: b.firstName || "Mother",
      stage: stageLabel,
    };
  });
}

export async function cancelCommunityEventAction(eventId: string, reason: string) {
  const session = await auth();
  const personId = (session?.user as any)?.personId || session?.user?.id;
  if (!personId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const comm = await getCommunityForPerson(personId);
  if (!comm) {
    return { success: false, error: "COMMUNITY_NOT_FOUND" };
  }

  const [ev] = await db
    .select()
    .from(event)
    .where(and(eq(event.id, eventId), eq(event.communityId, comm.id)))
    .limit(1);

  if (!ev) {
    return { success: false, error: "EVENT_NOT_FOUND" };
  }

  if (!reason.trim()) {
    return { success: false, error: "REASON_REQUIRED" };
  }

  // Update event status to cancelled
  await db
    .update(event)
    .set({
      status: "cancelled",
      cancelReason: reason.trim(),
      updatedAt: new Date(),
    })
    .where(eq(event.id, eventId));

  // Refund every booked mother in full
  const bookedUsers = await db
    .select({
      bookingId: booking.id,
      personId: booking.personId,
      creditsCharged: booking.creditsCharged,
    })
    .from(booking)
    .where(and(eq(booking.eventId, eventId), eq(booking.status, "confirmed")));

  for (const b of bookedUsers) {
    if (b.creditsCharged > 0) {
      const { refundPersonCredits } = await import("@/lib/ledger");
      await refundPersonCredits(b.personId, b.creditsCharged, null);
    }
    await db
      .update(booking)
      .set({ status: "cancelled", cancelledAt: new Date() })
      .where(eq(booking.id, b.bookingId));
  }

  return { success: true };
}

export async function messageBookedMothersAction(eventId: string, messageText: string) {
  const session = await auth();
  const personId = (session?.user as any)?.personId || session?.user?.id;
  if (!personId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const comm = await getCommunityForPerson(personId);
  if (!comm) {
    return { success: false, error: "COMMUNITY_NOT_FOUND" };
  }

  const [ev] = await db
    .select()
    .from(event)
    .where(and(eq(event.id, eventId), eq(event.communityId, comm.id)))
    .limit(1);

  if (!ev) {
    return { success: false, error: "EVENT_NOT_FOUND" };
  }

  if (!messageText.trim()) {
    return { success: false, error: "MESSAGE_EMPTY" };
  }

  // In production, queue notification to booked mothers through The Mothers system
  return { success: true };
}

export async function updateCommunityDetailsAction(details: {
  name: string;
  contactEmail: string;
  contactPhone?: string;
  legalName?: string;
  taxId?: string;
}) {
  const session = await auth();
  const personId = (session?.user as any)?.personId || session?.user?.id;
  if (!personId) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const comm = await getCommunityForPerson(personId);
  if (!comm) {
    return { success: false, error: "COMMUNITY_NOT_FOUND" };
  }

  await db
    .update(community)
    .set({
      name: details.name.trim(),
      contactEmail: details.contactEmail.trim(),
      contactPhone: details.contactPhone?.trim() || null,
      legalName: details.legalName?.trim() || null,
      taxId: details.taxId?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(community.id, comm.id));

  return { success: true };
}
