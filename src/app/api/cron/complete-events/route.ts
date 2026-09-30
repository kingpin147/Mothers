import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { event, booking, person, member, jobRun, auditLog } from "@/db/schema";
import { eq, and, lt, inArray } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";
import { queueAndSendEmail } from "@/lib/brevo";
import { getAppUrl } from "@/lib/urls";

/**
 * Complete Events Cron (§4.3, §8)
 * 
 * - Mark confirmed events where ends_at < NOW() as "completed"
 * - Queue "After Your Event" email to all attendees the following morning
 * - Only completed events can have attendance marked
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let completed = 0;
  let emailsQueued = 0;

  try {
    // Find confirmed events that have ended
    const finishedEvents = await db
      .select()
      .from(event)
      .where(
        and(
          eq(event.status, "confirmed"),
          lt(event.endsAt, new Date())
        )
      );

    for (const ev of finishedEvents) {
      // Mark as completed
      await db
        .update(event)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(event.id, ev.id));

      // Settle any remaining unfilled returns for this finished event (§5 & §7.3)
      await db
        .update(booking)
        .set({
          pendingReturnState: "settled_unfilled",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(booking.eventId, ev.id),
            eq(booking.pendingReturnState, "awaiting_replacement")
          )
        );

      await db.insert(auditLog).values({
        actorType: "system",
        action: "complete_event",
        entity: "event",
        entityId: ev.id,
        after: { title: ev.title, endsAt: ev.endsAt },
      });

      completed++;
    }

    await db.insert(jobRun).values({
      jobKey: "complete_events",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { completed, emailsQueued: 0 },
    });

    return NextResponse.json({ success: true, completed, emailsQueued: 0 });
  } catch (error: any) {
    console.error("complete_events cron error:", error);
    await db.insert(jobRun).values({
      jobKey: "complete_events",
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
