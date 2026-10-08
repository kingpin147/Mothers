"use server";

import { db } from "@/db";
import {
  member,
  person,
  payment,
  creditBatch,
  partner,
  partnerPerk,
  perkCodePool,
  perkReveal,
  partnerApplication,
  partnerUmbrella,
  partnerSpecialty,
  internalNote,
  subscriber,
  adminUser,
  faqItem,
  journalPost,
  mediaAsset,
  booking,
  event,
  auditLog,
  godmotherReferral,
  emailLog,
  circlePost,
  circleReply,
} from "@/db/schema";
import { eq, desc, and, or, sql, ne, asc, gt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sanitizeErrorMessage } from "@/lib/errors";
import {
  grantCreditsToPerson,
  spendPersonCreditsFIFO,
  getPersonWalletBalance,
} from "@/lib/ledger";

const adjustCreditsSchema = z.object({
  memberId: z.string().trim().min(1, "MEMBER_ID_REQUIRED"),
  amount: z.number().int(),
  reason: z.string().trim().min(1, "REASON_REQUIRED"),
});

const savePartnerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Partner name is required"),
  umbrella: z.string().trim().min(1, "Umbrella category is required"),
  specialty: z.string().trim().min(1, "Specialty is required"),
  description: z.string().optional(),
  offerForMembers: z.string().trim().min(1, "Offer for members is required"),
  discountCode: z.string().optional(),
  exclusive: z.boolean().optional(),
  status: z.string().optional(),
  forceOverrideConflict: z.boolean().optional(),
});

const savePerkSchema = z.object({
  id: z.string().optional(),
  partnerId: z.string().trim().min(1, "Partner ID is required"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  perkType: z.string().trim().min(1, "Perk type is required"),
  terms: z.string().optional(),
  discountCode: z.string().optional(),
  linkUrl: z.string().optional(),
  validUntil: z.date().optional(),
  active: z.boolean().optional(),
});

const saveFaqSchema = z.object({
  id: z.string().optional(),
  groupName: z.string().optional(),
  category: z.string().optional(),
  questionEn: z.string().trim().min(1, "Question (EN) is required"),
  answerEn: z.string().trim().min(1, "Answer (EN) is required"),
  questionEs: z.string().optional(),
  answerEs: z.string().optional(),
  questionFr: z.string().optional(),
  answerFr: z.string().optional(),
  sortOrder: z.number().int().optional(),
  active: z.boolean().optional(),
  policyQuote: z.string().optional(),
});

const saveJournalPostSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Title is required"),
  titleEs: z.string().optional(),
  titleFr: z.string().optional(),
  slug: z.string().optional(),
  category: z.string().optional(),
  excerpt: z.string().trim().min(1, "Excerpt is required"),
  excerptEs: z.string().optional(),
  excerptFr: z.string().optional(),
  body: z.string().trim().min(1, "Body is required"),
  bodyEs: z.string().optional(),
  bodyFr: z.string().optional(),
  quoteEn: z.string().optional(),
  quoteEs: z.string().optional(),
  quoteFr: z.string().optional(),
  author: z.string().optional(),
  authorRoleEn: z.string().optional(),
  authorRoleEs: z.string().optional(),
  authorRoleFr: z.string().optional(),
  bylineEn: z.string().optional(),
  bylineEs: z.string().optional(),
  bylineFr: z.string().optional(),
  reviewedNoteEn: z.string().optional(),
  reviewedNoteEs: z.string().optional(),
  reviewedNoteFr: z.string().optional(),
  heroImageId: z.string().nullable().optional(),
  heroImageUrl: z.string().nullable().optional(),
  status: z.string().optional(),
  published: z.boolean().optional(),
  publishedAt: z.date().nullable().optional(),
  audience: z.string().optional(),
  seoTitle: z.string().optional(),
  seoTitleEs: z.string().optional(),
  seoTitleFr: z.string().optional(),
  seoDescription: z.string().optional(),
  seoDescriptionEs: z.string().optional(),
  seoDescriptionFr: z.string().optional(),
  notifySubscribers: z.boolean().optional(),
});

const saveInternalNoteSchema = z.object({
  entityType: z.string().trim().min(1),
  entityId: z.string().trim().min(1),
  body: z.string().trim().min(1, "Body is required"),
});

const createSubscriberSchema = z.object({
  name: z.string().optional(),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  list: z.string().optional(),
  source: z.string().optional(),
});

async function verifyAdminRole() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "host", "super_admin"];
  if (!role || !allowed.includes(role)) {
    throw new Error("UNAUTHORIZED_ADMIN");
  }
  return { adminId: session?.user?.id, role };
}

// ─── 1. MEMBERS & AT-RISK MANAGEMENT (§19, §20.7) ───────────────────────────

export async function getAdminMembers() {
  try {
    await verifyAdminRole();

    const members = await db
      .select({
        id: member.id,
        personId: member.personId,
        status: member.status,
        stage: sql<string>`COALESCE(
          NULLIF(${member.stage}, ''),
          CASE 
            WHEN jsonb_typeof(${person.profileData}->'stages') = 'array' 
            THEN (SELECT string_agg(elem, ', ') FROM jsonb_array_elements_text(${person.profileData}->'stages') AS elem)
            ELSE ${person.profileData}->>'stages'
          END,
          'Not given'
        )`.as('stage'),
        neighbourhood: sql<string>`COALESCE(
          NULLIF(${member.neighbourhood}, ''),
          ${person.profileData}->>'neighbourhood',
          'Not given'
        )`.as('neighbourhood'),
        children: member.children,
        joinedAt: member.joinedAt,
        createdAt: person.createdAt,
        monthlyPriceCents: member.monthlyPriceCents,
        currentPeriodEnd: member.currentPeriodEnd,
        cancelAtPeriodEnd: member.cancelAtPeriodEnd,
        atRiskSince: member.atRiskSince,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        credits: sql<number>`(SELECT COALESCE(SUM(remaining), 0) FROM ${creditBatch} WHERE person_id = ${member.personId} AND remaining > 0 AND expires_at > NOW())::int`.as('credits'),
        attended: sql<number>`(SELECT COUNT(*)::int FROM ${booking} b INNER JOIN ${event} e ON b.event_id = e.id WHERE b.person_id = ${person.id} AND b.status = 'attended' AND e.starts_at >= NOW() - INTERVAL '90 days')`.as('attended'),
        bookedCount: sql<number>`(SELECT COUNT(*)::int FROM ${booking} b WHERE b.person_id = ${person.id} AND b.status IN ('held', 'confirmed', 'attended'))`.as('booked_count'),
        lastSeenDate: sql<Date>`(SELECT MAX(e.starts_at) FROM ${booking} b INNER JOIN ${event} e ON b.event_id = e.id WHERE b.person_id = ${person.id} AND b.status = 'attended')`.as('last_seen_date'),
      })
      .from(member)
      .innerJoin(person, eq(member.personId, person.id))
      .where(sql`${person.deletedAt} IS NULL`)
      .orderBy(desc(sql`COALESCE(${member.joinedAt}, ${person.createdAt})`));

    return { success: true, members };
  } catch (err: any) {
    console.error("getAdminMembers error:", err?.message || err);
    return { success: false, error: sanitizeErrorMessage(err, "UNAUTHORIZED_ADMIN"), members: [] };
  }
}

export async function adjustMemberCredits(rawData: {
  memberId: string;
  amount: number; // positive or negative
  reason: string; // mandatory reason code (§5)
}) {
  const parsed = adjustCreditsSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "INVALID_INPUT" };
  }
  const data = parsed.data;

  const { adminId } = await verifyAdminRole();
  if (!data.reason || !data.reason.trim()) {
    return { success: false, error: "REASON_REQUIRED" };
  }

  const mem = await db.query.member.findFirst({ where: eq(member.id, data.memberId) });
  if (!mem) return { success: false, error: "MEMBER_NOT_FOUND" };

  await db.transaction(async (tx) => {
    if (data.amount > 0) {
      await grantCreditsToPerson(mem.personId, data.amount, "admin_adjustment", 6, tx);
    } else if (data.amount < 0) {
      await spendPersonCreditsFIFO(mem.personId, Math.abs(data.amount), tx);
    }

    await tx.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "adjust_credits",
      entity: "credit_batch",
      entityId: data.memberId,
      after: { memberId: data.memberId, amount: data.amount, reason: data.reason },
    });
  });

  return { success: true };
}

export async function getAdminMemberDetail(memberId: string) {
  await verifyAdminRole();

  // 1. Core Profile
  let memberData = await db
    .select({
      id: member.id,
      personId: member.personId,
      status: member.status,
      stage: member.stage,
      neighbourhood: member.neighbourhood,
      joinedAt: member.joinedAt,
      createdAt: person.createdAt,
      monthlyPriceCents: member.monthlyPriceCents,
      currentPeriodEnd: member.currentPeriodEnd,
      cancelAtPeriodEnd: member.cancelAtPeriodEnd,
      atRiskSince: member.atRiskSince,
      pauseMonthsUsedYear: member.pauseMonthsUsedYear,
      priceLockedUntil: member.priceLockedUntil,
      children: member.children,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phoneE164,
      languages: person.locale,
      isSuspended: person.isSuspended,
      suspendedReason: person.suspendedReason,
      createdBeforeLaunch: person.createdBeforeLaunch,
      godmotherCode: person.godmotherCode,
    })
    .from(member)
    .innerJoin(person, eq(member.personId, person.id))
    .where(or(eq(member.id, memberId), eq(member.personId, memberId)))
    .limit(1)
    .then(res => res[0]);

  let targetPersonId = memberData?.personId || memberId;

  if (!memberData) {
    const personRec = await db.query.person.findFirst({
      where: eq(person.id, memberId),
    });
    if (personRec) {
      targetPersonId = personRec.id;
      memberData = {
        id: personRec.id,
        personId: personRec.id,
        status: (personRec.isSuspended ? "banned" : personRec.isPaused ? "paused" : "applicant") as any,
        stage: "Pre-launch account",
        neighbourhood: "Barcelona",
        joinedAt: personRec.createdAt,
        createdAt: personRec.createdAt,
        monthlyPriceCents: 0,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        atRiskSince: null,
        pauseMonthsUsedYear: 0,
        priceLockedUntil: null,
        children: null,
        firstName: personRec.firstName,
        lastName: personRec.lastName,
        email: personRec.email,
        phone: personRec.phoneE164,
        languages: personRec.locale,
        isSuspended: personRec.isSuspended,
        suspendedReason: personRec.suspendedReason,
        createdBeforeLaunch: personRec.createdBeforeLaunch !== false,
        godmotherCode: personRec.godmotherCode,
      };
    }
  }

  if (!memberData) {
    return { success: false, error: "MEMBER_NOT_FOUND" };
  }

  if (!memberData.godmotherCode && targetPersonId) {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const namePrefix = (memberData.firstName || "MEMBER").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4).padEnd(4, "X");
    const generatedCode = `MOTHERS-${namePrefix}${randomSuffix}-BCN`;
    try {
      await db.update(person).set({ godmotherCode: generatedCode }).where(eq(person.id, targetPersonId));
      memberData.godmotherCode = generatedCode;
    } catch (err) {
      console.warn("Could not persist godmother code for admin member:", err);
    }
  }

  // 2. Fetch Batches, Booking Spends, Godmother Stats, Attendance, Contact History concurrently
  const [batches, bookingSpends, godmotherStats, attendance, contactHistory, totalBalance] = await Promise.all([
    // Credit Batches
    db
      .select()
      .from(creditBatch)
      .where(eq(creditBatch.personId, memberData.personId))
      .orderBy(desc(creditBatch.createdAt)),

    // Booking Spends
    db
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
          eq(booking.personId, memberData.personId),
          sql`${booking.creditsCharged} > 0`
        )
      )
      .orderBy(desc(booking.bookedAt)),

    // Godmother Referral Stats
    db
      .select()
      .from(godmotherReferral)
      .where(eq(godmotherReferral.referrerMemberId, memberId)),

    // Attendance History
    db
      .select({
        id: booking.id,
        status: booking.status,
        creditsCharged: booking.creditsCharged,
        bookedAt: booking.bookedAt,
        releasedAt: booking.releasedAt,
        eventTitle: event.title,
        eventStartsAt: event.startsAt,
        isFreeWalk: event.isFreeWalk,
      })
      .from(booking)
      .innerJoin(event, eq(booking.eventId, event.id))
      .where(eq(booking.memberId, memberId))
      .orderBy(desc(event.startsAt)),

    // Contact History (Emails)
    db
      .select({
        id: emailLog.id,
        templateKey: emailLog.templateKey,
        sentAt: emailLog.sentAt,
        status: emailLog.status,
      })
      .from(emailLog)
      .where(eq(emailLog.personId, memberData.personId))
      .orderBy(desc(emailLog.sentAt)),

    // Wallet Total Balance
    getPersonWalletBalance(memberData.personId),
  ]);

  const ledgerEntries = [
    ...batches.map((b) => ({
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
    ...bookingSpends.map((bk) => ({
      id: bk.id,
      amount: -bk.creditsCharged,
      type: "spend",
      reason: `Booking: ${bk.eventTitle}`,
      expiresAt: null,
      createdAt: bk.bookedAt || bk.createdAt,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    success: true,
    member: memberData,
    ledgerEntries,
    totalBalance,
    godmotherStats,
    attendance,
    contactHistory,
  };
}

export async function contactMember(memberId: string, messageText: string) {
  const { adminId } = await verifyAdminRole();
  const m = await db.select({ personId: member.personId }).from(member).where(eq(member.id, memberId)).limit(1).then(r => r[0]);
  if (!m) return { success: false, error: "Member not found" };

  await db.transaction(async (tx) => {
    await tx.insert(emailLog).values({
      personId: m.personId,
      templateKey: "admin_manual_message",
      dedupeKey: `admin_msg_${memberId}_${Date.now()}`,
      payload: { message: messageText },
      status: "sent",
      sentAt: new Date()
    });

    await tx.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "contact_member",
      entity: "member",
      entityId: memberId,
      after: { message: messageText }
    });
  });

  return { success: true };
}

export async function pauseMember(memberId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminId } = await verifyAdminRole();
    await db.transaction(async (tx) => {
      const existing = await tx.select().from(member).where(eq(member.id, memberId)).limit(1);
      if (!existing.length) throw new Error("Member not found");
      const current = existing[0];
      const pausedUntil = new Date();
      pausedUntil.setMonth(pausedUntil.getMonth() + 1);

      await tx.update(member).set({ 
        status: 'paused', 
        pausedUntil,
        pauseMonthsUsedYear: (current.pauseMonthsUsedYear || 0) + 1,
        currentPauseMonths: 1,
        updatedAt: new Date() 
      }).where(eq(member.id, memberId));

      await tx.insert(auditLog).values({
        actorId: adminId,
        actorType: "admin",
        action: "pause_member",
        entity: "member",
        entityId: memberId,
        after: { reason, pausedUntil, status: 'paused' }
      });
    });
    return { success: true };
  } catch (error: any) {
    console.error("pauseMember error:", error);
    return { success: false, error: sanitizeErrorMessage(error, "PAUSE_MEMBER_FAILED") };
  }
}

export async function resumeMember(memberId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminId } = await verifyAdminRole();
    const existing = await db.select().from(member).where(eq(member.id, memberId)).limit(1);
    if (!existing.length) return { success: false, error: "Member not found" };
    const mRec = existing[0];

    if (mRec.stripeSubscriptionId) {
      try {
        const { stripe } = await import("@/lib/stripe");
        await stripe.subscriptions.update(mRec.stripeSubscriptionId, {
          cancel_at_period_end: false,
          pause_collection: "",
        });
      } catch (stripeErr) {
        console.warn("Stripe resume warning:", stripeErr);
      }
    }

    await db.transaction(async (tx) => {
      await tx.update(member).set({ 
        status: 'active', 
        cancelAtPeriodEnd: false,
        pausedUntil: null,
        currentPauseMonths: 0,
        updatedAt: new Date() 
      }).where(eq(member.id, memberId));

      await tx.insert(auditLog).values({
        actorId: adminId,
        actorType: "admin",
        action: "resume_member",
        entity: "member",
        entityId: memberId,
        after: { reason: reason || "Manual resume by admin", status: 'active' }
      });
    });
    return { success: true };
  } catch (error: any) {
    console.error("resumeMember error:", error);
    return { success: false, error: sanitizeErrorMessage(error, "RESUME_MEMBER_FAILED") };
  }
}

export async function cancelMember(memberId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminId } = await verifyAdminRole();
    const existing = await db.select().from(member).where(eq(member.id, memberId)).limit(1);
    if (!existing.length) return { success: false, error: "Member not found" };
    const mRec = existing[0];

    if (mRec.stripeSubscriptionId) {
      try {
        const { stripe } = await import("@/lib/stripe");
        await stripe.subscriptions.update(mRec.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } catch (stripeErr) {
        console.warn("Stripe cancel warning:", stripeErr);
      }
    }

    await db.transaction(async (tx) => {
      await tx.update(member).set({ 
        status: 'cancelled_at_period_end', 
        cancelAtPeriodEnd: true,
        updatedAt: new Date() 
      }).where(eq(member.id, memberId));

      await tx.insert(auditLog).values({
        actorId: adminId,
        actorType: "admin",
        action: "cancel_member",
        entity: "member",
        entityId: memberId,
        after: { reason, status: 'cancelled_at_period_end' }
      });
    });
    return { success: true };
  } catch (error: any) {
    console.error("cancelMember error:", error);
    return { success: false, error: sanitizeErrorMessage(error, "CANCEL_MEMBER_FAILED") };
  }
}


// ─── 2. FINANCE & PAYMENTS MANAGEMENT ───────────────────────────────────────

export async function getAdminFinance() {
  await verifyAdminRole();

  const payments = await db
    .select({
      id: payment.id,
      personId: payment.personId,
      purpose: payment.purpose,
      amountCents: payment.amountCents,
      currency: payment.currency,
      status: payment.status,
      stripeInvoiceId: payment.stripeInvoiceId,
      occurredAt: payment.occurredAt,
      personEmail: person.email,
      personFirstName: person.firstName,
      personLastName: person.lastName,
    })
    .from(payment)
    .innerJoin(person, eq(payment.personId, person.id))
    .orderBy(desc(payment.occurredAt));

  const [batches, bookingSpends] = await Promise.all([
    db
      .select({
        id: creditBatch.id,
        memberId: member.id,
        amount: creditBatch.amount,
        type: creditBatch.source,
        expiresAt: creditBatch.expiresAt,
        sourceType: creditBatch.source,
        sourceId: creditBatch.id,
        reason: sql<string>`CASE 
          WHEN ${creditBatch.source} = 'subscription' THEN 'Monthly subscription grant'
          WHEN ${creditBatch.source} = 'godmother' THEN 'Godmother referral reward'
          WHEN ${creditBatch.source} = 'topup' THEN 'Credit top-up'
          WHEN ${creditBatch.source} = 'refund' THEN 'Event cancellation / release refund'
          WHEN ${creditBatch.source} = 'admin_adjustment' THEN 'Operator adjustment'
          WHEN ${creditBatch.source} = 'purchase' THEN 'Pre-launch credits'
          ELSE ${creditBatch.source}
        END`,
        actorAdminId: sql<string | null>`NULL`,
        createdAt: creditBatch.createdAt,
        personFirstName: person.firstName,
        personLastName: person.lastName,
        personEmail: person.email,
      })
      .from(creditBatch)
      .innerJoin(person, eq(creditBatch.personId, person.id))
      .leftJoin(member, eq(member.personId, person.id))
      .orderBy(desc(creditBatch.createdAt)),
    db
      .select({
        id: booking.id,
        memberId: booking.memberId,
        amount: sql<number>`-${booking.creditsCharged}`,
        type: sql<string>`'event_booking'`,
        expiresAt: sql<Date | null>`NULL`,
        sourceType: sql<string>`'event'`,
        sourceId: booking.eventId,
        reason: sql<string>`CONCAT('Booking: ', ${event.title})`,
        actorAdminId: sql<string | null>`NULL`,
        createdAt: booking.bookedAt,
        personFirstName: person.firstName,
        personLastName: person.lastName,
        personEmail: person.email,
      })
      .from(booking)
      .innerJoin(person, eq(booking.personId, person.id))
      .innerJoin(event, eq(booking.eventId, event.id))
      .where(gt(booking.creditsCharged, 0))
      .orderBy(desc(booking.bookedAt)),
  ]);

  const creditEntries = [...batches, ...bookingSpends].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return { success: true, payments, creditEntries };
}

// ─── 3. PARTNERS DIRECTORY CMS ──────────────────────────────────────────────

export async function getAdminPartners() {
  await verifyAdminRole();

  const partners = await db
    .select()
    .from(partner)
    .orderBy(desc(partner.createdAt));

  return { success: true, partners };
}

export async function savePartner(rawData: {
  id?: string;
  name: string;
  umbrella: string;
  specialty: string;
  description?: string;
  offerForMembers: string;
  discountCode?: string;
  exclusive?: boolean;
  status?: string;
  forceOverrideConflict?: boolean;
}): Promise<{ success: boolean; error?: string; conflict?: boolean; incumbentName?: string; exclusiveUntil?: Date | null }> {
  const parsed = savePartnerSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "INVALID_INPUT" };
  }
  const data = parsed.data;

  try {
    await verifyAdminRole();
    const isExclusive = data.exclusive ?? false;

    // Check exclusivity conflict (§12)
    if (isExclusive && !data.forceOverrideConflict) {
      const activeIncumbent = await db.query.partner.findFirst({
        where: and(
          eq(partner.specialty, data.specialty),
          or(eq(partner.status, "active"), eq(partner.status, "Live"), eq(partner.status, "live")),
          sql`exclusive_until IS NOT NULL AND exclusive_until > NOW()`,
          data.id ? ne(partner.id, data.id) : sql`1=1`
        ),
      });

      if (activeIncumbent) {
        return {
          success: false,
          conflict: true,
          incumbentName: activeIncumbent.name,
          exclusiveUntil: activeIncumbent.exclusiveUntil,
          error: `Exclusivity conflict: "${activeIncumbent.name}" holds exclusivity for ${data.specialty} until ${new Date(activeIncumbent.exclusiveUntil!).toLocaleDateString("en-GB")}.`,
        };
      }
    }

    if (data.id) {
      await db
        .update(partner)
        .set({
          name: data.name,
          umbrella: data.umbrella,
          specialty: data.specialty,
          description: data.description || "Curated club partner",
          offerForMembers: data.offerForMembers,
          discountCode: data.discountCode || null,
          status: data.status || "Live",
          exclusiveFrom: isExclusive ? new Date() : null,
          exclusiveUntil: isExclusive ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
          updatedAt: new Date(),
        })
        .where(eq(partner.id, data.id));
    } else {
      await db.insert(partner).values({
        name: data.name,
        umbrella: data.umbrella,
        specialty: data.specialty,
        description: data.description || "Curated club partner",
        offerForMembers: data.offerForMembers,
        discountCode: data.discountCode || null,
        status: data.status || "Live",
        exclusiveFrom: isExclusive ? new Date() : null,
        exclusiveUntil: isExclusive ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("savePartner error:", error);
    return { success: false, error: sanitizeErrorMessage(error, "SAVE_PARTNER_FAILED") };
  }
}

export async function deletePartner(partnerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdminRole();
    await db.delete(partner).where(eq(partner.id, partnerId));
    return { success: true };
  } catch (error: any) {
    console.error("deletePartner error:", error);
    return { success: false, error: sanitizeErrorMessage(error, "DELETE_PARTNER_FAILED") };
  }
}

// ─── 3b. PARTNER PERKS & CODE POOL CMS (§12) ────────────────────────────────

export async function getPartnerPerks(partnerId: string) {
  await verifyAdminRole();
  const perks = await db
    .select({
      perk: partnerPerk,
      totalCodes: sql<number>`(SELECT count(*)::int FROM ${perkCodePool} WHERE perk_id = ${partnerPerk.id})`.as('total_codes'),
      claimedCodes: sql<number>`(SELECT count(*)::int FROM ${perkCodePool} WHERE perk_id = ${partnerPerk.id} AND claimed_by_member_id IS NOT NULL)`.as('claimed_codes'),
      revealCount: sql<number>`(SELECT count(*)::int FROM ${perkReveal} WHERE perk_id = ${partnerPerk.id})`.as('reveal_count'),
    })
    .from(partnerPerk)
    .where(eq(partnerPerk.partnerId, partnerId))
    .orderBy(asc(partnerPerk.sortOrder));

  return { success: true, perks };
}

export async function savePartnerPerk(rawData: {
  id?: string;
  partnerId: string;
  title: string;
  description: string;
  perkType: string;
  terms?: string;
  discountCode?: string;
  linkUrl?: string;
  validUntil?: Date;
  active?: boolean;
}) {
  const parsed = savePerkSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "INVALID_INPUT" };
  }
  const data = parsed.data;

  try {
    await verifyAdminRole();
    if (data.id) {
      await db
        .update(partnerPerk)
        .set({
          title: data.title,
          description: data.description,
          perkType: data.perkType,
          terms: data.terms || null,
          discountCode: data.discountCode || null,
          linkUrl: data.linkUrl || null,
          validUntil: data.validUntil || null,
          active: data.active ?? true,
          updatedAt: new Date(),
        })
        .where(eq(partnerPerk.id, data.id));
    } else {
      await db.insert(partnerPerk).values({
        partnerId: data.partnerId,
        title: data.title,
        description: data.description,
        perkType: data.perkType,
        terms: data.terms || null,
        discountCode: data.discountCode || null,
        linkUrl: data.linkUrl || null,
        validUntil: data.validUntil || null,
        active: data.active ?? true,
      });
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "SAVE_PERK_FAILED" };
  }
}

export async function uploadPerkCodePool(perkId: string, codes: string[]) {
  try {
    await verifyAdminRole();
    const cleanCodes = Array.from(new Set(codes.map(c => c.trim()).filter(Boolean)));
    for (const code of cleanCodes) {
      await db
        .insert(perkCodePool)
        .values({ perkId, code })
        .onConflictDoNothing();
    }
    return { success: true, count: cleanCodes.length };
  } catch (e: any) {
    return { success: false, error: e?.message || "UPLOAD_CODES_FAILED" };
  }
}

// ─── 3c. PARTNER APPLICATIONS QUEUE (§12, §20) ──────────────────────────────

export async function getPartnerApplications() {
  await verifyAdminRole();
  const applications = await db
    .select()
    .from(partnerApplication)
    .orderBy(desc(partnerApplication.createdAt));

  return { success: true, applications };
}

export async function reviewPartnerApplication(data: {
  id: string;
  status: "accepted" | "declined" | "under_review";
  notesInternal?: string;
}) {
  try {
    const { adminId } = await verifyAdminRole();
    await db
      .update(partnerApplication)
      .set({
        status: data.status,
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        notesInternal: data.notesInternal || null,
        updatedAt: new Date(),
      })
      .where(eq(partnerApplication.id, data.id));

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "REVIEW_FAILED" };
  }
}

// ─── 3d. INTERNAL NOTES (§20) ────────────────────────────────────────────────

export async function getInternalNotes(entityType: string, entityId: string) {
  await verifyAdminRole();
  const notes = await db
    .select()
    .from(internalNote)
    .where(and(eq(internalNote.entityType, entityType), eq(internalNote.entityId, entityId)))
    .orderBy(desc(internalNote.createdAt));

  return { success: true, notes };
}

export async function saveInternalNote(rawData: {
  entityType: string;
  entityId: string;
  body: string;
}) {
  const parsed = saveInternalNoteSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "INVALID_INPUT" };
  }
  const data = parsed.data;

  try {
    const { adminId } = await verifyAdminRole();
    const author = adminId ? await db.query.adminUser.findFirst({ where: eq(adminUser.id, adminId) }) : null;
    await db.insert(internalNote).values({
      entityType: data.entityType,
      entityId: data.entityId,
      authorAdminId: adminId,
      authorName: author?.email || "Admin",
      body: data.body,
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "SAVE_NOTE_FAILED" };
  }
}

// ─── 3e. THE LETTER (SUBSCRIBERS CMS §13) ───────────────────────────────────

export async function getSubscribersList(listType: string = "letter") {
  await verifyAdminRole();
  const whereClause = listType === "all" ? undefined : eq(subscriber.list, listType);
  const subscribers = await db
    .select()
    .from(subscriber)
    .where(whereClause)
    .orderBy(desc(subscriber.createdAt));

  return { success: true, subscribers };
}

export async function createSubscriber(rawData: {
  name?: string;
  email: string;
  list?: string;
  source?: string;
}) {
  const parsed = createSubscriberSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "INVALID_INPUT" };
  }
  const data = parsed.data;

  try {
    await verifyAdminRole();
    const cleanEmail = data.email.toLowerCase().trim();
    const targetList = data.list || "letter";

    const existing = await db.query.subscriber.findFirst({
      where: and(eq(subscriber.email, cleanEmail), eq(subscriber.list, targetList)),
    });
    if (existing) {
      return { success: false, error: "This email is already subscribed to this list." };
    }

    await db
      .insert(subscriber)
      .values({
        name: data.name || null,
        email: cleanEmail,
        list: targetList,
        source: data.source || "admin_manual",
        marketingConsent: true,
        marketingConsentAt: new Date(),
      });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "SUBSCRIBE_FAILED" };
  }
}

export async function deleteSubscriber(id: string) {
  try {
    await verifyAdminRole();
    await db.delete(subscriber).where(eq(subscriber.id, id));
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "DELETE_SUBSCRIBER_FAILED" };
  }
}

// ─── 3f. GODMOTHER LEADERBOARD & REWARDS QUEUE (§13) ─────────────────────────

export async function getGodmotherLeaderboard() {
  await verifyAdminRole();
  const referrals = await db
    .select({
      referralId: godmotherReferral.id,
      referrerMemberId: godmotherReferral.referrerMemberId,
      referrerName: sql<string>`concat(${person.firstName}, ' ', ${person.lastName})`,
      referrerEmail: person.email,
      code: godmotherReferral.code,
      status: godmotherReferral.status,
      qualifiedAt: godmotherReferral.qualifiedAt,
      createdAt: godmotherReferral.createdAt,
      referredPersonName: sql<string>`(SELECT concat(first_name, ' ', last_name) FROM person WHERE id = ${godmotherReferral.referredPersonId})`,
    })
    .from(godmotherReferral)
    .innerJoin(member, eq(godmotherReferral.referrerMemberId, member.id))
    .innerJoin(person, eq(member.personId, person.id))
    .orderBy(desc(godmotherReferral.createdAt));

  return { success: true, referrals };
}

export async function payoutGodmotherReward(referralId: string) {
  try {
    const { adminId } = await verifyAdminRole();
    const result = await db.transaction(async (tx) => {
      const ref = await tx.query.godmotherReferral.findFirst({
        where: eq(godmotherReferral.id, referralId),
      });
      if (!ref || ref.status === "paid") {
        throw new Error("ALREADY_PAID_OR_NOT_FOUND");
      }

      const referrerMem = await tx.query.member.findFirst({
        where: eq(member.id, ref.referrerMemberId),
      });
      if (!referrerMem) {
        throw new Error("REFERRER_MEMBER_NOT_FOUND");
      }

      const grantRes = await grantCreditsToPerson(
        referrerMem.personId,
        5,
        "godmother",
        null,
        tx
      );

      await tx
        .update(godmotherReferral)
        .set({
          status: "paid",
          payoutCreditBatchId: grantRes.batchId,
          updatedAt: new Date(),
        })
        .where(eq(godmotherReferral.id, referralId));

      await tx.insert(auditLog).values({
        actorId: adminId,
        actorType: "admin",
        action: "payout_godmother_reward",
        entity: "godmother_referral",
        entityId: referralId,
        after: { referralId, batchId: grantRes.batchId, credits: 5 },
      });

      return { batchId: grantRes.batchId };
    });

    return { success: true, ...result };
  } catch (e: any) {
    return { success: false, error: e?.message || "PAYOUT_FAILED" };
  }
}

// ─── 4. FAQ CMS ─────────────────────────────────────────────────────────────

export async function getAdminFaqs() {
  await verifyAdminRole();

  let faqs = await db
    .select()
    .from(faqItem)
    .orderBy(faqItem.sortOrder);

  if (faqs.length === 0) {
    const { CANONICAL_FAQS } = await import("@/lib/faqData");
    const seedValues = CANONICAL_FAQS.map((faq, index) => ({
      groupName: faq.group,
      category: faq.group,
      questionEn: faq.qEn,
      answerEn: faq.aEn,
      questionEs: faq.qEs,
      answerEs: faq.aEs,
      sortOrder: index,
      active: true,
      isPublished: true,
    }));
    await db.insert(faqItem).values(seedValues);
    faqs = await db.select().from(faqItem).orderBy(faqItem.sortOrder);
  }

  return { success: true, faqs };
}

export async function saveFaq(rawData: {
  id?: string;
  groupName?: string;
  category?: string;
  questionEn: string;
  answerEn: string;
  questionEs?: string;
  answerEs?: string;
  questionFr?: string;
  answerFr?: string;
  sortOrder?: number;
  active?: boolean;
  policyQuote?: string;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = saveFaqSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "INVALID_INPUT" };
  }
  const data = parsed.data;

  try {
    await verifyAdminRole();
    const grp = data.groupName || data.category || "Coming to an event now";

    const isActive = data.active !== undefined ? data.active : true;

    if (data.id) {
      await db
        .update(faqItem)
        .set({
          groupName: grp,
          category: grp,
          questionEn: data.questionEn,
          answerEn: data.answerEn,
          questionEs: data.questionEs || "",
          answerEs: data.answerEs || "",
          questionFr: data.questionFr || "",
          answerFr: data.answerFr || "",
          policyQuote: data.policyQuote || null,
          sortOrder: data.sortOrder || 0,
          active: isActive,
          isPublished: isActive,
          updatedAt: new Date(),
        })
        .where(eq(faqItem.id, data.id));
    } else {
      await db.insert(faqItem).values({
        groupName: grp,
        category: grp,
        questionEn: data.questionEn,
        answerEn: data.answerEn,
        questionEs: data.questionEs || "",
        answerEs: data.answerEs || "",
        questionFr: data.questionFr || "",
        answerFr: data.answerFr || "",
        policyQuote: data.policyQuote || null,
        sortOrder: data.sortOrder || 0,
        active: isActive,
        isPublished: isActive,
      });
    }

    revalidatePath("/faq");
    revalidatePath("/admin/faq");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "SAVE_FAQ_FAILED" };
  }
}

export async function toggleFaqActive(id: string, active: boolean) {
  try {
    await verifyAdminRole();
    await db
      .update(faqItem)
      .set({ active, isPublished: active, updatedAt: new Date() })
      .where(eq(faqItem.id, id));
    revalidatePath("/faq");
    revalidatePath("/admin/faq");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "TOGGLE_FAQ_FAILED" };
  }
}

export async function deleteFaq(id: string) {
  try {
    await verifyAdminRole();
    await db.delete(faqItem).where(eq(faqItem.id, id));
    revalidatePath("/faq");
    revalidatePath("/admin/faq");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "DELETE_FAQ_FAILED" };
  }
}

// ─── 5. JOURNAL CMS ─────────────────────────────────────────────────────────

export async function getAdminJournalPosts() {
  await verifyAdminRole();

  const posts = await db
    .select({
      id: journalPost.id,
      title: journalPost.title,
      titleEs: journalPost.titleEs,
      slug: journalPost.slug,
      category: journalPost.category,
      excerpt: journalPost.excerpt,
      excerptEs: journalPost.excerptEs,
      body: journalPost.body,
      bodyEs: journalPost.bodyEs,
      quoteEn: journalPost.quoteEn,
      quoteEs: journalPost.quoteEs,
      author: journalPost.author,
      authorRoleEn: journalPost.authorRoleEn,
      authorRoleEs: journalPost.authorRoleEs,
      bylineEn: journalPost.bylineEn,
      bylineEs: journalPost.bylineEs,
      reviewedNoteEn: journalPost.reviewedNoteEn,
      reviewedNoteEs: journalPost.reviewedNoteEs,
      heroImageId: journalPost.heroImageId,
      heroImageUrl: mediaAsset.publicUrl,
      heroImageAlt: mediaAsset.altText,
      audience: journalPost.audience,
      status: journalPost.status,
      publishedAt: journalPost.publishedAt,
      seoTitle: journalPost.seoTitle,
      seoTitleEs: journalPost.seoTitleEs,
      seoDescription: journalPost.seoDescription,
      seoDescriptionEs: journalPost.seoDescriptionEs,
      views: journalPost.views,
      createdAt: journalPost.createdAt,
      updatedAt: journalPost.updatedAt,
    })
    .from(journalPost)
    .leftJoin(mediaAsset, eq(journalPost.heroImageId, mediaAsset.id))
    .orderBy(desc(journalPost.createdAt));

  return { success: true, posts };
}

export async function saveJournalPost(rawData: {
  id?: string;
  title: string;
  titleEs?: string;
  titleFr?: string;
  slug?: string;
  category?: string;
  excerpt: string;
  excerptEs?: string;
  excerptFr?: string;
  body: string;
  bodyEs?: string;
  bodyFr?: string;
  quoteEn?: string;
  quoteEs?: string;
  quoteFr?: string;
  author?: string;
  authorRoleEn?: string;
  authorRoleEs?: string;
  authorRoleFr?: string;
  bylineEn?: string;
  bylineEs?: string;
  bylineFr?: string;
  reviewedNoteEn?: string;
  reviewedNoteEs?: string;
  reviewedNoteFr?: string;
  heroImageId?: string | null;
  heroImageUrl?: string | null;
  status?: string; // 'published' | 'scheduled' | 'draft' | 'unpublished'
  published?: boolean;
  publishedAt?: Date | null;
  audience?: string; // 'public' | 'members_only'
  seoTitle?: string;
  seoTitleEs?: string;
  seoTitleFr?: string;
  seoDescription?: string;
  seoDescriptionEs?: string;
  seoDescriptionFr?: string;
  notifySubscribers?: boolean;
}): Promise<{ success: boolean; id?: string; error?: string; notifiedCount?: number }> {
  const parsed = saveJournalPostSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "INVALID_INPUT" };
  }
  const data = parsed.data;

  try {
    const { adminId } = await verifyAdminRole();

    const now = new Date();
    let computedStatus = data.status || (data.published ? "published" : "draft");
    let computedPublishedAt = data.publishedAt;

    if (data.published && !data.publishedAt) {
      computedPublishedAt = now;
      computedStatus = "published";
    }

    if (computedPublishedAt && new Date(computedPublishedAt) > now && computedStatus !== "draft" && computedStatus !== "unpublished") {
      computedStatus = "scheduled";
    } else if (computedPublishedAt && new Date(computedPublishedAt) <= now && computedStatus === "scheduled") {
      computedStatus = "published";
    }

    const payload = {
      title: data.title.trim(),
      titleEs: data.titleEs?.trim() || null,
      titleFr: data.titleFr?.trim() || null,
      category: data.category || "postpartum",
      excerpt: data.excerpt.trim(),
      excerptEs: data.excerptEs?.trim() || null,
      excerptFr: data.excerptFr?.trim() || null,
      body: data.body.trim(),
      bodyEs: data.bodyEs?.trim() || null,
      bodyFr: data.bodyFr?.trim() || null,
      quoteEn: data.quoteEn?.trim() || null,
      quoteEs: data.quoteEs?.trim() || null,
      quoteFr: data.quoteFr?.trim() || null,
      author: data.author?.trim() || "The Mothers",
      authorRoleEn: data.authorRoleEn?.trim() || null,
      authorRoleEs: data.authorRoleEs?.trim() || null,
      authorRoleFr: data.authorRoleFr?.trim() || null,
      bylineEn: data.bylineEn?.trim() || null,
      bylineEs: data.bylineEs?.trim() || null,
      bylineFr: data.bylineFr?.trim() || null,
      reviewedNoteEn: data.reviewedNoteEn?.trim() || null,
      reviewedNoteEs: data.reviewedNoteEs?.trim() || null,
      reviewedNoteFr: data.reviewedNoteFr?.trim() || null,
      heroImageId: data.heroImageId || null,
      audience: data.audience || "public",
      status: computedStatus,
      publishedAt: computedPublishedAt,
      seoTitle: data.seoTitle?.trim() || null,
      seoTitleEs: data.seoTitleEs?.trim() || null,
      seoTitleFr: data.seoTitleFr?.trim() || null,
      seoDescription: data.seoDescription?.trim() || null,
      seoDescriptionEs: data.seoDescriptionEs?.trim() || null,
      seoDescriptionFr: data.seoDescriptionFr?.trim() || null,
      updatedAt: now,
    };

    let targetId = data.id;
    let targetSlug = data.slug?.trim() || "";

    if (data.id) {
      await db
        .update(journalPost)
        .set(payload)
        .where(eq(journalPost.id, data.id));

      if (!targetSlug) {
        const existing = await db.select({ slug: journalPost.slug }).from(journalPost).where(eq(journalPost.id, data.id)).limit(1);
        targetSlug = existing[0]?.slug || "article";
      }

      await db.insert(auditLog).values({
        actorId: adminId,
        actorType: "admin",
        action: "update_journal_post",
        entity: "journal_post",
        entityId: data.id,
        after: payload,
      });
    } else {
      const generatedSlug = (data.slug?.trim() || data.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50) || `article-${Date.now().toString().slice(-4)}`;

      // Ensure slug uniqueness
      let finalSlug = generatedSlug;
      const existingSlug = await db.select({ id: journalPost.id }).from(journalPost).where(eq(journalPost.slug, finalSlug)).limit(1);
      if (existingSlug.length > 0) {
        finalSlug = `${generatedSlug}-${Date.now().toString().slice(-4)}`;
      }

      targetSlug = finalSlug;

      const inserted = await db.insert(journalPost).values({
        ...payload,
        slug: finalSlug,
      }).returning({ id: journalPost.id });

      const newId = inserted[0]?.id;
      targetId = newId;

      await db.insert(auditLog).values({
        actorId: adminId,
        actorType: "admin",
        action: "create_journal_post",
        entity: "journal_post",
        entityId: newId,
        after: { ...payload, slug: finalSlug },
      });
    }

    // ── Automated email notification broadcast to subscribers ──
    let notifiedCount = 0;
    if (data.notifySubscribers && computedStatus === "published" && targetId) {
      try {
        const { isNull } = await import("drizzle-orm");
        const { queueAndSendEmail, generateJournalPostEmailHtml, BREVO_TEMPLATES } = await import("@/lib/brevo");

        // Fetch active subscribers
        const activeSubscribers = await db
          .select()
          .from(subscriber)
          .where(and(eq(subscriber.list, "letter"), isNull(subscriber.unsubscribedAt)));

        let postHeroUrl = data.heroImageUrl || null;
        if (!postHeroUrl && data.heroImageId) {
          const asset = await db.select().from(mediaAsset).where(eq(mediaAsset.id, data.heroImageId)).limit(1);
          if (asset.length > 0 && asset[0].publicUrl) {
            postHeroUrl = asset[0].publicUrl;
          }
        }

        for (const sub of activeSubscribers) {
          if (!sub.email || !sub.email.includes("@")) continue;

          const cleanEmail = sub.email.toLowerCase().trim();

          // Ensure Person record exists for foreign key constraint in emailLog
          let personRecord = await db.query.person.findFirst({ where: eq(person.email, cleanEmail) });
          if (!personRecord) {
            const { getPublicClubSettings } = await import("@/app/actions/adminSettings");
            const clubSettings = await getPublicClubSettings();
            const [p] = await db.insert(person).values({
              firstName: sub.name || "Subscriber",
              lastName: "",
              email: cleanEmail,
              source: "subscriber",
              createdBeforeLaunch: !clubSettings.membershipLive,
            }).returning();
            personRecord = p;
          }

          const htmlContent = generateJournalPostEmailHtml({
            title: data.title,
            excerpt: data.excerpt,
            slug: targetSlug,
            category: data.category,
            author: data.author || "The Mothers",
            heroImageUrl: postHeroUrl,
            toEmail: cleanEmail,
          });

          const sendRes = await queueAndSendEmail({
            personId: personRecord.id,
            toEmail: cleanEmail,
            toName: sub.name || "Subscriber",
            templateKey: BREVO_TEMPLATES.JOURNAL_POST_NOTIFICATION,
            dedupeKey: `journal_${targetId}_${cleanEmail}`,
            subject: `The Letter · ${data.title}`,
            htmlContent,
            isTransactional: false,
            marketingOptIn: sub.marketingConsent ?? true,
          });

          if (sendRes.success) {
            notifiedCount++;
          }
        }
      } catch (broadcastErr) {
        console.error("Journal subscriber broadcast error:", broadcastErr);
      }
    }

    revalidatePath("/journal");
    revalidatePath("/admin/journal");
    if (targetSlug) {
      revalidatePath(`/journal/${targetSlug}`);
    }

    return { success: true, id: targetId, notifiedCount };
  } catch (error: any) {
    console.error("Save journal post error:", error);
    return { success: false, error: error?.message || "SAVE_JOURNAL_FAILED" };
  }
}

export async function duplicateJournalPost(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminId } = await verifyAdminRole();
    const existing = await db.select().from(journalPost).where(eq(journalPost.id, id)).limit(1);
    if (!existing.length) return { success: false, error: "POST_NOT_FOUND" };

    const orig = existing[0];
    const newTitle = `${orig.title} (Draft)`;
    const baseSlug = orig.slug.replace(/-draft-\d+$/, "").slice(0, 40);
    const newSlug = `${baseSlug}-draft-${Date.now().toString().slice(-4)}`;

    const inserted = await db.insert(journalPost).values({
      title: newTitle,
      titleEs: orig.titleEs ? `${orig.titleEs} (Borrador)` : null,
      titleFr: orig.titleFr ? `${orig.titleFr} (Brouillon)` : null,
      slug: newSlug,
      category: orig.category,
      excerpt: orig.excerpt,
      excerptEs: orig.excerptEs,
      excerptFr: orig.excerptFr,
      body: orig.body,
      bodyEs: orig.bodyEs,
      bodyFr: orig.bodyFr,
      quoteEn: orig.quoteEn,
      quoteEs: orig.quoteEs,
      quoteFr: orig.quoteFr,
      author: orig.author,
      authorRoleEn: orig.authorRoleEn,
      authorRoleEs: orig.authorRoleEs,
      authorRoleFr: orig.authorRoleFr,
      bylineEn: orig.bylineEn,
      bylineEs: orig.bylineEs,
      bylineFr: orig.bylineFr,
      reviewedNoteEn: orig.reviewedNoteEn,
      reviewedNoteEs: orig.reviewedNoteEs,
      reviewedNoteFr: orig.reviewedNoteFr,
      heroImageId: orig.heroImageId,
      audience: orig.audience,
      status: "draft",
      publishedAt: null,
      seoTitle: orig.seoTitle,
      seoTitleEs: orig.seoTitleEs,
      seoTitleFr: orig.seoTitleFr,
      seoDescription: orig.seoDescription,
      seoDescriptionEs: orig.seoDescriptionEs,
      seoDescriptionFr: orig.seoDescriptionFr,
    }).returning({ id: journalPost.id });

    await db.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "duplicate_journal_post",
      entity: "journal_post",
      entityId: inserted[0]?.id,
      after: { sourceId: id, newTitle, newSlug },
    });

    revalidatePath("/journal");
    revalidatePath("/admin/journal");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "DUPLICATE_FAILED" };
  }
}

export async function updateJournalPostSlug(id: string, newSlug: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminId } = await verifyAdminRole();
    const cleanSlug = newSlug
      .toLowerCase()
      .replace(/^https?:\/\/[^\/]+\/journal\//, "")
      .replace(/^\/journal\//, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanSlug) return { success: false, error: "INVALID_SLUG" };

    const conflict = await db
      .select({ id: journalPost.id })
      .from(journalPost)
      .where(and(eq(journalPost.slug, cleanSlug), ne(journalPost.id, id)))
      .limit(1);

    if (conflict.length > 0) {
      return { success: false, error: "SLUG_ALREADY_IN_USE" };
    }

    await db
      .update(journalPost)
      .set({ slug: cleanSlug, updatedAt: new Date() })
      .where(eq(journalPost.id, id));

    await db.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "update_journal_slug",
      entity: "journal_post",
      entityId: id,
      after: { newSlug: cleanSlug },
    });

    revalidatePath("/journal");
    revalidatePath(`/journal/${cleanSlug}`);
    revalidatePath("/admin/journal");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "UPDATE_SLUG_FAILED" };
  }
}

export async function toggleJournalPostStatus(id: string, action: "publish" | "unpublish" | "restore" | "draft"): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminId } = await verifyAdminRole();
    const now = new Date();

    let newStatus = "draft";
    let newPublishedAt: Date | null = null;

    if (action === "publish") {
      newStatus = "published";
      newPublishedAt = now;
    } else if (action === "unpublish") {
      newStatus = "unpublished";
      newPublishedAt = null;
    } else if (action === "restore") {
      newStatus = "published";
      newPublishedAt = now;
    } else if (action === "draft") {
      newStatus = "draft";
      newPublishedAt = null;
    }

    await db
      .update(journalPost)
      .set({
        status: newStatus,
        publishedAt: newPublishedAt,
        updatedAt: now,
      })
      .where(eq(journalPost.id, id));

    await db.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: `journal_status_${action}`,
      entity: "journal_post",
      entityId: id,
      after: { status: newStatus },
    });

    revalidatePath("/journal");
    revalidatePath("/admin/journal");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "TOGGLE_STATUS_FAILED" };
  }
}

export async function deleteJournalPost(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminId } = await verifyAdminRole();
    await db.delete(journalPost).where(eq(journalPost.id, id));
    await db.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "delete_journal_post",
      entity: "journal_post",
      entityId: id,
    });
    revalidatePath("/journal");
    revalidatePath("/admin/journal");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "DELETE_POST_FAILED" };
  }
}

export async function incrementJournalPostViews(slug: string): Promise<void> {
  try {
    await db
      .update(journalPost)
      .set({ views: sql`${journalPost.views} + 1` })
      .where(or(eq(journalPost.slug, slug), eq(journalPost.id, slug)));
  } catch (e) {
    // Non-blocking view tracking
    console.error("View increment error:", e);
  }
}

export async function getPublicJournalArticle(slug: string) {
  try {
    const clean = slug.toLowerCase().replace(/^\/journal\//, "").replace(/\/$/, "");

    const post = await db
      .select({
        id: journalPost.id,
        title: journalPost.title,
        titleEs: journalPost.titleEs,
        titleFr: journalPost.titleFr,
        slug: journalPost.slug,
        category: journalPost.category,
        excerpt: journalPost.excerpt,
        excerptEs: journalPost.excerptEs,
        excerptFr: journalPost.excerptFr,
        body: journalPost.body,
        bodyEs: journalPost.bodyEs,
        bodyFr: journalPost.bodyFr,
        quoteEn: journalPost.quoteEn,
        quoteEs: journalPost.quoteEs,
        quoteFr: journalPost.quoteFr,
        author: journalPost.author,
        authorRoleEn: journalPost.authorRoleEn,
        authorRoleEs: journalPost.authorRoleEs,
        authorRoleFr: journalPost.authorRoleFr,
        bylineEn: journalPost.bylineEn,
        bylineEs: journalPost.bylineEs,
        bylineFr: journalPost.bylineFr,
        reviewedNoteEn: journalPost.reviewedNoteEn,
        reviewedNoteEs: journalPost.reviewedNoteEs,
        reviewedNoteFr: journalPost.reviewedNoteFr,
        heroImageId: journalPost.heroImageId,
        heroImageUrl: mediaAsset.publicUrl,
        heroImageAlt: mediaAsset.altText,
        audience: journalPost.audience,
        status: journalPost.status,
        publishedAt: journalPost.publishedAt,
        views: journalPost.views,
        createdAt: journalPost.createdAt,
      })
      .from(journalPost)
      .leftJoin(mediaAsset, eq(journalPost.heroImageId, mediaAsset.id))
      .where(
        and(
          eq(journalPost.status, "published"),
          or(eq(journalPost.slug, clean), eq(journalPost.id, clean))
        )
      )
      .limit(1);

    if (!post.length) return null;

    const current = post[0];

    // Fetch related articles in the same category
    const related = await db
      .select({
        id: journalPost.id,
        slug: journalPost.slug,
        title: journalPost.title,
        titleEs: journalPost.titleEs,
        category: journalPost.category,
        excerpt: journalPost.excerpt,
        excerptEs: journalPost.excerptEs,
        publishedAt: journalPost.publishedAt,
      })
      .from(journalPost)
      .where(
        and(
          eq(journalPost.status, "published"),
          ne(journalPost.slug, current.slug),
          eq(journalPost.category, current.category)
        )
      )
      .limit(2);

    return { post: current, related };
  } catch (error) {
    console.error("Error fetching public journal article:", error);
    return null;
  }
}

export async function toggleSuspendAccount(personId: string, suspend: boolean, reason?: string) {
  await verifyAdminRole();
  await db
    .update(person)
    .set({
      isSuspended: suspend,
      suspendedAt: suspend ? new Date() : null,
      suspendedReason: suspend ? (reason || "Suspended by admin for house rules violation") : null,
      updatedAt: new Date(),
    })
    .where(eq(person.id, personId));

  // If suspending, cancel/freeze active future bookings
  if (suspend) {
    await db
      .update(booking)
      .set({ status: "released" })
      .where(and(eq(booking.personId, personId), sql`${booking.status} IN ('held', 'confirmed')`));
  }

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${personId}`);
  revalidatePath("/admin/pre-launch");
  return { success: true };
}

export async function adminDeleteAccountGDPR(personId: string) {
  const { adminId } = await verifyAdminRole();

  const personRecord = await db.query.person.findFirst({
    where: eq(person.id, personId),
  });
  const personName = `${personRecord?.firstName || "A member"} ${personRecord?.lastName || ""}`.trim();
  const originalEmail = personRecord?.email || "";

  const memberRecord = await db.query.member.findFirst({
    where: eq(member.personId, personId),
  });
  const hadActiveSub = !!memberRecord?.stripeSubscriptionId || memberRecord?.status === "active";

  if (memberRecord?.stripeSubscriptionId) {
    try {
      const { stripe } = await import("@/lib/stripe");
      await stripe.subscriptions.cancel(memberRecord.stripeSubscriptionId);
    } catch (e) {
      console.warn("Stripe cancel error:", e);
    }
  }

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

  // 3. Cancel active future bookings & count them
  const futureBookings = await db
    .select({ id: booking.id })
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
      .set({ status: "released", releaseReason: "admin_account_deleted", releasedAt: new Date(), updatedAt: new Date() })
      .where(eq(booking.id, b.id));
  }

  // 4. Scrub personal details (GDPR Right to Erasure)
  await db
    .update(person)
    .set({
      firstName: "Deleted",
      lastName: "Mother",
      phoneE164: null,
      whatsappE164: null,
      email: `deleted_${personId.slice(0, 8)}@themothers.cc`,
      deletedAt: new Date(),
      isSuspended: true,
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

  // 5. Activity log
  const parts = [`Team deleted account for ${personName}`];
  if (futureBookings.length > 0) {
    parts.push(`${futureBookings.length} future booking${futureBookings.length > 1 ? "s" : ""} released`);
  }
  if (hadActiveSub) {
    parts.push("membership cancelled");
  }
  const summaryText = parts.join(" · ");

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "admin_delete_account",
    entity: "person",
    entityId: personId,
    before: { name: personName, email: originalEmail, hadActiveSub, futureBookingsCount: futureBookings.length },
    after: { summary: summaryText, releasedBookings: futureBookings.length, subCancelled: hadActiveSub },
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin/pre-launch");
  return { success: true };
}


