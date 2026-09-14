import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { member, application, window, person, eventPass } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth"; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, memberId, token } = body;

    if (type !== "membership") {
      return NextResponse.json({ error: "Only membership payment intents are supported" }, { status: 400 });
    }
    if (!memberId) return NextResponse.json({ error: "Missing memberId" }, { status: 400 });

    let personId: string | null = null;
    let personEmail: string | null = null;
    let personRecord: any = null;

    if (token) {
      const appRecord = await db.query.application.findFirst({
        where: eq(application.paymentLinkToken, token),
      });

      if (!appRecord || appRecord.status !== "accepted") {
        return NextResponse.json({ error: "Invalid activation token" }, { status: 403 });
      }

      if (appRecord.acceptExpiresAt && new Date() > new Date(appRecord.acceptExpiresAt)) {
        return NextResponse.json({ error: "Activation token expired" }, { status: 403 });
      }

      personId = appRecord.personId;
    } else {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      personId = (session.user as any).personId || session.user.id;
      personEmail = session.user.email || null;
    }

    if (!personId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberRecord = await db.query.member.findFirst({
      where: eq(member.id, memberId),
    });

    if (!memberRecord || memberRecord.personId !== personId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    personRecord = await db.query.person.findFirst({
      where: eq(person.id, personId),
    });

    if (personRecord?.email) {
      personEmail = personRecord.email;
    }

    const appRecord = await db.query.application.findFirst({
      where: eq(application.personId, memberRecord.personId),
      orderBy: (app, { desc }) => [desc(app.submittedAt)],
    });

    let windowRecord = null;
    if (appRecord?.windowId) {
      windowRecord = await db.query.window.findFirst({
        where: eq(window.id, appRecord.windowId),
      });
    }

    const defaultMonthlyPrice = windowRecord?.monthlyPriceCents || 3900;
    const defaultJoiningFee = windowRecord?.joiningFeeCents || 1900;

    // Ensure customer exists in Stripe
    let customerId = memberRecord.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: personEmail || undefined,
        name: personRecord ? `${personRecord.firstName} ${personRecord.lastName}` : undefined,
        metadata: { personId, memberId },
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
      : (isQuarterly ? 9900 : defaultMonthlyPrice);

    const [totalAcceptedCount, pastPasses] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(member).where(sql`status IN ('active', 'accepted_awaiting_payment')`),
      db.query.eventPass.findMany({
        where: and(
          eq(eventPass.personId, personId),
          sql`purchased_at >= NOW() - INTERVAL '30 days'`
        ),
      }),
    ]);
    
    // Check joining fee waiver rules:
    // 1. Founding members (first 50) get fee waived
    // 2. Member who attended an event in last 30 days gets fee credited
    const isFirst50 = Number(totalAcceptedCount[0]?.count || 0) <= 50;
    const hasRecentPass = pastPasses.length > 0;

    let finalJoiningFee = defaultJoiningFee;
    if (isFirst50 || hasRecentPass) {
      finalJoiningFee = 0;
    }

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
        personId,
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
