"use server";

import { db } from "@/db";
import { person, memberCredential, auditLog } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { queueAndSendEmail } from "@/lib/brevo";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ─── 1. REQUEST PASSWORD RESET (PREVENTS ENUMERATION) ───────────────────────

export async function requestPasswordReset(email: string, locale: "en" | "es" = "en") {
  try {
    const cleanEmail = email.toLowerCase().trim();

    const personRecord = await db.query.person.findFirst({
      where: eq(person.email, cleanEmail),
    });

    // If person doesn't exist, return success anyway to prevent email enumeration
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

    // Send Brevo Email - Password Reset.html
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/account/reset-password/${rawToken}`;
    const userLocale = personRecord.locale || locale;

    const subject =
      userLocale === "es"
        ? "Restablecer tu contraseña — The Mothers"
        : "Reset your password — The Mothers";

    const htmlContent = `
      <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
        <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; margin: 0 0 16px;">
          ${userLocale === "es" ? "Restablecer Contraseña" : "Reset Your Password"}
        </h2>
        <p style="font-size: 15px; line-height: 1.6;">
          ${
            userLocale === "es"
              ? `Hola ${personRecord.firstName}, hemos recibido una solicitud para restablecer la contraseña de tu cuenta en The Mothers. Haz clic en el siguiente enlace para crear una nueva contraseña:`
              : `Hi ${personRecord.firstName}, we received a request to reset the password for your The Mothers account. Click the link below to choose a new password:`
          }
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #7b1f2c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 16px; display: inline-block;">
            ${userLocale === "es" ? "Crear Nueva Contraseña →" : "Set New Password →"}
          </a>
        </div>
        <p style="font-size: 13px; color: rgba(57,41,42,0.6); line-height: 1.5; border-top: 1px solid rgba(57,41,42,0.16); padding-top: 16px;">
          ${
            userLocale === "es"
              ? "Este enlace es válido durante 2 horas. Si tú no solicitaste este cambio, puedes ignorar este correo con total seguridad."
              : "This link is valid for 2 hours. If you did not request a password reset, you can safely ignore this email."
          }
        </p>
      </div>
    `;

    await queueAndSendEmail({
      personId: personRecord.id,
      toEmail: personRecord.email,
      toName: `${personRecord.firstName} ${personRecord.lastName}`,
      templateKey: "password_reset",
      dedupeKey: `pwd_reset_${rawToken.slice(0, 16)}`,
      subject,
      htmlContent,
      isTransactional: true,
    });

    return { success: true };
  } catch (error: any) {
    console.error("requestPasswordReset error:", error);
    return { success: false, error: error?.message || "REQUEST_FAILED" };
  }
}

// ─── 2. VERIFY TOKEN VALIDITY ───────────────────────────────────────────────

export async function verifyResetToken(token: string) {
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
    return { valid: false, error: error?.message || "VERIFICATION_FAILED" };
  }
}

// ─── 3. COMPLETE PASSWORD RESET ─────────────────────────────────────────────

export async function completePasswordReset(token: string, newPassword: string) {
  try {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "PASSWORD_TOO_SHORT" };
    }

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
    return { success: false, error: error?.message || "RESET_FAILED" };
  }
}
