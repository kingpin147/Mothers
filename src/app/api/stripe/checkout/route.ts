import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { event, member, person } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { auth } from "@/lib/auth"; 
import { getAppUrl } from "@/lib/urls"; 
import { getPersonWalletBalance } from "@/lib/ledger";
import { sanitizeErrorMessage } from "@/lib/errors";

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

      const { getPublicClubSettings } = await import("@/app/actions/adminSettings");
      const clubSettings = await getPublicClubSettings();
      const topUpUnitAmount = clubSettings.topUpPriceCents ?? 200;

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
                description: `€${topUpUnitAmount / 100}/credit · 6-month validity · THE Mothers Barcelona`,
              },
              unit_amount: topUpUnitAmount, // €2.00 per credit in cents from Settings (F-19)
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

    // ─── 2. MEMBERSHIP ACTIVATION / DIRECT SUBSCRIPTION CHECKOUT (§M-04 / §M-07 / §N-08 / F-08) ───
    if (type === "membership" || type === "subscribe") {
      const { getPublicClubSettings } = await import("@/app/actions/adminSettings");
      const clubSettings = await getPublicClubSettings();
      if (!clubSettings.membershipLive) {
        return NextResponse.json(
          { error: "Membership subscriptions are not available before launch." },
          { status: 400 }
        );
      }

      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const personId = (session.user as any).personId || session.user.id;
      let personEmail = session.user.email || null;

      const personRecord = await db.query.person.findFirst({
        where: eq(person.id, personId),
      });

      if (!personRecord) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }

      // Check suspension (F-08)
      if (personRecord.isSuspended) {
        return NextResponse.json(
          { error: "Your account is suspended. Subscriptions are not permitted." },
          { status: 403 }
        );
      }

      if (personRecord.email) {
        personEmail = personRecord.email;
      }

      // P2-07: Always look up member by authenticated personId; ignore browser-supplied memberId
      let memberRecord = await db.query.member.findFirst({ where: eq(member.personId, personId) });

      // Check already active or past_due member (P2-16)
      if (memberRecord?.stripeSubscriptionId && memberRecord?.status !== "lapsed" && memberRecord?.status !== "applicant") {
        return NextResponse.json(
          { error: "You already have an active or past-due subscription. Please go to Manage Billing to update your card." },
          { status: 400 }
        );
      }

      const isAnnual = plan === "annual" || memberRecord?.billingFrequency === "annual";

      // Tech Brief §17: Monthly €6.99 (699 cents), Annual €69.00 (6900 cents)
      const monthlyPrice = (clubSettings as any).memberMonthly ?? clubSettings.monthlyFeeCents ?? 699;
      const annualPrice = (clubSettings as any).memberAnnual ?? clubSettings.quarterlyFeeCents ?? 6900;

      if (!memberRecord) {
        const [newMem] = await db
          .insert(member)
          .values({
            personId,
            status: "applicant",
            billingFrequency: isAnnual ? "annual" : "monthly",
            priceCents: isAnnual ? annualPrice : monthlyPrice,
            monthlyPriceCents: monthlyPrice,
          })
          .returning();
        memberRecord = newMem;
        memberId = newMem.id;
      } else {
        memberId = memberRecord.id;
        if (plan && (plan === "monthly" || plan === "annual")) {
          await db
            .update(member)
            .set({
              billingFrequency: isAnnual ? "annual" : "monthly",
              priceCents: isAnnual ? annualPrice : monthlyPrice,
            })
            .where(eq(member.id, memberRecord.id));
        }
      }

      // Tech Brief §17: No joining fee for anyone, no wallet discount on membership. First payment = plan price.
      const unitAmount = isAnnual ? annualPrice : monthlyPrice;

      const lineItems: any[] = [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: isAnnual ? "The Mothers — Annual Membership" : "The Mothers — Monthly Membership",
              description: isAnnual
                ? `Annual membership with ${(clubSettings as any).annualCredits ?? 10} event credits, partner perks and unlimited Forum access · The Mothers`
                : `Monthly membership with partner perks and unlimited Forum access · The Mothers`,
            },
            unit_amount: unitAmount,
            recurring: isAnnual
              ? { interval: "year" }
              : { interval: "month", interval_count: 1 },
          },
          quantity: 1,
        }
      ];

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
        subscription_data: {
          metadata: {
            memberId,
            personId,
            plan: isAnnual ? "annual" : "monthly",
            company: "THE Mothers",
          }
        },
        metadata: {
          type: "membership",
          memberId,
          personId,
          plan: isAnnual ? "annual" : "monthly",
          company: "THE Mothers",
        },
        custom_text: {
          submit: {
            message: "Official checkout for The Mothers.",
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
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, "Checkout session creation failed") },
      { status: 500 }
    );
  }
}
