import { NextRequest, NextResponse } from "next/server";

/**
 * Vercel Cron Auth Middleware (§8)
 * All cron routes must validate the CRON_SECRET header.
 * Vercel sends this automatically when configured in vercel.json.
 */
export function verifyCronAuth(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn("CRON_SECRET not configured — rejecting cron request");
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized cron request" },
      { status: 401 }
    );
  }

  return null; // Auth passed
}

/**
 * Helper to log cron job execution to the job_run table.
 */
export async function logJobRun(
  db: any,
  jobRun: any,
  jobKey: string,
  startedAt: Date,
  outcome: "success" | "failed" | "warning",
  counts?: Record<string, number>,
  error?: string
) {
  await db.insert(jobRun).values({
    jobKey,
    startedAt,
    finishedAt: new Date(),
    outcome,
    counts: counts || null,
    error: error || null,
  });
}
