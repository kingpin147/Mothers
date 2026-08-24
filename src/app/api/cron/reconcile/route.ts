import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobRun } from "@/db/schema";
import { verifyCronAuth } from "@/lib/cron-auth";
import { runLedgerReconciliation } from "@/lib/ledger";

/**
 * Nightly Reconciliation Cron (§8, §17)
 * 
 * Runs all integrity checks:
 * - Credit ledger vs cached balances
 * - Seat counts vs booking counts per event
 * - No member balance is negative
 * - No grant is over-allocated
 * - Every spend has a booking, every active booking has a spend
 * 
 * Discrepancies alert; they do NOT auto-correct (§8).
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();

  try {
    const result = await runLedgerReconciliation();

    const outcome = result.passed ? "success" : "warning";
    const failedChecks = result.checks.filter((c) => !c.passed);

    await db.insert(jobRun).values({
      jobKey: "reconcile",
      outcome,
      startedAt,
      finishedAt: new Date(),
      counts: {
        totalChecks: result.checks.length,
        passed: result.checks.filter((c) => c.passed).length,
        failed: failedChecks.length,
      },
      error:
        failedChecks.length > 0
          ? `RECONCILIATION WARNINGS: ${failedChecks.map((c) => `${c.name}: ${c.details}`).join(" | ")}`
          : null,
    });

    if (!result.passed) {
      console.error(
        "[RECONCILIATION WARNING]",
        JSON.stringify(failedChecks, null, 2)
      );
    }

    return NextResponse.json({
      success: true,
      reconciliation: result,
    });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "reconcile",
      outcome: "failed",
      startedAt,
      finishedAt: new Date(),
      error: error?.message || "Unknown error",
    });

    return NextResponse.json(
      { error: error?.message || "CRON_FAILED" },
      { status: 500 }
    );
  }
}
