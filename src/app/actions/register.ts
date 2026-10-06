"use server";

import { db } from "@/db";
import { person, member, memberCredential, leadEntry, emailVerification } from "@/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getPublicClubSettings } from "@/app/actions/adminSettings";
import { z } from "zod";
import { checkSignUpRateLimit, getClientIp } from "@/lib/rate-limit";
import { captureException } from "@/lib/error-monitoring";
import { sendVerificationCodeEmail, sendAccountWelcomeEmail } from "@/lib/brevo";

const registerSchema = z
  .object({
    firstName: z.string().trim().optional(),
    lastName: z.string().trim().optional(),
    name: z.string().trim().optional(),
    email: z.string().trim().email("Please enter a valid email address.").toLowerCase(),
    password: z.string().min(8, "Passwords must be at least 8 characters."),
    letter: z.boolean().default(true),
    locale: z.enum(["en", "es", "fr"]).default("en"),
  })
  .refine(
    (data) => (data.firstName && data.firstName.length > 0) || (data.name && data.name.length > 0),
    { message: "Please tell us your name." }
  );

/**
 * Step 1: Request a 6-digit OTP verification code before account creation
 */
export async function sendSignupVerificationOtp(rawData: {
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  password?: string;
  locale?: "en" | "es" | "fr";
}) {
  const ip = await getClientIp();
  const rateCheck = checkSignUpRateLimit(ip);
  if (!rateCheck.success) {
    return {
      success: false as const,
      error: rateCheck.error || "Too many registration attempts. Please try again later.",
    };
  }

  const email = (rawData.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return {
      success: false as const,
      error: "Please enter a valid email address.",
    };
  }

  let firstName = rawData.firstName?.trim() || "";
  if (!firstName && rawData.name) {
    firstName = rawData.name.trim().split(/\s+/)[0] || "Friend";
  }
  if (!firstName) firstName = "Friend";

  try {
    // Check if account already exists with password
    const existingPerson = await db.query.person.findFirst({
      where: eq(person.email, email),
    });

    if (existingPerson) {
      const existingCred = await db.query.memberCredential.findFirst({
        where: eq(memberCredential.personId, existingPerson.id),
      });
      if (existingCred) {
        return {
          success: false as const,
          error: "ACCOUNT_EXISTS",
        };
      }
    }

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store in emailVerification table
    await db.insert(emailVerification).values({
      email,
      code,
      expiresAt,
      attempts: 0,
    });

    // Send email via Brevo using 'Email - Verify Your Email.html'
    await sendVerificationCodeEmail({
      email,
      firstName,
      code,
    });

    return {
      success: true as const,
      email,
    };
  } catch (err: any) {
    console.error("[sendSignupVerificationOtp error]", err);
    await captureException(err, { source: "register", action: "sendSignupVerificationOtp" });
    return {
      success: false as const,
      error: "Unable to send verification code. Please verify your email address and try again.",
    };
  }
}

/**
 * Step 2: Verify the 6-digit OTP code and create the account
 */
export async function verifyOtpAndCreateAccount(rawData: {
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  password: string;
  code: string;
  letter?: boolean;
  locale?: "en" | "es" | "fr";
}) {
  const parsed = registerSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Invalid registration data",
    };
  }

  const { firstName: rawFirst, lastName: rawLast, name, email, password, letter, locale } = parsed.data;
  const inputCode = (rawData.code || "").replace(/\D/g, "").trim();

  if (!inputCode || inputCode.length !== 6) {
    return {
      success: false as const,
      error: "Please enter a valid 6-digit code.",
    };
  }

  try {
    // Look up verification record
    const record = await db.query.emailVerification.findFirst({
      where: and(
        eq(emailVerification.email, email),
        gte(emailVerification.expiresAt, new Date())
      ),
      orderBy: [desc(emailVerification.createdAt)],
    });

    if (!record) {
      return {
        success: false as const,
        error: "Verification code expired or not found. Please request a new code.",
      };
    }

    if (record.attempts >= 5) {
      return {
        success: false as const,
        error: "Too many failed attempts. Please request a new code.",
      };
    }

    if (record.code !== inputCode) {
      await db
        .update(emailVerification)
        .set({ attempts: record.attempts + 1 })
        .where(eq(emailVerification.id, record.id));

      return {
        success: false as const,
        error: "Incorrect verification code. Please check your email.",
      };
    }

    // Code is valid -> proceed with account registration
    let firstName = rawFirst?.trim() || "";
    let lastName = rawLast?.trim() || "";

    if (!firstName && name) {
      const parts = name.trim().split(/\s+/);
      firstName = parts[0] || "Member";
      lastName = parts.slice(1).join(" ") || "";
    } else if (!lastName && name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length > 1) {
        lastName = parts.slice(1).join(" ");
      }
    }

    if (!firstName) firstName = "Member";

    const clubSettings = await getPublicClubSettings();

    // Check if person exists
    const existingPerson = await db.query.person.findFirst({
      where: eq(person.email, email),
    });

    let personId = "";

    if (existingPerson) {
      const existingCred = await db.query.memberCredential.findFirst({
        where: eq(memberCredential.personId, existingPerson.id),
      });

      if (existingCred) {
        return {
          success: false as const,
          error: "ACCOUNT_EXISTS",
        };
      }

      personId = existingPerson.id;

      if (lastName && !existingPerson.lastName) {
        await db.update(person).set({
          firstName: firstName !== "Member" ? firstName : existingPerson.firstName,
          lastName,
        }).where(eq(person.id, existingPerson.id));
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await db.insert(memberCredential).values({
        personId: existingPerson.id,
        passwordHash,
      });

      const existingMember = await db.query.member.findFirst({
        where: eq(member.personId, existingPerson.id),
      });

      if (!existingMember) {
        await db.insert(member).values({
          personId: existingPerson.id,
          status: "applicant",
          tier: "circle",
          billingFrequency: "monthly",
        });
      }
    } else {
      const passwordHash = await bcrypt.hash(password, 10);

      const [newPerson] = await db
        .insert(person)
        .values({
          firstName,
          lastName,
          email,
          locale: locale || "en",
          source: "signup",
          marketingOptIn: letter,
          createdBeforeLaunch: !clubSettings.membershipLive,
          profileDone: false,
        })
        .returning();

      personId = newPerson.id;

      await Promise.all([
        db.insert(member).values({
          personId: newPerson.id,
          status: "applicant",
          tier: "circle",
          billingFrequency: "monthly",
        }),
        db.insert(memberCredential).values({
          personId: newPerson.id,
          passwordHash,
        }),
      ]);
    }

    if (letter) {
      const existingLead = await db.query.leadEntry.findFirst({
        where: eq(leadEntry.email, email),
      });
      if (!existingLead) {
        await db.insert(leadEntry).values({
          email,
          source: "signup",
          type: "newsletter",
        });
      }
    }

    // Clean up verification record
    try {
      await db.delete(emailVerification).where(eq(emailVerification.id, record.id));
    } catch {}

    // Send Welcome Email
    sendAccountWelcomeEmail({
      personId,
      email,
      firstName,
      planName: "Free Account (Pre-launch)",
    }).catch((e) => console.warn("Failed to send welcome email:", e));

    return { success: true as const };
  } catch (err: any) {
    console.error("[verifyOtpAndCreateAccount error]", err);
    await captureException(err, { source: "register", action: "verifyOtpAndCreateAccount" });
    return {
      success: false as const,
      error: "Unable to create your account. Please try again.",
    };
  }
}

/**
 * Backward compatibility direct registration
 */
export async function registerFreeAccount(rawData: {
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  password: string;
  letter?: boolean;
  locale?: "en" | "es";
}) {
  return sendSignupVerificationOtp(rawData);
}

