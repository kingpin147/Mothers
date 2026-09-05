"use server";

import { db } from "@/db";
import { person, application, consentRecord, window, memberCredential } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { queueAndSendEmail } from "@/lib/brevo";

import { z } from "zod";

export interface ApplicationFormData {
  firstName: string;
  lastName?: string;
  email: string;
  stage: string | string[];
  childrenAge?: string | string[];
  neighbourhood: string;
  hopingToFind: string[];
  freeTimes: string[];
  referralSource?: string;
  referralCode?: string;
  socialPlatform?: string;
  socialHandle?: string;
  motivation?: string;
  billingPreference: string;
  termsAccepted: boolean;
  locale: "en" | "es";
}

const applicationSchema = z.object({
  firstName: z.string().min(1, "First name is required").trim(),
  lastName: z.string().trim().optional(),
  email: z.string().email("Invalid email").toLowerCase().trim(),
  stage: z.union([z.string().min(1), z.array(z.string()).min(1)]),
  childrenAge: z.union([z.string(), z.array(z.string())]).optional(),
  neighbourhood: z.string().min(1),
  hopingToFind: z.array(z.string()),
  freeTimes: z.array(z.string()),
  referralSource: z.string().optional(),
  referralCode: z.string().optional(),
  socialPlatform: z.string().optional(),
  socialHandle: z.string().optional(),
  motivation: z.string().optional(),
  billingPreference: z.string(),
  termsAccepted: z.literal(true),
  locale: z.enum(["en", "es"]).default("es"),
});

// ─── CHECK EMAIL EXISTS (for early duplicate detection) ──────────────────────
export async function checkEmailExists(email: string): Promise<{ exists: boolean }> {
  try {
    const normalised = email.toLowerCase().trim();
    const existingPerson = await db.query.person.findFirst({
      where: eq(person.email, normalised),
    });
    if (!existingPerson) return { exists: false };
    const credential = await db.query.memberCredential.findFirst({
      where: eq(memberCredential.personId, existingPerson.id),
    });
    return { exists: !!credential };
  } catch {
    return { exists: false };
  }
}

export async function submitApplication(data: ApplicationFormData) {
  try {
    const parsed = applicationSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "VALIDATION_FAILED", details: parsed.error.format() };
    }
    const validData = parsed.data;

    const email = validData.email;

    // 1. Get current open window (or fallback to active/latest window)
    let currentWindow = await db.query.window.findFirst({
      where: eq(window.status, "open"),
    });

    if (!currentWindow) {
      currentWindow = await db.query.window.findFirst();
      if (!currentWindow) {
        const [newWin] = await db
          .insert(window)
          .values({
            status: "open",
            placesOffered: 50,
            opensAt: new Date(),
            closesAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          })
          .returning();
        currentWindow = newWin;
      }
    }

    // 2. Upsert or find person
    let personRecord = await db.query.person.findFirst({
      where: eq(person.email, email),
    });

    if (!personRecord) {
      const insertedPerson = await db
        .insert(person)
        .values({
          firstName: data.firstName.trim(),
          lastName: data.lastName?.trim() || "",
          email,
          locale: data.locale || "es",
          isMother: true,
          marketingOptIn: false,
          source: data.referralSource || "website",
        })
        .returning();
      personRecord = insertedPerson[0];
    } else {
      // Check if this person already has a login (active member account)
      const existingCredential = await db.query.memberCredential.findFirst({
        where: eq(memberCredential.personId, personRecord.id),
      });
      if (existingCredential) {
        return { success: false, error: "EXISTING_MEMBER" };
      }
      // Update names
      await db
        .update(person)
        .set({
          firstName: data.firstName.trim(),
          lastName: data.lastName?.trim() || personRecord.lastName,
          locale: data.locale,
          updatedAt: new Date(),
        })
        .where(eq(person.id, personRecord.id));
    }

    // 3. Create consent record (§16)
    await db.insert(consentRecord).values({
      personId: personRecord.id,
      purpose: "terms_and_privacy",
      granted: true,
      textShownVerbatim: "I agree to the Terms & Conditions and Privacy Policy.",
      version: "v1.0",
    });

    // 4. Check for existing active application in this window
    const existingApp = await db.query.application.findFirst({
      where: and(
        eq(application.windowId, currentWindow.id),
        eq(application.personId, personRecord.id)
      ),
    });

    if (existingApp) {
      return { success: true, message: "ALREADY_SUBMITTED", applicationId: existingApp.id };
    }

    // 5. Create application
    const insertedApp = await db
      .insert(application)
      .values({
        windowId: currentWindow.id,
        personId: personRecord.id,
        answers: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          stage: data.stage,
          childrenAge: data.childrenAge,
          neighbourhood: data.neighbourhood,
          hopingToFind: data.hopingToFind,
          freeTimes: data.freeTimes,
          referralSource: data.referralSource,
          referralCode: data.referralCode,
          socialPlatform: data.socialPlatform,
          socialHandle: data.socialHandle,
          motivation: data.motivation,
          billingPreference: data.billingPreference,
        },
        status: "submitted",
      })
      .returning();

    // 6. Queue confirmation email (Email - Application Received.html)
    const subject =
      data.locale === "es"
        ? "Hemos recibido tu solicitud — The Mothers"
        : "We received your application — The Mothers";

    const htmlContent = `
      <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c;">
          ${data.locale === "es" ? "Solicitud recibida" : "Application received"}
        </h2>
        <p>
          ${
            data.locale === "es"
              ? `Hola ${data.firstName}, hemos recibido tu solicitud para unirte a The Mothers. Revisamos cada solicitud de forma individual y te responderemos en breve con el enlace para confirmar tu plaza.`
              : `Hi ${data.firstName}, we have received your application to join The Mothers. We review each application individually and will follow up shortly with a link to confirm your membership.`
          }
        </p>
        <p style="margin-top: 24px; color: rgba(57,41,42,0.6); font-size: 13px;">
          The Mothers · Barcelona · hello@themothers.cc
        </p>
      </div>
    `;

    try {
      await queueAndSendEmail({
        personId: personRecord.id,
        toEmail: personRecord.email,
        toName: `${personRecord.firstName} ${personRecord.lastName}`,
        templateKey: "application_received",
        dedupeKey: `app_received_${insertedApp[0].id}`,
        subject,
        htmlContent,
        isTransactional: true,
      });
    } catch (emailErr) {
      console.warn("Could not dispatch confirmation email:", emailErr);
    }

    return { success: true, applicationId: insertedApp[0].id };
  } catch (error: any) {
    console.error("submitApplication error:", error);
    return { success: false, error: error?.message || "SUBMIT_FAILED" };
  }
}
