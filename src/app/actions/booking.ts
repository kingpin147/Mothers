"use server";

import { db } from "@/db";
import { event, booking, creditEntry, creditAllocation, member, person, eventPass, eventWaitlist, auditLog } from "@/db/schema";
import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";
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
            inArray(booking.status, ["held", "confirmed"])
          ),
        }),
        tx
          .select({ count: sql<number>`count(*)` })
          .from(booking)
          .where(
            and(
              eq(booking.eventId, eventId),
              eq(booking.kind, "member"),
              inArray(booking.status, ["held", "confirmed"])
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

      // 7b. Settle oldest pending return awaiting replacement on this event (§5 & §7.3)
      const oldestPendingReturn = await tx.query.booking.findFirst({
        where: and(
          eq(booking.eventId, eventId),
          eq(booking.pendingReturnState, "awaiting_replacement")
        ),
        orderBy: asc(booking.releasedAt),
      });

      if (oldestPendingReturn && oldestPendingReturn.memberId && oldestPendingReturn.pendingReturnCredits > 0) {
        await tx
          .update(booking)
          .set({
            pendingReturnState: "settled_returned",
            updatedAt: new Date(),
          })
          .where(eq(booking.id, oldestPendingReturn.id));

        await tx.insert(creditEntry).values({
          memberId: oldestPendingReturn.memberId,
          amount: oldestPendingReturn.pendingReturnCredits,
          type: "return_release",
          sourceType: "booking",
          sourceId: oldestPendingReturn.id,
          reason: `Released seat filled by replacement member for ${ev.title}`,
        });
      }

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

      const htmlContent = `\n<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your place is booked — The Mothers</title>
<!--[if mso]>
<style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style>
<![endif]-->
<style>
@media only screen and (max-width:620px){
  .px{padding-left:24px !important;padding-right:24px !important;}
  .h1{font-size:30px !important;line-height:36px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#efeae1;">
<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Your place is booked — this email carries the meeting point. Credits have come off your balance.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efeae1;">
<tr>
<td align="center" style="padding:32px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;">

<tr>
<td class="px" align="center" style="padding:34px 48px 26px;border-bottom:1px solid #ddd4c6;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:20px;mso-line-height-rule:exactly;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;">The Mothers</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:7px;">Barcelona</div>
</td>
</tr>

<tr>
<td class="px" style="padding:38px 48px 0;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">Booking confirmed</div>
<h1 class="h1" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:42px;mso-line-height-rule:exactly;font-weight:normal;color:#2A1E20;">Your place is booked.</h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:27px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0 0 16px;">Hello <span style="color:#7b1f2c;">${personRecord.firstName}</span>,</p>
<p style="margin:0 0 16px;">You're in. <strong style="font-weight:normal;color:#7b1f2c;">[Event title]</strong> — the details are below, and this email is the only thing you need to bring.</p>
<p style="margin:0;">If plans change, release your place from your account and the credits come straight back, up to [24 hours] before. After that they don't, because the table is already laid.</p>
</td>
</tr>

<tr>
<td class="px" style="padding:30px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #ddd4c6;background-color:#f3efe6;">
<tr>
<td style="padding:22px 24px 14px;font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;">Where and when</td>
</tr>
<tr>
<td style="padding:0 24px 22px;font-family:Georgia,'Times New Roman',serif;color:#2A1E20;">
<div style="font-size:20px;line-height:28px;mso-line-height-rule:exactly;padding-bottom:12px;">[Event title]</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#2A1E20;">
<tr>
<td width="96" valign="top" style="width:96px;padding:7px 0;border-top:1px solid #ddd4c6;font-size:13px;color:#8a807a;">Date</td>
<td valign="top" style="padding:7px 0;border-top:1px solid #ddd4c6;">[Day, date] · [time]</td>
</tr>
<tr>
<td width="96" valign="top" style="width:96px;padding:7px 0;border-top:1px solid #ddd4c6;font-size:13px;color:#8a807a;">Meeting point</td>
<td valign="top" style="padding:7px 0;border-top:1px solid #ddd4c6;">[Street and number]<br><span style="color:#8a807a;font-size:14px;">[Neighbourhood]</span></td>
</tr>
<tr>
<td width="96" valign="top" style="width:96px;padding:7px 0;border-top:1px solid #ddd4c6;font-size:13px;color:#8a807a;">Spent</td>
<td valign="top" style="padding:7px 0;border-top:1px solid #ddd4c6;"><strong style="font-weight:normal;color:#7b1f2c;">[N] credits</strong></td>
</tr>
<tr>
<td width="96" valign="top" style="width:96px;padding:7px 0;border-top:1px solid #ddd4c6;font-size:13px;color:#8a807a;">Balance</td>
<td valign="top" style="padding:7px 0;border-top:1px solid #ddd4c6;">[N] credits left this month</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td bgcolor="#7b1f2c" style="border-radius:4px;">
<a href="Account.dc.html" style="display:block;padding:16px 34px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:22px;mso-line-height-rule:exactly;color:#faf7f1;text-decoration:none;">View or release my place</a>
</td>
</tr>
</table>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:#8a807a;padding-top:12px;">Everything you have booked lives in your account.</div>
</td>
</tr>

<tr>
<td class="px" style="padding:32px 48px 0;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">Worth knowing</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#2A1E20;">
<tr>
<td width="26" valign="top" style="width:26px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">01</td>
<td valign="top" style="">Release before [24 hours] and your credits return in full. After that they stay spent — the numbers have gone to the host by then.</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding-top:10px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">02</td>
<td valign="top" style="padding-top:10px;">If we cancel for any reason, your credits come back automatically and we email you a week ahead where we can.</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding-top:10px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">03</td>
<td valign="top" style="padding-top:10px;">Bringing your baby? [Say which events are baby-in-arms and which are not — she should not have to guess.]</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#5c534e;">
<p style="margin:0;">Anything before the day — dietary needs, a late arrival, a nap that overran — reply to this email.</p>
</td>
</tr>

<tr>
<td class="px" style="padding:26px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0;">See you there,<br>The Mothers Team</p>
</td>
</tr>

<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;line-height:20px;mso-line-height-rule:exactly;color:#8a807a;padding-top:20px;">
The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
<a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a> &nbsp;·&nbsp;
<a href="https://themothers.cc" style="color:#7b1f2c;text-decoration:underline;">themothers.cc</a>
</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:18px;mso-line-height-rule:exactly;color:#8a807a;padding-top:12px;">
You're receiving this because you booked a place using your membership credits.<br>
This is a booking confirmation, not a marketing email.
</div>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>
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
  phoneE164: z.string().optional(),
});

export async function buyGuestPass(params: {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneE164?: string;
}) {
  try {
    const parsed = buyGuestPassSchema.safeParse(params);
    if (!parsed.success) return { success: false, error: "INVALID_INPUT" };
    const { eventId, firstName, lastName, email, phoneE164 } = parsed.data;

    const result = await db.transaction(async (tx) => {
      // 1. SELECT ... FOR UPDATE on the event row
      const eventRows = await tx
        .select()
        .from(event)
        .where(eq(event.id, eventId))
        .for("update");

      if (eventRows.length === 0) throw new Error("EVENT_NOT_FOUND");
      const ev = eventRows[0];

      // 2. Find or create person by email
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
            phoneE164: phoneE164 || null,
            isMother: true,
            marketingOptIn: false,
          })
          .returning();
        personRecord = inserted[0];
      } else if (phoneE164 && !personRecord.phoneE164) {
        await tx
          .update(person)
          .set({ phoneE164 })
          .where(eq(person.id, personRecord.id));
      }

      // 3. Lifetime pass check across email AND phone (§8, §20.4)
      let lifetimePassCount = 0;
      const emailPasses = await tx
        .select({ count: sql<number>`count(*)` })
        .from(eventPass)
        .where(eq(eventPass.personId, personRecord.id));
      lifetimePassCount += Number(emailPasses[0]?.count || 0);

      if (phoneE164) {
        const phoneMatchPersons = await tx.query.person.findMany({
          where: eq(person.phoneE164, phoneE164),
        });

        for (const otherP of phoneMatchPersons) {
          if (otherP.id !== personRecord.id) {
            // Collision flagged for review
            const otherPasses = await tx
              .select({ count: sql<number>`count(*)` })
              .from(eventPass)
              .where(eq(eventPass.personId, otherP.id));
            lifetimePassCount += Number(otherPasses[0]?.count || 0);

            // Record collision audit log
            await tx.insert(auditLog).values({
              actorId: personRecord.id,
              actorType: "system",
              action: "phone_email_collision_flagged",
              entity: "person",
              entityId: personRecord.id,
              after: {
                primaryEmail: email,
                matchedEmail: otherP.email,
                phone: phoneE164,
              },
            });
          }
        }
      }

      const guestBookingsCount = await tx
        .select({ count: sql<number>`count(*)` })
        .from(booking)
        .where(
          and(
            eq(booking.eventId, eventId),
            eq(booking.kind, "guest"),
            inArray(booking.status, ["held", "confirmed"])
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

// ─── 5. JOIN EVENT WAITLIST (§7.4) ───────────────────────────────────────────

export async function joinEventWaitlist(eventId: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };

  const personId = (session.user as any).personId || session.user.id;

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Check if already on waitlist
      const existing = await tx.query.eventWaitlist.findFirst({
        where: and(
          eq(eventWaitlist.eventId, eventId),
          eq(eventWaitlist.personId, personId)
        )
      });

      if (existing) {
        throw new Error("ALREADY_ON_WAITLIST");
      }

      // 2. Determine position
      const maxPos = await tx
        .select({ max: sql<number>`MAX(position)` })
        .from(eventWaitlist)
        .where(eq(eventWaitlist.eventId, eventId));
      
      const nextPosition = (maxPos[0]?.max || 0) + 1;

      // 3. Insert
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

// ─── 6. CLAIM WAITLIST OFFER (§7.4) ──────────────────────────────────────────

export async function claimWaitlistOffer(waitlistId: string) {
  const session = await auth();
  if (!session?.user) return { success: false, error: "AUTH_REQUIRED" };

  const personId = (session.user as any).personId || session.user.id;
  const memberId = (session.user as any).memberId;

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Fetch waitlist offer with lock
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

      // Deduct credits if member
      if (memberId && ev.creditCost > 0) {
        await spendCredits(memberId, ev.creditCost, "booking", ev.id, `Claimed waitlist offer for ${ev.title}`, tx);
      }

      // Mark waitlist accepted
      await tx
        .update(eventWaitlist)
        .set({ acceptedAt: new Date() })
        .where(eq(eventWaitlist.id, waitlistId));

      // Create booking
      const newBooking = await tx
        .insert(booking)
        .values({
          eventId: ev.id,
          personId,
          memberId: memberId || null,
          kind: memberId ? "member" : "guest",
          status: ev.status === "confirmed" ? "confirmed" : "held",
          creditsCharged: memberId ? ev.creditCost : 0,
        })
        .returning();

      // Settle oldest pending return if any (§5 & §7.3)
      const oldestPendingReturn = await tx.query.booking.findFirst({
        where: and(
          eq(booking.eventId, ev.id),
          eq(booking.pendingReturnState, "awaiting_replacement")
        ),
        orderBy: asc(booking.releasedAt),
      });

      if (oldestPendingReturn && oldestPendingReturn.memberId && oldestPendingReturn.pendingReturnCredits > 0) {
        await tx
          .update(booking)
          .set({
            pendingReturnState: "settled_returned",
            updatedAt: new Date(),
          })
          .where(eq(booking.id, oldestPendingReturn.id));

        await tx.insert(creditEntry).values({
          memberId: oldestPendingReturn.memberId,
          amount: oldestPendingReturn.pendingReturnCredits,
          type: "return_release",
          sourceType: "booking",
          sourceId: oldestPendingReturn.id,
          reason: `Released seat claimed by waitlist member for ${ev.title}`,
        });
      }

      return { bookingId: newBooking[0].id };
    });

    return { success: true, bookingId: result.bookingId };
  } catch (error: any) {
    return { success: false, error: error?.message || "CLAIM_FAILED" };
  }
}

