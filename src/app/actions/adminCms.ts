"use server";

import { db } from "@/db";
import {
  member,
  person,
  payment,
  creditEntry,
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
  emailLog
} from "@/db/schema";
import { eq, desc, and, or, sql, ne, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";

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
        stage: member.stage,
        neighbourhood: member.neighbourhood,
        children: member.children,
        joinedAt: member.joinedAt,
        monthlyPriceCents: member.monthlyPriceCents,
        currentPeriodEnd: member.currentPeriodEnd,
        atRiskSince: member.atRiskSince,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        credits: sql<number>`(SELECT COALESCE(SUM(amount), 0) FROM ${creditEntry} WHERE member_id = ${member.id})::int`.as('credits'),
        attended: sql<number>`(SELECT COUNT(*)::int FROM ${booking} b INNER JOIN ${event} e ON b.event_id = e.id WHERE b.member_id = ${member.id} AND b.status = 'attended' AND e.starts_at >= NOW() - INTERVAL '90 days')`.as('attended'),
        lastSeenDate: sql<Date>`(SELECT MAX(e.starts_at) FROM ${booking} b INNER JOIN ${event} e ON b.event_id = e.id WHERE b.member_id = ${member.id} AND b.status = 'attended')`.as('last_seen_date'),
      })
      .from(member)
      .innerJoin(person, eq(member.personId, person.id))
      .orderBy(desc(member.joinedAt));

    return { success: true, members };
  } catch (err: any) {
    console.error("getAdminMembers error:", err?.message || err);
    return { success: false, error: err?.message || "UNAUTHORIZED_ADMIN", members: [] };
  }
}

export async function adjustMemberCredits(data: {
  memberId: string;
  amount: number; // positive or negative
  reason: string; // mandatory reason code (§5)
}) {
  const { adminId } = await verifyAdminRole();
  if (!data.reason || !data.reason.trim()) {
    return { success: false, error: "REASON_REQUIRED" };
  }

  await db.transaction(async (tx) => {
    await tx.insert(creditEntry).values({
      memberId: data.memberId,
      amount: data.amount,
      type: "adjustment",
      sourceType: "manual_adjustment",
      actorAdminId: adminId,
      reason: `Operator Adjustment: ${data.reason.trim()}`,
    });

    await tx.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "adjust_credits",
      entity: "credit_entry",
      entityId: data.memberId,
      after: { memberId: data.memberId, amount: data.amount, reason: data.reason },
    });
  });

  return { success: true };
}

export async function getAdminMemberDetail(memberId: string) {
  await verifyAdminRole();

  // 1. Core Profile
  const memberData = await db
    .select({
      id: member.id,
      personId: member.personId,
      status: member.status,
      stage: member.stage,
      neighbourhood: member.neighbourhood,
      joinedAt: member.joinedAt,
      monthlyPriceCents: member.monthlyPriceCents,
      currentPeriodEnd: member.currentPeriodEnd,
      atRiskSince: member.atRiskSince,
      pauseMonthsUsedYear: member.pauseMonthsUsedYear,
      priceLockedUntil: member.priceLockedUntil,
      children: member.children,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      phone: person.phoneE164,
      languages: person.locale, // Or actual languages field if added
    })
    .from(member)
    .innerJoin(person, eq(member.personId, person.id))
    .where(eq(member.id, memberId))
    .limit(1)
    .then(res => res[0]);

  if (!memberData) {
    return { success: false, error: "MEMBER_NOT_FOUND" };
  }

  // 2. Fetch Ledger, Godmother Stats, Attendance, Contact History concurrently
  const [ledgerEntries, godmotherStats, attendance, contactHistory] = await Promise.all([
    // Credits Ledger
    db
      .select()
      .from(creditEntry)
      .where(eq(creditEntry.memberId, memberId))
      .orderBy(desc(creditEntry.createdAt)),

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
  ]);

  const totalBalance = ledgerEntries.reduce((sum, e) => sum + e.amount, 0);

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
    return { success: false, error: error.message };
  }
}

export async function resumeMember(memberId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminId } = await verifyAdminRole();
    await db.transaction(async (tx) => {
      await tx.update(member).set({ 
        status: 'active', 
        pausedUntil: null,
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
    return { success: false, error: error.message };
  }
}

export async function cancelMember(memberId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { adminId } = await verifyAdminRole();
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
    return { success: false, error: error.message };
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

  const creditEntries = await db
    .select({
      id: creditEntry.id,
      memberId: creditEntry.memberId,
      amount: creditEntry.amount,
      type: creditEntry.type,
      expiresAt: creditEntry.expiresAt,
      sourceType: creditEntry.sourceType,
      sourceId: creditEntry.sourceId,
      reason: creditEntry.reason,
      actorAdminId: creditEntry.actorAdminId,
      createdAt: creditEntry.createdAt,
      personFirstName: person.firstName,
      personLastName: person.lastName,
      personEmail: person.email,
    })
    .from(creditEntry)
    .innerJoin(member, eq(creditEntry.memberId, member.id))
    .innerJoin(person, eq(member.personId, person.id))
    .orderBy(desc(creditEntry.createdAt));

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

export async function savePartner(data: {
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
    return { success: false, error: error?.message || "SAVE_PARTNER_FAILED" };
  }
}

export async function deletePartner(partnerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdminRole();
    await db.delete(partner).where(eq(partner.id, partnerId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "DELETE_PARTNER_FAILED" };
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

export async function savePartnerPerk(data: {
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

export async function saveInternalNote(data: {
  entityType: string;
  entityId: string;
  body: string;
}) {
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

export async function createSubscriber(data: {
  name?: string;
  email: string;
  list?: string;
  source?: string;
}) {
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

      const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
      const insertedCredit = await tx
        .insert(creditEntry)
        .values({
          memberId: ref.referrerMemberId,
          amount: 5,
          type: "godmother",
          expiresAt,
          sourceType: "godmother",
          sourceId: ref.id,
          actorAdminId: adminId,
          reason: `Godmother referral reward for code ${ref.code}`,
        })
        .returning();

      await tx
        .update(godmotherReferral)
        .set({
          status: "paid",
          payoutCreditEntryId: insertedCredit[0].id,
          updatedAt: new Date(),
        })
        .where(eq(godmotherReferral.id, referralId));

      return { creditEntryId: insertedCredit[0].id };
    });

    return { success: true, ...result };
  } catch (e: any) {
    return { success: false, error: e?.message || "PAYOUT_FAILED" };
  }
}

// ─── 4. FAQ CMS ─────────────────────────────────────────────────────────────

export async function getAdminFaqs() {
  await verifyAdminRole();

  const faqs = await db
    .select()
    .from(faqItem)
    .orderBy(faqItem.sortOrder);

  return { success: true, faqs };
}

export async function saveFaq(data: {
  id?: string;
  category?: string;
  questionEn: string;
  answerEn: string;
  questionEs: string;
  answerEs: string;
  sortOrder?: number;
  active?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdminRole();

    if (data.id) {
      await db
        .update(faqItem)
        .set({
          category: data.category || "General",
          questionEn: data.questionEn,
          answerEn: data.answerEn,
          questionEs: data.questionEs,
          answerEs: data.answerEs,
          sortOrder: data.sortOrder || 0,
          active: data.active !== undefined ? data.active : true,
          updatedAt: new Date(),
        })
        .where(eq(faqItem.id, data.id));
    } else {
      await db.insert(faqItem).values({
        category: data.category || "General",
        questionEn: data.questionEn,
        answerEn: data.answerEn,
        questionEs: data.questionEs,
        answerEs: data.answerEs,
        sortOrder: data.sortOrder || 0,
        active: data.active !== undefined ? data.active : true,
      });
    }

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
      .set({ active, updatedAt: new Date() })
      .where(eq(faqItem.id, id));
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "TOGGLE_FAQ_FAILED" };
  }
}

export async function deleteFaq(id: string) {
  try {
    await verifyAdminRole();
    await db.delete(faqItem).where(eq(faqItem.id, id));
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

export async function saveJournalPost(data: {
  id?: string;
  title: string;
  titleEs?: string;
  slug?: string;
  category?: string;
  excerpt: string;
  excerptEs?: string;
  body: string;
  bodyEs?: string;
  quoteEn?: string;
  quoteEs?: string;
  author?: string;
  authorRoleEn?: string;
  authorRoleEs?: string;
  bylineEn?: string;
  bylineEs?: string;
  reviewedNoteEn?: string;
  reviewedNoteEs?: string;
  heroImageId?: string | null;
  heroImageUrl?: string | null;
  status?: string; // 'published' | 'scheduled' | 'draft' | 'unpublished'
  published?: boolean;
  publishedAt?: Date | null;
  audience?: string; // 'public' | 'members_only'
  seoTitle?: string;
  seoTitleEs?: string;
  seoDescription?: string;
  seoDescriptionEs?: string;
  notifySubscribers?: boolean;
}): Promise<{ success: boolean; id?: string; error?: string; notifiedCount?: number }> {
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
      category: data.category || "postpartum",
      excerpt: data.excerpt.trim(),
      excerptEs: data.excerptEs?.trim() || null,
      body: data.body.trim(),
      bodyEs: data.bodyEs?.trim() || null,
      quoteEn: data.quoteEn?.trim() || null,
      quoteEs: data.quoteEs?.trim() || null,
      author: data.author?.trim() || "The Mothers",
      authorRoleEn: data.authorRoleEn?.trim() || null,
      authorRoleEs: data.authorRoleEs?.trim() || null,
      bylineEn: data.bylineEn?.trim() || null,
      bylineEs: data.bylineEs?.trim() || null,
      reviewedNoteEn: data.reviewedNoteEn?.trim() || null,
      reviewedNoteEs: data.reviewedNoteEs?.trim() || null,
      heroImageId: data.heroImageId || null,
      audience: data.audience || "public",
      status: computedStatus,
      publishedAt: computedPublishedAt,
      seoTitle: data.seoTitle?.trim() || null,
      seoTitleEs: data.seoTitleEs?.trim() || null,
      seoDescription: data.seoDescription?.trim() || null,
      seoDescriptionEs: data.seoDescriptionEs?.trim() || null,
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
            const [p] = await db.insert(person).values({
              firstName: sub.name || "Subscriber",
              lastName: "",
              email: cleanEmail,
              source: "subscriber",
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
      slug: newSlug,
      category: orig.category,
      excerpt: orig.excerpt,
      excerptEs: orig.excerptEs,
      body: orig.body,
      bodyEs: orig.bodyEs,
      quoteEn: orig.quoteEn,
      quoteEs: orig.quoteEs,
      author: orig.author,
      authorRoleEn: orig.authorRoleEn,
      authorRoleEs: orig.authorRoleEs,
      bylineEn: orig.bylineEn,
      bylineEs: orig.bylineEs,
      reviewedNoteEn: orig.reviewedNoteEn,
      reviewedNoteEs: orig.reviewedNoteEs,
      heroImageId: orig.heroImageId,
      audience: orig.audience,
      status: "draft",
      publishedAt: null,
      seoTitle: orig.seoTitle,
      seoTitleEs: orig.seoTitleEs,
      seoDescription: orig.seoDescription,
      seoDescriptionEs: orig.seoDescriptionEs,
    }).returning({ id: journalPost.id });

    await db.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "duplicate_journal_post",
      entity: "journal_post",
      entityId: inserted[0]?.id,
      after: { sourceId: id, newTitle, newSlug },
    });

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


