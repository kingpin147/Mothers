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
} as const;

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

