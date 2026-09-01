"use server";

import { db } from "@/db";
import { event, booking, creditEntry, creditAllocation, member, person, eventPass, eventWaitlist, auditLog } from "@/db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { canBook, canRelease, canBuyPass, canRsvp } from "@/lib/access";
import { spendCredits, returnCredits } from "@/lib/ledger";
import { queueAndSendEmail } from "@/lib/brevo";
import crypto from "crypto";
import { z } from "zod";

// ─── 1. MEMBER BOOKING WITH FOR UPDATE ROW LOCK (§7.1) ──────────────────────

const bookEventSchema = z.object({ eventId: z.string().uuid() });

export async function bookEvent(eventId: string) {
  const parsed = bookEventSchema.safeParse({ eventId });
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };
  eventId = parsed.data.eventId;

  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "AUTH_REQUIRED" };
  }

  const personId = (session.user as any).personId || session.user.id;
  const memberId = (session.user as any).memberId;

  if (!memberId) {
    return { success: false, error: "MEMBER_ACCOUNT_REQUIRED" };
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. SELECT ... FOR UPDATE on the event row (Lock first, validate second §7.1)
      const eventRows = await tx
        .select()
        .from(event)
        .where(eq(event.id, eventId))
        .for("update");

      if (eventRows.length === 0) {
        throw new Error("EVENT_NOT_FOUND");
      }
      const ev = eventRows[0];

      // 2. Fetch member record
      const memberRecord = await tx.query.member.findFirst({
        where: eq(member.id, memberId),
      });

      if (!memberRecord) {
        throw new Error("MEMBER_NOT_FOUND");
      }

      // 3. Count existing active bookings for member & total member seats booked
      const [existingBooking, memberBookingsCount] = await Promise.all([
        tx.query.booking.findFirst({
          where: and(
            eq(booking.eventId, eventId),
            eq(booking.personId, personId),
            sql`status IN ('held', 'confirmed')`
          ),
        }),
        tx
          .select({ count: sql<number>`count(*)` })
          .from(booking)
          .where(
            and(
              eq(booking.eventId, eventId),
              eq(booking.kind, "member"),
              sql`status IN ('held', 'confirmed')`
            )
          ),
      ]);

      const activeMemberBookingsCount = Number(memberBookingsCount[0]?.count || 0);

      // 4. Calculate member credit balance
      const creditEntries = await tx
        .select()
        .from(creditEntry)
        .where(eq(creditEntry.memberId, memberId));

      const totalBalance = creditEntries.reduce((sum, entry) => sum + entry.amount, 0);

      // 5. Validate using pure access helper
      const validation = canBook(
        {
          isMember: true,
          member: memberRecord,
          creditBalance: totalBalance,
          hasExistingActiveBooking: !!existingBooking,
        },
        {
          status: ev.status,
          creditCost: ev.creditCost,
          capacityMember: ev.capacityMember,
          activeMemberBookingsCount,
          startsAt: ev.startsAt,
        }
      );

      if (!validation.allowed) {
        throw new Error(validation.reasonCode || "BOOKING_REFUSED");
      }

      // 6. Write Spend Entry in Credit Ledger if cost > 0 (FIFO spend order §5)
      let spendEntryId: string | null = null;
      if (ev.creditCost > 0) {
        const spendResult = await spendCredits(
          memberId,
          ev.creditCost,
          "booking",
          eventId,
          `Booking for ${ev.title}`,
          tx
        );
        spendEntryId = spendResult.spendEntryId;
      }

      // 7. Insert Booking with snapshotted creditsCharged
      const initialStatus = ev.status === "confirmed" ? "confirmed" : "held";
      const bookingInsert = await tx
        .insert(booking)
        .values({
          eventId,
          personId,
          memberId,
          kind: "member",
          status: initialStatus,
          creditsCharged: ev.creditCost,
          bookedAt: new Date(),
        })
        .returning({ id: booking.id });

      const newBookingId = bookingInsert[0].id;

      // 8. Write audit log
      await tx.insert(auditLog).values({
        actorId: personId,
        actorType: "member",
        action: "book_event",
        entity: "booking",
        entityId: newBookingId,
        after: {
          eventId,
          status: initialStatus,
          creditsCharged: ev.creditCost,
        },
      });

      return {
        bookingId: newBookingId,
        eventTitle: ev.title,
        status: initialStatus,
        startsAt: ev.startsAt,
        venueName: ev.venueName,
      };
    });

    // 9. Post-commit: queue email confirmation (outside transaction §7.1)
    const personRecord = await db.query.person.findFirst({
      where: eq(person.id, personId),
    });

    if (personRecord) {
      const subject =
        personRecord.locale === "es"
          ? `Reserva Confirmada: ${result.eventTitle} — The Mothers`
          : `Booking Confirmed: ${result.eventTitle} — The Mothers`;

      const htmlContent = `
        <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
          <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; margin: 0 0 16px;">
            ${personRecord.locale === "es" ? "Plaza Reservada" : "Place Confirmed"}
          </h2>
          <p style="font-size: 15px; line-height: 1.6;">
            ${
              personRecord.locale === "es"
                ? `Hola ${personRecord.firstName}, tienes tu plaza confirmada para <strong>${result.eventTitle}</strong>.`
                : `Hi ${personRecord.firstName}, your place is confirmed for <strong>${result.eventTitle}</strong>.`
            }
          </p>
          <div style="background: #fff; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 14px;">
            <div>📅 <strong>${new Date(result.startsAt).toLocaleDateString()}</strong></div>
            <div>📍 <strong>${result.venueName}</strong></div>
          </div>
          <p style="font-size: 13px; color: rgba(57,41,42,0.6); margin-top: 24px;">
            The Mothers · Barcelona · hello@themothers.cc
          </p>
        </div>
      `;

      await queueAndSendEmail({
        personId,
        toEmail: personRecord.email,
        toName: `${personRecord.firstName} ${personRecord.lastName}`,
        templateKey: "booking_confirmed",
        dedupeKey: `booking_confirmed_${result.bookingId}`,
        subject,
        htmlContent,
        isTransactional: true,
      });
    }

    return { success: true, bookingId: result.bookingId };
  } catch (error: any) {
    console.error("bookEvent error:", error);
    return { success: false, error: error?.message || "BOOKING_FAILED" };
  }
}

// ─── 2. MEMBER RELEASE WITH AUTO WAITLIST PROMOTION (§7.3, §7.4) ────────────

const releaseBookingSchema = z.object({ bookingId: z.string().uuid() });

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
      // 1. Fetch booking with row lock
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

      // 2. Fetch event to verify date
      const ev = await tx.query.event.findFirst({
        where: eq(event.id, b.eventId),
      });

      if (!ev) throw new Error("EVENT_NOT_FOUND");

      // 3. Mark booking released
      const msUntilEvent = new Date(ev.startsAt).getTime() - Date.now();
      const hoursUntilEvent = msUntilEvent / (1000 * 60 * 60);
      const isInside24h = hoursUntilEvent <= 24;

      await tx
        .update(booking)
        .set({
          status: "released",
          releasedAt: new Date(),
          updatedAt: new Date(),
          ...(isInside24h && b.memberId && b.creditsCharged > 0
            ? {
                pendingReturnState: "awaiting_replacement",
                pendingReturnCredits: b.creditsCharged,
              }
            : {}),
        })
        .where(eq(booking.id, bookingId));

      // 4. Return credits if member booking (§5)
      let returnedCredits = 0;
      if (b.memberId && b.creditsCharged > 0 && !isInside24h) {
        // Find the original spend entry for this booking
        const spendEntry = await tx.query.creditEntry.findFirst({
          where: and(
            eq(creditEntry.memberId, b.memberId),
            eq(creditEntry.type, "spend"),
            eq(creditEntry.sourceId, b.eventId)
          ),
        });

        if (spendEntry) {
          await returnCredits(
            b.memberId,
            spendEntry.id,
            "return_release",
            `Released seat for ${ev.title}`,
            tx
          );
        } else {
          // Fallback if no spend entry is found (e.g. legacy data)
          await tx.insert(creditEntry).values({
            memberId: b.memberId,
            amount: b.creditsCharged,
            type: "return_release",
            sourceType: "booking",
            sourceId: b.id,
            reason: `Released seat for ${ev.title}`,
          });
        }
        returnedCredits = b.creditsCharged;
      }

      // 5. Trigger waitlist offer to Position 1 (§7.4)
      const nextWaitlist = await tx
        .select()
        .from(eventWaitlist)
        .where(
          and(
            eq(eventWaitlist.eventId, b.eventId),
            sql`offered_at IS NULL`
          )
        )
        .orderBy(asc(eventWaitlist.position))
        .limit(1);

      let offeredPersonId: string | null = null;
      if (nextWaitlist.length > 0) {
        const topWaitlist = nextWaitlist[0];
        // 24 hours expiry, or 2 hours inside 48 hours of event
        const msUntilEvent = new Date(ev.startsAt).getTime() - Date.now();
        const offerExpiryHours = msUntilEvent < 48 * 60 * 60 * 1000 ? 2 : 24;
        const offerExpiresAt = new Date(Date.now() + offerExpiryHours * 60 * 60 * 1000);

        await tx
          .update(eventWaitlist)
          .set({
            offeredAt: new Date(),
            offerExpiresAt,
          })
          .where(eq(eventWaitlist.id, topWaitlist.id));

        offeredPersonId = topWaitlist.personId;
      }

      // 6. Audit log
      await tx.insert(auditLog).values({
        actorId: personId,
        actorType: "member",
        action: "release_booking",
        entity: "booking",
        entityId: bookingId,
        before: { status: b.status },
        after: { status: "released", returnedCredits: b.creditsCharged },
      });

      return {
        eventId: b.eventId,
        eventTitle: ev.title,
        returnedCredits,
        offeredPersonId,
      };
    });
    if (result.offeredPersonId) {
      const offeredPerson = await db.query.person.findFirst({
        where: eq(person.id, result.offeredPersonId)
      });
      if (offeredPerson) {
        const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
        await queueAndSendEmail({
          personId: result.offeredPersonId,
          toEmail: offeredPerson.email,
          toName: offeredPerson.firstName || "Member",
          templateKey: "window_is_open",
          dedupeKey: `window_open_${result.eventId}_${Date.now().toString().slice(0, 8)}`,
          subject: `A spot opened up for ${result.eventTitle}`,
          htmlContent: `
            <div style="font-family: Georgia, serif; color: #39292a; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8efe2; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px;">
              <h2 style="font-size: 22px; color: #7b1f2c; margin-top: 0;">Good news!</h2>
              <p style="font-size: 15px; line-height: 1.6;">Dear ${offeredPerson.firstName || "Member"},</p>
              <p style="font-size: 15px; line-height: 1.6;">A place just became available for <strong>${result.eventTitle}</strong>.</p>
              <p style="font-size: 15px; line-height: 1.6;">You have priority to claim this spot. Please click below to confirm your booking.</p>
              <div style="margin: 32px 0; text-align: center;">
                <a href="${origin}/events/${result.eventId}" style="display: inline-block; background: #7b1f2c; color: #f8efe2; padding: 12px 28px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 15px;">Claim your spot</a>
              </div>
              <p style="font-size: 14px; color: rgba(57,41,42,0.8); line-height: 1.5;">If you no longer wish to attend, you can simply ignore this email or remove yourself from the list.</p>
              <p style="font-size: 14px; margin-top: 24px;">Warmly,<br/><strong>The Mothers Barcelona</strong></p>
            </div>
          `,
          isTransactional: true,
        });
      }
    }

    return { success: true, returnedCredits: result.returnedCredits };
  } catch (error: any) {
    console.error("releaseBooking error:", error);
    return { success: false, error: error?.message || "RELEASE_FAILED" };
  }
}
// ─── 3. GUEST PASS PURCHASE WITH 32-BYTE TOKEN (§9) ─────────────────────────

const buyGuestPassSchema = z.object({
  eventId: z.string().uuid(),
  firstName: z.string().min(1).trim(),
  lastName: z.string().trim().default(""),
  email: z.string().email().toLowerCase().trim(),
});

export async function buyGuestPass(params: {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
}) {
  try {
    const parsed = buyGuestPassSchema.safeParse(params);
    if (!parsed.success) return { success: false, error: "INVALID_INPUT" };
    const { eventId, firstName, lastName, email } = parsed.data;

    const result = await db.transaction(async (tx) => {
      // 1. SELECT ... FOR UPDATE on the event row
      const eventRows = await tx
        .select()
        .from(event)
        .where(eq(event.id, eventId))
        .for("update");

      if (eventRows.length === 0) throw new Error("EVENT_NOT_FOUND");
      const ev = eventRows[0];

      // 2. Find or create person
      let personRecord = await tx.query.person.findFirst({
        where: eq(person.email, email),
      });

      if (!personRecord) {
        const inserted = await tx
          .insert(person)
          .values({
            firstName,
            lastName,
            email,
            isMother: true,
            marketingOptIn: false,
          })
          .returning();
        personRecord = inserted[0];
      }

      // 3. Check lifetime pass count (max 2 §3.4, §20.4)
      const pastPasses = await tx
        .select({ count: sql<number>`count(*)` })
        .from(eventPass)
        .where(eq(eventPass.personId, personRecord.id));

      const lifetimePassCount = Number(pastPasses[0]?.count || 0);

      const guestBookingsCount = await tx
        .select({ count: sql<number>`count(*)` })
        .from(booking)
        .where(
          and(
            eq(booking.eventId, eventId),
            eq(booking.kind, "guest"),
            sql`status IN ('held', 'confirmed')`
          )
        );

      const activeGuestBookingsCount = Number(guestBookingsCount[0]?.count || 0);

      const passCheck = canBuyPass(
        { isMother: personRecord.isMother, lifetimePassCount },
        {
          status: ev.status,
          isSignature: ev.isSignature,
          creditCost: ev.creditCost,
          showEventPassCta: ev.showEventPassCta,
          capacityGuest: ev.capacityGuest,
          activeGuestBookingsCount,
          guestOpenAt: ev.guestOpenAt,
          guestCloseAt: ev.guestCloseAt,
          startsAt: ev.startsAt,
        }
      );

      if (!passCheck.allowed) {
        throw new Error(passCheck.reasonCode || "GUEST_PASS_NOT_ALLOWED");
      }


      return {
        personId: personRecord.id,
        guestPriceCents: ev.guestPriceCents || 3500,
        eventTitle: ev.title,
        startsAt: ev.startsAt,
      };
    });

    // 5. Generate Stripe Checkout Session for Guest Pass
    // We import Stripe locally to avoid server startup issues if not configured
    const { stripe } = await import("@/lib/stripe");
    const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Guest Pass: ${result.eventTitle}`,
              description: `Single guest pass for ${new Date(result.startsAt).toLocaleDateString()}`,
            },
            unit_amount: result.guestPriceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "guest_pass",
        eventId,
        personId: result.personId,
      },
      success_url: `${origin}/events?guest_pass_success=true`,
      cancel_url: `${origin}/events?guest_pass_canceled=true`,
    });

    return { success: true, url: stripeSession.url };
  } catch (error: any) {
    console.error("buyGuestPass error:", error);
    return { success: false, error: error?.message || "PURCHASE_FAILED" };
  }
}

// ─── 4. BUY EXTRA CREDITS (§20.3) ────────────────────────────────────────────

export async function buyExtraCredits(amount: number, eventId?: string) {
  if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
    return { success: false, error: "INVALID_AMOUNT" };
  }

  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };

  const memberId = (session.user as any).memberId;
  if (!memberId) return { success: false, error: "MEMBER_ACCOUNT_REQUIRED" };

  const memberRecord = await db.query.member.findFirst({ where: eq(member.id, memberId) });
  if (!memberRecord || memberRecord.status !== "active") {
    return { success: false, error: "ACTIVE_MEMBERSHIP_REQUIRED" };
  }

  try {
    const { stripe } = await import("@/lib/stripe");
    const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const personRecord = await db.query.person.findFirst({ where: eq(person.id, memberRecord.personId) });

    const session2 = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: personRecord?.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${amount} Extra Credits — The Mothers`,
              description: `€1/credit · 6-month expiry · FIFO`,
            },
            unit_amount: amount * 100, // €1 per credit in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "extra_credits",
        memberId,
        personId: memberRecord.personId,
        creditAmount: String(amount),
        eventId: eventId || "",
      },
      success_url: eventId
        ? `${origin}/events/${eventId}?booking_success=true`
        : `${origin}/account?credits_purchased=true`,
      cancel_url: eventId
        ? `${origin}/events/${eventId}`
        : `${origin}/account`,
    });

    return { success: true, url: session2.url };
  } catch (error: any) {
    console.error("buyExtraCredits error:", error);
    return { success: false, error: error?.message || "CHECKOUT_FAILED" };
  }
}
