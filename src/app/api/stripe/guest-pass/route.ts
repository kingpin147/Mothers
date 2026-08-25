"use server";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { event, eventPass, person } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

/**
 * POST /api/stripe/guest-pass
 * Purchase a guest event pass (€35)
 * Requires: eventId, guestName, guestEmail
 * Creates payment intent and returns client secret
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, guestName, guestEmail } = body;

    if (!eventId || !guestName || !guestEmail) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, guestName, guestEmail" },
        { status: 400 }
      );
    }

    // Verify event exists and accepts guests
    const eventRecord = await db.query.event.findFirst({
      where: eq(event.id, eventId),
    });

    if (!eventRecord) {
      return NextResponse.json({ error: "EVENT_NOT_FOUND" }, { status: 404 });
    }

    if (eventRecord.isSignature || eventRecord.creditCost > 18) {
      return NextResponse.json(
        { error: "GUEST_PASS_NOT_ALLOWED_FOR_EVENT" },
        { status: 403 }
      );
    }

    // Check or create person record
    let personRecord = await db.query.person.findFirst({
      where: eq(person.email, guestEmail),
    });

    if (!personRecord) {
      const [newPerson] = await db
        .insert(person)
        .values({
          firstName: guestName,
          lastName: "",
          email: guestEmail,
          isMother: true,
          source: "guest_pass",
        })
        .returning();
      personRecord = newPerson;
    }

    // Generate ticket token hash
    const ticketToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(ticketToken).digest("hex");

    // Create payment intent
    const intent = await stripe.paymentIntents.create({
      amount: 3500, // €35 in cents
      currency: "eur",
      metadata: {
        eventId,
        guestEmail,
        guestName,
        ticketTokenHash: tokenHash,
      },
      description: `Guest Event Pass for ${eventRecord.title}`,
    });

    // Pre-create the pass record (will be confirmed on Stripe webhook)
    await db.insert(eventPass).values({
      personId: personRecord.id,
      eventId,
      priceCents: 3500,
      status: "paid",
      ticketTokenHash: tokenHash,
      creditExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day credit window
    });

    return NextResponse.json({
      success: true,
      clientSecret: intent.client_secret,
      ticketToken, // Return token so client can store it temporarily
    });
  } catch (error: any) {
    console.error("Guest pass checkout error:", error);
    return NextResponse.json(
      { error: error?.message || "CHECKOUT_FAILED" },
      { status: 500 }
    );
  }
}
