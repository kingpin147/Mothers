"use server";

import { db } from "@/db";
import { guestRsvp } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const freeWalkRsvpSchema = z.object({
  eventId: z.string().trim().min(1, "Event ID is required"),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  whatsappE164: z.string().trim().optional(),
});

export async function submitFreeWalkRsvp(rawData: {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsappE164?: string;
}) {
  const parsed = freeWalkRsvpSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }
  const data = parsed.data;

  try {
    // 1. Check if already RSVP'd
    const existingEntry = await db.query.guestRsvp.findFirst({
      where: and(
        eq(guestRsvp.eventId, data.eventId),
        eq(guestRsvp.email, data.email)
      ),
    });

    if (existingEntry) {
      return { success: true, message: "already_registered" };
    }

    // 2. Add to guest_rsvp
    await db.insert(guestRsvp).values({
      eventId: data.eventId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      whatsappE164: data.whatsappE164 || null,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to submit free walk RSVP:", error);
    return { success: false, error: "Failed to submit RSVP" };
  }
}
