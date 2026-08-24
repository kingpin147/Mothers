import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { event, booking, creditEntry, jobRun, auditLog } from "@/db/schema";
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
      // Count active member bookings
      const counts = await db
        .select({ count: sql<number>`count(*)` })
        .from(booking)
        .where(
          and(
            eq(booking.eventId, ev.id),
            eq(booking.kind, "member"),
            sql`status IN ('held', 'confirmed')`
          )
        );

      const activeBookings = Number(counts[0]?.count || 0);

      if (activeBookings >= ev.minToConfirm) {
        // ── CONFIRM: threshold met ──────────────────────────────────────────
        await db.transaction(async (tx) => {
          // Set guest window dates on confirmation
          const guestOpenAt = new Date(); // opens now on confirmation
          const guestCloseAt = new Date(
            new Date(ev.startsAt).getTime() - 2 * 24 * 60 * 60 * 1000
          ); // T-2

          await tx
            .update(event)
            .set({
              status: "confirmed",
              confirmedAt: new Date(),
              guestOpenAt:
                !ev.isSignature && ev.creditCost <= 18 ? guestOpenAt : null,
              guestCloseAt:
                !ev.isSignature && ev.creditCost <= 18 ? guestCloseAt : null,
              updatedAt: new Date(),
            })
            .where(eq(event.id, ev.id));

          // Promote all held bookings to confirmed
          await tx
            .update(booking)
            .set({ status: "confirmed", updatedAt: new Date() })
            .where(
              and(eq(booking.eventId, ev.id), eq(booking.status, "held"))
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
      } else if (ev.decisionAt && new Date(ev.decisionAt) <= new Date()) {
        // ── CANCEL: threshold NOT met at decision_at ────────────────────────
        await db.transaction(async (tx) => {
          await tx
            .update(event)
            .set({
              status: "cancelled",
              cancelledAt: new Date(),
              cancelReason: `Threshold not met: ${activeBookings}/${ev.minToConfirm} bookings at decision date`,
              updatedAt: new Date(),
            })
            .where(eq(event.id, ev.id));

          // Release all active bookings and return credits
          const activeBookingRows = await tx
            .select()
            .from(booking)
            .where(
              and(
                eq(booking.eventId, ev.id),
                sql`status IN ('held', 'confirmed')`
              )
            );

          for (const b of activeBookingRows) {
            await tx
              .update(booking)
              .set({
                status: "cancelled_event",
                cancelledAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(booking.id, b.id));

            // Return credits for member bookings
            if (b.memberId && b.creditsCharged > 0) {
              // Find the original spend entry for this booking
              const spendEntry = await tx.query.creditEntry.findFirst({
                where: and(
                  eq(creditEntry.memberId, b.memberId),
                  eq(creditEntry.type, "spend"),
                  eq(creditEntry.sourceId, b.eventId)
                ),
              });

              if (spendEntry) {
                await returnCredits(
                  b.memberId,
                  spendEntry.id,
                  "return_cancellation",
                  `Event cancelled (threshold not met): ${ev.title}`,
                  tx
                );
              } else {
                // Fallback: direct return entry
                await tx.insert(creditEntry).values({
                  memberId: b.memberId,
                  amount: b.creditsCharged,
                  type: "return_cancellation",
                  sourceType: "event",
                  sourceId: ev.id,
                  reason: `Event cancelled (threshold not met): ${ev.title}`,
                });
              }
            }
          }

          await tx.insert(auditLog).values({
            actorType: "system",
            action: "threshold_cancel",
            entity: "event",
            entityId: ev.id,
            after: {
              activeBookings,
              minRequired: ev.minToConfirm,
              bookingsCancelled: activeBookingRows.length,
            },
          });
        });
        cancelled++;
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
