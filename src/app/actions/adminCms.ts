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
      joinedAt: member.joinedAt,
      monthlyPriceCents: member.monthlyPriceCents,
      currentPeriodEnd: member.currentPeriodEnd,
      atRiskSince: member.atRiskSince,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
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
      personName: person.firstName,
    })
    .from(payment)
    .innerJoin(person, eq(payment.personId, person.id))
    .orderBy(desc(payment.occurredAt));

  return { success: true, payments };
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
          status: data.published ? "published" : "draft",
          publishedAt: data.published ? new Date() : null,
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
        status: data.published ? "published" : "draft",
        publishedAt: data.published ? new Date() : null,
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "SAVE_JOURNAL_FAILED" };
  }
}
