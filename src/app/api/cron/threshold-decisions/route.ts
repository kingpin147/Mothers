import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { event, booking, jobRun, auditLog } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";
import { returnCredits } from "@/lib/ledger";

/**
 * Threshold Decisions Cron (§8, §4.3)
 * 
 * At each event's `decision_at`: 
 *   - If bookings >= min_to_confirm → CONFIRM (held → confirmed)
 *   - If bookings < min_to_confirm → CANCEL (release all holds, return credits)
 * 
 * Also auto-confirms events with min_to_confirm = 0 that are still pending.
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let confirmed = 0;
  let cancelled = 0;
  let evaluated = 0;

  try {
    // Find all published_pending events where decision_at has passed
    const pendingEvents = await db
      .select()
      .from(event)
      .where(
        and(
          eq(event.status, "published_pending"),
          sql`(decision_at IS NOT NULL AND decision_at <= NOW()) OR (min_to_confirm = 0)`
        )
      );

    evaluated = pendingEvents.length;

    for (const ev of pendingEvents) {
      // Count all active bookings (kind = member or guest), excluding expired holds
      const counts = await db
        .select({ count: sql<number>`count(*)` })
        .from(booking)
        .where(
          and(
            eq(booking.eventId, ev.id),
            sql`(${booking.status} = 'confirmed' OR (${booking.status} = 'held' AND (${booking.heldUntil} IS NULL OR ${booking.heldUntil} > NOW())))`
          )
        );

      const activeBookings = Number(counts[0]?.count || 0);

      if (activeBookings >= ev.minToConfirm) {
        // ── CONFIRM: threshold met ──────────────────────────────────────────
        await db.transaction(async (tx) => {
          await tx
            .update(event)
            .set({
              status: "confirmed",
              confirmedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(event.id, ev.id));

          // Promote all active held bookings to confirmed
          await tx
            .update(booking)
            .set({ status: "confirmed", updatedAt: new Date() })
            .where(
              and(
                eq(booking.eventId, ev.id),
                eq(booking.status, "held"),
                sql`(${booking.heldUntil} IS NULL OR ${booking.heldUntil} > NOW())`
              )
            );

          await tx.insert(auditLog).values({
            actorType: "system",
            action: "threshold_confirm",
            entity: "event",
            entityId: ev.id,
            after: {
              activeBookings,
              minRequired: ev.minToConfirm,
            },
          });
        });
        confirmed++;
      }
    }

    await db.insert(jobRun).values({
      jobKey: "threshold_decisions",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { evaluated, confirmed, cancelled },
    });

    return NextResponse.json({
      success: true,
      evaluated,
      confirmed,
      cancelled,
    });
  } catch (error: any) {
    await db.insert(jobRun).values({
      jobKey: "threshold_decisions",
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
