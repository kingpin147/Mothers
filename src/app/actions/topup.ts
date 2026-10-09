"use server";

import { db } from "@/db";
import { person, booking, event } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/urls";

export async function createTopUpCheckoutSession(data: {
  amount: number;
  eventId?: string;
  returnTo?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "AUTH_REQUIRED" };
  }

  const creditAmount = Math.floor(Number(data.amount));
  if (isNaN(creditAmount) || creditAmount < 1 || creditAmount > 100) {
    return { success: false, error: "INVALID_AMOUNT_MIN_1" };
  }

  const personId = (session.user as any).personId || session.user.id;
  const personRecord = await db.query.person.findFirst({
    where: eq(person.id, personId),
  });

  if (!personRecord) {
    return { success: false, error: "USER_NOT_FOUND" };
  }

  try {
    const origin = getAppUrl();
    const eventId = data.eventId || undefined;
    const returnTo = data.returnTo || undefined;

    const { getPublicClubSettings } = await import("@/app/actions/adminSettings");
    const clubSettings = await getPublicClubSettings();
    const unitAmount = clubSettings.topUpPriceCents ?? 200;
    const formattedUnitPrice = (unitAmount / 100).toFixed(2);

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: personRecord.email || session.user.email || undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `THE Mothers — ${creditAmount} Event Credits`,
              description: `€${formattedUnitPrice} / credit · 6-month validity · THE Mothers Barcelona`,
            },
            unit_amount: unitAmount,
          },
          quantity: creditAmount,
        },
      ],
      metadata: {
        type: "topup",
        personId: personRecord.id,
        creditAmount: String(creditAmount),
        eventId: eventId || "",
        company: "THE Mothers",
      },
      custom_text: {
        submit: {
          message: "Official checkout for THE Mothers Barcelona.",
        },
      },
      success_url: eventId
        ? `${origin}/events/${eventId}?topup_success=true&credits=${creditAmount}`
        : returnTo
        ? `${origin}${returnTo}?topup_success=true&credits=${creditAmount}`
        : `${origin}/account?credits_purchased=true&amount=${creditAmount}`,
      cancel_url: eventId
        ? `${origin}/events/${eventId}`
        : returnTo
        ? `${origin}${returnTo}`
        : `${origin}/topup`,
    });

    return { success: true, url: stripeSession.url };
  } catch (err: any) {
    console.error("createTopUpCheckoutSession error:", err);
    return { success: false, error: err?.message || "CHECKOUT_FAILED" };
  }
}
