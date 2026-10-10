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
import { eq, and, or, sql, inArray, gt, desc } from "drizzle-orm";
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
import { generateIcsString } from "@/lib/ics";
import { getAppUrl } from "@/lib/urls";

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
              webhookEventId: event.id,
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
              webhookEventId: event.id,
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
            webhookEventId: event.id,
          });
        }
        break;
      }
      
      // ─── H. CHECKOUT SESSION EXPIRED ────────────────────────────────────────
      case "checkout.session.expired": {
        const session = eventData;
        await handleCheckoutSessionExpired({ session, webhookEventId: event.id });
        break;
      }

      // ─── C. INVOICE PAYMENT FAILED ──────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = eventData;
        const customerId = invoice.customer as string;

        if (customerId) {
          await handleInvoicePaymentFailed({ customerId, invoice, webhookEventId: event.id });
        }
        break;
      }

      // ─── D. CUSTOMER SUBSCRIPTION DELETED / CANCELLED ───────────────────────
      case "customer.subscription.deleted": {
        const subscription = eventData;
        const customerId = subscription.customer as string;

        if (customerId) {
          await handleSubscriptionCancelled({ customerId, subscription, webhookEventId: event.id });
        }
        break;
      }

      // ─── E. CUSTOMER SUBSCRIPTION UPDATED ──────────────────────────────────
      case "customer.subscription.updated": {
        const subscription = eventData;
        const customerId = subscription.customer as string;

        if (customerId) {
          await handleSubscriptionUpdated({ customerId, subscription, webhookEventId: event.id });
        }
        break;
      }

      // ─── F. CHARGE REFUNDED ────────────────────────────────────────────────
      case "charge.refunded": {
        const charge = eventData;
        await handleChargeRefunded({ charge, webhookEventId: event.id });
        break;
      }

      // ─── G. CHARGE DISPUTE CREATED ─────────────────────────────────────────
      case "charge.dispute.created": {
        const dispute = eventData;
        await handleChargeDisputed({ dispute, webhookEventId: event.id });
        break;
      }

      default: {
        // Record unhandled event
        await db.insert(stripeEvent).values({
          id: event.id,
          type: event.type,
          payload: event as any,
        }).onConflictDoNothing();
        break;
      }
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
  webhookEventId,
}: {
  personId: string;
  creditAmount: number;
  eventId?: string;
  session: any;
  webhookEventId: string;
}) {
  const { getPublicClubSettings } = await import("@/app/actions/adminSettings");
  const clubSettings = await getPublicClubSettings();

  // 1. Grant credits and record payment in its own transaction (N-02: Never rollback paid credits)
  // Mark stripeEvent done atomically inside the transaction
  const txResult = await db.transaction(async (tx) => {
    const pRecord = await tx.query.person.findFirst({
      where: eq(person.id, personId),
    });
    if (!pRecord) return null;

    const creditLife = clubSettings.creditLifeMonths ?? 6;
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;
    const gResult = await grantCreditsToPerson(personId, creditAmount, "topup", creditLife, tx, null, paymentIntentId);

    await tx.insert(payment).values({
      personId,
      purpose: "topup",
      amountCents: session.amount_total || creditAmount * (clubSettings.topUpPriceCents ?? 200),
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

    await tx.insert(stripeEvent).values({
      id: webhookEventId,
      type: "checkout.session.completed",
      payload: session as any,
    }).onConflictDoNothing();

    return { grantResult: gResult, personRecord: pRecord };
  });

  if (!txResult || !txResult.personRecord || !txResult.grantResult) return;
  const { grantResult, personRecord } = txResult;

  // 2. Send Payment Receipt Email (§11)
  const amountEur = (session.amount_total || creditAmount * (clubSettings.topUpPriceCents ?? 200)) / 100;
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
        // Check event exists, is active (not cancelled), and is in the future
        if (!ev || ev.status === "cancelled" || new Date(ev.startsAt).getTime() <= Date.now()) {
          console.warn(`[Auto-Booking] Event ${eventId} is cancelled or in the past. Keeping credits in wallet.`);
          return;
        }

        const mem = await tx.query.member.findFirst({
          where: and(eq(member.personId, personId), eq(member.status, "active")),
        });
        const isMember = !!mem;

        // Check if non-members are allowed if user is not a member (P2-10 fix)
        if (clubSettings.membershipLive && !isMember) {
          if (ev.nonMemberOpensAt && new Date() < new Date(ev.nonMemberOpensAt)) {
            console.warn(`[Auto-Booking] Event ${eventId} embargo active for non-members. Keeping credits in wallet.`);
            return;
          }
          if (ev.nonMemberCredits === null) {
            console.warn(`[Auto-Booking] Event ${eventId} is member-only. Keeping credits in wallet.`);
            return;
          }
        }

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
              heldUntil: null,
              creditsCharged: requiredCredits,
              creditDeductions,
              updatedAt: new Date(),
            })
            .where(eq(booking.id, heldBooking.id));

          await settleOldestPendingReturn(ev.id, tx);

          bookingConfirmedResult = {
            bookingId: heldBooking.id,
            eventId: ev.id,
            eventTitle: ev.title,
            startsAt: ev.startsAt,
            endsAt: ev.endsAt,
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

            await settleOldestPendingReturn(ev.id, tx);

            bookingConfirmedResult = {
              bookingId: insertedB.id,
              eventId: ev.id,
              eventTitle: ev.title,
              startsAt: ev.startsAt,
              endsAt: ev.endsAt,
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
          endsAt: bookingConfirmedResult.endsAt,
          eventId: bookingConfirmedResult.eventId,
          appUrl: origin,
          isEs,
        });

        const icsString = generateIcsString({
          title: bookingConfirmedResult.eventTitle,
          description: `The Mothers gathering: ${bookingConfirmedResult.eventTitle}. Meeting point: ${bookingConfirmedResult.meetingPoint || bookingConfirmedResult.venueName || "Barcelona"}`,
          location: bookingConfirmedResult.meetingPoint || bookingConfirmedResult.venueName || "Barcelona, Spain",
          startsAt: bookingConfirmedResult.startsAt,
          endsAt: bookingConfirmedResult.endsAt,
          url: `${origin}/events/${bookingConfirmedResult.eventId}`,
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
          attachments: [
            {
              name: "mothers-gathering.ics",
              content: Buffer.from(icsString, "utf-8").toString("base64"),
            },
          ],
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
  webhookEventId,
}: {
  memberId: string;
  customerId: string;
  subscriptionId: string;
  session: any;
  webhookEventId: string;
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
    
    // P2-14: Plan credits ignore "credit life" in Settings
    const creditLife = clubSettings.creditLifeMonths ?? 6;

    const creditsToConsume = parseInt(session?.metadata?.creditsToConsume || "0", 10);

    // 1. Activate member
    await tx.update(member).set({
      status: "active",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      joinedAt: mem.joinedAt || new Date(),
      updatedAt: new Date(),
    }).where(eq(member.id, memberId));

    // 2. We skip deducting credits here because route.ts already consumed them dynamically. (P2-03)

    // 3. Record Payment in finance ledger matching actual breakdown from Stripe (P2-08)
    const { stripe } = await import("@/lib/stripe");
    let initialInvoiceLines: any[] = [];
    if (session?.invoice) {
      try {
        const inv = await stripe.invoices.retrieve(session.invoice as string);
        if (inv.lines?.data) initialInvoiceLines = inv.lines.data;
      } catch (err) {
        console.warn("Failed to fetch invoice lines for checkout session:", err);
      }
    }

    if (initialInvoiceLines.length > 0) {
      for (const line of initialInvoiceLines) {
        let purpose = "other";
        if (line.type === "subscription" || line.subscription) {
          purpose = isQuarterly ? "subscription_quarterly" : "subscription_monthly";
        } else if (line.description?.toLowerCase().includes("joining")) {
          purpose = "joining_fee";
        }
        await tx.insert(payment).values({
          personId: mem.personId,
          purpose: purpose as any,
          amountCents: line.amount,
          currency: "EUR",
          status: "succeeded",
          stripeInvoiceId: subscriptionId || session?.id || null,
          occurredAt: new Date(),
        }).onConflictDoNothing();
      }
    } else {
      // Fallback
      await tx.insert(payment).values({
        personId: mem.personId,
        purpose: isQuarterly ? "subscription_quarterly" : "subscription_monthly",
        amountCents: session?.amount_total || 3900,
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

    // 4. Grant credits for initial cycle from settings (F-09)
    const initialCredits = isQuarterly
      ? (clubSettings.quarterlyCreditsGranted ?? 60)
      : (clubSettings.monthlyCreditsGranted ?? 20);
    
    const initialInvoiceId = typeof session?.invoice === "string" ? session.invoice : session?.invoice?.id || null;
    const initialPaymentIntentId = typeof session?.payment_intent === "string" ? session.payment_intent : session?.payment_intent?.id || null;
    
    await grantCreditsToPerson(mem.personId, initialCredits, "subscription", creditLife, tx, initialInvoiceId, initialPaymentIntentId);

    // 5. Godmother referral bonus (§10 / §A-03 / F-10): Grant only ONCE per person
    const godmotherPersonId =
      personRecord.referredByPersonId ||
      (mem.referredByMemberId
        ? (await tx.query.member.findFirst({ where: eq(member.id, mem.referredByMemberId) }))?.personId
        : null);

    if (godmotherPersonId && !personRecord.godmotherRewardedAt) {
      const bonusCredits = clubSettings.referralBonusCredits || 5;

      await grantCreditsToPerson(godmotherPersonId, bonusCredits, "godmother", creditLife, tx);

      await tx
        .update(person)
        .set({ godmotherRewardedAt: new Date(), updatedAt: new Date() })
        .where(eq(person.id, personRecord.id));

      const godmother = await tx.query.person.findFirst({
        where: eq(person.id, godmotherPersonId),
      });

      if (godmother) {
        const isEsGm = godmother.locale === "es";

        await queueAndSendEmail({
          personId: godmother.id,
          toEmail: godmother.email,
          toName: `${godmother.firstName || ""} ${godmother.lastName || ""}`.trim() || "Godmother",
          templateKey: "godmother_credited",
          dedupeKey: `godmother_reward_${mem.personId}`,
          subject: isEsGm ? `+${bonusCredits} créditos por tu recomendación — The Mothers` : `+${bonusCredits} credits for your referral — The Mothers`,
          htmlContent: `
            <div style="font-family: Georgia, serif; color: #39292a; max-width: 560px; margin: 0 auto; padding: 24px; background: #fdf8f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px;">
              <h2 style="color: #7b1f2c; margin-top: 0;">${isEsGm ? "¡Gracias por compartir The Mothers!" : "Thank you for sharing The Mothers!"}</h2>
              <p>${isEsGm ? `Tu amiga ${personRecord.firstName} se ha unido. Hemos añadido <strong>${bonusCredits} créditos</strong> a tu cuenta.` : `Your friend ${personRecord.firstName} has joined. We've added <strong>${bonusCredits} credits</strong> to your wallet.`}</p>
              <p style="margin-top: 24px;">Warmly,<br/><strong>The Mothers Barcelona</strong></p>
            </div>
          `,
          isTransactional: true,
        });
      }
    }

    // 6. Send Welcome / Subscription Confirmation Email
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

    // 7. Audit Log & Mark stripeEvent done atomically
    await tx.insert(auditLog).values({
      actorId: mem.personId,
      actorType: "system",
      action: "membership_activated",
      entity: "member",
      entityId: memberId,
      after: { status: "active", subscriptionId, amountTotalCents: session?.amount_total || 0, initialCredits },
    });

    await tx.insert(stripeEvent).values({
      id: webhookEventId,
      type: "checkout.session.completed",
      payload: session as any,
    }).onConflictDoNothing();
  });
}

async function handleInvoicePaymentSucceeded({
  customerId,
  subscriptionId,
  invoice,
  webhookEventId,
}: {
  customerId: string;
  subscriptionId: string;
  invoice: any;
  webhookEventId: string;
}) {
  const memberRecord = await db.query.member.findFirst({
    where: eq(member.stripeCustomerId, customerId),
  });

  if (!memberRecord) return;

  await db.transaction(async (tx) => {
    // Skip the first invoice; it is handled by checkout.session.completed
    if (invoice.billing_reason === "subscription_create") {
      return;
    }

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

    // P2-14: Plan credits ignore "credit life" in Settings
    const creditLife = clubSettings.creditLifeMonths ?? 6;

    // 1. Record payment in ledger from actual line items
    // P2-09: Renewal lines can be booked as "joining fee"
    const lines = invoice.lines?.data || [];
    if (lines.length === 0) {
      await tx
        .insert(payment)
        .values({
          personId: memberRecord.personId,
          purpose: isQuarterly ? "subscription_quarterly" : "subscription_monthly",
          amountCents: invoice.amount_paid || (isQuarterly ? 9900 : 3900),
          currency: (invoice.currency || "eur").toUpperCase(),
          status: "succeeded",
          stripeInvoiceId: invoice.id,
          occurredAt: new Date(),
        })
        .onConflictDoNothing();
    } else {
      for (const line of lines) {
        let purpose = "other";
        if (line.type === "subscription" || line.subscription) {
          purpose = isQuarterly ? "subscription_quarterly" : "subscription_monthly";
        } else if (line.description?.toLowerCase().includes("proration")) {
          purpose = "proration";
        }
        await tx
          .insert(payment)
          .values({
            personId: memberRecord.personId,
            purpose: purpose as any,
            amountCents: line.amount,
            currency: (invoice.currency || "eur").toUpperCase(),
            status: "succeeded",
            stripeInvoiceId: invoice.id,
            occurredAt: new Date(),
          })
          .onConflictDoNothing();
      }
    }

    // 2. Grant credits to FIFO wallet for renewal
    const invoiceId = invoice.id || null;
    const paymentIntentId = invoice.payment_intent || null;
    await grantCreditsToPerson(memberRecord.personId, renewalCredits, "subscription", creditLife, tx, invoiceId, paymentIntentId);

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

    // 4. Audit Log & Mark stripeEvent done atomically
    await tx.insert(auditLog).values({
      actorId: memberRecord.personId,
      actorType: "system",
      action: "membership_renewed",
      entity: "member",
      entityId: memberRecord.id,
      after: { amountPaidCents: invoice.amount_paid, invoiceId: invoice.id, renewalCredits },
    });

    await tx.insert(stripeEvent).values({
      id: webhookEventId,
      type: "invoice.paid",
      payload: invoice as any,
    }).onConflictDoNothing();
  });
}

async function handleInvoicePaymentFailed({
  customerId,
  invoice,
  webhookEventId,
}: {
  customerId: string;
  invoice: any;
  webhookEventId: string;
}) {
  const memberRecord = await db.query.member.findFirst({
    where: eq(member.stripeCustomerId, customerId),
  });

  if (!memberRecord) return;

  await db.transaction(async (tx) => {
    // Keep 'past_due' (overdue) as distinct status - do NOT set to 'paused'
    await tx
      .update(member)
      .set({
        status: "past_due",
        updatedAt: new Date(),
      })
      .where(eq(member.id, memberRecord.id));

    await tx.insert(auditLog).values({
      actorId: memberRecord.personId,
      actorType: "system",
      action: "membership_payment_failed",
      entity: "member",
      entityId: memberRecord.id,
      after: { invoiceId: invoice.id, amountDue: invoice.amount_due },
    });

    await tx.insert(stripeEvent).values({
      id: webhookEventId,
      type: "invoice.payment_failed",
      payload: invoice as any,
    }).onConflictDoNothing();
  });

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
}

async function handleSubscriptionCancelled({
  customerId,
  subscription,
  webhookEventId,
}: {
  customerId: string;
  subscription: any;
  webhookEventId: string;
}) {
  const memberRecord = await db.query.member.findFirst({
    where: eq(member.stripeCustomerId, customerId),
  });

  if (!memberRecord) return;

  await db.transaction(async (tx) => {
    await tx
      .update(member)
      .set({
        status: "lapsed",
        updatedAt: new Date(),
      })
      .where(eq(member.id, memberRecord.id));

    await tx.insert(auditLog).values({
      actorId: memberRecord.personId,
      actorType: "system",
      action: "membership_lapsed",
      entity: "member",
      entityId: memberRecord.id,
      after: { stripeSubscriptionId: subscription.id },
    });

    await tx.insert(stripeEvent).values({
      id: webhookEventId,
      type: "customer.subscription.deleted",
      payload: subscription as any,
    }).onConflictDoNothing();
  });
}

async function handleSubscriptionUpdated({
  customerId,
  subscription,
  webhookEventId,
}: {
  customerId: string;
  subscription: any;
  webhookEventId: string;
}) {
  const memberRecord = await db.query.member.findFirst({
    where: eq(member.stripeCustomerId, customerId),
  });

  if (!memberRecord) return;

  let newStatus = memberRecord.status;
  if (subscription.status === "canceled") newStatus = "lapsed";
  else if (subscription.status === "past_due" || subscription.status === "unpaid") newStatus = "past_due";
  else if (subscription.status === "active") {
    if (subscription.pause_collection) {
      newStatus = "paused";
    } else {
      newStatus = "active";
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(member)
      .set({
        status: newStatus as any,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        updatedAt: new Date(),
      })
      .where(eq(member.id, memberRecord.id));

    await tx.insert(auditLog).values({
      actorId: memberRecord.personId,
      actorType: "system",
      action: "membership_status_changed",
      entity: "member",
      entityId: memberRecord.id,
      before: { status: memberRecord.status },
      after: { status: newStatus, stripeStatus: subscription.status, cancelAtPeriodEnd: subscription.cancel_at_period_end },
    });

    await tx.insert(stripeEvent).values({
      id: webhookEventId,
      type: "customer.subscription.updated",
      payload: subscription as any,
    }).onConflictDoNothing();
  });
}

async function handleChargeRefunded({
  charge,
  webhookEventId,
}: {
  charge: any;
  webhookEventId: string;
}) {
  await db.transaction(async (tx) => {
    const paymentIntentId = charge.payment_intent as string | null;
    const invoiceId = charge.invoice as string | null;

    const payRecord = await tx.query.payment.findFirst({
      where: or(
        paymentIntentId ? eq(payment.stripePaymentIntentId, paymentIntentId) : sql`false`,
        invoiceId ? eq(payment.stripeInvoiceId, invoiceId) : sql`false`
      ),
    });

    if (!payRecord) return;

    // 1. Update payment status to refunded
    await tx.update(payment).set({
      status: "refunded",
    }).where(eq(payment.id, payRecord.id));

    // 2. Clawback / Remove unused credits from creditBatch if topup/subscription
    // First try to find the exact batch that was granted by this payment
    const condition = [];
    if (paymentIntentId) condition.push(eq(creditBatch.stripePaymentIntentId, paymentIntentId));
    if (invoiceId) condition.push(eq(creditBatch.stripeInvoiceId, invoiceId));
    
    let batches: any[] = [];
    if (condition.length > 0) {
      batches = await tx.query.creditBatch.findMany({
        where: and(
          eq(creditBatch.personId, payRecord.personId),
          gt(creditBatch.remaining, 0),
          or(...condition)
        ),
        orderBy: [desc(creditBatch.createdAt)],
      });
    }

    // If no exact match found, fallback to all valid batches
    if (batches.length === 0) {
      batches = await tx.query.creditBatch.findMany({
        where: and(
          eq(creditBatch.personId, payRecord.personId),
          gt(creditBatch.remaining, 0),
          gt(creditBatch.expiresAt, new Date())
        ),
        orderBy: [desc(creditBatch.createdAt)],
      });
    }

    const refundAmountCents = charge.amount_refunded || payRecord.amountCents;
    
    // Determine how many credits were granted by this specific payment
    let creditsToClawback = 0;
    const exactBatch = batches.find(b => 
      (paymentIntentId && b.stripePaymentIntentId === paymentIntentId) || 
      (invoiceId && b.stripeInvoiceId === invoiceId)
    );

    if (exactBatch) {
       // Only claw back exactly what was granted (or whatever is remaining of it)
       creditsToClawback = exactBatch.amount; // Clawback the original granted amount
    } else {
       // Fallback logic
       creditsToClawback = Math.max(1, Math.floor(refundAmountCents / 200));
    }

    let totalClawedBack = 0;
    for (const b of batches) {
      if (creditsToClawback <= 0) break;
      const remove = Math.min(b.remaining, creditsToClawback);
      await tx.update(creditBatch).set({
        remaining: b.remaining - remove,
      }).where(eq(creditBatch.id, b.id));
      totalClawedBack += remove;
      creditsToClawback -= remove;
    }

    const remainingUnrecovered = creditsToClawback;

    // 3. Audit Log & Alert
    await tx.insert(auditLog).values({
      actorId: payRecord.personId,
      actorType: "system",
      action: "payment_refunded_clawback",
      entity: "payment",
      entityId: payRecord.id,
      after: {
        amountRefundedCents: refundAmountCents,
        totalClawedBack,
        remainingUnrecoveredSpent: remainingUnrecovered,
        alertTeam: remainingUnrecovered > 0,
      },
    });

    await tx.insert(stripeEvent).values({
      id: webhookEventId,
      type: "charge.refunded",
      payload: charge as any,
    }).onConflictDoNothing();
  });
}

async function handleChargeDisputed({
  dispute,
  webhookEventId,
}: {
  dispute: any;
  webhookEventId: string;
}) {
  await db.transaction(async (tx) => {
    const chargeId = dispute.charge as string;
    const paymentIntentId = dispute.payment_intent as string | null;

    const payRecord = await tx.query.payment.findFirst({
      where: or(
        paymentIntentId ? eq(payment.stripePaymentIntentId, paymentIntentId) : sql`false`,
        eq(payment.stripeInvoiceId, chargeId)
      ),
    });

    if (payRecord) {
      await tx.update(payment).set({
        status: "disputed",
      }).where(eq(payment.id, payRecord.id));

      await tx.insert(auditLog).values({
        actorId: payRecord.personId,
        actorType: "system",
        action: "charge_disputed_alert",
        entity: "payment",
        entityId: payRecord.id,
        after: {
          disputeId: dispute.id,
          amountDisputedCents: dispute.amount,
          reason: dispute.reason,
          status: dispute.status,
        },
      });
    }

    await tx.insert(stripeEvent).values({
      id: webhookEventId,
      type: "charge.dispute.created",
      payload: dispute as any,
    }).onConflictDoNothing();
  });
}

async function handleCheckoutSessionExpired({
  session,
  webhookEventId,
}: {
  session: any;
  webhookEventId: string;
}) {
  await db.transaction(async (tx) => {
    // If the session was for a membership checkout with reserved credits
    if (session.metadata?.type === "membership" && session.metadata?.creditDeductions) {
      try {
        const deductions = JSON.parse(session.metadata.creditDeductions);
        if (Array.isArray(deductions) && deductions.length > 0) {
          const { refundBookingCredits } = await import("@/lib/ledger");
          // Re-use refundBookingCredits which takes an array of deductions
          await refundBookingCredits(
            { personId: session.metadata.personId, creditDeductions: deductions },
            undefined,
            tx
          );
        }
      } catch (e) {
        console.error("Failed to parse/refund creditDeductions on expired session:", e);
      }
    }

    if (session.metadata?.couponId) {
      try {
        await stripe.coupons.del(session.metadata.couponId);
      } catch (e) {
        console.warn("Failed to delete unused coupon:", e);
      }
    }

    await tx.insert(stripeEvent).values({
      id: webhookEventId,
      type: "checkout.session.expired",
      payload: session as any,
    }).onConflictDoNothing();
  });
}
