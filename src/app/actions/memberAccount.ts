"use server";

import { db } from "@/db";
import { member, person, creditEntry, creditBatch, circlePost, circleReply, booking, event, eventCategory, eventPass, partner, partnerPerk, perkCodePool, perkReveal, eventWaitlist } from "@/db/schema";
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

    if (!memberRecord || !memberId) {
      return { success: false, error: "MEMBER_NOT_FOUND" };
    }

    // Parallelize independent sub-queries for maximum performance
    const [creditRows, ledger, upcomingBookings, godmotherStats, activePartners, creditBatches, activeWaitlists] = await Promise.all([
      db
        .select({
          total: sql<number>`COALESCE(SUM(amount), 0)`,
        })
        .from(creditEntry)
        .where(eq(creditEntry.memberId, memberId)),
      db
        .select({
          id: creditEntry.id,
          amount: creditEntry.amount,
          type: creditEntry.type,
          reason: creditEntry.reason,
          expiresAt: creditEntry.expiresAt,
          createdAt: creditEntry.createdAt,
        })
        .from(creditEntry)
        .where(eq(creditEntry.memberId, memberId))
        .orderBy(asc(creditEntry.createdAt)),
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
            eq(booking.memberId, memberId),
            sql`${event.startsAt} > NOW()`,
            sql`${booking.status} IN ('held', 'confirmed')`
          )
        )
        .orderBy(asc(event.startsAt))
        .limit(10),
      db
        .select({
          totalCreditsEarned: sql<number>`COALESCE(SUM(CASE WHEN type IN ('godmother', 'godmother_bonus', 'referral') OR (type = 'grant' AND source_type = 'referral') OR (type = 'adjustment' AND source_type = 'godmother') THEN amount ELSE 0 END), 0)`,
        })
        .from(creditEntry)
        .where(eq(creditEntry.memberId, memberId)),
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

    const currentBalance = Number(creditRows[0]?.total || 0);

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

    const safeWaitlists = (activeWaitlists || []).map((w: any) => ({
      ...w,
      startsAt: w.startsAt ? new Date(w.startsAt).toISOString() : null,
      offeredAt: w.offeredAt ? new Date(w.offeredAt).toISOString() : null,
      offerExpiresAt: w.offerExpiresAt ? new Date(w.offerExpiresAt).toISOString() : null,
    }));

    return {
      success: true,
      member: {
        id: memberRecord.id,
        firstName: personRecord?.firstName || "",
        lastName: personRecord?.lastName || "",
        email: personRecord?.email || userEmail || "",
        phone: personRecord?.phoneE164 || "",
        status: memberRecord.status || "active",
        stage: memberRecord.stage || "",
        neighbourhood: memberRecord.neighbourhood || "",
        monthlyPriceCents: memberRecord.monthlyPriceCents || 0,
        joiningFeePaidCents: memberRecord.joiningFeePaidCents || 0,
        pausedUntil: memberRecord.pausedUntil ? new Date(memberRecord.pausedUntil).toISOString() : null,
        cancelAtPeriodEnd: !!memberRecord.cancelAtPeriodEnd,
        currentPeriodEnd: memberRecord.currentPeriodEnd ? new Date(memberRecord.currentPeriodEnd).toISOString() : null,
        createdBeforeLaunch: !!personRecord?.createdBeforeLaunch,
      },
      credits: {
        available: Math.max(0, currentBalance),
        ledger: ledger || [],
        batches: safeBatches,
      },
      bookings: safeBookings,
      waitlists: safeWaitlists,
      godmother: {
        totalCreditsEarned: Number(godmotherStats[0]?.totalCreditsEarned || 0),
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

export async function pauseMembership() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };
  const memberId = (session.user as any).memberId;
  if (!memberId) return { success: false, error: "NOT_A_MEMBER" };

  try {
    const memberRecord = await db.query.member.findFirst({ where: eq(member.id, memberId) });
    if (!memberRecord) return { success: false, error: "MEMBER_NOT_FOUND" };
    if (memberRecord.status === "paused" || (memberRecord.pausedUntil && new Date(memberRecord.pausedUntil) > new Date())) {
      return { success: false, error: "ALREADY_PAUSED" };
    }
    const usedMonths = memberRecord.pauseMonthsUsedYear ?? 0;
    if (usedMonths >= 2) {
      return { success: false, error: "PAUSE_LIMIT_REACHED" };
    }
    
    // Pause for up to 2 months
    const pausedUntil = new Date();
    pausedUntil.setMonth(pausedUntil.getMonth() + 2);

    if (memberRecord.stripeSubscriptionId) {
      try {
        const { stripe } = await import("@/lib/stripe");
        await stripe.subscriptions.update(memberRecord.stripeSubscriptionId, {
          pause_collection: {
            behavior: "void",
            resumes_at: Math.floor(pausedUntil.getTime() / 1000),
          },
        });
      } catch (stripeErr) {
        console.warn("Stripe pause_collection warning:", stripeErr);
      }
    }
    
    await db.update(member)
      .set({ 
        status: "paused",
        pausedUntil, 
        pauseMonthsUsedYear: usedMonths + 2,
        updatedAt: new Date() 
      })
      .where(eq(member.id, memberId));
      
    return { success: true, pausedUntil };
  } catch (e: any) {
    return { success: false, error: e?.message || "PAUSE_FAILED" };
  }
}

export async function resumeMembership() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };
  const memberId = (session.user as any).memberId;
  if (!memberId) return { success: false, error: "NOT_A_MEMBER" };

  try {
    const memberRecord = await db.query.member.findFirst({ where: eq(member.id, memberId) });
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

    await db.update(member)
      .set({
        status: "active",
        pausedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(member.id, memberId));

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
  const memberId = (session.user as any).memberId;
  if (!memberId) return { success: false, error: "NOT_A_MEMBER" };

  try {
    const memberRecord = await db.query.member.findFirst({ where: eq(member.id, memberId) });
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
      .where(eq(member.id, memberId));

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
  const memberId = (session.user as any).memberId;
  if (!memberId) return { success: false, error: "NOT_A_MEMBER" };

  try {
    const memberRecord = await db.query.member.findFirst({ where: eq(member.id, memberId) });
    if (!memberRecord) return { success: false, error: "MEMBER_NOT_FOUND" };
    if (!memberRecord.cancelAtPeriodEnd && memberRecord.status === "active") {
      return { success: false, error: "ALREADY_ACTIVE" };
    }

    if (memberRecord.stripeSubscriptionId) {
      try {
        const { stripe } = await import("@/lib/stripe");
        await stripe.subscriptions.update(memberRecord.stripeSubscriptionId, {
          cancel_at_period_end: false,
        });
      } catch (stripeErr) {
        console.warn("Stripe reactivate warning:", stripeErr);
      }
    }

    await db.update(member)
      .set({
        cancelAtPeriodEnd: false,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(member.id, memberId));

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "REACTIVATE_FAILED" };
  }
}

export async function getStripePortalUrl() {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };
  const memberId = (session.user as any).memberId;
  if (!memberId) return { success: false, error: "NOT_A_MEMBER" };

  try {
    const memberRecord = await db.query.member.findFirst({
      where: eq(member.id, memberId),
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

  const memberId = (session.user as any).memberId;
  if (!memberId) return { success: false, error: "MEMBER_REQUIRED" };

  try {
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


// Lightweight credit-balance fetch used by the Navigation bar
export async function getMyCredits(): Promise<{ balance: number }> {
  try {
    const session = await auth();
    if (!session?.user) return { balance: 0 };

    let memberId = (session.user as any).memberId;

    // Fall back to look-up by personId or email if memberId isn't on the session token
    if (!memberId) {
      const personId = (session.user as any).personId || session.user.id;
      let personRec = personId
        ? await db.query.person.findFirst({ where: eq(person.id, personId) })
        : null;
      if (!personRec && session.user.email) {
        personRec = await db.query.person.findFirst({
          where: eq(person.email, session.user.email.toLowerCase().trim()),
        });
      }
      if (personRec) {
        const memberRec = await db.query.member.findFirst({
          where: eq(member.personId, personRec.id),
        });
        memberId = memberRec?.id;
      }
    }

    if (!memberId) return { balance: 0 };

    const rows = await db
      .select({ total: sql<number>`COALESCE(SUM(${creditEntry.amount}), 0)` })
      .from(creditEntry)
      .where(eq(creditEntry.memberId, memberId));

    return { balance: Number(rows[0]?.total ?? 0) };
  } catch {
    return { balance: 0 };
  }
}

export async function deleteMyAccountGDPR() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to delete your account.");
  }

  const personId = session.user.id;

  // 1. Anonymize circle posts and delete attached photos
  await db
    .update(circlePost)
    .set({
      isAnonymous: true,
      anonymousArea: "Barcelona",
      photos: [],
      updatedAt: new Date(),
    })
    .where(eq(circlePost.personId, personId));

  // 2. Anonymize circle replies
  await db
    .update(circleReply)
    .set({
      isAnonymous: true,
      anonymousArea: "Barcelona",
      updatedAt: new Date(),
    })
    .where(eq(circleReply.personId, personId));

  // 3. Mark person as deleted (soft delete with deletedAt, scrub personal details)
  await db
    .update(person)
    .set({
      firstName: "Deleted",
      lastName: "Mother",
      phoneE164: null,
      whatsappE164: null,
      deletedAt: new Date(),
    })
    .where(eq(person.id, personId));

  return { success: true };
}

