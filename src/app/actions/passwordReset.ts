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

    const htmlContent = `\n<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Set a new password — The Mothers</title>
<!--[if mso]>
<style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style>
<![endif]-->
<style>
@media only screen and (max-width:620px){
  .px{padding-left:24px !important;padding-right:24px !important;}
  .h1{font-size:30px !important;line-height:36px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#efeae1;">
<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">A link to set a new password. It works once, and expires in an hour.</span>

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
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">Password reset</div>
<h1 class="h1" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:42px;mso-line-height-rule:exactly;font-weight:normal;color:#2A1E20;">Let's get you back in.</h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:27px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0 0 16px;">Hello <span style="color:#7b1f2c;">${personRecord.firstName}</span>,</p>
<p style="margin:0 0 16px;">Someone asked to reset the password for <strong style="font-weight:normal;color:#7b1f2c;">${cleanEmail}</strong>. If that was you, the button below sets a new one.</p>
<p style="margin:0;">If it wasn't you, nothing has changed and you can ignore this. Your password still works and nobody has been let in.</p>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td bgcolor="#7b1f2c" style="border-radius:4px;">
<a href="${resetUrl}" style="display:block;padding:16px 34px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:22px;mso-line-height-rule:exactly;color:#faf7f1;text-decoration:none;">Set a new password</a>
</td>
</tr>
</table>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:#8a807a;padding-top:12px;">This link works once and expires in 2 hours. Asking again sends a fresh one.</div>
</td>
</tr>

<tr>
<td class="px" style="padding:32px 48px 0;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">If it will not work</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#2A1E20;">
<tr>
<td width="26" valign="top" style="width:26px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">01</td>
<td valign="top" style="">Expired links are the usual culprit — request another from the sign-in page and use it straight away.</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding-top:10px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">02</td>
<td valign="top" style="padding-top:10px;">Use the address you joined with. If you are not sure which that is, reply and we will look it up.</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding-top:10px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">03</td>
<td valign="top" style="padding-top:10px;">We will never ask you for your password, by email or otherwise.</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#5c534e;">
<p style="margin:0;">Still locked out? Reply to this email and a person will sort it out with you.</p>
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
You're receiving this because a password reset was requested for your account.<br>
If you did not ask for it, no action is needed.
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
