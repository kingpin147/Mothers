"use server";

import { db } from "@/db";
import {
  member,
  person,
  payment,
  creditEntry,
  partner,
  faqItem,
  journalPost,
  booking,
  event,
  auditLog,
  godmotherReferral,
  emailLog
} from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
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
      await tx.update(member).set({ status: 'paused', updatedAt: new Date() }).where(eq(member.id, memberId));
      await tx.insert(auditLog).values({
        actorId: adminId,
        actorType: "admin",
        action: "pause_member",
        entity: "member",
        entityId: memberId,
        after: { reason }
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
      await tx.update(member).set({ status: 'cancelled_at_period_end', updatedAt: new Date() }).where(eq(member.id, memberId));
      await tx.insert(auditLog).values({
        actorId: adminId,
        actorType: "admin",
        action: "cancel_member",
        entity: "member",
        entityId: memberId,
        after: { reason }
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
  description: string;
  offerForMembers: string;
  discountCode?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await verifyAdminRole();
    if (data.id) {
      await db
        .update(partner)
        .set({
          name: data.name,
          umbrella: data.umbrella,
          specialty: data.specialty,
          description: data.description,
          offerForMembers: data.offerForMembers,
          discountCode: data.discountCode || null,
          updatedAt: new Date(),
        })
        .where(eq(partner.id, data.id));
    } else {
      await db.insert(partner).values({
        name: data.name,
        umbrella: data.umbrella,
        specialty: data.specialty,
        description: data.description,
        offerForMembers: data.offerForMembers,
        discountCode: data.discountCode || null,
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
