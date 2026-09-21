"use server";

import { db } from "@/db";
import { person, waitlistEntry } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const joinWaitlistSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  source: z.string().trim().optional(),
});

export async function joinWaitlist(rawData: {
  firstName: string;
  lastName: string;
  email: string;
  source?: string;
}) {
  const parsed = joinWaitlistSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }
  const data = parsed.data;

  try {
    // 1. Check if person exists
    let existingPerson = await db.query.person.findFirst({
      where: eq(person.email, data.email),
    });

    let personId = existingPerson?.id;

    // 2. If not, create person
    if (!personId) {
      const [newPerson] = await db
        .insert(person)
        .values({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
        })
        .returning();
      personId = newPerson.id;
    }

    // 3. Check if already on waitlist
    const existingEntry = await db.query.waitlistEntry.findFirst({
      where: eq(waitlistEntry.personId, personId),
    });

    if (existingEntry) {
      return { success: true, message: "already_joined" };
    }

    // 4. Join waitlist
    await db.insert(waitlistEntry).values({
      personId,
      source: data.source || "membership_page",
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to join waitlist:", error);
    return { success: false, error: "Failed to join waitlist" };
  }
}
