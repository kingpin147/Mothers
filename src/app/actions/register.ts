"use server";

import { db } from "@/db";
import { person, member, memberCredential, leadEntry } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getPublicClubSettings } from "@/app/actions/adminSettings";
import { z } from "zod";
import { checkSignUpRateLimit, getClientIp } from "@/lib/rate-limit";
import { captureException } from "@/lib/error-monitoring";

const registerSchema = z
  .object({
    firstName: z.string().trim().optional(),
    lastName: z.string().trim().optional(),
    name: z.string().trim().optional(),
    email: z.string().trim().email("Please enter a valid email address.").toLowerCase(),
    password: z.string().min(8, "Passwords must be at least 8 characters."),
    letter: z.boolean().default(true),
    locale: z.enum(["en", "es"]).default("en"),
  })
  .refine(
    (data) => (data.firstName && data.firstName.length > 0) || (data.name && data.name.length > 0),
    { message: "Please tell us your name." }
  );

export async function registerFreeAccount(rawData: {
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  password: string;
  letter?: boolean;
  locale?: "en" | "es";
}) {
  const ip = await getClientIp();
  const rateCheck = checkSignUpRateLimit(ip);
  if (!rateCheck.success) {
    return {
      success: false,
      error: rateCheck.error || "Too many registration attempts. Please try again later.",
    };
  }

  const parsed = registerSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid registration data",
    };
  }

  const { firstName: rawFirst, lastName: rawLast, name, email, password, letter, locale } = parsed.data;

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

  try {
    const clubSettings = await getPublicClubSettings();

    // Check if person exists
    const existingPerson = await db.query.person.findFirst({
      where: eq(person.email, email),
    });

    if (existingPerson) {
      // Check if credential already exists
      const existingCred = await db.query.memberCredential.findFirst({
        where: eq(memberCredential.personId, existingPerson.id),
      });

      if (existingCred) {
        return {
          success: false,
          error: "ACCOUNT_EXISTS",
        };
      }

      // If existing person doesn't have lastName but new registration provided it, update it
      if (lastName && !existingPerson.lastName) {
        await db.update(person).set({
          firstName: firstName !== "Member" ? firstName : existingPerson.firstName,
          lastName,
        }).where(eq(person.id, existingPerson.id));
      }

      // Person exists (e.g. from leads/subscribers) but has no password yet
      const passwordHash = await bcrypt.hash(password, 10);
      await db.insert(memberCredential).values({
        personId: existingPerson.id,
        passwordHash,
      });

      // Ensure member record exists
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

      return { success: true };
    }

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

    return { success: true };
  } catch (err: any) {
    await captureException(err, { source: "register", action: "registerFreeAccount" });
    return {
      success: false,
      error: err.message || "Failed to create account. Please try again.",
    };
  }
}
