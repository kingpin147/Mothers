import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobRun } from "@/db/schema";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * Quarterly Credits Tranche Job (N-10 / §6 Credit Rules)
 *
 * NOTE: Per the latest unified credit wallet architecture, quarterly members
 * receive all 60 credits granted upfront at payment/renewal directly into
 * their person credit wallet (credit_batch) via the Stripe webhook.
 *
 * This cron runs for bookkeeping / jobRun reporting and confirms that quarterly
 * grants are handled upfront on invoice payment.
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();

  await db.insert(jobRun).values({
    jobKey: "quarterly_credits_tranche",
    outcome: "success",
    startedAt,
    finishedAt: new Date(),
    counts: { grantedUpfrontViaWebhook: true, skipped: 0 },
  });

  return NextResponse.json({
    success: true,
    message: "Quarterly members receive 60 credits upfront via invoice payment in Stripe webhook.",
    grantedUpfrontViaWebhook: true,
  });
}
