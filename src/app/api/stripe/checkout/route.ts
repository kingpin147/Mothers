import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { event, member, window, application } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth"; 

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, eventId, memberId } = body;
    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";

    if (type === "guest_pass") {
      if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

      // Fetch dynamic price from event
      const eventRecord = await db.query.event.findFirst({
        where: eq(event.id, eventId),
      });

      if (!eventRecord) return NextResponse.json({ error: "Event not found" }, { status: 404 });
      if (!eventRecord.guestPriceCents) return NextResponse.json({ error: "Event does not allow guests" }, { status: 400 });

      // Create checkout session for guest pass
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: session.user.email || undefined,
        line_items: [
          {
            price_data: {
              currency: "eur",
              product_data: {
                name: `Guest Pass: ${eventRecord.title}`,
                description: `Single guest pass for ${new Date(eventRecord.startsAt).toLocaleDateString()}`,
              },
              unit_amount: eventRecord.guestPriceCents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          type: "guest_pass",
          eventId,
          personId: session.user.id as string,
        },
        success_url: `${origin}/events?guest_pass_success=true`,
        cancel_url: `${origin}/events?guest_pass_canceled=true`,
      });

      return NextResponse.json({ url: stripeSession.url });
    }

    if (type === "membership") {
      if (!memberId) return NextResponse.json({ error: "Missing memberId" }, { status: 400 });

      // Fetch member
      const memberRecord = await db.query.member.findFirst({
        where: eq(member.id, memberId),
      });

      if (!memberRecord) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      // Fetch application to get windowId
      const appRecord = await db.query.application.findFirst({
        where: eq(application.personId, memberRecord.personId),
      });

      if (!appRecord || !appRecord.windowId) {
        return NextResponse.json({ error: "Application or Window not found" }, { status: 404 });
      }

      // Fetch window pricing
      const windowRecord = await db.query.window.findFirst({
        where: eq(window.id, appRecord.windowId),
      });

      if (!windowRecord) return NextResponse.json({ error: "Application window not found" }, { status: 404 });

      const lineItems: any[] = [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "The Mothers - Monthly Membership",
            },
            unit_amount: windowRecord.monthlyPriceCents,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        }
      ];

      // Add joining fee if present
      if (windowRecord.joiningFeeCents > 0) {
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: {
              name: "The Mothers - Joining Fee (One-time)",
            },
            unit_amount: windowRecord.joiningFeeCents,
          },
          quantity: 1,
        });
      }

      // Create checkout session for membership subscription + setup fee
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer_email: session.user.email || undefined,
        line_items: lineItems,
        subscription_data: {
          metadata: {
            memberId,
          }
        },
        metadata: {
          type: "membership",
          memberId,
          personId: session.user.id as string,
        },
        success_url: `${origin}/account?membership_success=true`,
        cancel_url: `${origin}/account?membership_canceled=true`,
      });

      return NextResponse.json({ url: stripeSession.url });
    }

    return NextResponse.json({ error: "Invalid checkout type" }, { status: 400 });

  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
