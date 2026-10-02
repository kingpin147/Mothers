"use server";

import { db } from "@/db";
import { person, member, memberCredential, leadEntry } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getPublicClubSettings } from "@/app/actions/adminSettings";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name."),
  email: z.string().trim().email("Please enter a valid email address.").toLowerCase(),
  password: z.string().min(8, "Passwords must be at least 8 characters."),
  letter: z.boolean().default(true),
  locale: z.enum(["en", "es"]).default("en"),
});

export async function registerFreeAccount(rawData: {
  name: string;
  email: string;
  password: string;
  letter?: boolean;
  locale?: "en" | "es";
}) {
  const parsed = registerSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid registration data",
    };
  }

  const { name, email, password, letter, locale } = parsed.data;

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

    // Split name into first and last name
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] || "Member";
    const lastName = parts.slice(1).join(" ") || "";

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
    console.error("registerFreeAccount error:", err);
    return {
      success: false,
      error: err.message || "Failed to create account. Please try again.",
    };
  }
}
