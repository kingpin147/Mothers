"use server";

import { db } from "@/db";
import { application, window, waitlistEntry, person } from "@/db/schema";
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

export async function subscribeToLetter(email: string) {
  if (!email || !email.includes("@")) return { success: false, error: "INVALID_EMAIL" };
  const cleanEmail = email.toLowerCase().trim();
  try {
    let personRecord = await db.query.person.findFirst({ where: eq(person.email, cleanEmail) });
    if (!personRecord) {
      const [p] = await db.insert(person).values({ firstName: "", lastName: "", email: cleanEmail, source: "letter" }).returning();
      personRecord = p;
    }
    const existing = await db.query.waitlistEntry.findFirst({ where: eq(waitlistEntry.personId, personRecord.id) });
    if (!existing) {
      await db.insert(waitlistEntry).values({ personId: personRecord.id, source: "letter" });
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}

export async function getPublicPartners() {
  const { partner } = await import("@/db/schema");
  const partners = await db
    .select()
    .from(partner)
    .where(eq(partner.status, "active"))
    .orderBy(desc(partner.createdAt));

  return { success: true, partners };
}

export async function submitPartnerApplication(data: {
  name: string;
  business: string;
  category: string;
  email: string;
  website: string;
  message: string;
}) {
  if (!data.name || !data.business || !data.email) {
    return { success: false, error: "MISSING_FIELDS" };
  }

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