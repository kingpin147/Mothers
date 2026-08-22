import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { stripeEvent, member, payment, person, auditLog } from "@/db/schema";
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

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: error?.message || "Webhook processing error" }, { status: 500 });
  }
}
