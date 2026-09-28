import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { event, member, window, application, eventPass, person } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { auth } from "@/lib/auth"; 
import { getAppUrl } from "@/lib/urls"; 
import { getPersonWalletBalance } from "@/lib/ledger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, eventId, memberId: rawMemberId, token, amount, plan, returnTo } = body;
    const origin = req.headers.get("origin") || getAppUrl();
    let memberId = rawMemberId;

    // ─── 1. CREDIT TOP-UP CHECKOUT (FOR ALL PERSONS §20.3) ───────────────────
    if (type === "extra_credits" || type === "credit_topup" || type === "topup") {
      const session = await auth();
      if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const creditAmount = parseInt(String(amount || 10), 10);
      if (!Number.isInteger(creditAmount) || creditAmount < 5 || creditAmount > 100) {
        return NextResponse.json({ error: "Minimum top-up is 5 credits (€10.00)" }, { status: 400 });
      }

      const personId = (session.user as any).personId || session.user.id;
      const personRecord = await db.query.person.findFirst({
        where: eq(person.id, personId),
      });

      if (!personRecord) {
        return NextResponse.json({ error: "User account not found" }, { status: 404 });
      }

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
                description: `€2.00 / credit · 6-month validity · THE Mothers Barcelona`,
              },
              unit_amount: 200, // €2.00 per credit in cents
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

      return NextResponse.json({ url: stripeSession.url });
    }

    // ─── 2. MEMBERSHIP ACTIVATION / DIRECT SUBSCRIPTION CHECKOUT (§M-04 / §M-07 / §N-08) ───
    if (type === "membership" || type === "subscribe") {
      const { getPublicClubSettings } = await import("@/app/actions/adminSettings");
      const clubSettings = await getPublicClubSettings();
      if (!clubSettings.membershipLive) {
        return NextResponse.json(
          { error: "Membership subscriptions are not available before launch." },
          { status: 400 }
        );
      }

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

      personRecord = await db.query.person.findFirst({
        where: eq(person.id, personId),
      });

      if (personRecord?.email) {
        personEmail = personRecord.email;
      }

      // Fetch or create member record directly from My Account
      let memberRecord = memberId
        ? await db.query.member.findFirst({ where: eq(member.id, memberId) })
        : await db.query.member.findFirst({ where: eq(member.personId, personId) });

      const isQuarterly = plan === "quarterly" || memberRecord?.billingFrequency === "quarterly";

      if (!memberRecord) {
        const [newMem] = await db
          .insert(member)
          .values({
            personId,
            status: "applicant",
            billingFrequency: isQuarterly ? "quarterly" : "monthly",
            priceCents: isQuarterly ? 9900 : 3900,
            monthlyPriceCents: 3900,
          })
          .returning();
        memberRecord = newMem;
        memberId = newMem.id;
      } else {
        memberId = memberRecord.id;
        if (plan && (plan === "monthly" || plan === "quarterly")) {
          await db
            .update(member)
            .set({
              billingFrequency: isQuarterly ? "quarterly" : "monthly",
              priceCents: isQuarterly ? 9900 : 3900,
            })
            .where(eq(member.id, memberRecord.id));
        }
      }

      const defaultMonthlyPrice = 3900;
      const defaultJoiningFee = 1900;

      // Check joining fee waiver:
      // Waived permanently if createdBeforeLaunch === true (§6.1, Pre-Membership Rule)
      const isFeeWaived = personRecord?.createdBeforeLaunch === true;

      const unitAmount = isQuarterly ? 9900 : (memberRecord.priceCents > 0 ? memberRecord.priceCents : defaultMonthlyPrice);

      // Check wallet credit discount on first payment (§M-07 / §5)
      const walletBalance = await getPersonWalletBalance(personId);
      const creditDiscountCents = Math.min(walletBalance * 200, unitAmount);
      const creditsToConsume = Math.floor(creditDiscountCents / 200);

      // Create one-off Stripe coupon if wallet discount applies (M-07)
      let discounts: any[] | undefined = undefined;
      if (creditDiscountCents > 0) {
        const coupon = await stripe.coupons.create({
          amount_off: creditDiscountCents,
          currency: "eur",
          duration: "once",
          name: `Credits Discount (${creditsToConsume} credits)`,
        });
        discounts = [{ coupon: coupon.id }];
      }

      const lineItems: any[] = [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: isQuarterly ? "THE Mothers — Quarterly Membership" : "THE Mothers — Monthly Membership",
              description: isQuarterly
                ? "Quarterly membership access including 60 event credits · THE Mothers Barcelona"
                : "Full membership access including 20 monthly event credits · THE Mothers Barcelona",
            },
            unit_amount: unitAmount,
            recurring: {
              interval: "month",
              interval_count: isQuarterly ? 3 : 1,
            },
          },
          quantity: 1,
        }
      ];

      // Add €19 joining fee if NOT waived
      if (!isFeeWaived && defaultJoiningFee > 0) {
        lineItems.push({
          price_data: {
            currency: "eur",
            product_data: {
              name: "THE Mothers — Joining Fee (One-time)",
              description: "Club onboarding & registration fee · THE Mothers Barcelona",
            },
            unit_amount: defaultJoiningFee,
          },
          quantity: 1,
        });
      }

      // Ensure customer in Stripe
      let customerId = memberRecord.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: personEmail || undefined,
          name: personRecord ? `${personRecord.firstName} ${personRecord.lastName}` : undefined,
          metadata: { personId, memberId, company: "THE Mothers" },
        });
        customerId = customer.id;
      }

      // Create checkout session for membership subscription
      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer: customerId,
        line_items: lineItems,
        discounts,
        subscription_data: {
          metadata: {
            memberId,
            personId,
            isQuarterly: String(isQuarterly),
            creditsToConsume: String(creditsToConsume),
            company: "THE Mothers",
          }
        },
        metadata: {
          type: "membership",
          memberId,
          personId,
          isQuarterly: String(isQuarterly),
          feeWaived: String(isFeeWaived),
          creditsToConsume: String(creditsToConsume),
          company: "THE Mothers",
        },
        custom_text: {
          submit: {
            message: "Official checkout for THE Mothers Barcelona.",
          },
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
