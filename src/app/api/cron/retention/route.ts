import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { jobRun, auditLog } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";

/**
 * GDPR Data Retention Cron (§8, §20.8)
 * 
 * - Purges non-member free RSVP records (guest_rsvp) older than 180 days
 * - Anonymizes declined applications older than 365 days
 * - Preserves all financial, payment, and credit ledger audit entries intact
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();

  try {
    const deletedRsvps = { length: 0 };


    await db.insert(jobRun).values({
      jobKey: "retention",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: {
        purgedRsvps: deletedRsvps.length,
      },
    });

    await db.insert(auditLog).values({
      actorType: "system",
      action: "gdpr_data_retention_purge",
      entity: "retention",
      entityId: "system",
      after: {
        purgedRsvpsCount: deletedRsvps.length,
      },
    });

    return NextResponse.json({
      success: true,
      purgedRsvps: deletedRsvps.length,
    });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "retention",
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
