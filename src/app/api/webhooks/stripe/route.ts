import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { stripeEvent, member, payment, person, auditLog, creditEntry, event as eventTable, booking } from "@/db/schema";
import { eq } from "drizzle-orm";
import { grantMonthlySubscriptionCredits } from "@/lib/ledger";
import { queueAndSendEmail } from "@/lib/brevo";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2025-01-27.acacia" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_placeholder";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  // 1. Idempotency Check: prevent duplicate event processing (§6, §14)
  const existingEvent = await db.query.stripeEvent.findFirst({
    where: eq(stripeEvent.id, event.id),
  });

  if (existingEvent) {
    return NextResponse.json({ received: true, status: "already_processed" });
  }

  // Record incoming event
  await db.insert(stripeEvent).values({
    id: event.id,
    type: event.type,
    payload: event as any,
  });

  try {
    switch (event.type) {
      // ─── A. SUBSCRIPTION PAYMENT SUCCEEDED (§5, §6) ────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (customerId) {
          const memberRecord = await db.query.member.findFirst({
            where: eq(member.stripeCustomerId, customerId),
          });

          if (memberRecord) {
            await db.transaction(async (tx) => {
              // 1. Record Payment
              const insertedPayment = await tx
                .insert(payment)
                .values({
                  personId: memberRecord.personId,
                  purpose: "subscription_monthly",
                  amountCents: invoice.amount_paid,
                  currency: invoice.currency.toUpperCase(),
                  status: "succeeded",
                  stripeInvoiceId: invoice.id,
                })
                .returning({ id: payment.id });

              // 2. Grant Monthly Credits with 40-cap rollover protection (§5)
              await grantMonthlySubscriptionCredits(memberRecord.id, insertedPayment[0].id, tx);

              // 3. Advance billing period end
              const nextPeriodEnd = invoice.lines.data[0]?.period?.end
                ? new Date(invoice.lines.data[0].period.end * 1000)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

              await tx
                .update(member)
                .set({
                  status: "active",
                  currentPeriodEnd: nextPeriodEnd,
                  cancelAtPeriodEnd: false,
                  updatedAt: new Date(),
                })
                .where(eq(member.id, memberRecord.id));
            });
          }
        }
        break;
      }

      // ─── B. PAYMENT FAILED (§6, §20.7) ────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (customerId) {
          const memberRecord = await db.query.member.findFirst({
            where: eq(member.stripeCustomerId, customerId),
          });

          if (memberRecord) {
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
              const subject =
                personRecord.locale === "es"
                  ? "Problema con el pago de tu membresía — The Mothers"
                  : "Payment failed for your membership — The Mothers";

              const htmlContent = `
                <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 28px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
                  <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c;">
                    ${personRecord.locale === "es" ? "Aviso de Pago" : "Payment Notice"}
                  </h2>
                  <p>
                    ${
                      personRecord.locale === "es"
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
                toName: `${personRecord.firstName} ${personRecord.lastName}`,
                templateKey: "payment_failed",
                dedupeKey: `payment_failed_${invoice.id}`,
                subject,
                htmlContent,
                isTransactional: true,
              });
            }
          }
        }
        break;
      }

      // ─── C. SUBSCRIPTION CANCELLED (§6) ───────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        if (customerId) {
          await db
            .update(member)
            .set({
              status: "lapsed",
              updatedAt: new Date(),
            })
            .where(eq(member.stripeCustomerId, customerId));
        }
        break;
      }

      // ─── D. CHECKOUT SESSION: EXTRA CREDITS & GUEST PASS (§20.3, §9) ─────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};

        if (meta.type === "extra_credits" && meta.memberId && meta.creditAmount) {
          const creditAmount = parseInt(meta.creditAmount, 10);
          if (creditAmount > 0) {
            const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 6 months

            await db.insert(creditEntry).values({
              memberId: meta.memberId,
              amount: creditAmount,
              type: "grant",
              sourceType: "extra_purchase",
              sourceId: session.id,
              reason: `Extra credits purchase (${creditAmount} × €1)`,
              expiresAt,
            });

            // Perform auto-booking if eventId is provided
            if (meta.eventId) {
              const eventId = meta.eventId;
              await db.transaction(async (tx) => {
                const ev = await tx.query.event.findFirst({
                  where: eq(eventTable.id, eventId),
                });
                if (ev) {
                  // Deduct credits for the booking
                  if (ev.creditCost > 0) {
                    const { spendCredits } = await import("@/lib/ledger");
                    await spendCredits(
                      meta.memberId,
                      ev.creditCost,
                      "booking",
                      eventId,
                      `Booking for ${ev.title}`,
                      tx
                    );
                  }

                  // Insert booking
                  const initialStatus = ev.status === "confirmed" ? "confirmed" : "held";
                  const insertedBooking = await tx.insert(booking).values({
                    eventId,
                    personId: meta.personId,
                    memberId: meta.memberId,
                    kind: "member",
                    status: initialStatus,
                    creditsCharged: ev.creditCost,
                    bookedAt: new Date(),
                  }).returning({ id: booking.id });

                  // Send email
                  const personRecord = await tx.query.person.findFirst({
                    where: eq(person.id, meta.personId),
                  });
                  if (personRecord) {
                    const subject =
                      personRecord.locale === "es"
                        ? `Reserva Confirmada: ${ev.title} — The Mothers`
                        : `Booking Confirmed: ${ev.title} — The Mothers`;

                    const htmlContent = `
                      <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
                        <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; margin: 0 0 16px;">
                          ${personRecord.locale === "es" ? "Plaza Reservada" : "Place Confirmed"}
                        </h2>
                        <p style="font-size: 15px; line-height: 1.6;">
                          ${
                            personRecord.locale === "es"
                              ? `Hola ${personRecord.firstName}, tienes tu plaza confirmada para <strong>${ev.title}</strong>.`
                              : `Hi ${personRecord.firstName}, your place is confirmed for <strong>${ev.title}</strong>.`
                          }
                        </p>
                        <div style="background: #fff; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 14px;">
                          <div>📅 <strong>${new Date(ev.startsAt).toLocaleDateString()}</strong></div>
                          <div>📍 <strong>${ev.venueName}</strong></div>
                        </div>
                      </div>
                    `;

                    await queueAndSendEmail({
                      personId: meta.personId,
                      toEmail: personRecord.email,
                      toName: `${personRecord.firstName} ${personRecord.lastName}`,
                      templateKey: "booking_confirmed",
                      dedupeKey: `booking_confirmed_${insertedBooking[0].id}`,
                      subject,
                      htmlContent,
                      isTransactional: true,
                    });
                  }
                }
              });
            }

            await db.insert(auditLog).values({
              actorId: meta.personId || meta.memberId,
              actorType: "member",
              action: "buy_extra_credits",
              entity: "credit_entry",
              entityId: meta.memberId,
              after: { creditAmount, eventId: meta.eventId || null, sessionId: session.id, expiresAt: expiresAt.toISOString() },
            });
          }
        }

        if (meta.type === "guest_pass" && meta.eventId && meta.personId) {
          const eventId = meta.eventId;
          const personId = meta.personId;

          // 1. Record payment
          await db.insert(payment).values({
            personId,
            purpose: "event_pass",
            amountCents: session.amount_total || 3500,
            currency: (session.currency || "eur").toUpperCase(),
            status: "succeeded",
            stripePaymentIntentId: session.payment_intent as string | null,
          }).onConflictDoNothing();

          // 2. Generate secure ticket token
          const { randomBytes, createHash } = await import("crypto");
          const rawToken = randomBytes(32).toString("hex");
          const ticketTokenHash = createHash("sha256").update(rawToken).digest("hex");

          // 3. Create Event Pass & Booking
          await db.transaction(async (tx) => {
            const ev = await tx.query.event.findFirst({
              where: eq(eventTable.id, eventId),
            });
            if (ev) {
              const passInsert = await tx.insert(eventPass).values({
                personId,
                eventId,
                priceCents: session.amount_total || 3500,
                status: "paid",
                ticketTokenHash,
                creditExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              }).returning({ id: eventPass.id });

              const initialStatus = ev.status === "confirmed" ? "confirmed" : "held";
              const insertedBooking = await tx.insert(booking).values({
                eventId,
                personId,
                kind: "guest",
                status: initialStatus,
                creditsCharged: 0,
                moneyPaidCents: session.amount_total || 3500,
                passId: passInsert[0].id,
                bookedAt: new Date(),
              }).returning({ id: booking.id });

              // Send email with the token link
              const personRecord = await tx.query.person.findFirst({
                where: eq(person.id, personId),
              });
              if (personRecord) {
                const origin = process.env.NEXTAUTH_URL || "https://themothers.cc";
                const ticketLink = `${origin}/ticket/${rawToken}`;
                const subject = personRecord.locale === "es"
                  ? `Tu Event Pass: ${ev.title} — The Mothers`
                  : `Your Event Pass: ${ev.title} — The Mothers`;

                const htmlContent = `
                  <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
                    <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; margin: 0 0 16px;">
                      ${personRecord.locale === "es" ? "Event Pass Confirmado" : "Event Pass Confirmed"}
                    </h2>
                    <p style="font-size: 15px; line-height: 1.6;">
                      ${personRecord.locale === "es"
                        ? `Hola ${personRecord.firstName}, aquí tienes tu pase de invitada para <strong>${ev.title}</strong>.`
                        : `Hi ${personRecord.firstName}, here is your guest pass for <strong>${ev.title}</strong>.`}
                    </p>
                    <div style="margin: 32px 0; text-align: center;">
                      <a href="${ticketLink}" style="display: inline-block; background: #7b1f2c; color: #f8efe2; padding: 12px 28px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 15px;">
                        ${personRecord.locale === "es" ? "Ver tu entrada" : "View your ticket"}
                      </a>
                    </div>
                  </div>
                `;

                await queueAndSendEmail({
                  personId,
                  toEmail: personRecord.email,
                  toName: `${personRecord.firstName} ${personRecord.lastName}`,
                  templateKey: "event_pass_ticket",
                  dedupeKey: `event_pass_${insertedBooking[0].id}`,
                  subject,
                  htmlContent,
                  isTransactional: true,
                });
              }
            }
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: error?.message || "Webhook processing error" }, { status: 500 });
  }
}
