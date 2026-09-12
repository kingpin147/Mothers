import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { person, eventPass, booking, event, member, creditEntry, auditLog, application } from "@/db/schema";
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
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Your Event Pass — The Mothers</title>
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
<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">This email is your ticket — it carries the meeting point and a link to release your place. Keep it.</span>

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
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">Your Event Pass — confirmed</div>
<h1 class="h1" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:42px;mso-line-height-rule:exactly;font-weight:normal;color:#2A1E20;">Your place is booked.</h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:27px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0 0 16px;">Hello <span style="color:#7b1f2c;">${personRecord.firstName}</span>,</p>
<p style="margin:0 0 16px;">You have a seat at the table. There is nothing else to arrange and no account to set up — <strong style="font-weight:normal;color:#7b1f2c;">this email is your ticket</strong>. Keep it somewhere you'll find it.</p>
<p style="margin:0;">A small thing that matters: the group will be mothers who mostly know each other. Come as you are, arrive a few minutes early if you can, and someone will be looking out for you.</p>
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
<div style="font-size:20px;line-height:28px;mso-line-height-rule:exactly;padding-bottom:12px;">${eventRecord.title}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#2A1E20;">
<tr>
<td width="96" valign="top" style="width:96px;padding:7px 0;border-top:1px solid #ddd4c6;font-size:13px;color:#8a807a;">Date</td>
<td valign="top" style="padding:7px 0;border-top:1px solid #ddd4c6;">${new Date(eventRecord.startsAt).toLocaleDateString()}</td>
</tr>
<tr>
<td width="96" valign="top" style="width:96px;padding:7px 0;border-top:1px solid #ddd4c6;font-size:13px;color:#8a807a;">Meeting point</td>
<td valign="top" style="padding:7px 0;border-top:1px solid #ddd4c6;">${eventRecord.meetingPoint}<br><span style="color:#8a807a;font-size:14px;">${eventRecord.neighbourhood}</span></td>
</tr>
<tr>
<td width="96" valign="top" style="width:96px;padding:7px 0;border-top:1px solid #ddd4c6;font-size:13px;color:#8a807a;">Paid</td>
<td valign="top" style="padding:7px 0;border-top:1px solid #ddd4c6;">€${((amountTotalCents || 3500) / 100).toFixed(0)}</td>
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
<a href="${ticketUrl}" style="display:block;padding:16px 34px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:22px;mso-line-height-rule:exactly;color:#faf7f1;text-decoration:none;">View or release my place</a>
</td>
</tr>
</table>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:#8a807a;padding-top:12px;">This link is yours alone and works until the evening is over. No password needed.</div>
</td>
</tr>

<tr>
<td class="px" style="padding:32px 48px 0;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">Worth knowing</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#2A1E20;">
<tr>
<td width="26" valign="top" style="width:26px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">01</td>
<td valign="top">Changing your mind is not refunded — but if you can't come, release the place through the link above and another mother can take it.</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding-top:10px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">02</td>
<td valign="top" style="padding-top:10px;">If the event itself does not go ahead, you are refunded in full — you need do nothing.</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding-top:10px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">03</td>
<td valign="top" style="padding-top:10px;">Our walks and park socials are free and open to you any time, member or not.</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:30px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-top:1px solid #ddd4c6;">
<tr>
<td style="padding:22px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#5c534e;">
<p style="margin:0 0 14px;">If this turns out to be your kind of room, <strong style="font-weight:normal;color:#7b1f2c;">we waive the joining fee</strong> when you join within 30 days of the event, so your first payment is just the month itself. Membership is €39 a month, or €99 every three months, and it covers the whole calendar rather than one table.</p>
<a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/membership" style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#7b1f2c;text-decoration:underline;">See what membership includes</a>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#5c534e;">
<p style="margin:0;">Anything at all before the day, reply to this email — it reaches us, not a helpdesk.</p>
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
You're receiving this because you booked a place at one of our events.<br>
This is a booking confirmation, not a marketing email — we keep your details only for this evening.
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

    // Mark the most recent accepted application for this person as paid
    const recentApp = await tx.query.application.findFirst({
      where: and(
        eq(application.personId, mem.personId),
        eq(application.status, "accepted")
      ),
      orderBy: (application, { desc }) => [desc(application.decidedAt)]
    });

    if (recentApp && !recentApp.isPaid) {
      await tx.update(application).set({
        isPaid: true,
        updatedAt: new Date()
      }).where(eq(application.id, recentApp.id));
    }

    // Both monthly and quarterly memberships receive 20 credits per month (§5, §6)
    const amount = 20;

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    // Grant credits for the first month
    await tx.insert(creditEntry).values({
      memberId,
      amount,
      type: "grant",
      reason: "Initial Membership Grant",
      sourceType: "subscription_monthly",
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

    // Both monthly and quarterly renewals receive 20 credits per month (§5, §6)
    const amount = 20;

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    // Renew credits for the month
    await tx.insert(creditEntry).values({
      memberId: mem.id,
      amount,
      type: "grant",
      reason: "Monthly Subscription Renewal",
      sourceType: "subscription_monthly",
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
