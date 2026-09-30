"use server";

import { db } from "@/db";
import { leadEntry } from "@/db/schema";
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
    const existingEntry = await db.query.leadEntry.findFirst({
      where: eq(leadEntry.email, data.email),
    });

    if (existingEntry) {
      return { success: true, message: "already_joined" };
    }

    await db.insert(leadEntry).values({
      email: data.email,
      source: data.source || "membership_page",
      type: "waitlist",
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to join waitlist:", error);
    return { success: false, error: "Failed to join waitlist" };
  }
}

