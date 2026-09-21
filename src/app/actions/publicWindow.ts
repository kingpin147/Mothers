"use server";

import { db } from "@/db";
import { application, window, waitlistEntry, person, setting, subscriber } from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export async function getPublicMembershipWindow() {
  const currentWindow = await db.query.window.findFirst({
    where: eq(window.status, "open"),
  });

  if (!currentWindow) {
    // Look for the next scheduled (draft) window
    const nextWindow = await db.query.window.findFirst({
      where: eq(window.status, "draft"),
      orderBy: [window.opensAt],
    });

    return {
      open: false,
      spotsRemaining: 0,
      nextWindowDate: nextWindow?.opensAt?.toISOString() ?? null,
    };
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(application)
    .where(and(
      eq(application.windowId, currentWindow.id),
      inArray(application.status, ["accepted", "paid"]),
    ));

  return {
    open: true,
    spotsRemaining: Math.max(0, currentWindow.placesOffered - Number(result?.count || 0)),
    nextWindowDate: null as string | null,
  };
}

export async function getPublicSettings() {
  const settingsRows = await db.select().from(setting);
  const settingsMap: Record<string, any> = {};
  for (const s of settingsRows) {
    settingsMap[s.key] = s.value;
  }
  return {
    joiningFeeCents: settingsMap["joining_fee_cents"] ?? 1900,
    monthlyGrantCredits: settingsMap["monthly_grant_credits"] ?? 20,
    rolloverCapCredits: settingsMap["rollover_cap_credits"] ?? 0,
    referralBonusCredits: settingsMap["referral_bonus_credits"] ?? 5,
    godmotherThreeMonthBonus: settingsMap["godmother_three_month_bonus"] ?? 15,
  };
}

import { z } from "zod";

const emailSchema = z.string().trim().email("INVALID_EMAIL").toLowerCase();

const subscribeComingSoonSchema = z.object({
  email: z.string().trim().email("INVALID_EMAIL").toLowerCase(),
  name: z.string().trim().optional(),
});

const partnerAppSchema = z.object({
  name: z.string().trim().min(1, "MISSING_FIELDS"),
  business: z.string().trim().min(1, "MISSING_FIELDS"),
  category: z.string().trim().optional().default("General"),
  email: z.string().trim().email("INVALID_EMAIL").toLowerCase(),
  website: z.string().trim().optional().default(""),
  message: z.string().trim().optional().default(""),
});

export async function subscribeToLetter(rawEmail: string) {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) return { success: false, error: "INVALID_EMAIL" };
  const cleanEmail = parsed.data;

  try {
    // 1. Record in subscriber table
    const existingSub = await db.query.subscriber.findFirst({
      where: and(eq(subscriber.email, cleanEmail), eq(subscriber.list, "letter")),
    });
    if (existingSub) {
      return {
        success: true,
        alreadySubscribed: true,
        message: "You are already subscribed with this email.",
      };
    }

    await db.insert(subscriber).values({
      email: cleanEmail,
      list: "letter",
      source: "journal",
      marketingConsent: true,
      marketingConsentAt: new Date(),
    });

    // 2. Record in person & waitlistEntry
    let personRecord = await db.query.person.findFirst({ where: eq(person.email, cleanEmail) });
    if (!personRecord) {
      const [p] = await db.insert(person).values({ firstName: "", lastName: "", email: cleanEmail, source: "letter" }).returning();
      personRecord = p;
    }
    const existing = await db.query.waitlistEntry.findFirst({ where: eq(waitlistEntry.personId, personRecord.id) });
    if (!existing) {
      await db.insert(waitlistEntry).values({ personId: personRecord.id, source: "letter" });
    }
    return { success: true, alreadySubscribed: false };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

export async function subscribeToComingSoon(rawEmail: string, rawName?: string) {
  const parsed = subscribeComingSoonSchema.safeParse({ email: rawEmail, name: rawName });
  if (!parsed.success) return { success: false, error: "INVALID_EMAIL" };
  const { email: cleanEmail, name } = parsed.data;

  try {
    // 1. Record in subscriber table
    const existingSub = await db.query.subscriber.findFirst({
      where: and(eq(subscriber.email, cleanEmail), eq(subscriber.list, "letter")),
    });
    if (existingSub) {
      return {
        success: true,
        alreadySubscribed: true,
        message: "You are already subscribed with this email.",
      };
    }

    await db.insert(subscriber).values({
      name: name || null,
      email: cleanEmail,
      list: "letter",
      source: "coming_soon",
      marketingConsent: true,
      marketingConsentAt: new Date(),
    });

    // 2. Record in person & waitlistEntry
    let personRecord = await db.query.person.findFirst({ where: eq(person.email, cleanEmail) });
    if (!personRecord) {
      const [p] = await db.insert(person).values({ firstName: name || "", lastName: "", email: cleanEmail, source: "coming_soon" }).returning();
      personRecord = p;
    }
    const existing = await db.query.waitlistEntry.findFirst({ where: eq(waitlistEntry.personId, personRecord.id) });
    if (!existing) {
      await db.insert(waitlistEntry).values({ personId: personRecord.id, source: "coming_soon" });
    }
    return { success: true, alreadySubscribed: false };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

export async function getPublicPartners() {
  const { partner } = await import("@/db/schema");
  const { or, eq, inArray } = await import("drizzle-orm");
  const partners = await db
    .select()
    .from(partner)
    .where(inArray(partner.status, ["active", "Live", "live", "Ending soon"]))
    .orderBy(desc(partner.createdAt));

  return { success: true, partners };
}

export async function submitPartnerApplication(rawData: {
  name: string;
  business: string;
  category: string;
  email: string;
  website: string;
  message: string;
}) {
  const parsed = partnerAppSchema.safeParse(rawData);
  if (!parsed.success) {
    const isMissing = parsed.error.issues.some(i => i.message === "MISSING_FIELDS");
    return { success: false, error: isMissing ? "MISSING_FIELDS" : "INVALID_INPUT" };
  }
  const data = parsed.data;

  try {
    const { queueAndSendEmail } = await import("@/lib/brevo");
    
    // We send an internal email to the admins notifying them of the application.
    await queueAndSendEmail({
      personId: "SYSTEM", // System generated email
      toEmail: "hello@themothers.cc", // Or wherever admin emails go
      toName: "The Mothers Partnerships",
      templateKey: "internal_partner_application",
      dedupeKey: `partner_app_${data.email}_${Date.now().toString().slice(0, 8)}`,
      subject: `New Partner Application: ${data.business}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>New Partner Application Received</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Business:</strong> ${data.business}</p>
          <p><strong>Category:</strong> ${data.category}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Website:</strong> ${data.website}</p>
          <p><strong>Message:</strong><br/> ${data.message}</p>
        </div>
      `,
      isTransactional: true,
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}