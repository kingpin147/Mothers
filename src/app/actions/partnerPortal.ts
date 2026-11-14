"use server";

import { db } from "@/db";
import { community, event, person } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export interface CommunityEventInput {
  title: string;
  description: string;
  startsAt: string; // ISO
  durationMinutes: number;
  capacity: number;
  locationName: string;
  locationAddress: string;
  priceCents: number; // 0 for free, or > 0 in cents (e.g. 2400 for €24)
  isCommunityOnly: boolean;
  bookingCutoffHours: number;
}

export async function getCommunityPortalDataAction() {
  const session = await auth();
  const personId = (session?.user as any)?.personId || session?.user?.id;
  if (!personId) {
    throw new Error("UNAUTHORIZED");
  }

  // Find community where user is contact person
  const [comm] = await db
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
        return { community: commByEmail, events: [] };
      }
    }
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

  const [comm] = await db
    .select()
    .from(community)
    .where(eq(community.contactPersonId, personId))
    .limit(1);

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

  const [comm] = await db
    .select()
    .from(community)
    .where(eq(community.contactPersonId, personId))
    .limit(1);

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
