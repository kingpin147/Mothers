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
  booking,
  event,
  auditLog,
  godmotherReferral,
  emailLog
} from "@/db/schema";
import { eq, desc, and, sql, ne, asc } from "drizzle-orm";
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

  // 2. Credits Ledger
  const ledgerEntries = await db
    .select()
    .from(creditEntry)
    .where(eq(creditEntry.memberId, memberId))
    .orderBy(desc(creditEntry.createdAt));
  const totalBalance = ledgerEntries.reduce((sum, e) => sum + e.amount, 0);

  // 3. Godmother Referral Stats
  const godmotherStats = await db
    .select()
    .from(godmotherReferral)
    .where(eq(godmotherReferral.referrerMemberId, memberId));

  // 4. Attendance History
  const attendance = await db
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
    .orderBy(desc(event.startsAt));

  // 5. Contact History (Emails)
  const contactHistory = await db
    .select({
      id: emailLog.id,
      templateKey: emailLog.templateKey,
      sentAt: emailLog.sentAt,
      status: emailLog.status,
    })
    .from(emailLog)
    .where(eq(emailLog.personId, memberData.personId))
    .orderBy(desc(emailLog.sentAt));

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
          eq(partner.status, "active"),
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
          status: data.status || "active",
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
        status: data.status || "active",
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
  const subscribers = await db
    .select()
    .from(subscriber)
    .where(eq(subscriber.list, listType))
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
    const cleanEmail = data.email.toLowerCase().trim();
    await db
      .insert(subscriber)
      .values({
        name: data.name || null,
        email: cleanEmail,
        list: data.list || "letter",
        source: data.source || "admin_manual",
        marketingConsent: true,
        marketingConsentAt: new Date(),
      });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "SUBSCRIBE_FAILED" };
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

// ─── 5. JOURNAL CMS ─────────────────────────────────────────────────────────

export async function getAdminJournalPosts() {
  await verifyAdminRole();

  const posts = await db
    .select()
    .from(journalPost)
    .orderBy(desc(journalPost.createdAt));

  return { success: true, posts };
}

export async function saveJournalPost(data: {
  id?: string;
  title: string;
  excerpt: string;
  body: string;
  author?: string;
  published?: boolean;
  publishedAt?: Date | null;
  audience?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdminRole();
    const slug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Date.now().toString().slice(-4)}`;

    if (data.id) {
      await db
        .update(journalPost)
        .set({
          title: data.title,
          excerpt: data.excerpt,
          body: data.body,
          audience: data.audience || "public",
          status: data.published ? "published" : "draft",
          publishedAt: data.publishedAt !== undefined ? data.publishedAt : (data.published ? new Date() : null),
          updatedAt: new Date(),
        })
        .where(eq(journalPost.id, data.id));
    } else {
      await db.insert(journalPost).values({
        slug,
        title: data.title,
        excerpt: data.excerpt,
        body: data.body,
        author: data.author || "The Mothers Editorial",
        audience: data.audience || "public",
        status: data.published ? "published" : "draft",
        publishedAt: data.publishedAt !== undefined ? data.publishedAt : (data.published ? new Date() : null),
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "SAVE_JOURNAL_FAILED" };
  }
}
