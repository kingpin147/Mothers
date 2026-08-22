"use server";

import { db } from "@/db";
import { eventPass, event, person, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function getGuestTicketByToken(token: string) {
  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const passRecord = await db.query.eventPass.findFirst({
      where: eq(eventPass.ticketTokenHash, tokenHash),
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
        purchasedAt: passRecord.purchasedAt,
        creditExpiresAt: passRecord.creditExpiresAt,
        eventTitle: ev.title,
        startsAt: ev.startsAt,
        endsAt: ev.endsAt,
        venueName: ev.venueName,
        meetingPoint: ev.meetingPoint, // Revealed to ticket holder
        neighbourhood: ev.neighbourhood,
        guestName: personRecord.firstName,
      },
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "LOOKUP_FAILED" };
  }
}

export async function releaseGuestTicket(token: string) {
  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const passRecord = await db.query.eventPass.findFirst({
      where: eq(eventPass.ticketTokenHash, tokenHash),
    });

    if (!passRecord || passRecord.status !== "paid") {
      return { success: false, error: "TICKET_CANNOT_BE_RELEASED" };
    }

    await db
      .update(eventPass)
      .set({
        status: "released",
        releasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(eventPass.id, passRecord.id));

    // Audit log
    await db.insert(auditLog).values({
      actorId: passRecord.personId,
      actorType: "system",
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
