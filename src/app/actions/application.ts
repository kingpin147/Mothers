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
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>We have your application — The Mothers</title>
<!--[if mso]>
<style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style>
<![endif]-->
<style>
@media only screen and (max-width:620px){
  .px{padding-left:24px !important;padding-right:24px !important;}
  .h1{font-size:28px !important;line-height:34px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#efeae1;">
<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Your application is with us. We read every one ourselves — here is what happens next.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efeae1;">
<tr>
<td align="center" style="padding:32px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;">

<tr>
<td class="px" align="center" style="padding:34px 48px 26px;border-bottom:1px solid #ddd4c6;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:20px;mso-line-height-rule:exactly;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;">The Mothers</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:7px;">Barcelona</div>
</td>
</tr>

<tr>
<td class="px" style="padding:38px 48px 0;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">Application received</div>
<h1 class="h1" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:40px;mso-line-height-rule:exactly;font-weight:normal;color:#2A1E20;">Thank you — it's with us.</h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:27px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0 0 16px;">Hello <span style="color:#7b1f2c;">${data.firstName}</span>,</p>
<p style="margin:0 0 16px;">We've received your application to join The Mothers. Thank you for the time you gave it — we read every one ourselves, which is slower than a form that lets anyone in, and deliberately so.</p>
<p style="margin:0;">There is nothing for you to do now. Everyone who applied in this Window hears on the same day, and we'll write to you either way.</p>
</td>
</tr>

<tr>
<td class="px" style="padding:30px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #ddd4c6;background-color:#f3efe6;">
<tr>
<td style="padding:22px 24px 8px;font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;">What happens next</td>
</tr>
<tr>
<td style="padding:0 24px 22px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#2A1E20;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr>
<td width="26" valign="top" style="width:26px;padding:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">01</td>
<td valign="top" style="padding:8px 0 0;">We read every application in this Window, then decide together.</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">02</td>
<td valign="top" style="padding:10px 0 0;">Everyone who applied in this Window hears <strong style="font-weight:normal;color:#7b1f2c;">on the same day</strong> — accepted or not, so you're never left wondering.</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">03</td>
<td valign="top" style="padding:10px 0 0;">If you're in, that email carries a payment link that holds your place for <strong style="font-weight:normal;color:#7b1f2c;">72 hours</strong>. You become a member the moment it clears — not before.</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:30px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#5c534e;">
<p style="margin:0;">In the meantime, our walks are open to everyone — no membership needed. It's the easiest way to meet us before you decide anything.</p>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 4px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td bgcolor="#7b1f2c" style="border-radius:4px;">
<a href="https://themothers.cc/events" style="display:block;padding:14px 30px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:20px;mso-line-height-rule:exactly;color:#faf7f1;text-decoration:none;">See the calendar</a>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:26px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0;">Warmly,<br>The Mothers Team</p>
</td>
</tr>


<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;line-height:20px;mso-line-height-rule:exactly;color:#8a807a;padding-top:20px;">
The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
<a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a> &nbsp;·&nbsp;
<a href="https://themothers.cc" style="color:#7b1f2c;text-decoration:underline;">themothers.cc</a>
</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:18px;mso-line-height-rule:exactly;color:#8a807a;padding-top:12px;">
You're receiving this because you applied to join The Mothers.<br>
<a href="https://themothers.cc/unsubscribe" style="color:#8a807a;text-decoration:underline;">Unsubscribe</a> from club emails at any time.
</div>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>

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
