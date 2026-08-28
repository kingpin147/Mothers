import * as brevo from "@getbrevo/brevo";
import { db } from "@/db";
import { emailLog } from "@/db/schema";
import { eq } from "drizzle-orm";

const apiInstance = new brevo.TransactionalEmailsApi();
if (process.env.BREVO_API_KEY) {
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
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

  // 3. Dispatch to Brevo
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = params.subject;
    sendSmtpEmail.htmlContent = params.htmlContent;
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME || "The Mothers",
      email: process.env.BREVO_SENDER_EMAIL || "external@themothers.cc",
    };
    sendSmtpEmail.to = [{ email: params.toEmail, name: params.toName }];

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    const messageId = result.body?.messageId || "sent";

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
