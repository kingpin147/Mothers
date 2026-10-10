"use server";

import { db } from "@/db";
import { member, person, creditBatch, circlePost, circleReply, circleSavedPost, booking, event, eventCategory, partner, partnerPerk, perkCodePool, perkReveal, eventWaitlist, auditLog, emailLog } from "@/db/schema";
import { eq, desc, and, sql, asc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getAppUrl } from "@/lib/urls";
import { z } from "zod";

const updatePersonDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: z.string().trim().optional(),
  stage: z.string().optional(),
  neighbourhood: z.string().optional(),
});

const perkIdSchema = z.string().trim().min(1, "PERK_NOT_FOUND");

export async function getAccountData(targetMemberId?: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "AUTH_REQUIRED" };
  }

  const role = (session.user as any)?.role;
  const isAdmin = ["owner", "manager", "host", "super_admin"].includes(role);

  const userEmail = session.user.email?.toLowerCase().trim();
  let personId = (session.user as any).personId || session.user.id;
  let memberId = (isAdmin && targetMemberId) ? targetMemberId : (session.user as any).memberId;

  try {
    let personRecord = null;
    let memberRecord = null;

    if (memberId) {
      memberRecord = await db.query.member.findFirst({
        where: eq(member.id, memberId),
      });
    }

    if (!memberRecord && !targetMemberId && personId) {
      memberRecord = await db.query.member.findFirst({
        where: eq(member.personId, personId),
      });
      if (memberRecord) memberId = memberRecord.id;
    }

    if (!memberRecord && !targetMemberId && userEmail) {
      personRecord = await db.query.person.findFirst({
        where: eq(person.email, userEmail),
      });
      if (personRecord) {
        personId = personRecord.id;
        memberRecord = await db.query.member.findFirst({
          where: eq(member.personId, personRecord.id),
        });
        if (memberRecord) memberId = memberRecord.id;
      }
    }

    if (!personRecord) {
      if (memberRecord?.personId) {
        personRecord = await db.query.person.findFirst({
          where: eq(person.id, memberRecord.personId),
        });
      } else if (personId) {
        personRecord = await db.query.person.findFirst({
          where: eq(person.id, personId),
        });
      } else if (userEmail) {
        personRecord = await db.query.person.findFirst({
          where: eq(person.email, userEmail),
        });
      }
    }

    if (personRecord && !personRecord.godmotherCode) {
      const cleanFirst = (personRecord.firstName || "MEMBER").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "MEMBER";
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const generatedCode = `MOTHERS-${cleanFirst}-${randomSuffix}`;
      await db.update(person).set({ godmotherCode: generatedCode }).where(eq(person.id, personRecord.id));
      personRecord.godmotherCode = generatedCode;
    }

    if (!personRecord && !memberRecord) {
      return { success: false, error: "PERSON_NOT_FOUND" };
    }

    // Parallelize independent sub-queries for maximum performance
    const [allBatches, bookingSpends, upcomingBookings, godmotherBatches, activePartners, creditBatches, activeWaitlists] = await Promise.all([
      personId
        ? db
            .select()
            .from(creditBatch)
            .where(eq(creditBatch.personId, personId))
            .orderBy(desc(creditBatch.createdAt))
        : Promise.resolve([]),
      personId
        ? db
            .select({
              id: booking.id,
              creditsCharged: booking.creditsCharged,
              bookedAt: booking.bookedAt,
              createdAt: booking.createdAt,
              eventTitle: event.title,
            })
            .from(booking)
            .innerJoin(event, eq(booking.eventId, event.id))
            .where(
              and(
                eq(booking.personId, personId),
                sql`${booking.creditsCharged} > 0`
              )
            )
            .orderBy(desc(booking.bookedAt))
        : Promise.resolve([]),
      db
        .select({
          id: booking.id,
          eventId: booking.eventId,
          eventTitle: event.title,
          eventDate: event.startsAt,
          eventEndDate: event.endsAt,
          eventLocation: event.neighbourhood,
          meetingPoint: event.meetingPoint,
          venueName: event.venueName,
          status: booking.status,
          eventStatus: event.status,
          minToConfirm: event.minToConfirm,
          isSignature: event.isSignature,
          cancellationWindowHours: event.cancellationWindowHours,
          categoryName: eventCategory.name,
          categorySlug: eventCategory.slug,
          creditsCharged: booking.creditsCharged,
          confirmedCount: sql<number>`(SELECT COUNT(*)::int FROM ${booking} b2 WHERE b2.event_id = ${event.id} AND b2.status IN ('held', 'confirmed'))`.as('confirmed_count'),
        })
        .from(booking)
        .innerJoin(event, eq(booking.eventId, event.id))
        .leftJoin(eventCategory, eq(event.categoryId, eventCategory.id))
        .where(
          and(
            memberId ? eq(booking.memberId, memberId) : eq(booking.personId, personId!),
            sql`${event.startsAt} > NOW()`,
            sql`${booking.status} IN ('held', 'confirmed')`
          )
        )
        .orderBy(asc(event.startsAt))
        .limit(10),
      personId
        ? db
            .select({
              totalCreditsEarned: sql<number>`COALESCE(SUM(amount), 0)::int`,
            })
            .from(creditBatch)
            .where(
              and(
                eq(creditBatch.personId, personId),
                eq(creditBatch.source, "godmother")
              )
            )
        : Promise.resolve([{ totalCreditsEarned: 0 }]),
      db
        .select()
        .from(partner)
        .where(inArray(partner.status, ["active", "Live", "live", "Ending soon"])),
      personId
        ? db
            .select()
            .from(creditBatch)
            .where(
              and(
                eq(creditBatch.personId, personId),
                sql`${creditBatch.remaining} > 0`,
                sql`${creditBatch.expiresAt} > NOW()`
              )
            )
            .orderBy(asc(creditBatch.expiresAt))
        : Promise.resolve([]),
      personId
        ? db
            .select({
              id: eventWaitlist.id,
              eventId: eventWaitlist.eventId,
              position: eventWaitlist.position,
              offeredAt: eventWaitlist.offeredAt,
              offerExpiresAt: eventWaitlist.offerExpiresAt,
              createdAt: eventWaitlist.createdAt,
              eventTitle: event.title,
              startsAt: event.startsAt,
              venueName: event.venueName,
              neighbourhood: event.neighbourhood,
            })
            .from(eventWaitlist)
            .innerJoin(event, eq(eventWaitlist.eventId, event.id))
            .where(
              and(
                eq(eventWaitlist.personId, personId),
                sql`${event.startsAt} > NOW()`
              )
            )
            .orderBy(asc(event.startsAt))
        : Promise.resolve([]),
    ]);

    const currentBalance = (creditBatches || []).reduce((acc: number, b: any) => acc + (Number(b.remaining) || 0), 0);

    const ledger = [
      ...(allBatches || []).map((b: any) => ({
        id: b.id,
        amount: b.amount,
        type: b.source,
        reason: b.source === "subscription" ? "Monthly subscription grant" :
                b.source === "godmother" ? "Godmother referral reward" :
                b.source === "refund" ? "Booking refund" :
                b.source === "topup" ? "Credit top-up" :
                b.source === "admin_adjustment" ? "Operator adjustment" :
                b.source === "purchase" ? "Pre-launch credits" : b.source,
        expiresAt: b.expiresAt,
        createdAt: b.createdAt || b.purchasedAt,
      })),
      ...(bookingSpends || []).map((bk: any) => ({
        id: bk.id,
        amount: -bk.creditsCharged,
        type: "event_booking",
        reason: `Booking: ${bk.eventTitle}`,
        expiresAt: null,
        createdAt: bk.bookedAt || bk.createdAt,
      })),
    ].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const safeBookings = (upcomingBookings || []).map((b: any) => ({
      ...b,
      eventDate: b.eventDate ? new Date(b.eventDate).toISOString() : null,
      eventEndDate: b.eventEndDate ? new Date(b.eventEndDate).toISOString() : null,
      confirmedCount: Number(b.confirmedCount ?? b.confirmed_count ?? 0),
    }));

    const safeBatches = (creditBatches || []).map((b: any) => ({
      ...b,
      expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString() : null,
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : null,
    }));

    const safeAllBatches = (allBatches || []).map((b: any) => ({
      ...b,
      expiresAt: b.expiresAt ? new Date(b.expiresAt).toISOString() : null,
      createdAt: (b.createdAt || b.purchasedAt) ? new Date(b.createdAt || b.purchasedAt).toISOString() : null,
    }));

    const safeWaitlists = (activeWaitlists || []).map((w: any) => ({
      ...w,
      startsAt: w.startsAt ? new Date(w.startsAt).toISOString() : null,
      offeredAt: w.offeredAt ? new Date(w.offeredAt).toISOString() : null,
      offerExpiresAt: w.offerExpiresAt ? new Date(w.offerExpiresAt).toISOString() : null,
    }));

    const { getPublicClubSettings } = await import("@/app/actions/adminSettings");
    const settings = await getPublicClubSettings();

    let finalGodmotherCode = personRecord?.godmotherCode;
    if (!finalGodmotherCode && personRecord?.id) {
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const namePrefix = (personRecord.firstName || "MEMBER").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4).padEnd(4, "X");
      finalGodmotherCode = `MOTHERS-${namePrefix}${randomSuffix}-BCN`;
      try {
        await db.update(person).set({ godmotherCode: finalGodmotherCode }).where(eq(person.id, personRecord.id));
      } catch (err) {
        console.warn("Could not persist generated godmother code:", err);
      }
    }

    return {
      success: true,
      settings,
      member: memberRecord
        ? {
            id: memberRecord.id,
            firstName: personRecord?.firstName || "",
            lastName: personRecord?.lastName || "",
            email: personRecord?.email || userEmail || "",
            phone: personRecord?.phoneE164 || "",
            status: memberRecord.status || "applicant",
            stage: memberRecord.stage || "",
            neighbourhood: memberRecord.neighbourhood || personRecord?.profileData?.neighbourhood || "",
            monthlyPriceCents: memberRecord.monthlyPriceCents || 0,
            joiningFeePaidCents: memberRecord.joiningFeePaidCents || 0,
            pausedUntil: memberRecord.pausedUntil ? new Date(memberRecord.pausedUntil).toISOString() : null,
            cancelAtPeriodEnd: !!memberRecord.cancelAtPeriodEnd,
            currentPeriodEnd: memberRecord.currentPeriodEnd ? new Date(memberRecord.currentPeriodEnd).toISOString() : null,
            createdBeforeLaunch: !!personRecord?.createdBeforeLaunch,
            godmotherCode: finalGodmotherCode,
            hasActiveSubscription: !!memberRecord.stripeSubscriptionId && memberRecord.status === "active",
          }
        : {
            id: null,
            firstName: personRecord?.firstName || "",
            lastName: personRecord?.lastName || "",
            email: personRecord?.email || userEmail || "",
            phone: personRecord?.phoneE164 || "",
            status: "applicant",
            stage: (personRecord?.profileData?.stages || [])[0] || "",
            neighbourhood: personRecord?.profileData?.neighbourhood || "",
            monthlyPriceCents: 0,
            joiningFeePaidCents: 0,
            pausedUntil: null,
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
            createdBeforeLaunch: !!personRecord?.createdBeforeLaunch,
            godmotherCode: finalGodmotherCode,
            hasActiveSubscription: false,
          },
      credits: {
        available: Math.max(0, currentBalance),
        ledger: ledger || [],
        batches: safeAllBatches,
        activeBatches: safeBatches,
      },
      bookings: safeBookings,
      waitlists: safeWaitlists,
      godmother: {
        totalCreditsEarned: Number(godmotherBatches[0]?.totalCreditsEarned || 0),
      },
      partners: activePartners || [],
    };
  } catch (error: any) {
    console.error("getAccountData error:", error);
    return { success: false, error: error?.message || "ACCOUNT_LOAD_FAILED" };
  }
}

export async function leaveWaitlist(waitlistId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const personId = session.user.id;

  const waitlistEntry = await db.query.eventWaitlist.findFirst({
    where: and(
      eq(eventWaitlist.id, waitlistId),
      eq(eventWaitlist.personId, personId)
    ),
  });

  if (!waitlistEntry) {
    throw new Error("Waitlist entry not found.");
  }

  await db
    .delete(eventWaitlist)
    .where(eq(eventWaitlist.id, waitlistId));

  // Re-number subsequent positions on this event
  await db
    .update(eventWaitlist)
    .set({
      position: sql`${eventWaitlist.position} - 1`,
    })
    .where(
      and(
        eq(eventWaitlist.eventId, waitlistEntry.eventId),
        sql`${eventWaitlist.position} > ${waitlistEntry.position}`
      )
    );

  return { success: true };
}

export async function pauseMembership(months: number = 1) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };
  const personId = (session.user as any).personId || session.user.id;
  if (!personId) return { success: false, error: "AUTH_REQUIRED" };

  const pauseMonths = Math.min(2, Math.max(1, Math.floor(Number(months) || 1)));

  try {
    const memberRecord = await db.query.member.findFirst({ where: eq(member.personId, personId) });
    if (!memberRecord) return { success: false, error: "MEMBER_NOT_FOUND" };
    if (memberRecord.status !== "active") {
      return { success: false, error: "CANNOT_PAUSE" };
    }
    if (memberRecord.cancelAtPeriodEnd) {
      return { success: false, error: "CANNOT_PAUSE_WHILE_CANCELLING" };
    }
    if (memberRecord.pausedUntil && new Date(memberRecord.pausedUntil) > new Date()) {
      return { success: false, error: "ALREADY_PAUSED" };
    }
    const usedMonths = memberRecord.pauseMonthsUsedYear ?? 0;
    if (usedMonths + pauseMonths > 2) {
      return { success: false, error: `PAUSE_LIMIT_REACHED. You have used ${usedMonths}/2 pause months this year.` };
    }
    
    // Pause for requested months (1 or 2)
    const pausedUntil = new Date();
    pausedUntil.setMonth(pausedUntil.getMonth() + pauseMonths);

    if (memberRecord.stripeSubscriptionId) {
      try {
        const { stripe } = await import("@/lib/stripe");
        await stripe.subscriptions.update(memberRecord.stripeSubscriptionId, {
          pause_collection: {
            behavior: "void",
            resumes_at: Math.floor(pausedUntil.getTime() / 1000),
          },
        });
      } catch (stripeErr: any) {
        throw new Error(stripeErr.message || "STRIPE_PAUSE_FAILED");
      }
    }
    
    await db.update(member)
      .set({ 
        status: "paused",
        pausedUntil, 
        pauseMonthsUsedYear: usedMonths + pauseMonths,
        currentPauseMonths: pauseMonths,
        updatedAt: new Date() 
      })
      .where(eq(member.id, memberRecord.id));
      
    return { success: true, pausedUntil };
  } catch (e: any) {
    return { success: false, error: e?.message || "PAUSE_FAILED" };
  }
}

export async function resumeMembership() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };
  const personId = (session.user as any).personId || session.user.id;
  if (!personId) return { success: false, error: "AUTH_REQUIRED" };

  try {
    const memberRecord = await db.query.member.findFirst({ where: eq(member.personId, personId) });
    if (!memberRecord) return { success: false, error: "MEMBER_NOT_FOUND" };

    if (memberRecord.stripeSubscriptionId) {
      try {
        const { stripe } = await import("@/lib/stripe");
        await stripe.subscriptions.update(memberRecord.stripeSubscriptionId, {
          pause_collection: "",
        });
      } catch (stripeErr) {
        console.warn("Stripe unpause warning:", stripeErr);
      }
    }

    // On early resume: calculate whole unused months to credit back (§M-08)
    let newUsedMonths = memberRecord.pauseMonthsUsedYear ?? 0;
    if (memberRecord.pausedUntil && new Date(memberRecord.pausedUntil) > new Date()) {
      const remainingMs = new Date(memberRecord.pausedUntil).getTime() - Date.now();
      const remainingDays = remainingMs / (1000 * 60 * 60 * 24);
      const wholeUnusedMonths = Math.floor(remainingDays / 28);
      if (wholeUnusedMonths > 0) {
        newUsedMonths = Math.max(0, newUsedMonths - wholeUnusedMonths);
      }
    }

    await db.update(member)
      .set({
        status: "active",
        pausedUntil: null,
        currentPauseMonths: 0,
        pauseMonthsUsedYear: newUsedMonths,
        updatedAt: new Date(),
      })
      .where(eq(member.id, memberRecord.id));

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "RESUME_FAILED" };
  }
}

export async function updatePersonDetails(rawData: { firstName: string; lastName: string; phone?: string; stage?: string; neighbourhood?: string }) {
  const parsed = updatePersonDetailsSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "INVALID_INPUT" };
  }
  const data = parsed.data;

  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };

  const userEmail = session.user.email?.toLowerCase().trim();
  let personId = (session.user as any).personId || session.user.id;
  let memberId = (session.user as any).memberId;

  try {
    // If personId or memberId is missing from session token, look them up by email
    if ((!personId || !memberId) && userEmail) {
      const personRec = await db.query.person.findFirst({
        where: eq(person.email, userEmail),
      });
      if (personRec) {
        personId = personRec.id;
        if (!memberId) {
          const memberRec = await db.query.member.findFirst({
            where: eq(member.personId, personRec.id),
          });
          if (memberRec) memberId = memberRec.id;
        }
      }
    }

    if (!personId) {
      return { success: false, error: "PERSON_NOT_FOUND" };
    }

    const updates: Promise<any>[] = [
      db
        .update(person)
        .set({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phoneE164: data.phone?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(person.id, personId)),
    ];

    if (memberId) {
      updates.push(
        db
          .update(member)
          .set({
            stage: data.stage !== undefined ? data.stage : undefined,
            neighbourhood: data.neighbourhood || null,
            updatedAt: new Date(),
          })
          .where(eq(member.id, memberId))
      );
    }

    await Promise.all(updates);
    return { success: true };
  } catch (e: any) {
    console.error("updatePersonDetails error:", e);
    return { success: false, error: e?.message || "UPDATE_FAILED" };
  }
}

export async function cancelMembership() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };
  const personId = (session.user as any).personId || session.user.id;
  if (!personId) return { success: false, error: "AUTH_REQUIRED" };

  try {
    const memberRecord = await db.query.member.findFirst({ where: eq(member.personId, personId) });
    if (!memberRecord) return { success: false, error: "MEMBER_NOT_FOUND" };
    if (memberRecord.cancelAtPeriodEnd) return { success: false, error: "ALREADY_CANCELLING" };

    // If Stripe subscription exists, set cancel_at_period_end via Stripe
    if (memberRecord.stripeSubscriptionId) {
      const { stripe } = await import("@/lib/stripe");
      await stripe.subscriptions.update(memberRecord.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // Always update DB flag regardless (Stripe webhook will also do this,
    // but we update optimistically so UI reflects immediately)
    await db.update(member)
      .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
      .where(eq(member.id, memberRecord.id));

    return {
      success: true,
      currentPeriodEnd: memberRecord.currentPeriodEnd?.toISOString() ?? null,
    };
  } catch (e: any) {
    return { success: false, error: e?.message || "CANCEL_FAILED" };
  }
}

export async function reactivateMembership() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };
  const personId = (session.user as any).personId || session.user.id;
  if (!personId) return { success: false, error: "AUTH_REQUIRED" };

  try {
    const memberRecord = await db.query.member.findFirst({ where: eq(member.personId, personId) });
    if (!memberRecord) return { success: false, error: "MEMBER_NOT_FOUND" };
    
    if (memberRecord.status !== "active" && memberRecord.status !== "paused") {
      return { success: false, error: "CANNOT_REACTIVATE_LAPSED" };
    }
    if (!memberRecord.cancelAtPeriodEnd) {
      return { success: false, error: "ALREADY_ACTIVE" };
    }

    if (memberRecord.stripeSubscriptionId) {
      try {
        const { stripe } = await import("@/lib/stripe");
        await stripe.subscriptions.update(memberRecord.stripeSubscriptionId, {
          cancel_at_period_end: false,
        });
      } catch (stripeErr: any) {
        throw new Error(stripeErr.message || "STRIPE_REACTIVATE_FAILED");
      }
    } else {
      return { success: false, error: "NO_SUBSCRIPTION" };
    }

    await db.update(member)
      .set({
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(member.id, memberRecord.id));

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "REACTIVATE_FAILED" };
  }
}

export async function getStripePortalUrl() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };
  const personId = (session.user as any).personId || session.user.id;
  if (!personId) return { success: false, error: "AUTH_REQUIRED" };

  try {
    const memberRecord = await db.query.member.findFirst({
      where: eq(member.personId, personId),
    });

    if (!memberRecord || !memberRecord.stripeCustomerId) {
      return { success: false, error: "STRIPE_CUSTOMER_NOT_FOUND" };
    }

    const { stripe } = await import("@/lib/stripe");
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: memberRecord.stripeCustomerId,
      return_url: `${getAppUrl()}/account`,
    });

    return { success: true, url: portalSession.url };
  } catch (e: any) {
    console.error("getStripePortalUrl error:", e);
    return { success: false, error: e?.message || "PORTAL_CREATION_FAILED" };
  }
}

// ─── 4. REVEAL PERK CODE (SERVER-SIDE TRACKED §12) ──────────────────────────

export async function revealPerkCode(rawPerkId: string) {
  const parsed = perkIdSchema.safeParse(rawPerkId);
  if (!parsed.success) return { success: false, error: "PERK_NOT_FOUND" };
  const perkId = parsed.data;

  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };

  const personId = (session.user as any).personId || session.user.id;
  if (!personId) return { success: false, error: "AUTH_REQUIRED" };

  try {
    const memberRecord = await db.query.member.findFirst({ where: eq(member.personId, personId) });
    if (!memberRecord) return { success: false, error: "MEMBER_REQUIRED" };
    if (memberRecord.status !== "active" && memberRecord.status !== "paused") {
      return { success: false, error: "NOT_ACTIVE_MEMBER" };
    }
    
    // Also check membershipLive (P2-05)
    const { getPublicClubSettings } = await import("@/app/actions/adminSettings");
    const settings = await getPublicClubSettings();
    if (!settings.membershipLive) {
      return { success: false, error: "MEMBERSHIP_NOT_LIVE" };
    }

    const memberId = memberRecord.id;

    const result = await db.transaction(async (tx) => {
      const perk = await tx.query.partnerPerk.findFirst({
        where: and(eq(partnerPerk.id, perkId), eq(partnerPerk.active, true)),
      });

      if (!perk) throw new Error("PERK_NOT_FOUND");

      // Record reveal interaction
      await tx.insert(perkReveal).values({
        perkId,
        memberId,
        revealedAt: new Date(),
      });

      if (perk.perkType === "shared_code") {
        return { code: perk.discountCode || "", linkUrl: perk.linkUrl, type: perk.perkType };
      }

      if (perk.perkType === "code_pool") {
        // Check if member already claimed a code from this pool
        const existingClaim = await tx.query.perkCodePool.findFirst({
          where: and(
            eq(perkCodePool.perkId, perkId),
            eq(perkCodePool.claimedByMemberId, memberId)
          ),
        });

        if (existingClaim) {
          return { code: existingClaim.code, linkUrl: perk.linkUrl, type: perk.perkType };
        }

        // Claim next available code
        const availableCode = await tx.query.perkCodePool.findFirst({
          where: and(
            eq(perkCodePool.perkId, perkId),
            sql`claimed_by_member_id IS NULL`
          ),
        });

        if (!availableCode) {
          throw new Error("OUT_OF_CODES");
        }

        await tx
          .update(perkCodePool)
          .set({
            claimedByMemberId: memberId,
            claimedAt: new Date(),
            revealedAt: new Date(),
          })
          .where(eq(perkCodePool.id, availableCode.id));

        return { code: availableCode.code, linkUrl: perk.linkUrl, type: perk.perkType };
      }

      return { code: "", linkUrl: perk.linkUrl, type: perk.perkType };
    });

    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, error: error?.message || "REVEAL_FAILED" };
  }
}


// Lightweight credit-balance fetch used by the Navigation bar (Unified FIFO Wallet §C-02)
export async function getMyCredits(): Promise<{ balance: number }> {
  try {
    const session = await auth();
    if (!session?.user) return { balance: 0 };

    const personId = (session.user as any).personId || session.user.id;
    if (!personId) return { balance: 0 };

    const { getPersonWalletBalance } = await import("@/lib/ledger");
    const balance = await getPersonWalletBalance(personId);
    return { balance };
  } catch {
    return { balance: 0 };
  }
}

export async function validateGodmotherCode(code: string) {
  if (!code || !code.trim()) {
    return { valid: false, error: "Please enter a code" };
  }

  const normalized = code.trim().toUpperCase();
  const session = await auth();
  const currentPersonId = session?.user?.id ? ((session.user as any).personId || session.user.id) : null;

  const match = await db.query.person.findFirst({
    where: eq(person.godmotherCode, normalized),
  });

  if (!match) {
    return { valid: false, error: "Invalid Godmother code" };
  }

  if (currentPersonId && match.id === currentPersonId) {
    return { valid: false, error: "You cannot use your own referral code" };
  }

  return {
    valid: true,
    godmotherName: match.firstName || "A Mother in Barcelona",
    godmotherPersonId: match.id,
  };
}

export async function submitFirstVisitProfile(formData: {
  stages: string[];
  neighbourhood: string;
  hoping: string[];
  availability: string[];
  heard: string;
  godmotherCode?: string;
  social?: string;
  why?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "AUTH_REQUIRED" };
  }
  const personId = (session.user as any).personId || session.user.id;

  let referredByPersonId: string | null = null;
  if (formData.godmotherCode && formData.godmotherCode.trim()) {
    const check = await validateGodmotherCode(formData.godmotherCode);
    if (check.valid && check.godmotherPersonId) {
      referredByPersonId = check.godmotherPersonId;
    }
  }

  await db
    .update(person)
    .set({
      profileDone: true,
      ...(referredByPersonId ? { referredByPersonId } : {}),
      profileData: {
        stages: formData.stages,
        neighbourhood: formData.neighbourhood,
        hoping: formData.hoping,
        availability: formData.availability,
        heard: formData.heard,
        godmotherCode: formData.godmotherCode,
        social: formData.social,
        why: formData.why,
      },
      updatedAt: new Date(),
    })
    .where(eq(person.id, personId));

  // Also sync stage & neighbourhood to member table
  const memberRec = await db.query.member.findFirst({
    where: eq(member.personId, personId),
  });
  if (memberRec) {
    const stageStr = Array.isArray(formData.stages) ? formData.stages.join(", ") : formData.stages || null;
    await db
      .update(member)
      .set({
        stage: stageStr,
        neighbourhood: formData.neighbourhood || null,
        updatedAt: new Date(),
      })
      .where(eq(member.id, memberRec.id));
  }

  return { success: true };
}

export async function deleteMyAccountGDPR() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to delete your account.");
  }

  const personId = (session.user as any).personId || session.user.id;

  try {
    const personRecord = await db.query.person.findFirst({
      where: eq(person.id, personId),
    });
    const personName = `${personRecord?.firstName || "A mother"} ${personRecord?.lastName || ""}`.trim() || "A mother in Barcelona";
    const originalEmail = personRecord?.email || "";

    // 1. Cancel Stripe subscription if any (§M-04)
    const memberRecord = await db.query.member.findFirst({
      where: eq(member.personId, personId),
    });

    const hadActiveSub = !!memberRecord?.stripeSubscriptionId || memberRecord?.status === "active";

    if (memberRecord?.stripeSubscriptionId) {
      try {
        const { stripe } = await import("@/lib/stripe");
        await stripe.subscriptions.cancel(memberRecord.stripeSubscriptionId);
      } catch (stripeErr) {
        console.warn("[GDPR Delete] Stripe subscription cancel warning:", stripeErr);
      }
    }

    // 2. Free / cancel future bookings
    const futureBookings = await db
      .select({
        id: booking.id,
        eventTitle: event.title,
        startsAt: event.startsAt,
        capacityMember: event.capacityMember,
      })
      .from(booking)
      .innerJoin(event, eq(booking.eventId, event.id))
      .where(
        and(
          eq(booking.personId, personId),
          sql`${booking.status} IN ('held', 'confirmed')`,
          sql`${event.startsAt} > NOW()`
        )
      );

    for (const b of futureBookings) {
      await db
        .update(booking)
        .set({
          status: "released",
          releaseReason: "account_deleted",
          releasedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(booking.id, b.id));
    }

    // 3. Remove waitlist entries
    await db.delete(eventWaitlist).where(eq(eventWaitlist.personId, personId));

    // 3b. Remove saved posts entries (§C-23, GDPR)
    await db.delete(circleSavedPost).where(eq(circleSavedPost.personId, personId));

    // 3c. Fetch and zero out remaining credits (no refund)
    const creditBatches = await db
      .select({ id: creditBatch.id, remaining: creditBatch.remaining })
      .from(creditBatch)
      .where(and(eq(creditBatch.personId, personId), sql`${creditBatch.remaining} > 0`));
    const totalRemainingCredits = creditBatches.reduce((sum, b) => sum + (b.remaining || 0), 0);
    if (creditBatches.length > 0) {
      await db
        .update(creditBatch)
        .set({ remaining: 0, updatedAt: new Date() })
        .where(and(eq(creditBatch.personId, personId), sql`${creditBatch.remaining} > 0`));
    }

    // 4. Anonymize circle posts and delete attached photos
    await db
      .update(circlePost)
      .set({
        isAnonymous: true,
        anonymousArea: "Barcelona",
        photos: [],
        updatedAt: new Date(),
      })
      .where(eq(circlePost.personId, personId));

    // 5. Anonymize circle replies
    await db
      .update(circleReply)
      .set({
        isAnonymous: true,
        anonymousArea: "Barcelona",
        updatedAt: new Date(),
      })
      .where(eq(circleReply.personId, personId));

    // 6a. Send confirmation email to her BEFORE her email is scrubbed
    try {
      const { sendAccountDeletionConfirmationEmail } = await import("@/lib/brevo");
      await sendAccountDeletionConfirmationEmail({
        personId,
        email: originalEmail,
        firstName: personRecord?.firstName || "there",
        releasedBookingTitles: futureBookings.map((fb) => fb.eventTitle || "Event"),
        remainingCredits: totalRemainingCredits,
        hadActiveSub,
      });
    } catch (emailErr) {
      console.warn("[GDPR Delete] Confirmation email to member warning:", emailErr);
    }

    // 6b. Scrub personal details & email per GDPR
    const scrubbedEmail = `deleted-${personId.slice(0, 8)}@invalid.the-mothers.internal`;
    await db
      .update(person)
      .set({
        firstName: "Deleted",
        lastName: "Mother",
        email: scrubbedEmail,
        phoneE164: null,
        whatsappE164: null,
        godmotherCode: null,
        profileData: null,
        profileDone: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(person.id, personId));

    if (memberRecord) {
      await db
        .update(member)
        .set({
          status: "cancelled_at_period_end",
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        })
        .where(eq(member.id, memberRecord.id));
    }

    // 7. Activity log entry
    const parts = [`${personName} deleted her own account`];
    if (futureBookings.length > 0) {
      parts.push(`${futureBookings.length} future booking${futureBookings.length > 1 ? "s" : ""} released`);
    }
    if (hadActiveSub) {
      parts.push("membership cancelled");
    }
    const summaryText = parts.join(" · ");

    await db.insert(auditLog).values({
      actorId: personId,
      actorType: "member",
      action: "self_delete_account",
      entity: "person",
      entityId: personId,
      before: {
        name: personName,
        email: originalEmail,
        hadActiveSub,
        futureBookingsCount: futureBookings.length,
      },
      after: {
        summary: summaryText,
        releasedBookings: futureBookings.length,
        subCancelled: hadActiveSub,
      },
    });

    // 8. Team email alert if future bookings released or active subscription
    if (futureBookings.length > 0 || hadActiveSub) {
      const formattedBookings = futureBookings.map((fb) => ({
        title: fb.eventTitle || "Event",
        date: fb.startsAt
          ? new Date(fb.startsAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
          : "",
      }));

      try {
        const { sendAccountDeletionAlertEmail } = await import("@/lib/brevo");
        await sendAccountDeletionAlertEmail({
          name: personName,
          futureBookings: formattedBookings,
          hadActiveSub,
        });
      } catch (emailErr) {
        console.warn("[GDPR Delete] Email dispatch warning:", emailErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("deleteMyAccountGDPR error:", err);
    throw new Error(err?.message || "Account deletion failed");
  }
}

export async function updateProfileDetails(formData: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  stage?: string;
  neighbourhood?: string;
  childrenAges?: string;
  profileDone?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "AUTH_REQUIRED" };
  }
  const personId = (session.user as any).personId || session.user.id;

  const existingPerson = await db.query.person.findFirst({
    where: eq(person.id, personId),
  });

  const existingProfileData = existingPerson?.profileData || {};
  const mergedProfileData = {
    ...existingProfileData,
    ...(formData.stage !== undefined ? { stages: formData.stage ? [formData.stage] : [] } : {}),
    ...(formData.neighbourhood !== undefined ? { neighbourhood: formData.neighbourhood } : {}),
    ...(formData.childrenAges !== undefined ? { why: formData.childrenAges } : {}),
  };

  await db
    .update(person)
    .set({
      ...(formData.firstName ? { firstName: formData.firstName } : {}),
      ...(formData.lastName ? { lastName: formData.lastName } : {}),
      ...(formData.phone ? { phoneE164: formData.phone } : {}),
      profileDone: true,
      profileData: mergedProfileData,
      updatedAt: new Date(),
    })
    .where(eq(person.id, personId));

  return { success: true };
}

