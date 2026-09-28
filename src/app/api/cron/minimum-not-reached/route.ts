import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { event, booking, jobRun, auditLog, adminUser } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";
import { sendMinimumNotReachedEmail } from "@/lib/brevo";
import { getAppUrl } from "@/lib/urls";

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let alertsTriggered = 0;

  try {
    // Find pending events that have reached decision date where quorum is not yet met and alert has not been sent
    const pendingEvents = await db
      .select()
      .from(event)
      .where(
        and(
          eq(event.status, "published_pending"),
          sql`decision_at IS NOT NULL AND decision_at <= NOW()`,
          sql`min_to_confirm > 0`,
          sql`threshold_alert_sent_at IS NULL`
        )
      );

    const admins = await db.query.adminUser.findMany({
      where: inArray(adminUser.role, ["owner", "manager", "super_admin"]),
    });

    const adminEmails = admins.map((a) => a.email).filter(Boolean);
    if (adminEmails.length === 0 && process.env.ADMIN_ALERT_EMAIL) {
      adminEmails.push(process.env.ADMIN_ALERT_EMAIL);
    }

    for (const ev of pendingEvents) {
      const activeCounts = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(booking)
        .where(
          and(
            eq(booking.eventId, ev.id),
            sql`(${booking.status} = 'confirmed' OR (${booking.status} = 'held' AND (${booking.heldUntil} IS NULL OR ${booking.heldUntil} > NOW())))`
          )
        );

      const currentBookings = activeCounts[0]?.count || 0;
      const minRequired = ev.minToConfirm || 0;

      if (currentBookings < minRequired) {
        const origin = getAppUrl();
        const eventDateFormatted = new Date(ev.startsAt).toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        for (const adminEmail of adminEmails) {
          await sendMinimumNotReachedEmail({
            adminEmail,
            eventTitle: ev.title,
            activeBookings: currentBookings,
            minRequired,
            eventDate: eventDateFormatted,
          }).catch((err) => console.error("Error sending minimum not reached alert:", err));
        }

        await db
          .update(event)
          .set({ thresholdAlertSentAt: new Date(), updatedAt: new Date() })
          .where(eq(event.id, ev.id));

        await db.insert(auditLog).values({
          actorType: "system",
          action: "minimum_not_reached_alert_sent",
          entity: "event",
          entityId: ev.id,
          after: { currentBookings, minRequired, adminEmails },
        });

        alertsTriggered++;
      }
    }

    await db.insert(jobRun).values({
      jobKey: "minimum_not_reached_alert",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { alertsTriggered },
    });

    return NextResponse.json({ success: true, alertsTriggered });
  } catch (error: any) {
    console.error("minimum-not-reached cron error:", error);
    await db.insert(jobRun).values({
      jobKey: "minimum_not_reached_alert",
      outcome: "failed",
      startedAt,
      finishedAt: new Date(),
      error: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
