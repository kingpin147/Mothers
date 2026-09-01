import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { person, eventPass, booking, event, member, creditEntry, auditLog } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { queueAndSendEmail } from "@/lib/brevo";
import { headers } from "next/headers";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
    }

    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
    }

    const eventData = stripeEvent.data.object as any;

    if (stripeEvent.type === "checkout.session.completed") {
      const type = eventData.metadata?.type;
      const personId = eventData.metadata?.personId;
      const eventId = eventData.metadata?.eventId; // Guest pass
      const memberId = eventData.metadata?.memberId; // Membership

      if (type === "guest_pass" && personId && eventId) {
        await handleGuestPassPurchase(personId, eventId, eventData.amount_total);
      } else if (type === "membership" && memberId) {
        await handleMembershipActivation(memberId, eventData.customer, eventData.subscription);
      }
    }

    if (stripeEvent.type === "invoice.paid") {
      const subscriptionId = eventData.subscription;
      const billingReason = eventData.billing_reason;
      
      // If it's a recurring payment (not the initial subscription creation, which is handled in checkout.session.completed)
      if (subscriptionId && billingReason === "subscription_cycle") {
        await handleRecurringPayment(subscriptionId, eventData.amount_paid);
      }
    }

    if (stripeEvent.type === "customer.subscription.deleted" || stripeEvent.type === "customer.subscription.updated") {
      const subscription = eventData;
      if (subscription.status === "canceled" || subscription.status === "past_due" || subscription.status === "unpaid") {
        await handleSubscriptionStatusChange(subscription.id, subscription.status);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Stripe Webhook Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function handleGuestPassPurchase(personId: string, eventId: string, amountTotalCents: number) {
  await db.transaction(async (tx) => {
    // Check if pass already exists
    const existingBooking = await tx.query.booking.findFirst({
      where: and(eq(booking.personId, personId), eq(booking.eventId, eventId)),
    });
    
    if (existingBooking) return; // Prevent double execution

    const eventRecord = await tx.query.event.findFirst({
      where: eq(event.id, eventId),
    });
    
    const personRecord = await tx.query.person.findFirst({
      where: eq(person.id, personId),
    });

    if (!eventRecord || !personRecord) return;

    // Generate cryptographic token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const creditExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const insertedPass = await tx
      .insert(eventPass)
      .values({
        personId,
        eventId,
        priceCents: amountTotalCents || 3500,
        status: "paid",
        ticketTokenHash: tokenHash,
        creditExpiresAt,
      })
      .returning();

    const passId = insertedPass[0].id;

    await tx.insert(booking).values({
      eventId,
      personId,
      kind: "guest",
      status: "confirmed",
      moneyPaidCents: amountTotalCents || 3500,
      passId,
    });

    // Send email
    const ticketUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/ticket/${rawToken}`;
    const subject = `Your Ticket: ${eventRecord.title} — The Mothers`;

    const htmlContent = `
      <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
        <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px;">
          Guest Place Booked
        </h2>
        <p style="font-size: 15px; line-height: 1.6;">
          Hi ${personRecord.firstName}, your guest ticket for <strong>${eventRecord.title}</strong> is ready.
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
      personId,
      toEmail: personRecord.email,
      toName: personRecord.firstName,
      templateKey: "guest_place_booked",
      dedupeKey: `guest_ticket_${rawToken.slice(0, 16)}`,
      subject,
      htmlContent,
      isTransactional: true,
    });
  });
}

async function handleMembershipActivation(memberId: string, customerId: string, subscriptionId: string) {
  await db.transaction(async (tx) => {
    const mem = await tx.query.member.findFirst({ where: eq(member.id, memberId) });
    if (!mem) return;

    // Activate member
    await tx.update(member).set({
      status: "active",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      updatedAt: new Date()
    }).where(eq(member.id, memberId));

    const isQuarterly = mem.billingFrequency === "quarterly";
    const amount = isQuarterly ? 60 : 20;

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    // Grant credits for the first month/quarter
    await tx.insert(creditEntry).values({
      memberId,
      amount,
      type: "grant",
      reason: "Initial Membership Grant",
      sourceType: "manual",
      expiresAt,
    });

    await tx.insert(auditLog).values({
      actorId: mem.personId,
      actorType: "system",
      action: "membership_activated",
      entity: "member",
      entityId: memberId,
      after: { status: "active", subscriptionId },
    });
  });
}

async function handleRecurringPayment(subscriptionId: string, amountPaidCents: number) {
  await db.transaction(async (tx) => {
    const mem = await tx.query.member.findFirst({
      where: eq(member.stripeSubscriptionId, subscriptionId)
    });
    
    if (!mem || mem.status !== "active") return;

    const isQuarterly = mem.billingFrequency === "quarterly";
    const amount = isQuarterly ? 60 : 20;

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    // Renew credits for the month/quarter
    await tx.insert(creditEntry).values({
      memberId: mem.id,
      amount,
      type: "grant",
      reason: "Monthly Subscription Renewal",
      sourceType: "manual",
      expiresAt,
    });

    await tx.insert(auditLog).values({
      actorId: mem.personId,
      actorType: "system",
      action: "membership_renewed",
      entity: "member",
      entityId: mem.id,
      after: { amountPaidCents },
    });
  });
}

async function handleSubscriptionStatusChange(subscriptionId: string, stripeStatus: string) {
  await db.transaction(async (tx) => {
    const mem = await tx.query.member.findFirst({
      where: eq(member.stripeSubscriptionId, subscriptionId)
    });
    
    if (!mem) return;

    let newStatus = mem.status;
    if (stripeStatus === "canceled") newStatus = "lapsed";
    else if (stripeStatus === "past_due" || stripeStatus === "unpaid") newStatus = "paused";

    if (newStatus !== mem.status) {
      await tx.update(member).set({
        status: newStatus as any,
        updatedAt: new Date()
      }).where(eq(member.id, mem.id));

      await tx.insert(auditLog).values({
        actorId: mem.personId,
        actorType: "system",
        action: "membership_status_changed",
        entity: "member",
        entityId: mem.id,
        before: { status: mem.status },
        after: { status: newStatus, stripeStatus },
      });
    }
  });
}
