import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobRun } from "@/db/schema";
import { runCreditExpiryWorker } from "@/lib/ledger";

export async function GET(req: NextRequest) {
  const startedAt = new Date();

  try {
    const result = await runCreditExpiryWorker();

    await db.insert(jobRun).values({
      jobKey: "expire_credits",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: result,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "expire_credits",
      outcome: "failed",
      startedAt,
      finishedAt: new Date(),
      error: error?.message || "Unknown error",
    });

    return NextResponse.json({ error: error?.message || "CRON_FAILED" }, { status: 500 });
  }
}
