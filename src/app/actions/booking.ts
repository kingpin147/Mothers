"use server";

import { db } from "@/db";
import { event, booking, creditEntry, creditAllocation, member, person, eventPass, eventWaitlist, auditLog } from "@/db/schema";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { canBook, canRelease, canBuyPass, canRsvp } from "@/lib/access";
import { queueAndSendEmail } from "@/lib/brevo";
import crypto from "crypto";

// ─── 1. MEMBER BOOKING WITH FOR UPDATE ROW LOCK (§7.1) ──────────────────────

export async function bookEvent(eventId: string) {
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
        const spendInsert = await tx
          .insert(creditEntry)
          .values({
            memberId,
            amount: -ev.creditCost,
            type: "spend",
            sourceType: "booking",
            sourceId: eventId,
            reason: `Booking for ${ev.title}`,
          })
          .returning({ id: creditEntry.id });

        spendEntryId = spendInsert[0].id;

        // Allocate against oldest non-expired grants (FIFO)
        const activeGrants = await tx
          .select()
          .from(creditEntry)
          .where(
            and(
              eq(creditEntry.memberId, memberId),
              eq(creditEntry.type, "grant"),
              sql`expires_at IS NULL OR expires_at > NOW()`
            )
          )
          .orderBy(asc(creditEntry.expiresAt), asc(creditEntry.createdAt));

        let remainingToDeduct = ev.creditCost;
        for (const grant of activeGrants) {
          if (remainingToDeduct <= 0) break;
          const deductAmount = Math.min(grant.amount, remainingToDeduct);
          await tx.insert(creditAllocation).values({
            spendEntryId: spendEntryId!,
            grantEntryId: grant.id,
            amount: deductAmount,
          });
          remainingToDeduct -= deductAmount;
        }
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

export async function releaseBooking(bookingId: string) {
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
      await tx
        .update(booking)
        .set({
          status: "released",
          releasedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(booking.id, bookingId));

      // 4. Return credits if member booking (§5)
      if (b.memberId && b.creditsCharged > 0) {
        await tx.insert(creditEntry).values({
          memberId: b.memberId,
          amount: b.creditsCharged,
          type: "return_release",
          sourceType: "booking",
          sourceId: b.id,
          reason: `Released seat for ${ev.title}`,
        });
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
        returnedCredits: b.creditsCharged,
        offeredPersonId,
      };
    });

    return { success: true, returnedCredits: result.returnedCredits };
  } catch (error: any) {
    console.error("releaseBooking error:", error);
    return { success: false, error: error?.message || "RELEASE_FAILED" };
  }
}

// ─── 3. GUEST PASS PURCHASE WITH 32-BYTE TOKEN (§9) ─────────────────────────

export async function buyGuestPass(params: {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
}) {
  try {
    const email = params.email.toLowerCase().trim();

    const result = await db.transaction(async (tx) => {
      // 1. SELECT ... FOR UPDATE on the event row
      const eventRows = await tx
        .select()
        .from(event)
        .where(eq(event.id, params.eventId))
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
            firstName: params.firstName.trim(),
            lastName: params.lastName.trim(),
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

      const passCheck = canBuyPass(
        { isMother: personRecord.isMother, lifetimePassCount },
        {
          status: ev.status,
          isSignature: ev.isSignature,
          creditCost: ev.creditCost,
          capacityGuest: ev.capacityGuest,
          activeGuestBookingsCount: 0,
        }
      );

      if (!passCheck.allowed) {
        throw new Error(passCheck.reasonCode || "GUEST_PASS_NOT_ALLOWED");
      }

      // 4. Generate 32-byte cryptographic token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

      // 5. Create Event Pass record
      const creditExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30-day conversion window
      const insertedPass = await tx
        .insert(eventPass)
        .values({
          personId: personRecord.id,
          eventId: ev.id,
          priceCents: 3500, // €35
          status: "paid",
          ticketTokenHash: tokenHash,
          creditExpiresAt,
        })
        .returning();

      const passId = insertedPass[0].id;

      // 6. Create guest booking
      await tx.insert(booking).values({
        eventId: ev.id,
        personId: personRecord.id,
        kind: "guest",
        status: "confirmed",
        moneyPaidCents: 3500,
        passId,
      });

      return {
        rawToken,
        personId: personRecord.id,
        personName: personRecord.firstName,
        eventTitle: ev.title,
        startsAt: ev.startsAt,
      };
    });

    // 7. Send Guest Place Booked email with token link (§9)
    const ticketUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/ticket/${result.rawToken}`;
    const subject = `Your Ticket: ${result.eventTitle} — The Mothers`;

    const htmlContent = `
      <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
        <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px;">
          Guest Place Booked
        </h2>
        <p style="font-size: 15px; line-height: 1.6;">
          Hi ${result.personName}, your guest ticket for <strong>${result.eventTitle}</strong> is ready.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${ticketUrl}" style="background-color: #7b1f2c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 15px; display: inline-block;">
            View Your Ticket & Meeting Point →
          </a>
        </div>
        <p style="font-size: 12.5px; color: rgba(57,41,42,0.6); line-height: 1.5; border-top: 1px solid rgba(57,41,42,0.16); padding-top: 14px;">
          If you join The Mothers within 30 days, your €35 pass is credited directly against your joining fee (€23 instead of €58).
        </p>
      </div>
    `;

    await queueAndSendEmail({
      personId: result.personId,
      toEmail: email,
      toName: result.personName,
      templateKey: "guest_place_booked",
      dedupeKey: `guest_ticket_${result.rawToken.slice(0, 16)}`,
      subject,
      htmlContent,
      isTransactional: true,
    });

    return { success: true, token: result.rawToken };
  } catch (error: any) {
    console.error("buyGuestPass error:", error);
    return { success: false, error: error?.message || "PURCHASE_FAILED" };
  }
}
