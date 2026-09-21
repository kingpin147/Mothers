"use server";

import { db } from "@/db";
import { eventPass, event, person, booking, auditLog } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";

const ticketTokenSchema = z.string().trim().min(1, "Ticket token is required");

export async function getGuestTicketByToken(rawToken: string) {
  const parsed = ticketTokenSchema.safeParse(rawToken);
  if (!parsed.success) {
    return { success: false, error: "INVALID_TOKEN" };
  }
  const token = parsed.data;

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const passRecord = await db.query.eventPass.findFirst({
      where: or(
        eq(eventPass.ticketTokenHash, tokenHash),
        eq(eventPass.ticketTokenHash, token),
        eq(eventPass.id, token)
      ),
    });

    if (!passRecord) {
      return { success: false, error: "TICKET_NOT_FOUND" };
    }

    const [ev, personRecord] = await Promise.all([
      db.query.event.findFirst({ where: eq(event.id, passRecord.eventId) }),
      db.query.person.findFirst({ where: eq(person.id, passRecord.personId) }),
    ]);

    if (!ev || !personRecord) {
      return { success: false, error: "EVENT_OR_PERSON_NOT_FOUND" };
    }

    // Token expires 48 hours after event (§9)
    const tokenExpiresAt = new Date(new Date(ev.endsAt).getTime() + 48 * 60 * 60 * 1000);
    if (new Date() > tokenExpiresAt) {
      return { success: false, error: "TOKEN_EXPIRED" };
    }

    return {
      success: true,
      ticket: {
        passId: passRecord.id,
        status: passRecord.status,
        priceCents: passRecord.priceCents || 3500,
        purchasedAt: passRecord.purchasedAt,
        creditExpiresAt: passRecord.creditExpiresAt,
        eventTitle: ev.title,
        startsAt: ev.startsAt,
        endsAt: ev.endsAt,
        venueName: ev.venueName,
        meetingPoint: ev.meetingPoint, // Revealed to ticket holder
        neighbourhood: ev.neighbourhood,
        guestName: personRecord.firstName || "Guest",
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "LOOKUP_FAILED" };
  }
}

export async function releaseGuestTicket(rawToken: string) {
  const parsed = ticketTokenSchema.safeParse(rawToken);
  if (!parsed.success) {
    return { success: false, error: "INVALID_TOKEN" };
  }
  const token = parsed.data;

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const passRecord = await db.query.eventPass.findFirst({
      where: eq(eventPass.ticketTokenHash, tokenHash),
    });

    if (!passRecord || passRecord.status !== "paid") {
      return { success: false, error: "TICKET_CANNOT_BE_RELEASED" };
    }

    const now = new Date();

    // 1. Update event pass status
    await db
      .update(eventPass)
      .set({
        status: "released",
        releasedAt: now,
        updatedAt: now,
      })
      .where(eq(eventPass.id, passRecord.id));

    // 2. Synchronize the booking record so capacity & roster update properly
    await db
      .update(booking)
      .set({
        status: "released",
        releasedAt: now,
        updatedAt: now,
      })
      .where(
        or(
          eq(booking.passId, passRecord.id),
          and(
            eq(booking.eventId, passRecord.eventId),
            eq(booking.personId, passRecord.personId)
          )
        )
      );

    // 3. Write audit log
    await db.insert(auditLog).values({
      actorId: passRecord.personId,
      actorType: "guest",
      action: "release_guest_pass",
      entity: "event_pass",
      entityId: passRecord.id,
      before: { status: "paid" },
      after: { status: "released" },
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "RELEASE_FAILED" };
  }
}
