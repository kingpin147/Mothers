import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import {
  stripeEvent,
  member,
  payment,
  person,
  auditLog,
  creditBatch,
  event as eventTable,
  booking,
} from "@/db/schema";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import {
  grantCreditsToPerson,
  spendPersonCreditsFIFO,
  getPersonWalletBalance,
  settleOldestPendingReturn,
} from "@/lib/ledger";
import {
  queueAndSendEmail,
  generateSubscriptionConfirmationEmailHtml,
  generateBookingConfirmedEmailHtml,
  generatePaymentReceiptEmailHtml,
} from "@/lib/brevo";
import { getAppUrl } from "@/lib/urls";
import crypto from "crypto";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function handleStripeWebhook(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    if (!webhookSecret) {
      console.warn("⚠️ STRIPE_WEBHOOK_SECRET is not configured in environment variables.");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
    }

    // 1. Idempotency Check: prevent duplicate event processing
    const existingEvent = await db.query.stripeEvent.findFirst({
      where: eq(stripeEvent.id, event.id),
    });

    if (existingEvent) {
      return NextResponse.json({ received: true, status: "already_processed" });
    }

    // Record incoming event in database
    await db.insert(stripeEvent).values({
      id: event.id,
      type: event.type,
      payload: event as any,
    });

    const eventData = event.data.object as any;

    switch (event.type) {
      // ─── A. CHECKOUT SESSION COMPLETED ─────────────────────────────────────
      case "checkout.session.completed": {
        const session = eventData;
        const meta = session.metadata || {};
        const type = meta.type;

        // 1. Top-Up / Extra Credits Checkout (FIFO wallet)
        if (type === "extra_credits" || type === "credit_topup" || type === "topup") {
          const personId = meta.personId;
          const creditAmount = parseInt(meta.creditAmount || "10", 10);
          const eventId = meta.eventId || undefined;

          if (personId && !isNaN(creditAmount) && creditAmount > 0) {
            await handleTopUpCheckout({
              personId,
              creditAmount,
              eventId,
              session,
            });
          }
        }

        // 2. Membership Activation Checkout
        else if (type === "membership") {
          const memberId = meta.memberId;
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          if (memberId) {
            await handleMembershipCheckout({
              memberId,
              customerId,
              subscriptionId,
              session,
            });
          }
        }
        break;
      }

      // ─── B. INVOICE PAID (SUBSCRIPTION RENEWALS §F-03) ───────────────────────
      case "invoice.paid": {
        const invoice = eventData;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;
        const billingReason = invoice.billing_reason;

        // Handle subscription cycle payments (recurring renewals)
        if (customerId && subscriptionId && billingReason !== "subscription_create") {
          await handleInvoicePaymentSucceeded({
            customerId,
            subscriptionId,
            invoice,
          });
        }
        break;
      }

      // ─── C. INVOICE PAYMENT FAILED ──────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = eventData;
        const customerId = invoice.customer as string;

        if (customerId) {
          await handleInvoicePaymentFailed({ customerId, invoice });
        }
        break;
      }

      // ─── D. CUSTOMER SUBSCRIPTION DELETED / CANCELLED ───────────────────────
      case "customer.subscription.deleted": {
        const subscription = eventData;
        const customerId = subscription.customer as string;

        if (customerId) {
          await handleSubscriptionCancelled({ customerId, subscription });
        }
        break;
      }

      // ─── E. CUSTOMER SUBSCRIPTION UPDATED ──────────────────────────────────
      case "customer.subscription.updated": {
        const subscription = eventData;
        const customerId = subscription.customer as string;

        if (customerId) {
          await handleSubscriptionUpdated({ customerId, subscription });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Stripe Webhook Handler Error:", err);
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function handleTopUpCheckout({
  personId,
  creditAmount,
  eventId,
  session,
}: {
  personId: string;
  creditAmount: number;
  eventId?: string;
  session: any;
}) {
  const { getPublicClubSettings } = await import("@/app/actions/adminSettings");
  const clubSettings = await getPublicClubSettings();

  // 1. Grant credits and record payment in its own transaction (N-02: Never rollback paid credits)
  const txResult = await db.transaction(async (tx) => {
    const pRecord = await tx.query.person.findFirst({
      where: eq(person.id, personId),
    });
    if (!pRecord) return null;

    const gResult = await grantCreditsToPerson(personId, creditAmount, "topup", null, tx);

    await tx.insert(payment).values({
      personId,
      purpose: "topup",
      amountCents: session.amount_total || creditAmount * 200,
      currency: (session.currency || "eur").toUpperCase(),
      status: "succeeded",
      stripeInvoiceId: session.invoice as string | null,
      stripePaymentIntentId: session.payment_intent as string | null,
      occurredAt: new Date(),
    }).onConflictDoNothing();

    await tx.insert(auditLog).values({
      actorId: personId,
      actorType: "system",
      action: "topup_credits_purchased",
      entity: "credit_batch",
      entityId: gResult.batchId,
      after: { creditAmount, eventId: eventId || null, sessionId: session.id },
    });

    return { grantResult: gResult, personRecord: pRecord };
  });

  if (!txResult || !txResult.personRecord || !txResult.grantResult) return;
  const { grantResult, personRecord } = txResult;

  // 2. Send Payment Receipt Email (§11)
  const amountEur = (session.amount_total || creditAmount * 200) / 100;
  const isEs = personRecord.locale === "es";
  const origin = getAppUrl();
  const orderId = `TM-${grantResult.batchId.substring(0, 8).toUpperCase()}`;
  const expiryDateFormatted = grantResult.expiresAt.toLocaleDateString(isEs ? "es-ES" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const subject = isEs
    ? `Recibo de compra — ${creditAmount} créditos`
    : `Your receipt — ${creditAmount} credits`;

  const htmlContent = generatePaymentReceiptEmailHtml({
    firstName: personRecord.firstName || "Friend",
    orderId,
    amountEur,
    creditsPurchased: creditAmount,
    expiryDateFormatted,
    appUrl: origin,
    isEs,
  });

  await queueAndSendEmail({
    personId: personRecord.id,
    toEmail: personRecord.email,
    toName: `${personRecord.firstName || ""} ${personRecord.lastName || ""}`.trim() || "Member",
    templateKey: "payment_receipt",
    dedupeKey: `topup_receipt_${grantResult.batchId}`,
    subject,
    htmlContent,
    isTransactional: true,
  });

  // 3. If eventId attached, attempt auto-booking without rolling back credits on failure (N-02, N-03, B-03, B-05)
  if (eventId && !personRecord.isSuspended) {
    try {
      let bookingConfirmedResult: any = null;

      await db.transaction(async (tx) => {
        const ev = await tx.query.event.findFirst({
          where: eq(eventTable.id, eventId),
        });
        if (!ev) return;

        const mem = await tx.query.member.findFirst({
          where: and(eq(member.personId, personId), eq(member.status, "active")),
        });
        const isMember = !!mem;

        let requiredCredits = 0;
        if (!clubSettings.membershipLive) {
          requiredCredits = ev.nonMemberCredits ?? ev.creditCost;
        } else if (isMember) {
          requiredCredits = ev.memberCredits ?? ev.creditCost;
        } else {
          requiredCredits = ev.nonMemberCredits ?? ev.creditCost;
        }

        const balance = await getPersonWalletBalance(personId, tx);
        if (balance < requiredCredits) {
          console.warn(`[Auto-Booking] Wallet balance (${balance}) still short of required (${requiredCredits}) for person ${personId}`);
          return;
        }

        // Check held or existing booking
        const heldBooking = await tx.query.booking.findFirst({
          where: and(
            eq(booking.eventId, eventId),
            eq(booking.personId, personId),
            eq(booking.status, "held")
          ),
        });

        if (heldBooking) {
          // If hold had expired while checking out, re-verify event capacity (F-05)
          const isHoldExpired = !!(heldBooking.heldUntil && new Date(heldBooking.heldUntil) < new Date());
          if (isHoldExpired) {
            const activeCondition = sql`(${booking.status} = 'confirmed' OR (${booking.status} = 'held' AND (${booking.heldUntil} IS NULL OR ${booking.heldUntil} > NOW())))`;
            const activeCountRes = await tx
              .select({ count: sql<number>`count(*)::int` })
              .from(booking)
              .where(and(eq(booking.eventId, eventId), activeCondition));
            const currentActive = activeCountRes[0]?.count || 0;
            if (ev.capacityMember > 0 && currentActive >= ev.capacityMember) {
              console.warn(`[Auto-Booking] Hold expired and event ${eventId} is at capacity. Keeping credits in wallet.`);
              const personRecord = await tx.query.person.findFirst({ where: eq(person.id, personId) });
              if (personRecord?.email) {
                await queueAndSendEmail({
                  personId,
                  toEmail: personRecord.email,
                  toName: `${personRecord.firstName || ""} ${personRecord.lastName || ""}`.trim() || "Friend",
                  templateKey: "event_full_credits_kept",
                  dedupeKey: `event_full_${eventId}_${personId}_${Date.now().toString().slice(0, 8)}`,
                  subject: `Event full — your credits are in your wallet — The Mothers`,
                  htmlContent: `
                    <div style="font-family: Georgia, serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #39292a; background-color: #fdfaf5;">
                      <h2 style="font-weight: normal; font-size: 24px; margin-bottom: 16px;">Your credits are in your wallet</h2>
                      <p style="font-size: 15px; line-height: 1.6;">The last place for <strong>${ev.title}</strong> was taken just before your top-up completed. Your payment succeeded and your credits have been placed directly in your wallet.</p>
                      <p style="font-size: 15px; line-height: 1.6;">You can spend these credits on any upcoming event or join the waitlist for ${ev.title}.</p>
                      <p style="margin-top: 24px;"><a href="${getAppUrl()}/events" style="background-color: #7b1f2c; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Browse upcoming events</a></p>
                    </div>
                  `,
                  isTransactional: true,
                });
              }
              return;
            }
          }

          let creditDeductions: Array<{ batchId: string; deducted: number; expiresAt: string }> = [];
          if (requiredCredits > 0) {
            const spendResult = await spendPersonCreditsFIFO(personId, requiredCredits, tx);
            creditDeductions = (spendResult.batchesDeducted || []).map((b) => ({
              batchId: b.batchId,
              deducted: b.deducted,
              expiresAt: new Date(b.expiresAt).toISOString(),
            }));
          }
          await tx
            .update(booking)
            .set({
              status: ev.status === "confirmed" ? "confirmed" : "held",
              heldUntil: null, // Clear heldUntil once paid/confirmed (F-04)
              creditsCharged: requiredCredits,
              creditDeductions,
              updatedAt: new Date(),
            })
            .where(eq(booking.id, heldBooking.id));

          // Settle oldest pending return awaiting replacement if any (F-06)
          await settleOldestPendingReturn(ev.id, tx);

          bookingConfirmedResult = {
            bookingId: heldBooking.id,
            eventTitle: ev.title,
            startsAt: ev.startsAt,
            venueName: ev.venueName,
            meetingPoint: ev.meetingPoint,
            creditsCharged: requiredCredits,
          };
        } else {
          const activeCondition = sql`(${booking.status} = 'confirmed' OR (${booking.status} = 'held' AND (${booking.heldUntil} IS NULL OR ${booking.heldUntil} > NOW())))`;
          const existing = await tx.query.booking.findFirst({
            where: and(
              eq(booking.eventId, eventId),
              eq(booking.personId, personId),
              activeCondition
            ),
          });

          if (!existing) {
            // Check capacity before inserting new booking
            const activeCountRes = await tx
              .select({ count: sql<number>`count(*)::int` })
              .from(booking)
              .where(and(eq(booking.eventId, eventId), activeCondition));
            const currentActive = activeCountRes[0]?.count || 0;
            if (ev.capacityMember > 0 && currentActive >= ev.capacityMember) {
              console.warn(`[Auto-Booking] Event ${eventId} is at capacity. Keeping credits in wallet.`);
              const personRecord = await tx.query.person.findFirst({ where: eq(person.id, personId) });
              if (personRecord?.email) {
                await queueAndSendEmail({
                  personId,
                  toEmail: personRecord.email,
                  toName: `${personRecord.firstName || ""} ${personRecord.lastName || ""}`.trim() || "Friend",
                  templateKey: "event_full_credits_kept",
                  dedupeKey: `event_full_${eventId}_${personId}_${Date.now().toString().slice(0, 8)}`,
                  subject: `Event full — your credits are in your wallet — The Mothers`,
                  htmlContent: `
                    <div style="font-family: Georgia, serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #39292a; background-color: #fdfaf5;">
                      <h2 style="font-weight: normal; font-size: 24px; margin-bottom: 16px;">Your credits are in your wallet</h2>
                      <p style="font-size: 15px; line-height: 1.6;">The last place for <strong>${ev.title}</strong> was taken just before your top-up completed. Your payment succeeded and your credits have been placed directly in your wallet.</p>
                      <p style="font-size: 15px; line-height: 1.6;">You can spend these credits on any upcoming event or join the waitlist for ${ev.title}.</p>
                      <p style="margin-top: 24px;"><a href="${getAppUrl()}/events" style="background-color: #7b1f2c; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Browse upcoming events</a></p>
                    </div>
                  `,
                  isTransactional: true,
                });
              }
              return;
            }

            let creditDeductions: Array<{ batchId: string; deducted: number; expiresAt: string }> = [];
            if (requiredCredits > 0) {
              const spendResult = await spendPersonCreditsFIFO(personId, requiredCredits, tx);
              creditDeductions = (spendResult.batchesDeducted || []).map((b) => ({
                batchId: b.batchId,
                deducted: b.deducted,
                expiresAt: new Date(b.expiresAt).toISOString(),
              }));
            }
            const [insertedB] = await tx.insert(booking).values({
              eventId,
              personId,
              memberId: mem?.id || null,
              kind: isMember ? "member" : "non_member",
              status: ev.status === "confirmed" ? "confirmed" : "held",
              heldUntil: null,
              creditsCharged: requiredCredits,
              creditDeductions,
              bookedAt: new Date(),
            }).returning();

            // Settle oldest pending return awaiting replacement if any (F-06)
            await settleOldestPendingReturn(ev.id, tx);

            bookingConfirmedResult = {
              bookingId: insertedB.id,
              eventTitle: ev.title,
              startsAt: ev.startsAt,
              venueName: ev.venueName,
              meetingPoint: ev.meetingPoint,
              creditsCharged: requiredCredits,
            };
          }
        }
      });

      // 4. Send Booking Confirmation Email if auto-booking succeeded (§N-03)
      if (bookingConfirmedResult) {
        const eventDateFormatted = new Date(bookingConfirmedResult.startsAt).toLocaleDateString(
          isEs ? "es-ES" : "en-US",
          { weekday: "short", month: "short", day: "numeric", year: "numeric" }
        );
        const eventTimeFormatted = new Date(bookingConfirmedResult.startsAt).toLocaleTimeString(
          isEs ? "es-ES" : "en-GB",
          { hour: "2-digit", minute: "2-digit" }
        );

        const bookingSubject = isEs
          ? `Tu plaza está reservada — ${bookingConfirmedResult.eventTitle}, ${eventDateFormatted}`
          : `You're booked — ${bookingConfirmedResult.eventTitle}, ${eventDateFormatted}`;

        const bookingHtml = generateBookingConfirmedEmailHtml({
          firstName: personRecord.firstName || "Friend",
          eventTitle: bookingConfirmedResult.eventTitle,
          eventDateFormatted,
          eventTimeFormatted,
          venueName: bookingConfirmedResult.venueName || undefined,
          meetingPoint: bookingConfirmedResult.meetingPoint || bookingConfirmedResult.venueName || undefined,
          creditsCharged: bookingConfirmedResult.creditsCharged,
          startsAt: bookingConfirmedResult.startsAt,
          appUrl: origin,
          isEs,
        });

        await queueAndSendEmail({
          personId: personRecord.id,
          toEmail: personRecord.email,
          toName: `${personRecord.firstName || ""} ${personRecord.lastName || ""}`.trim() || "Member",
          templateKey: "booking_confirmed",
          dedupeKey: `auto_booking_confirmed_${bookingConfirmedResult.bookingId}`,
          subject: bookingSubject,
          htmlContent: bookingHtml,
          isTransactional: true,
        });
      }
    } catch (bookingErr) {
      console.error("[Auto-Booking Error] Failed to auto-confirm booking:", bookingErr);
    }
  }
}

async function handleMembershipCheckout({
  memberId,
  customerId,
  subscriptionId,
  session,
}: {
  memberId: string;
  customerId: string;
  subscriptionId: string;
  session: any;
}) {
  await db.transaction(async (tx) => {
    const mem = await tx.query.member.findFirst({ where: eq(member.id, memberId) });
    if (!mem) return;

    const personRecord = await tx.query.person.findFirst({ where: eq(person.id, mem.personId) });
    if (!personRecord) return;

    const { getPublicClubSettings } = await import("@/app/actions/adminSettings");
    const clubSettings = await getPublicClubSettings();

    const isQuarterly = mem.billingFrequency === "quarterly" || session?.metadata?.isQuarterly === "true";
    const defaultMonthlyPrice = clubSettings.monthlyFeeCents ?? 3900;
    const defaultQuarterlyPrice = clubSettings.quarterlyFeeCents ?? 9900;
    const defaultJoiningFee = clubSettings.joiningFeeCents ?? 1900;

    const subAmount = isQuarterly ? defaultQuarterlyPrice : defaultMonthlyPrice;
    const isFeeWaived = session?.metadata?.feeWaived === "true";
    const joiningFeeAmount = isFeeWaived ? 0 : defaultJoiningFee;
    const amountTotalCents = session?.amount_total || (subAmount + joiningFeeAmount);
    const creditsToConsume = parseInt(session?.metadata?.creditsToConsume || "0", 10);

    // 1. Activate member
    await tx.update(member).set({
      status: "active",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      joinedAt: mem.joinedAt || new Date(),
      updatedAt: new Date(),
    }).where(eq(member.id, memberId));

    // 3. Deduct consumed wallet credits from subscription discount if any (M-07)
    if (creditsToConsume > 0) {
      const balance = await getPersonWalletBalance(mem.personId, tx);
      const toSpend = Math.min(balance, creditsToConsume);
      if (toSpend > 0) {
        await spendPersonCreditsFIFO(mem.personId, toSpend, tx);
      }
    }

    // 4. Record Payment in finance ledger matching accurate breakdown (F-09)
    await tx.insert(payment).values({
      personId: mem.personId,
      purpose: isQuarterly ? "subscription_quarterly" : "subscription_monthly",
      amountCents: subAmount,
      currency: "EUR",
      status: "succeeded",
      stripeInvoiceId: subscriptionId || session?.id || null,
      occurredAt: new Date(),
    }).onConflictDoNothing();

    if (joiningFeeAmount > 0) {
      await tx.insert(payment).values({
        personId: mem.personId,
        purpose: "joining_fee",
        amountCents: joiningFeeAmount,
        currency: "EUR",
        status: "succeeded",
        stripeInvoiceId: subscriptionId || session?.id || null,
        occurredAt: new Date(),
      }).onConflictDoNothing();
    }

    if (creditsToConsume > 0) {
      const topUpUnitCents = clubSettings.topUpPriceCents ?? 200;
      const discountCents = creditsToConsume * topUpUnitCents;
      await tx.insert(payment).values({
        personId: mem.personId,
        purpose: "credit_discount",
        amountCents: -discountCents,
        currency: "EUR",
        status: "succeeded",
        stripeInvoiceId: subscriptionId || session?.id || null,
        occurredAt: new Date(),
      }).onConflictDoNothing();
    }

    // 5. Grant credits for initial cycle from settings (F-09)
    const initialCredits = isQuarterly
      ? (clubSettings.quarterlyCreditsGranted ?? 60)
      : (clubSettings.monthlyCreditsGranted ?? 20);
    await grantCreditsToPerson(mem.personId, initialCredits, "subscription", 6, tx);

    // 6. Godmother referral bonus (§10 / §A-03 / F-10): Grant only ONCE per person
    const godmotherPersonId =
      personRecord.referredByPersonId ||
      (mem.referredByMemberId
        ? (await tx.query.member.findFirst({ where: eq(member.id, mem.referredByMemberId) }))?.personId
        : null);

    if (godmotherPersonId && !personRecord.godmotherRewardedAt) {
      const bonusCredits = clubSettings.referralBonusCredits || 5;

      await grantCreditsToPerson(godmotherPersonId, bonusCredits, "godmother", null, tx);

      // Mark person as rewarded so re-subscribing won't double pay (F-10)
      await tx
        .update(person)
        .set({ godmotherRewardedAt: new Date(), updatedAt: new Date() })
        .where(eq(person.id, personRecord.id));

      const godmother = await tx.query.person.findFirst({
        where: eq(person.id, godmotherPersonId),
      });

      if (godmother) {
        const newBalance = await getPersonWalletBalance(godmother.id, tx);
        const origin = getAppUrl();
        const isEsGm = godmother.locale === "es";

        const { renderPublicEmailTemplate } = await import("@/lib/brevo");
        const htmlContent = renderPublicEmailTemplate("Email - Godmother Credited.html", {
          first_name: godmother.firstName || "Godmother",
          friend_first_name: personRecord.firstName || "Your friend",
          bonus: bonusCredits,
          balance: newBalance,
          account_url: `${origin}/account`,
        }) || `
          <div style="font-family: Georgia, serif; color: #39292a; max-width: 560px; margin: 0 auto; padding: 24px; background: #fdf8f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px;">
            <h2 style="color: #7b1f2c; margin-top: 0;">${isEsGm ? "¡Gracias por compartir The Mothers!" : "Thank you for sharing The Mothers!"}</h2>
            <p>${isEsGm ? `Tu amiga ${personRecord.firstName} se ha unido. Hemos añadido <strong>${bonusCredits} créditos</strong> a tu cuenta.` : `Your friend ${personRecord.firstName} has joined. We've added <strong>${bonusCredits} credits</strong> to your wallet.`}</p>
            <p style="margin-top: 24px;">Warmly,<br/><strong>The Mothers Barcelona</strong></p>
          </div>
        `;

        await queueAndSendEmail({
          personId: godmother.id,
          toEmail: godmother.email,
          toName: `${godmother.firstName || ""} ${godmother.lastName || ""}`.trim() || "Godmother",
          templateKey: "godmother_credited",
          dedupeKey: `godmother_reward_${mem.personId}`,
          subject: isEsGm ? `+${bonusCredits} créditos por tu recomendación — The Mothers` : `+${bonusCredits} credits for your referral — The Mothers`,
          htmlContent,
          isTransactional: true,
        });
      }
    }

    // 7. Send Welcome / Subscription Confirmation Email
    const appUrl = getAppUrl();
    const planName = isQuarterly ? `Quarterly Membership (€${defaultQuarterlyPrice / 100} / 3 months)` : `Monthly Membership (€${defaultMonthlyPrice / 100} / month)`;
    const isEs = personRecord.locale === "es";

    await queueAndSendEmail({
      personId: mem.personId,
      toEmail: personRecord.email,
      toName: `${personRecord.firstName || ""} ${personRecord.lastName || ""}`.trim() || "Member",
      templateKey: "welcome_confirmation",
      dedupeKey: `member_welcome_${memberId}`,
      subject: isEs ? "Bienvenida a The Mothers — tu membresía está confirmada" : "Welcome to The Mothers — your membership is confirmed",
      htmlContent: generateSubscriptionConfirmationEmailHtml({
        firstName: personRecord.firstName,
        planName,
        creditsGranted: initialCredits,
        appUrl,
        isEs,
      }),
      isTransactional: true,
    });

    // 8. Audit Log
    await tx.insert(auditLog).values({
      actorId: mem.personId,
      actorType: "system",
      action: "membership_activated",
      entity: "member",
      entityId: memberId,
      after: { status: "active", subscriptionId, amountTotalCents, initialCredits },
    });
  });
}

async function handleInvoicePaymentSucceeded({
  customerId,
  subscriptionId,
  invoice,
}: {
  customerId: string;
  subscriptionId: string;
  invoice: any;
}) {
  const memberRecord = await db.query.member.findFirst({
    where: eq(member.stripeCustomerId, customerId),
  });

  if (!memberRecord) return;

  await db.transaction(async (tx) => {
    // Check if invoice already processed (F-03 idempotency guard)
    if (invoice.id) {
      const existingPayment = await tx.query.payment.findFirst({
        where: eq(payment.stripeInvoiceId, invoice.id),
      });
      if (existingPayment) {
        console.log(`[Invoice Paid] Invoice ${invoice.id} already processed. Skipping duplicate credit grant.`);
        return;
      }
    }

    const { getPublicClubSettings } = await import("@/app/actions/adminSettings");
    const clubSettings = await getPublicClubSettings();

    const isQuarterly = memberRecord.billingFrequency === "quarterly";
    const renewalCredits = isQuarterly
      ? (clubSettings.quarterlyCreditsGranted ?? 60)
      : (clubSettings.monthlyCreditsGranted ?? 20);

    // 1. Record payment in ledger
    const lines = invoice.lines?.data || [];
    for (const line of lines) {
      const purpose = line.subscription ? (isQuarterly ? "subscription_quarterly" : "subscription_monthly") : "joining_fee";
      await tx
        .insert(payment)
        .values({
          personId: memberRecord.personId,
          purpose,
          amountCents: line.amount,
          currency: (invoice.currency || "eur").toUpperCase(),
          status: "succeeded",
          stripeInvoiceId: invoice.id,
          occurredAt: new Date(),
        })
        .onConflictDoNothing();
    }

    // 2. Grant credits to FIFO wallet for renewal
    await grantCreditsToPerson(memberRecord.personId, renewalCredits, "subscription", 6, tx);

    // 3. Advance billing period end
    const nextPeriodEnd = invoice.lines?.data?.[0]?.period?.end
      ? new Date(invoice.lines.data[0].period.end * 1000)
      : new Date(Date.now() + (isQuarterly ? 90 : 30) * 24 * 60 * 60 * 1000);

    await tx
      .update(member)
      .set({
        status: "active",
        currentPeriodEnd: nextPeriodEnd,
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(member.id, memberRecord.id));

    // 4. Audit Log
    await tx.insert(auditLog).values({
      actorId: memberRecord.personId,
      actorType: "system",
      action: "membership_renewed",
      entity: "member",
      entityId: memberRecord.id,
      after: { amountPaidCents: invoice.amount_paid, invoiceId: invoice.id, renewalCredits },
    });
  });
}

async function handleInvoicePaymentFailed({
  customerId,
  invoice,
}: {
  customerId: string;
  invoice: any;
}) {
  const memberRecord = await db.query.member.findFirst({
    where: eq(member.stripeCustomerId, customerId),
  });

  if (!memberRecord) return;

  await db
    .update(member)
    .set({
      status: "past_due",
      updatedAt: new Date(),
    })
    .where(eq(member.id, memberRecord.id));

  const personRecord = await db.query.person.findFirst({
    where: eq(person.id, memberRecord.personId),
  });

  if (personRecord) {
    const isEs = personRecord.locale === "es";
    const subject = isEs
      ? "Problema con el pago de tu membresía — The Mothers"
      : "Payment failed for your membership — The Mothers";

    const htmlContent = `
      <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 28px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
        <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c;">
          ${isEs ? "Aviso de Pago" : "Payment Notice"}
        </h2>
        <p>
          ${
            isEs
              ? `Hola ${personRecord.firstName}, no hemos podido procesar tu última cuota de membresía. Por favor, actualiza tus datos de pago en tu cuenta para mantener tu plaza activa.`
              : `Hi ${personRecord.firstName}, we were unable to process your latest membership dues. Please update your payment method in your account to keep your membership active.`
          }
        </p>
        <p style="font-size: 13px; color: rgba(57,41,42,0.6); margin-top: 24px;">
          The Mothers · Barcelona · hello@themothers.cc
        </p>
      </div>
    `;

    await queueAndSendEmail({
      personId: personRecord.id,
      toEmail: personRecord.email,
      toName: `${personRecord.firstName || ""} ${personRecord.lastName || ""}`.trim() || "Member",
      templateKey: "payment_failed",
      dedupeKey: `payment_failed_${invoice.id}`,
      subject,
      htmlContent,
      isTransactional: true,
    });
  }

  await db.insert(auditLog).values({
    actorId: memberRecord.personId,
    actorType: "system",
    action: "membership_payment_failed",
    entity: "member",
    entityId: memberRecord.id,
    after: { invoiceId: invoice.id, amountDue: invoice.amount_due },
  });
}

async function handleSubscriptionCancelled({
  customerId,
  subscription,
}: {
  customerId: string;
  subscription: any;
}) {
  const memberRecord = await db.query.member.findFirst({
    where: eq(member.stripeCustomerId, customerId),
  });

  if (!memberRecord) return;

  await db
    .update(member)
    .set({
      status: "lapsed",
      updatedAt: new Date(),
    })
    .where(eq(member.id, memberRecord.id));

  await db.insert(auditLog).values({
    actorId: memberRecord.personId,
    actorType: "system",
    action: "membership_lapsed",
    entity: "member",
    entityId: memberRecord.id,
    after: { stripeSubscriptionId: subscription.id },
  });
}

async function handleSubscriptionUpdated({
  customerId,
  subscription,
}: {
  customerId: string;
  subscription: any;
}) {
  const memberRecord = await db.query.member.findFirst({
    where: eq(member.stripeCustomerId, customerId),
  });

  if (!memberRecord) return;

  let newStatus = memberRecord.status;
  if (subscription.status === "canceled") newStatus = "lapsed";
  else if (subscription.status === "past_due" || subscription.status === "unpaid") newStatus = "paused";
  else if (subscription.status === "active") newStatus = "active";

  await db
    .update(member)
    .set({
      status: newStatus as any,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      updatedAt: new Date(),
    })
    .where(eq(member.id, memberRecord.id));

  await db.insert(auditLog).values({
    actorId: memberRecord.personId,
    actorType: "system",
    action: "membership_status_changed",
    entity: "member",
    entityId: memberRecord.id,
    before: { status: memberRecord.status },
    after: { status: newStatus, stripeStatus: subscription.status, cancelAtPeriodEnd: subscription.cancel_at_period_end },
  });
}
