"use server";

import { db } from "@/db";
import {
  event,
  booking,
  creditBatch,
  member,
  person,
  eventWaitlist,
  auditLog,
  memberCredential,
} from "@/db/schema";
import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { canBook, canRelease } from "@/lib/access";
import {
  getPersonWalletBalance,
  spendPersonCreditsFIFO,
  refundPersonCredits,
  refundBookingCredits,
  grantCreditsToPerson,
} from "@/lib/ledger";
import {
  queueAndSendEmail,
  generateBookingConfirmedEmailHtml,
} from "@/lib/brevo";
import { getAppUrl } from "@/lib/urls";
import crypto from "crypto";
import { z } from "zod";

import { getPublicClubSettings } from "@/app/actions/adminSettings";

// ─── 1. UNIVERSAL EVENT BOOKING WITH FIFO WALLET (§7.1) ──────────────────────

const bookEventSchema = z.object({ eventId: z.string().min(1) });

export async function bookEvent(eventId: string) {
  const parsed = bookEventSchema.safeParse({ eventId });
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };
  eventId = parsed.data.eventId;

  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "AUTH_REQUIRED" };
  }

  const personId = (session.user as any).personId || session.user.id;
  let memberId = (session.user as any).memberId || null;

  try {
    const clubSettings = await getPublicClubSettings();

    const result = await db.transaction(async (tx) => {
      // 1. SELECT ... FOR UPDATE on the event row
      const eventRows = await tx
        .select()
        .from(event)
        .where(eq(event.id, eventId))
        .for("update");

      if (eventRows.length === 0) {
        throw new Error("EVENT_NOT_FOUND");
      }
      const ev = eventRows[0];

      // 2. Fetch Person record and check suspension / member status
      const personRecord = await tx.query.person.findFirst({
        where: eq(person.id, personId),
      });

      if (!personRecord) {
        throw new Error("PERSON_NOT_FOUND");
      }

      if (personRecord.isSuspended) {
        throw new Error("ACCOUNT_SUSPENDED");
      }

      if (!memberId) {
        const mem = await tx.query.member.findFirst({
          where: eq(member.personId, personId),
        });
        if (mem && mem.status === "active") {
          memberId = mem.id;
        }
      }

      const isMember = !!memberId;

      // 3. Members-First Window check (§7.1) - only active when membership is live
      if (
        clubSettings.membershipLive &&
        !isMember &&
        ev.nonMemberOpensAt &&
        new Date() < new Date(ev.nonMemberOpensAt)
      ) {
        throw new Error("MEMBERS_FIRST_WINDOW_ACTIVE");
      }

      // 4. Calculate required credits
      let requiredCredits = 0;
      if (ev.isFreeWalk) {
        requiredCredits = 0;
      } else if (!clubSettings.membershipLive) {
        // Pre-launch mode: everyone pays the non-member credit cost (€2/credit)
        requiredCredits = ev.nonMemberCredits > 0 ? ev.nonMemberCredits : ev.creditCost;
      } else if (isMember) {
        requiredCredits = ev.memberCredits > 0 ? ev.memberCredits : ev.creditCost;
      } else {
        requiredCredits = ev.nonMemberCredits > 0 ? ev.nonMemberCredits : ev.creditCost;
      }

      // 5. Count existing active bookings for this person & on this event (excluding expired holds)
      const activeBookingCondition = sql`(${booking.status} = 'confirmed' OR (${booking.status} = 'held' AND (${booking.heldUntil} IS NULL OR ${booking.heldUntil} > NOW())))`;

      const [existingBooking, activeBookingsResult] = await Promise.all([
        tx.query.booking.findFirst({
          where: and(
            eq(booking.eventId, eventId),
            eq(booking.personId, personId),
            activeBookingCondition
          ),
        }),
        tx
          .select({ count: sql<number>`count(*)` })
          .from(booking)
          .where(
            and(
              eq(booking.eventId, eventId),
              activeBookingCondition
            )
          ),
      ]);

      if (existingBooking) {
        throw new Error("ALREADY_BOOKED");
      }

      const currentActiveCount = Number(activeBookingsResult[0]?.count || 0);
      const totalCapacity = ev.capacityMember || 0;
      if (totalCapacity > 0 && currentActiveCount >= totalCapacity) {
        throw new Error("EVENT_FULL");
      }

      // 6. Check & Spend Credits via Unified FIFO Wallet if requiredCredits > 0
      let creditDeductions: Array<{ batchId: string; deducted: number; expiresAt: string }> = [];
      if (requiredCredits > 0) {
        const currentBalance = await getPersonWalletBalance(personId, tx);
        if (currentBalance < requiredCredits) {
          throw new Error("INSUFFICIENT_CREDITS");
        }
        const spendResult = await spendPersonCreditsFIFO(personId, requiredCredits, tx);
        creditDeductions = (spendResult.batchesDeducted || []).map((b) => ({
          batchId: b.batchId,
          deducted: b.deducted,
          expiresAt: new Date(b.expiresAt).toISOString(),
        }));
      }

      // 7. Check Quorum
      const newActiveCount = currentActiveCount + 1;
      const isQuorumReached =
        ev.status === "published_pending" &&
        ev.minToConfirm != null &&
        ev.minToConfirm > 0 &&
        newActiveCount >= ev.minToConfirm;

      const targetEventStatus = isQuorumReached ? "confirmed" : ev.status;
      const initialStatus =
        targetEventStatus === "confirmed" || ev.status === "confirmed"
          ? "confirmed"
          : "held";

      if (isQuorumReached) {
        // Auto-promote event
        await tx
          .update(event)
          .set({
            status: "confirmed",
            confirmedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(event.id, eventId));

        // Promote all held bookings
        await tx
          .update(booking)
          .set({
            status: "confirmed",
            updatedAt: new Date(),
          })
          .where(and(eq(booking.eventId, eventId), eq(booking.status, "held")));
      }

      // 8. Insert official booking row (works for free walks, non-members & members!)
      const bookingInsert = await tx
        .insert(booking)
        .values({
          eventId,
          personId,
          memberId: memberId || null,
          kind: isMember ? "member" : "guest",
          status: initialStatus,
          creditsCharged: requiredCredits,
          creditDeductions,
          bookedAt: new Date(),
        })
        .returning({ id: booking.id });

      const newBookingId = bookingInsert[0].id;

      // 9. Settle oldest pending return awaiting replacement if any
      const oldestPendingReturn = await tx.query.booking.findFirst({
        where: and(
          eq(booking.eventId, eventId),
          eq(booking.pendingReturnState, "awaiting_replacement")
        ),
        orderBy: asc(booking.releasedAt),
      });

      if (oldestPendingReturn && oldestPendingReturn.personId && oldestPendingReturn.pendingReturnCredits > 0) {
        await tx
          .update(booking)
          .set({
            pendingReturnState: "settled_returned",
            updatedAt: new Date(),
          })
          .where(eq(booking.id, oldestPendingReturn.id));

        await refundBookingCredits(
          oldestPendingReturn,
          oldestPendingReturn.pendingReturnCredits,
          tx
        );
      }

      // 10. Write audit log
      await tx.insert(auditLog).values({
        actorId: personId,
        actorType: isMember ? "member" : "guest",
        action: "book_event",
        entity: "booking",
        entityId: newBookingId,
        after: {
          eventId,
          status: initialStatus,
          creditsCharged: requiredCredits,
          eventAutoConfirmed: isQuorumReached,
        },
      });

      return {
        bookingId: newBookingId,
        eventTitle: ev.title,
        status: initialStatus,
        eventStatus: targetEventStatus,
        startsAt: ev.startsAt,
        venueName: ev.venueName,
        meetingPoint: ev.meetingPoint,
        creditsCharged: requiredCredits,
      };
    });

    // 11. Post-commit: queue email confirmation
    const personRecord = await db.query.person.findFirst({
      where: eq(person.id, personId),
    });

    if (personRecord) {
      const origin = getAppUrl();
      const isEs = personRecord.locale === "es";
      const eventDateFormatted = new Date(result.startsAt).toLocaleDateString(
        isEs ? "es-ES" : "en-US",
        { weekday: "short", month: "short", day: "numeric", year: "numeric" }
      );
      const eventTimeFormatted = new Date(result.startsAt).toLocaleTimeString(
        isEs ? "es-ES" : "en-GB",
        { hour: "2-digit", minute: "2-digit" }
      );

      const subject = isEs
        ? `Tu plaza está reservada — ${result.eventTitle}, ${eventDateFormatted}`
        : `You're booked — ${result.eventTitle}, ${eventDateFormatted}`;

      const htmlContent = generateBookingConfirmedEmailHtml({
        firstName: personRecord.firstName || "Friend",
        eventTitle: result.eventTitle,
        eventDateFormatted,
        eventTimeFormatted,
        venueName: result.venueName || undefined,
        meetingPoint: result.meetingPoint || result.venueName || undefined,
        creditsCharged: result.creditsCharged,
        startsAt: result.startsAt,
        appUrl: origin,
        isEs,
      });

      await queueAndSendEmail({
        personId,
        toEmail: personRecord.email,
        toName: `${personRecord.firstName || ""} ${personRecord.lastName || ""}`.trim() || "Member",
        templateKey: "booking_confirmed",
        dedupeKey: `booking_confirmed_${result.bookingId}`,
        subject,
        htmlContent,
        isTransactional: true,
      });
    }

    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/admin/events");
    revalidatePath("/account");

    return {
      success: true,
      bookingId: result.bookingId,
      status: result.status,
      eventStatus: result.eventStatus,
    };
  } catch (error: any) {
    console.error("bookEvent error:", error);
    return { success: false, error: error?.message || "BOOKING_FAILED" };
  }
}

// ─── 2. HOLD BOOKING FOR TOP-UP (10-MINUTE HOLD WINDOW) ─────────────────────

export async function holdBookingForTopUp(eventId: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };

  const personId = (session.user as any).personId || session.user.id;
  let memberId = (session.user as any).memberId || null;

  try {
    const clubSettings = await getPublicClubSettings();

    const result = await db.transaction(async (tx) => {
      const ev = await tx.query.event.findFirst({
        where: eq(event.id, eventId),
      });

      if (!ev) throw new Error("EVENT_NOT_FOUND");

      const activeBookingCondition = sql`(${booking.status} = 'confirmed' OR (${booking.status} = 'held' AND (${booking.heldUntil} IS NULL OR ${booking.heldUntil} > NOW())))`;

      const existingBooking = await tx.query.booking.findFirst({
        where: and(
          eq(booking.eventId, eventId),
          eq(booking.personId, personId),
          activeBookingCondition
        ),
      });

      if (existingBooking) {
        return { bookingId: existingBooking.id };
      }

      if (!memberId) {
        const mem = await tx.query.member.findFirst({
          where: eq(member.personId, personId),
        });
        if (mem && mem.status === "active") {
          memberId = mem.id;
        }
      }

      const isMember = !!memberId;
      let requiredCredits = 0;
      if (ev.isFreeWalk) {
        requiredCredits = 0;
      } else if (!clubSettings.membershipLive) {
        requiredCredits = ev.nonMemberCredits > 0 ? ev.nonMemberCredits : ev.creditCost;
      } else if (isMember) {
        requiredCredits = ev.memberCredits > 0 ? ev.memberCredits : ev.creditCost;
      } else {
        requiredCredits = ev.nonMemberCredits > 0 ? ev.nonMemberCredits : ev.creditCost;
      }

      const heldUntil = new Date(Date.now() + 10 * 60 * 1000); // 10-minute hold window

      const [inserted] = await tx
        .insert(booking)
        .values({
          eventId,
          personId,
          memberId,
          kind: isMember ? "member" : "guest",
          status: "held",
          heldUntil,
          creditsCharged: requiredCredits,
          bookedAt: new Date(),
        })
        .returning({ id: booking.id });

      return { bookingId: inserted.id };
    });

    return { success: true, bookingId: result.bookingId };
  } catch (err: any) {
    return { success: false, error: err?.message || "HOLD_FAILED" };
  }
}

// ─── 3. RELEASE BOOKING WITH CANCELLATION WINDOW CHECK & REFUND (§7.3) ───────

const releaseBookingSchema = z.object({ bookingId: z.string().min(1) });

export async function releaseBooking(bookingId: string) {
  const parsed = releaseBookingSchema.safeParse({ bookingId });
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };
  bookingId = parsed.data.bookingId;

  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "AUTH_REQUIRED" };
  }

  const personId = (session.user as any).personId || session.user.id;

  try {
    const result = await db.transaction(async (tx) => {
      const bookingRows = await tx
        .select()
        .from(booking)
        .where(eq(booking.id, bookingId))
        .for("update");

      if (bookingRows.length === 0) {
        throw new Error("BOOKING_NOT_FOUND");
      }
      const b = bookingRows[0];

      if (b.personId !== personId) {
        throw new Error("UNAUTHORIZED_RELEASE");
      }

      if (b.status !== "held" && b.status !== "confirmed") {
        throw new Error("BOOKING_NOT_ACTIVE");
      }

      const ev = await tx.query.event.findFirst({
        where: eq(event.id, b.eventId),
      });

      if (!ev) throw new Error("EVENT_NOT_FOUND");

      const msUntilEvent = new Date(ev.startsAt).getTime() - Date.now();
      const hoursUntilEvent = msUntilEvent / (1000 * 60 * 60);
      const cancellationWindow = ev.cancellationWindowHours ?? 24;
      const refundPercent = ev.cancellationRefundPercent ?? 100;
      const isInsideWindow = hoursUntilEvent <= cancellationWindow;

      let returnedCredits = 0;
      if (b.creditsCharged > 0 && !isInsideWindow) {
        returnedCredits = Math.floor(b.creditsCharged * (refundPercent / 100));
      }

      await tx
        .update(booking)
        .set({
          status: "released",
          releasedAt: new Date(),
          updatedAt: new Date(),
          ...(isInsideWindow && b.creditsCharged > 0
            ? {
                pendingReturnState: "awaiting_replacement",
                pendingReturnCredits: b.creditsCharged,
              }
            : {}),
        })
        .where(eq(booking.id, bookingId));

      if (returnedCredits > 0) {
        await refundBookingCredits(b, returnedCredits, tx);
      }

      // Waitlist logic (§7.4 / B-08)
      // >24h out: first in line gets 12h
      // <=24h out: notify everyone on waitlist, first to click books
      const allWaitlist = await tx
        .select()
        .from(eventWaitlist)
        .where(
          and(
            eq(eventWaitlist.eventId, b.eventId),
            sql`accepted_at IS NULL`
          )
        )
        .orderBy(asc(eventWaitlist.position));

      const notifyWaitlistPersonIds: string[] = [];

      if (allWaitlist.length > 0) {
        if (hoursUntilEvent > 24) {
          const topWaitlist = allWaitlist[0];
          const offerExpiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

          await tx
            .update(eventWaitlist)
            .set({
              offeredAt: new Date(),
              offerExpiresAt,
            })
            .where(eq(eventWaitlist.id, topWaitlist.id));

          notifyWaitlistPersonIds.push(topWaitlist.personId);
        } else {
          // Less than 24h out: broadcast offer to everyone on waitlist
          const offerExpiresAt = new Date(ev.startsAt);
          await tx
            .update(eventWaitlist)
            .set({
              offeredAt: new Date(),
              offerExpiresAt,
            })
            .where(
              and(
                eq(eventWaitlist.eventId, b.eventId),
                sql`accepted_at IS NULL`
              )
            );

          for (const wl of allWaitlist) {
            notifyWaitlistPersonIds.push(wl.personId);
          }
        }
      }

      await tx.insert(auditLog).values({
        actorId: personId,
        actorType: b.kind === "member" ? "member" : "guest",
        action: "release_booking",
        entity: "booking",
        entityId: bookingId,
        before: { status: b.status },
        after: { status: "released", returnedCredits, waitlistNotified: notifyWaitlistPersonIds.length },
      });

      return {
        eventId: b.eventId,
        eventTitle: ev.title,
        returnedCredits,
        notifyWaitlistPersonIds,
      };
    });

    // Notify waitlist users using Place Still Open approved template (B-08 / E-01)
    if (result.notifyWaitlistPersonIds && result.notifyWaitlistPersonIds.length > 0) {
      const { sendPlaceStillOpenEmail } = await import("@/lib/brevo");
      for (const pId of result.notifyWaitlistPersonIds) {
        const waitingPerson = await db.query.person.findFirst({
          where: eq(person.id, pId),
        });
        if (waitingPerson) {
          await sendPlaceStillOpenEmail({
            personId: waitingPerson.id,
            email: waitingPerson.email,
            firstName: waitingPerson.firstName || "Friend",
            eventTitle: result.eventTitle,
            eventId: result.eventId,
          }).catch((err) => console.error("Error sending waitlist offer email:", err));
        }
      }
    }

    revalidatePath("/events");
    if (result.eventId) revalidatePath(`/events/${result.eventId}`);
    revalidatePath("/account");

    return { success: true, returnedCredits: result.returnedCredits };
  } catch (error: any) {
    console.error("releaseBooking error:", error);
    return { success: false, error: error?.message || "RELEASE_FAILED" };
  }
}

// ─── 4. BUY EXTRA CREDITS (FOR ALL ACCOUNT HOLDERS §20.3) ────────────────────

export async function buyExtraCredits(amount: number, eventId?: string) {
  if (!Number.isInteger(amount) || amount < 5 || amount > 100) {
    return { success: false, error: "INVALID_AMOUNT_MIN_5" };
  }

  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };

  const personId = (session.user as any).personId || session.user.id;
  const personRecord = await db.query.person.findFirst({
    where: eq(person.id, personId),
  });

  if (!personRecord) return { success: false, error: "PERSON_NOT_FOUND" };

  try {
    const { stripe } = await import("@/lib/stripe");
    const origin = getAppUrl();

    const sessionStripe = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: personRecord.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `THE Mothers — ${amount} Event Credits`,
              description: `€2/credit · 6-month validity · THE Mothers Barcelona`,
            },
            unit_amount: 200, // €2.00 per credit in cents
          },
          quantity: amount,
        },
      ],
      metadata: {
        type: "topup",
        personId: personRecord.id,
        creditAmount: String(amount),
        eventId: eventId || "",
        company: "THE Mothers",
      },
      custom_text: {
        submit: {
          message: "Official checkout for THE Mothers Barcelona.",
        },
      },
      success_url: eventId
        ? `${origin}/events/${eventId}?topup_success=true&credits=${amount}`
        : `${origin}/account?credits_purchased=true&amount=${amount}`,
      cancel_url: eventId
        ? `${origin}/events/${eventId}`
        : `${origin}/account`,
    });

    return { success: true, url: sessionStripe.url };
  } catch (error: any) {
    console.error("buyExtraCredits error:", error);
    return { success: false, error: error?.message || "CHECKOUT_FAILED" };
  }
}

// ─── 5. JOIN EVENT WAITLIST (§7.4) ───────────────────────────────────────────

export async function joinEventWaitlist(eventId: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };

  const personId = (session.user as any).personId || session.user.id;

  try {
    const result = await db.transaction(async (tx) => {
      const existing = await tx.query.eventWaitlist.findFirst({
        where: and(
          eq(eventWaitlist.eventId, eventId),
          eq(eventWaitlist.personId, personId)
        ),
      });

      if (existing) {
        throw new Error("ALREADY_ON_WAITLIST");
      }

      const maxPos = await tx
        .select({ max: sql<number>`MAX(position)` })
        .from(eventWaitlist)
        .where(eq(eventWaitlist.eventId, eventId));

      const nextPosition = (maxPos[0]?.max || 0) + 1;

      await tx.insert(eventWaitlist).values({
        eventId,
        personId,
        position: nextPosition,
      });

      return { position: nextPosition };
    });

    return { success: true, position: result.position };
  } catch (error: any) {
    return { success: false, error: error?.message || "WAITLIST_JOIN_FAILED" };
  }
}

// ─── 6. CLAIM WAITLIST OFFER (§7.4 / §B-08 / §B-03 / §B-05) ──────────────────

export async function claimWaitlistOffer(waitlistId: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };

  const personId = (session.user as any).personId || session.user.id;
  let memberId = (session.user as any).memberId || null;

  try {
    const clubSettings = await getPublicClubSettings();

    const result = await db.transaction(async (tx) => {
      // 1. Fetch Person and check suspension
      const personRecord = await tx.query.person.findFirst({
        where: eq(person.id, personId),
      });

      if (!personRecord) throw new Error("PERSON_NOT_FOUND");
      if (personRecord.isSuspended) throw new Error("ACCOUNT_SUSPENDED");

      if (!memberId) {
        const mem = await tx.query.member.findFirst({
          where: eq(member.personId, personId),
        });
        if (mem && mem.status === "active") {
          memberId = mem.id;
        }
      }

      const isMember = !!memberId;

      // 2. Fetch waitlist record and verify offer
      const waitlistRow = await tx.query.eventWaitlist.findFirst({
        where: and(
          eq(eventWaitlist.id, waitlistId),
          eq(eventWaitlist.personId, personId)
        ),
      });

      if (!waitlistRow || !waitlistRow.offeredAt) {
        throw new Error("NO_ACTIVE_OFFER");
      }

      if (waitlistRow.offerExpiresAt && new Date() > new Date(waitlistRow.offerExpiresAt)) {
        throw new Error("OFFER_EXPIRED");
      }

      const ev = await tx.query.event.findFirst({
        where: eq(event.id, waitlistRow.eventId),
      });

      if (!ev) throw new Error("EVENT_NOT_FOUND");

      // 3. Capacity check (First to claim wins! §B-08)
      const activeBookingCondition = sql`(${booking.status} = 'confirmed' OR (${booking.status} = 'held' AND (${booking.heldUntil} IS NULL OR ${booking.heldUntil} > NOW())))`;
      const activeBookingsCount = await tx
        .select({ count: sql<number>`count(*)` })
        .from(booking)
        .where(
          and(
            eq(booking.eventId, ev.id),
            activeBookingCondition
          )
        );

      const currentActiveCount = Number(activeBookingsCount[0]?.count || 0);
      const totalCapacity = ev.capacityMember || 0;
      if (totalCapacity > 0 && currentActiveCount >= totalCapacity) {
        throw new Error("EVENT_FULL");
      }

      // 4. Calculate cost based on membership status & live switch (§B-03)
      let cost = 0;
      if (ev.isFreeWalk) {
        cost = 0;
      } else if (!clubSettings.membershipLive) {
        cost = ev.nonMemberCredits > 0 ? ev.nonMemberCredits : ev.creditCost;
      } else if (isMember) {
        cost = ev.memberCredits > 0 ? ev.memberCredits : ev.creditCost;
      } else {
        cost = ev.nonMemberCredits > 0 ? ev.nonMemberCredits : ev.creditCost;
      }

      let creditDeductions: Array<{ batchId: string; deducted: number; expiresAt: string }> = [];
      if (cost > 0) {
        const currentBalance = await getPersonWalletBalance(personId, tx);
        if (currentBalance < cost) {
          throw new Error("INSUFFICIENT_CREDITS");
        }
        const spendResult = await spendPersonCreditsFIFO(personId, cost, tx);
        creditDeductions = (spendResult.batchesDeducted || []).map((b) => ({
          batchId: b.batchId,
          deducted: b.deducted,
          expiresAt: new Date(b.expiresAt).toISOString(),
        }));
      }

      await tx
        .update(eventWaitlist)
        .set({ acceptedAt: new Date() })
        .where(eq(eventWaitlist.id, waitlistId));

      const newBooking = await tx
        .insert(booking)
        .values({
          eventId: ev.id,
          personId,
          memberId: memberId || null,
          kind: isMember ? "member" : "guest",
          status: ev.status === "confirmed" ? "confirmed" : "held",
          creditsCharged: cost,
          creditDeductions,
          bookedAt: new Date(),
        })
        .returning();

      return { bookingId: newBooking[0].id };
    });

    revalidatePath("/events");
    revalidatePath("/account");

    return { success: true, bookingId: result.bookingId };
  } catch (error: any) {
    return { success: false, error: error?.message || "CLAIM_FAILED" };
  }
}

// ─── 8. CHECK BOOKING EMAIL STATUS ───────────────────────────────────────────

export type BookingEmailCheckResult = {
  exists: boolean;
  firstName?: string;
  hasPassword?: boolean;
  isAlreadyBooked?: boolean;
  availableCredits?: number;
  personId?: string;
};

export async function checkBookingEmailStatus(
  email: string,
  eventId?: string
): Promise<BookingEmailCheckResult> {
  try {
    const normalised = (email || "").toLowerCase().trim();
    if (!normalised || !normalised.includes("@")) {
      return { exists: false };
    }

    const existingPerson = await db.query.person.findFirst({
      where: eq(person.email, normalised),
    });

    if (!existingPerson) {
      return { exists: false };
    }

    const firstName = existingPerson.firstName || normalised.split("@")[0] || "Friend";

    const credential = await db.query.memberCredential.findFirst({
      where: eq(memberCredential.personId, existingPerson.id),
    });
    const hasPassword = !!credential && !!credential.passwordHash;

    let isAlreadyBooked = false;
    if (eventId) {
      const activeBookingCondition = sql`(${booking.status} = 'confirmed' OR (${booking.status} = 'held' AND (${booking.heldUntil} IS NULL OR ${booking.heldUntil} > NOW())))`;
      const activeBooking = await db.query.booking.findFirst({
        where: and(
          eq(booking.eventId, eventId),
          eq(booking.personId, existingPerson.id),
          activeBookingCondition
        ),
      });
      if (activeBooking) {
        isAlreadyBooked = true;
      }
    }

    const availableCredits = await getPersonWalletBalance(existingPerson.id);

    return {
      exists: true,
      firstName,
      hasPassword,
      isAlreadyBooked,
      availableCredits,
      personId: existingPerson.id,
    };
  } catch (err) {
    console.error("checkBookingEmailStatus error:", err);
    return { exists: false };
  }
}
