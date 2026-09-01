import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { member, application, window } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth"; 

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, memberId } = body;

    if (type !== "membership") {
      return NextResponse.json({ error: "Only membership payment intents are supported" }, { status: 400 });
    }
    if (!memberId) return NextResponse.json({ error: "Missing memberId" }, { status: 400 });

    const memberRecord = await db.query.member.findFirst({
      where: eq(member.id, memberId),
    });

    if (!memberRecord) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const appRecord = await db.query.application.findFirst({
      where: eq(application.personId, memberRecord.personId),
    });

    if (!appRecord || !appRecord.windowId) {
      return NextResponse.json({ error: "Application or Window not found" }, { status: 404 });
    }

    const windowRecord = await db.query.window.findFirst({
      where: eq(window.id, appRecord.windowId),
    });

    if (!windowRecord) return NextResponse.json({ error: "Application window not found" }, { status: 404 });

    // Ensure customer exists in Stripe
    let customerId = (session.user as any).stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        metadata: { personId: session.user.id },
      });
      customerId = customer.id;
    }

    // Get or create base products for the subscription
    const products = await stripe.products.search({ query: "active:'true' AND name:'The Mothers Membership'", limit: 1 });
    let productId = products.data.length > 0 ? products.data[0].id : undefined;
    if (!productId) {
      const prod = await stripe.products.create({ name: "The Mothers Membership" });
      productId = prod.id;
    }

    const isQuarterly = memberRecord.billingFrequency === "quarterly";
    const amountCents = memberRecord.priceCents > 0 
      ? memberRecord.priceCents 
      : (isQuarterly ? windowRecord.monthlyPriceCents * 3 - 800 : windowRecord.monthlyPriceCents); // fallback

    const { eventPass } = await import("@/db/schema");
    const pastPasses = await db.query.eventPass.findMany({
      where: eq(eventPass.personId, session.user.id),
    });
    
    // Calculate joining fee discount
    // We cap the discount at the joining fee amount to avoid negative fees,
    // although they should only have up to 2 passes.
    const passDiscountCents = Math.min(
      pastPasses.length * 3500,
      windowRecord.joiningFeeCents
    );
    const finalJoiningFee = windowRecord.joiningFeeCents - passDiscountCents;

    // Create the subscription as incomplete
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: "eur",
          product: productId,
          unit_amount: amountCents,
          recurring: { 
            interval: "month",
            interval_count: isQuarterly ? 3 : 1
          },
        },
      }],
      add_invoice_items: finalJoiningFee > 0 ? [{
        price_data: {
          currency: "eur",
          product: productId, 
          unit_amount: finalJoiningFee,
        }
      }] : undefined,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        type: "membership",
        memberId,
        personId: session.user.id,
      },
    });

    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice.payment_intent;

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    });

  } catch (error: any) {
    console.error("Stripe Payment Intent Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
