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
  eventPass,
  application,
} from "@/db/schema";
import { eq, and, or, sql, inArray } from "drizzle-orm";
import {
  grantCreditsToPerson,
  spendPersonCreditsFIFO,
  getPersonWalletBalance,
} from "@/lib/ledger";
import {
  queueAndSendEmail,
  generateSubscriptionConfirmationEmailHtml,
  generateGuestPassEmailHtml,
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

        // 1. Guest Pass Checkout
        if (type === "guest_pass") {
          const personId = meta.personId;
          const eventId = meta.eventId;
          const amountTotal = session.amount_total || 3500;

          if (personId && eventId) {
            await handleGuestPassCheckout({
              personId,
              eventId,
              amountTotalCents: amountTotal,
              currency: (session.currency || "eur").toUpperCase(),
              paymentIntentId: session.payment_intent as string | null,
              sessionId: session.id,
            });
          }
        }

        // 2. Top-Up / Extra Credits Checkout (FIFO wallet)
        else if (type === "extra_credits" || type === "credit_topup" || type === "topup") {
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

        // 3. Membership Activation Checkout
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

      // ─── B. INVOICE PAYMENT SUCCEEDED (SUBSCRIPTION RENEWALS) ─────────────────
      case "invoice.payment_succeeded":
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

async function handleGuestPassCheckout({
  personId,
  eventId,
  amountTotalCents,
  currency,
  paymentIntentId,
  sessionId,
}: {
  personId: string;
  eventId: string;
  amountTotalCents: number;
  currency: string;
  paymentIntentId: string | null;
  sessionId: string;
}) {
  await db.transaction(async (tx) => {
    const existingPass = await tx.query.eventPass.findFirst({
      where: and(eq(eventPass.personId, personId), eq(eventPass.eventId, eventId)),
    });

    if (existingPass) return;

    const eventRecord = await tx.query.event.findFirst({
      where: eq(eventTable.id, eventId),
    });

    const personRecord = await tx.query.person.findFirst({
      where: eq(person.id, personId),
    });

    if (!eventRecord || !personRecord) return;

    // 1. Record payment in ledger
    await tx.insert(payment).values({
      personId,
      purpose: "event_pass",
      amountCents: amountTotalCents,
      currency,
      status: "succeeded",
      stripePaymentIntentId: paymentIntentId,
      stripeInvoiceId: sessionId,
      occurredAt: new Date(),
    }).onConflictDoNothing();

    // 2. Generate secure 32-byte ticket token & hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const creditExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // 3. Create Event Pass
    const insertedPass = await tx
      .insert(eventPass)
      .values({
        personId,
        eventId,
        priceCents: amountTotalCents,
        status: "paid",
        ticketTokenHash: tokenHash,
        creditExpiresAt,
      })
      .returning();

    const passId = insertedPass[0].id;
    const initialStatus = eventRecord.status === "confirmed" ? "confirmed" : "held";

    // 4. Create Booking
    const insertedBooking = await tx
      .insert(booking)
      .values({
        eventId,
        personId,
        kind: "guest",
        status: initialStatus,
        creditsCharged: 0,
        moneyPaidCents: amountTotalCents,
        passId,
        bookedAt: new Date(),
      })
      .returning();

    // 5. Audit Log
    await tx.insert(auditLog).values({
      actorId: personId,
      actorType: "system",
      action: "guest_pass_purchased",
      entity: "event_pass",
      entityId: passId,
      after: { eventId, amountTotalCents, bookingId: insertedBooking[0]?.id },
    });

    // 6. Send Ticket Email
    const ticketUrl = `${getAppUrl()}/ticket/${rawToken}`;
    const isEs = personRecord.locale === "es";
    const subject = isEs
      ? `Tu Event Pass: ${eventRecord.title} — The Mothers`
      : `Your Event Pass — ${eventRecord.title} · The Mothers`;

    const eventDateFormatted = new Date(eventRecord.startsAt).toLocaleDateString(isEs ? "es-ES" : "en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

    const htmlContent = generateGuestPassEmailHtml({
      firstName: personRecord.firstName || "Mother",
      eventTitle: eventRecord.title,
      eventDate: eventDateFormatted,
      meetingPoint: eventRecord.meetingPoint || eventRecord.venueName || "Barcelona",
      neighbourhood: eventRecord.neighbourhood || undefined,
      amountPaidEur: amountTotalCents / 100,
      passNumber: 1,
      receiptNumber: `TM-${insertedBooking[0]?.id.slice(0, 4).toUpperCase()}`,
      ticketUrl,
      isEs,
    });

    await queueAndSendEmail({
      personId,
      toEmail: personRecord.email,
      toName: `${personRecord.firstName || ""} ${personRecord.lastName || ""}`.trim() || "Member",
      templateKey: "guest_place_booked",
      dedupeKey: `guest_ticket_${rawToken.slice(0, 16)}`,
      subject,
      htmlContent,
      isTransactional: true,
    });
  });
}

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
  await db.transaction(async (tx) => {
    const personRecord = await tx.query.person.findFirst({
      where: eq(person.id, personId),
    });
    if (!personRecord) return;

    // 1. Grant credits to person's unified FIFO wallet
    const grant = await grantCreditsToPerson(personId, creditAmount, "topup", 6, tx);

    // 2. Record payment in finance ledger
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

    // 3. Send Payment Receipt Email (§11)
    const amountEur = (session.amount_total || creditAmount * 200) / 100;
    const isEs = personRecord.locale === "es";
    const origin = getAppUrl();
    const orderId = `TM-${grant.batchId.substring(0, 8).toUpperCase()}`;
    const expiryDateFormatted = grant.expiresAt.toLocaleDateString(isEs ? "es-ES" : "en-US", {
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
      dedupeKey: `topup_receipt_${grant.batchId}`,
      subject,
      htmlContent,
      isTransactional: true,
    });

    // 4. If eventId attached, auto-confirm held booking or create booking
    if (eventId) {
      const ev = await tx.query.event.findFirst({
        where: eq(eventTable.id, eventId),
      });

      if (ev) {
        const requiredCredits = ev.nonMemberCredits > 0 ? ev.nonMemberCredits : ev.creditCost;

        // Check if there is an existing held booking
        const heldBooking = await tx.query.booking.findFirst({
          where: and(
            eq(booking.eventId, eventId),
            eq(booking.personId, personId),
            eq(booking.status, "held")
          ),
        });

        if (heldBooking) {
          if (requiredCredits > 0) {
            await spendPersonCreditsFIFO(personId, requiredCredits, tx);
          }
          await tx
            .update(booking)
            .set({
              status: ev.status === "confirmed" ? "confirmed" : "held",
              creditsCharged: requiredCredits,
              updatedAt: new Date(),
            })
            .where(eq(booking.id, heldBooking.id));
        } else {
          // Check if not already booked
          const existing = await tx.query.booking.findFirst({
            where: and(
              eq(booking.eventId, eventId),
              eq(booking.personId, personId),
              inArray(booking.status, ["held", "confirmed"])
            ),
          });

          if (!existing) {
            if (requiredCredits > 0) {
              await spendPersonCreditsFIFO(personId, requiredCredits, tx);
            }
            await tx.insert(booking).values({
              eventId,
              personId,
              kind: "guest",
              status: ev.status === "confirmed" ? "confirmed" : "held",
              creditsCharged: requiredCredits,
              bookedAt: new Date(),
            });
          }
        }
      }
    }

    // 5. Audit Log
    await tx.insert(auditLog).values({
      actorId: personId,
      actorType: "system",
      action: "topup_credits_purchased",
      entity: "credit_batch",
      entityId: grant.batchId,
      after: { creditAmount, eventId: eventId || null, sessionId: session.id },
    });
  });
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

    const isQuarterly = mem.billingFrequency === "quarterly" || session?.metadata?.isQuarterly === "true";
    const amountTotalCents = session?.amount_total || (isQuarterly ? 9900 : 3900);
    const isFeeWaived = session?.metadata?.feeWaived === "true";
    const creditsToConsume = parseInt(session?.metadata?.creditsToConsume || "0", 10);

    // 1. Activate member
    await tx.update(member).set({
      status: "active",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      joinedAt: mem.joinedAt || new Date(),
      updatedAt: new Date(),
    }).where(eq(member.id, memberId));

    // 2. Mark application as paid
    const recentApp = await tx.query.application.findFirst({
      where: and(
        eq(application.personId, mem.personId),
        or(eq(application.status, "accepted"), eq(application.status, "submitted"), eq(application.status, "paid"))
      ),
      orderBy: (app, { desc }) => [desc(app.decidedAt), desc(app.submittedAt)],
    });

    if (recentApp) {
      await tx.update(application).set({
        status: "paid",
        isPaid: true,
        updatedAt: new Date(),
      }).where(eq(application.id, recentApp.id));
    }

    // 3. Deduct consumed wallet credits from subscription discount if any
    if (creditsToConsume > 0) {
      const balance = await getPersonWalletBalance(mem.personId, tx);
      const toSpend = Math.min(balance, creditsToConsume);
      if (toSpend > 0) {
        await spendPersonCreditsFIFO(mem.personId, toSpend, tx);
      }
    }

    // 4. Record Payment in finance ledger
    const subAmount = isQuarterly ? 9900 : 3900;
    const joiningFeeAmount = (!isFeeWaived && amountTotalCents > subAmount) ? (amountTotalCents - subAmount) : 0;

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

    // 5. Grant credits for initial month (20 credits with 6-month validity in unified FIFO wallet)
    await grantCreditsToPerson(mem.personId, 20, "subscription", 6, tx);

    // 6. Godmother referral bonus (§10 / §A-03): Grant +5 credits to Godmother if referred
    const godmotherPersonId =
      personRecord.referredByPersonId ||
      (mem.referredByMemberId
        ? (await tx.query.member.findFirst({ where: eq(member.id, mem.referredByMemberId) }))?.personId
        : null);

    if (godmotherPersonId) {
      await grantCreditsToPerson(godmotherPersonId, 5, "godmother", 6, tx);

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
          bonus: 5,
          balance: newBalance,
          account_url: `${origin}/account`,
        }) || `
          <div style="font-family: Georgia, serif; color: #39292a; max-width: 560px; margin: 0 auto; padding: 24px; background: #fdf8f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px;">
            <h2 style="color: #7b1f2c; margin-top: 0;">${isEsGm ? "¡Gracias por compartir The Mothers!" : "Thank you for sharing The Mothers!"}</h2>
            <p>${isEsGm ? `Tu amiga ${personRecord.firstName} se ha unido. Hemos añadido <strong>5 créditos</strong> a tu cuenta.` : `Your friend ${personRecord.firstName} has joined. We've added <strong>5 credits</strong> to your wallet.`}</p>
            <p style="margin-top: 24px;">Warmly,<br/><strong>The Mothers Barcelona</strong></p>
          </div>
        `;

        await queueAndSendEmail({
          personId: godmother.id,
          toEmail: godmother.email,
          toName: `${godmother.firstName || ""} ${godmother.lastName || ""}`.trim() || "Godmother",
          templateKey: "godmother_credited",
          dedupeKey: `godmother_reward_${mem.personId}`,
          subject: isEsGm ? "+5 créditos por tu recomendación — The Mothers" : "+5 credits for your referral — The Mothers",
          htmlContent,
          isTransactional: true,
        });
      }
    }

    // 7. Send Welcome / Subscription Confirmation Email
    const appUrl = getAppUrl();
    const planName = isQuarterly ? "Quarterly Membership (€99 / 3 months)" : "Monthly Membership (€39 / month)";
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
        creditsGranted: 20,
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
      after: { status: "active", subscriptionId, amountTotalCents },
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
    // 1. Record payment in ledger
    const lines = invoice.lines?.data || [];
    for (const line of lines) {
      const purpose = line.subscription ? "subscription_monthly" : "joining_fee";
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

    // 2. Grant 20 credits to FIFO wallet for monthly renewal
    await grantCreditsToPerson(memberRecord.personId, 20, "subscription", 6, tx);

    // 3. Advance billing period end
    const isQuarterly = memberRecord.billingFrequency === "quarterly";
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
      after: { amountPaidCents: invoice.amount_paid, invoiceId: invoice.id },
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
