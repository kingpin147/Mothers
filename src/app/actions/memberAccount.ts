"use server";

import { db } from "@/db";
import { member, person, creditEntry, booking, event, eventCategory, eventPass, partner, partnerPerk, perkCodePool, perkReveal } from "@/db/schema";
import { eq, desc, and, sql, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function getAccountData() {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "AUTH_REQUIRED" };
  }

  const userEmail = session.user.email?.toLowerCase().trim();
  let personId = (session.user as any).personId || session.user.id;
  let memberId = (session.user as any).memberId;

  try {
    let personRecord = null;
    let memberRecord = null;

    if (memberId) {
      memberRecord = await db.query.member.findFirst({
        where: eq(member.id, memberId),
      });
    }

    if (!memberRecord && personId) {
      memberRecord = await db.query.member.findFirst({
        where: eq(member.personId, personId),
      });
      if (memberRecord) memberId = memberRecord.id;
    }

    if (!memberRecord && userEmail) {
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

    if (!personRecord && personId) {
      personRecord = await db.query.person.findFirst({
        where: eq(person.id, personId),
      });
    }

    if (!memberRecord || !memberId) {
      return { success: false, error: "MEMBER_NOT_FOUND" };
    }

    // Fetch current credit balance (sum of all entries)
    const creditRows = await db
      .select({
        total: sql<number>`COALESCE(SUM(amount), 0)`,
      })
      .from(creditEntry)
      .where(eq(creditEntry.memberId, memberId));

    const currentBalance = Number(creditRows[0]?.total || 0);

    // Fetch credit ledger (FIFO ordered, most recent last)
    const ledger = await db
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
      .orderBy(asc(creditEntry.createdAt));

    // Fetch upcoming bookings
    const upcomingBookings = await db
      .select({
        id: booking.id,
        eventId: booking.eventId,
        eventTitle: event.title,
        eventDate: event.startsAt,
        eventLocation: event.neighbourhood,
        status: booking.status,
        creditsCharged: booking.creditsCharged,
      })
      .from(booking)
      .innerJoin(event, eq(booking.eventId, event.id))
      .where(
        and(
          eq(booking.memberId, memberId),
          sql`${event.startsAt} > NOW()`,
          sql`${booking.status} IN ('held', 'confirmed')`
        )
      )
      .orderBy(asc(event.startsAt))
      .limit(5);

    // Fetch godmother referral details
    const godmotherStats = await db
      .select({
        totalCreditsEarned: sql<number>`COALESCE(SUM(CASE WHEN type = 'godmother' THEN amount ELSE 0 END), 0)`,
      })
      .from(creditEntry)
      .where(eq(creditEntry.memberId, memberId));

    // Fetch active partners
    const activePartners = await db
      .select()
      .from(partner)
      .where(eq(partner.status, "active"));

    return {
      success: true,
      member: {
        id: memberRecord.id,
        firstName: personRecord?.firstName || "",
        lastName: personRecord?.lastName || "",
        phone: personRecord?.phoneE164 || "",
        status: memberRecord.status,
        stage: memberRecord.stage,
        neighbourhood: memberRecord.neighbourhood,
        monthlyPriceCents: memberRecord.monthlyPriceCents,
        joiningFeePaidCents: memberRecord.joiningFeePaidCents,
        pausedUntil: memberRecord.pausedUntil ? memberRecord.pausedUntil.toISOString() : null,
        cancelAtPeriodEnd: memberRecord.cancelAtPeriodEnd,
        currentPeriodEnd: memberRecord.currentPeriodEnd ? memberRecord.currentPeriodEnd.toISOString() : null,
      },
      credits: {
        available: Math.max(0, currentBalance),
        ledger: ledger,
      },
      bookings: upcomingBookings,
      godmother: {
        totalCreditsEarned: Number(godmotherStats[0]?.totalCreditsEarned || 0),
      },
      partners: activePartners,
    };
  } catch (error: any) {
    console.error("getAccountData error:", error);
    return { success: false, error: error?.message || "ACCOUNT_LOAD_FAILED" };
  }
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

export async function updatePersonDetails(data: { firstName: string; lastName: string; phone?: string; stage?: string; neighbourhood?: string }) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };
  const personId = (session.user as any).personId || session.user.id;
  const memberId = (session.user as any).memberId;
  try {
    await db.update(person)
      .set({ firstName: data.firstName, lastName: data.lastName, phoneE164: data.phone || null, updatedAt: new Date() })
      .where(eq(person.id, personId));
    if (memberId && data.stage !== undefined) {
      await db.update(member)
        .set({ stage: data.stage, neighbourhood: data.neighbourhood || null, updatedAt: new Date() })
        .where(eq(member.id, memberId));
    }
    return { success: true };
  } catch (e: any) {
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
      return_url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/account`,
    });

    return { success: true, url: portalSession.url };
  } catch (e: any) {
    console.error("getStripePortalUrl error:", e);
    return { success: false, error: e?.message || "PORTAL_CREATION_FAILED" };
  }
}

// ─── 4. REVEAL PERK CODE (SERVER-SIDE TRACKED §12) ──────────────────────────

export async function revealPerkCode(perkId: string) {
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
