"use server";

import { db } from "@/db";
import { application, person, member, memberCredential, creditEntry, auditLog, window } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function getActivationDetails(token: string) {
  const appRecord = await db.query.application.findFirst({
    where: eq(application.paymentLinkToken, token),
  });

  if (!appRecord || appRecord.status !== "accepted") {
    return { success: false, error: "INVALID_OR_EXPIRED_TOKEN" };
  }

  if (appRecord.acceptExpiresAt && new Date() > new Date(appRecord.acceptExpiresAt)) {
    return { success: false, error: "TOKEN_EXPIRED" };
  }

  const personRecord = await db.query.person.findFirst({
    where: eq(person.id, appRecord.personId),
  });

  return {
    success: true,
    application: appRecord,
    person: personRecord,
    monthlyPriceCents: 2900,
    joiningFeeCents: 1900,
  };
}

export async function completeMembershipActivation(token: string, password: string) {
  try {
    if (!password || password.length < 8) {
      return { success: false, error: "PASSWORD_TOO_SHORT" };
    }

    const appRecord = await db.query.application.findFirst({
      where: eq(application.paymentLinkToken, token),
    });

    if (!appRecord || appRecord.status !== "accepted") {
      return { success: false, error: "INVALID_TOKEN" };
    }

    if (appRecord.acceptExpiresAt && new Date() > new Date(appRecord.acceptExpiresAt)) {
      return { success: false, error: "TOKEN_EXPIRED" };
    }

    const personRecord = await db.query.person.findFirst({
      where: eq(person.id, appRecord.personId),
    });

    if (!personRecord) {
      return { success: false, error: "PERSON_NOT_FOUND" };
    }

    // 1. Hash password & store in member_credential
    const passwordHash = await bcrypt.hash(password, 12);
    const existingCred = await db.query.memberCredential.findFirst({
      where: eq(memberCredential.personId, personRecord.id),
    });

    if (existingCred) {
      await db
        .update(memberCredential)
        .set({
          passwordHash,
          passwordUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(memberCredential.id, existingCred.id));
    } else {
      await db.insert(memberCredential).values({
        personId: personRecord.id,
        passwordHash,
      });
    }

    const existingMember = await db.query.member.findFirst({
      where: eq(member.personId, personRecord.id),
    });

    if (!existingMember) {
      return { success: false, error: "MEMBER_RECORD_NOT_FOUND" };
    }

    // 2. Fetch window pricing
    const windowRecord = await db.query.window.findFirst({
      where: eq(window.id, appRecord.windowId),
    });

    if (!windowRecord) return { success: false, error: "WINDOW_NOT_FOUND" };

    // 3. Generate Stripe Checkout Session for Membership
    const { stripe } = await import("@/lib/stripe");
    const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";

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

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: personRecord.email,
      line_items: lineItems,
      subscription_data: {
        metadata: {
          memberId: existingMember.id,
        }
      },
      metadata: {
        type: "membership",
        memberId: existingMember.id,
        personId: personRecord.id,
        applicationId: appRecord.id,
      },
      success_url: `${origin}/account/login?membership_success=true`,
      cancel_url: `${origin}/membership/activate/${token}?canceled=true`,
    });

    return { success: true, url: stripeSession.url };
  } catch (error: any) {
    console.error("completeMembershipActivation error:", error);
    return { success: false, error: error?.message || "ACTIVATION_FAILED" };
  }
}
