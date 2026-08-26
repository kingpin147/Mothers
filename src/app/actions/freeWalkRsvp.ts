"use server";

import { db } from "@/db";
import { guestRsvp } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function submitFreeWalkRsvp(data: {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsappE164?: string;
}) {
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
