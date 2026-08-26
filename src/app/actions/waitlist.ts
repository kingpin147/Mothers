"use server";

import { db } from "@/db";
import { person, waitlistEntry } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function joinWaitlist(data: {
  firstName: string;
  lastName: string;
  email: string;
  source?: string;
}) {
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
