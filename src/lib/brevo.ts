import * as brevo from "@getbrevo/brevo";
import { db } from "@/db";
import { emailLog } from "@/db/schema";
import { eq } from "drizzle-orm";

export const BREVO_TEMPLATES = {
  WELCOME_CONFIRMATION: "welcome_confirmation",
  APPLICATION_RECEIVED: "application_received",
  APPLICATION_ACCEPTED: "application_accepted",
  APPLICATION_DECLINED: "application_declined",
  PAYMENT_RECEIPT: "payment_receipt",
  PAYMENT_FAILED: "payment_failed",
  PASSWORD_RESET: "password_reset",
  GUEST_PASS_ISSUED: "guest_pass_issued",
  TICKET_RELEASED: "ticket_released",
  EVENT_BOOKING_CONFIRMED: "event_booking_confirmed",
  EVENT_REMINDER_48H: "event_reminder_48h",
  EVENT_CANCELLED_REFUND: "event_cancelled_refund",
  WAITLIST_PROMOTED: "waitlist_promoted",
  CREDITS_EXPIRING_30D: "credits_expiring_30d",
  MEMBERSHIP_PAUSED: "membership_paused",
  MEMBERSHIP_CANCELLED: "membership_cancelled",
  TIER_UPGRADE: "tier_upgrade",
  GODMOTHER_BONUS_EARNED: "godmother_bonus_earned",
  JOURNAL_POST_NOTIFICATION: "journal_post_notification",
} as const;

export function generateJournalPostEmailHtml(params: {
  title: string;
  excerpt: string;
  slug: string;
  category?: string;
  author?: string;
  heroImageUrl?: string | null;
  toEmail?: string;
  isEs?: boolean;
}): string {
  const isEs = params.isEs || false;
  const articleUrl = `https://themothers.cc/journal/${params.slug}`;
  const unsubscribeUrl = `https://themothers.cc/unsubscribe?email=${encodeURIComponent(params.toEmail || "")}`;
  const categoryLabel = params.category ? params.category.toUpperCase() : (isEs ? "EL JOURNAL" : "THE JOURNAL");
  const authorName = params.author || "The Mothers";

  return `<!DOCTYPE html>
<html lang="${isEs ? "es" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${params.title} — The Mothers</title>
<!--[if mso]>
<style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style>
<![endif]-->
<style>
@media only screen and (max-width:620px){
  .px{padding-left:24px !important;padding-right:24px !important;}
  .h1{font-size:26px !important;line-height:32px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#efeae1;">
<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${params.excerpt.slice(0, 120)}...</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efeae1;">
<tr>
<td align="center" style="padding:32px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;border-radius:6px;overflow:hidden;">

<!-- Header / Logo -->
<tr>
<td class="px" align="center" style="padding:32px 48px 24px;border-bottom:1px solid #ddd4c6;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:20px;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;font-weight:bold;">The Mothers</div>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:6px;">Barcelona · The Letter</div>
</td>
</tr>

${params.heroImageUrl ? `
<!-- Hero Image -->
<tr>
<td style="padding:0;">
  <img src="${params.heroImageUrl}" alt="${params.title}" width="600" style="width:100%;max-width:600px;height:auto;display:block;object-fit:cover;max-height:300px;" />
</td>
</tr>
` : ''}

<!-- Category & Title -->
<tr>
<td class="px" style="padding:32px 48px 0;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:12px;">${categoryLabel}</div>
  <h1 class="h1" style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:36px;font-weight:normal;color:#2A1E20;">${params.title}</h1>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:18px;color:#8a807a;">${isEs ? "Por" : "By"} ${authorName}</div>
</td>
</tr>

<!-- Excerpt -->
<tr>
<td class="px" style="padding:20px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:27px;color:#2A1E20;">
  <p style="margin:0 0 16px;color:#39292a;font-style:italic;">"${params.excerpt}"</p>
</td>
</tr>

<!-- CTA Button -->
<tr>
<td class="px" style="padding:20px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
  <td bgcolor="#7b1f2c" style="border-radius:4px;">
    <a href="${articleUrl}" style="display:block;padding:14px 30px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:20px;color:#faf7f1;text-decoration:none;font-weight:bold;letter-spacing:0.5px;">${isEs ? "Leer artículo completo" : "Read the full article"} &rarr;</a>
  </td>
  </tr>
  </table>
</td>
</tr>

<!-- Closing -->
<tr>
<td class="px" style="padding:32px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:24px;color:#5c534e;">
  <p style="margin:0;">${isEs ? "Con cariño," : "Warmly,"}<br>The Mothers Team</p>
</td>
</tr>

<!-- Footer -->
<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
  <tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;line-height:20px;color:#8a807a;padding-top:20px;">
    The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
    <a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a> &nbsp;·&nbsp;
    <a href="https://themothers.cc" style="color:#7b1f2c;text-decoration:underline;">themothers.cc</a>
  </div>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:18px;color:#8a807a;padding-top:12px;">
    You are receiving this because you subscribed to The Letter from The Mothers.<br>
    <a href="${unsubscribeUrl}" style="color:#8a807a;text-decoration:underline;">Unsubscribe</a> from future letters at any time.
  </div>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}

export interface SendEmailParams {
  personId: string;
  toEmail: string;
  toName: string;
  templateKey: string;
  dedupeKey: string;
  subject: string;
  htmlContent: string;
  isTransactional?: boolean; // Default true
  marketingOptIn?: boolean;
}

export async function queueAndSendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  // Check promotional consent
  if (!params.isTransactional && !params.marketingOptIn) {
    return { success: false, error: "MARKETING_CONSENT_REQUIRED" };
  }

  // 1. Idempotency check: dedupe_key
  const existingLog = await db.query.emailLog.findFirst({
    where: eq(emailLog.dedupeKey, params.dedupeKey),
  });

  if (existingLog && (existingLog.status === "sent" || existingLog.status === "delivered")) {
    return { success: true }; // Already sent, idempotent exit
  }

  // 2. Insert or update log entry
  let logId = existingLog?.id;
  if (!logId) {
    const inserted = await db
      .insert(emailLog)
      .values({
        personId: params.personId,
        templateKey: params.templateKey,
        dedupeKey: params.dedupeKey,
        payload: { subject: params.subject, to: params.toEmail },
        status: "queued",
      })
      .returning({ id: emailLog.id });
    logId = inserted[0]?.id;
  }

  // 3. Dispatch to Brevo or Dev Simulation
  const apiKey = process.env.BREVO_API_KEY;
  const isRealApiKey = apiKey && apiKey !== "your-brevo-api-key" && !apiKey.startsWith("your-");

  if (!isRealApiKey) {
    console.log(`[Brevo Email Simulated] To: ${params.toEmail} | Subject: "${params.subject}" | Template: ${params.templateKey}`);
    if (logId) {
      await db
        .update(emailLog)
        .set({
          status: "sent",
          providerId: `dev-sim-${Date.now()}`,
          sentAt: new Date(),
        })
        .where(eq(emailLog.id, logId));
    }
    return { success: true };
  }

  try {
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = params.subject;
    sendSmtpEmail.htmlContent = params.htmlContent;
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME || "The Mothers",
      email: process.env.BREVO_SENDER_EMAIL || "hello@themothers.cc",
    };
    sendSmtpEmail.to = [{ email: params.toEmail, name: params.toName }];

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    const messageId = (result as any).body?.messageId || "sent";

    if (logId) {
      await db
        .update(emailLog)
        .set({
          status: "sent",
          providerId: messageId,
          sentAt: new Date(),
        })
        .where(eq(emailLog.id, logId));
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Brevo Email Error]", error);
    if (logId) {
      await db
        .update(emailLog)
        .set({
          status: "failed",
          error: error?.message || "Send failed",
        })
        .where(eq(emailLog.id, logId));
    }
    return { success: false, error: error?.message || "Brevo dispatch failed" };
  }
}

