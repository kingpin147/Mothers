"use server";

import { db } from "@/db";
import { person, memberCredential, auditLog, adminUser } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { queueAndSendEmail } from "@/lib/brevo";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getAppUrl } from "@/lib/urls";
import { z } from "zod";
import { checkPasswordResetRequestRateLimit, checkPasswordResetCompleteRateLimit, getClientIp } from "@/lib/rate-limit";
import { captureException } from "@/lib/error-monitoring";
import { sanitizeErrorMessage } from "@/lib/errors";

const requestResetSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  locale: z.enum(["en", "es"]).default("en"),
});

const resetTokenSchema = z.string().trim().min(1, "TOKEN_EXPIRED_OR_INVALID");

const completeResetSchema = z.object({
  token: z.string().trim().min(1, "TOKEN_EXPIRED_OR_INVALID"),
  newPassword: z.string().min(8, "PASSWORD_TOO_SHORT"),
});

// ─── 1. REQUEST PASSWORD RESET (PREVENTS ENUMERATION) ───────────────────────

export async function requestPasswordReset(rawEmail: string, rawLocale: "en" | "es" = "en") {
  const ip = await getClientIp();
  const parsed = requestResetSchema.safeParse({ email: rawEmail, locale: rawLocale });
  // If invalid email format, still return success to prevent timing/format enumeration
  if (!parsed.success) {
    return { success: true };
  }
  const { email: cleanEmail, locale } = parsed.data;

  // Rate limit by email and IP
  const rateCheckEmail = checkPasswordResetRequestRateLimit(cleanEmail);
  const rateCheckIp = checkPasswordResetRequestRateLimit(ip);
  if (!rateCheckEmail.success || !rateCheckIp.success) {
    return {
      success: false,
      error: "Too many password reset requests. Please wait a few minutes before trying again.",
    };
  }

  try {
    let personRecord = await db.query.person.findFirst({
      where: eq(person.email, cleanEmail),
    });

    const adminRecord = await db.query.adminUser.findFirst({
      where: eq(adminUser.email, cleanEmail),
    });

    // If neither person nor adminUser exists, return success to prevent email enumeration
    if (!personRecord && !adminRecord) {
      return { success: true };
    }

    // If admin exists but person record is missing, create a placeholder person so the standard reset token flow works
    if (!personRecord && adminRecord) {
      const [newPerson] = await db.insert(person).values({
        email: cleanEmail,
        firstName: "Admin",
        lastName: "",
        locale,
        profileDone: true,
      }).returning();
      personRecord = newPerson;
    }

    if (!personRecord) {
      return { success: true };
    }

    // Generate 32-byte token expiring in 2 hours
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const existingCred = await db.query.memberCredential.findFirst({
      where: eq(memberCredential.personId, personRecord.id),
    });

    if (existingCred) {
      await db
        .update(memberCredential)
        .set({
          resetTokenHash: tokenHash,
          resetTokenExpiresAt: tokenExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(memberCredential.id, existingCred.id));
    } else {
      // If member credential row doesn't exist yet, create placeholder with dummy hash
      const dummyHash = await bcrypt.hash(crypto.randomBytes(16).toString("hex"), 10);
      await db.insert(memberCredential).values({
        personId: personRecord.id,
        passwordHash: dummyHash,
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: tokenExpiresAt,
      });
    }

    // Send Brevo Email - Password Reset
    const resetUrl = `${getAppUrl()}/account/reset-password/${rawToken}`;
    const userLocale = personRecord.locale || locale;

    const { renderEmailTemplate } = await import("@/lib/email-renderer");
    const rendered = renderEmailTemplate(
      "Email - Password Reset",
      { reset_url: resetUrl },
      userLocale
    );

    await queueAndSendEmail({
      personId: personRecord.id,
      toEmail: personRecord.email,
      toName: `${personRecord.firstName} ${personRecord.lastName}`.trim(),
      templateKey: "password_reset",
      dedupeKey: `pwd_reset_${rawToken.slice(0, 16)}`,
      subject: rendered.subject || (userLocale === "es" ? "Restablecer tu contraseña — The Mothers" : "Reset your password — The Mothers"),
      htmlContent: rendered.html,
      isTransactional: true,
    });

    return { success: true };
  } catch (error: any) {
    console.error("requestPasswordReset error:", error);
    await captureException(error, { source: "passwordReset", action: "requestPasswordReset" });
    return {
      success: false,
      error: sanitizeErrorMessage(error, "Unable to send reset email right now. Please wait a moment and try again."),
    };
  }
}

// ─── 2. VERIFY TOKEN VALIDITY ───────────────────────────────────────────────

export async function verifyResetToken(rawToken: string) {
  const parsed = resetTokenSchema.safeParse(rawToken);
  if (!parsed.success) {
    return { valid: false, error: "TOKEN_EXPIRED_OR_INVALID" };
  }
  const token = parsed.data;

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const cred = await db.query.memberCredential.findFirst({
      where: and(
        eq(memberCredential.resetTokenHash, tokenHash),
        sql`reset_token_expires_at > NOW()`
      ),
    });

    if (!cred) {
      return { valid: false, error: "TOKEN_EXPIRED_OR_INVALID" };
    }

    const personRecord = await db.query.person.findFirst({
      where: eq(person.id, cred.personId),
    });

    return {
      valid: true,
      email: personRecord?.email || "",
      firstName: personRecord?.firstName || "Member",
    };
  } catch (error: any) {
    console.error("verifyResetToken error:", error);
    return { valid: false, error: sanitizeErrorMessage(error, "TOKEN_EXPIRED_OR_INVALID") };
  }
}

// ─── 3. COMPLETE PASSWORD RESET ─────────────────────────────────────────────

export async function completePasswordReset(rawToken: string, rawNewPassword: string) {
  const ip = await getClientIp();
  const rateCheck = checkPasswordResetCompleteRateLimit(`${ip}:${rawToken.slice(0, 10)}`);
  if (!rateCheck.success) {
    return {
      success: false,
      error: "Too many reset attempts. Please wait a few minutes before trying again.",
    };
  }

  const parsed = completeResetSchema.safeParse({ token: rawToken, newPassword: rawNewPassword });
  if (!parsed.success) {
    const isPwErr = parsed.error.issues.some(i => i.message === "PASSWORD_TOO_SHORT");
    return { success: false, error: isPwErr ? "PASSWORD_TOO_SHORT" : "TOKEN_EXPIRED_OR_INVALID" };
  }
  const { token, newPassword } = parsed.data;

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const cred = await db.query.memberCredential.findFirst({
      where: and(
        eq(memberCredential.resetTokenHash, tokenHash),
        sql`reset_token_expires_at > NOW()`
      ),
    });

    if (!cred) {
      return { success: false, error: "TOKEN_EXPIRED_OR_INVALID" };
    }

    const personRecord = await db.query.person.findFirst({
      where: eq(person.id, cred.personId),
    });

    const newHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(memberCredential)
      .set({
        passwordHash: newHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        passwordUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(memberCredential.id, cred.id));

    // If an adminUser exists with this email, synchronize the admin passwordHash too
    if (personRecord?.email) {
      await db
        .update(adminUser)
        .set({
          passwordHash: newHash,
          updatedAt: new Date(),
        })
        .where(eq(adminUser.email, personRecord.email.toLowerCase().trim()));
    }

    // Audit log
    await db.insert(auditLog).values({
      actorId: cred.personId,
      actorType: "member",
      action: "password_reset_completed",
      entity: "member_credential",
      entityId: cred.id,
    });

    return { success: true };
  } catch (error: any) {
    console.error("completePasswordReset error:", error);
    await captureException(error, { source: "passwordReset", action: "completePasswordReset" });
    return {
      success: false,
      error: sanitizeErrorMessage(error, "Unable to reset password right now. Please wait a moment and try again."),
    };
  }
}
