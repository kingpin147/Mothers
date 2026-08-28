"use server";

import { db } from "@/db";
import {
  member,
  application,
  event,
  payment,
  creditEntry,
  auditLog,
  person,
  window
} from "@/db/schema";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function getAdminDashboardMetrics() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "host", "super_admin"];
  if (!role || !allowed.includes(role)) {
    throw new Error("UNAUTHORIZED_ADMIN");
  }

  const now = new Date();
  const t7Date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // 1. Members count by status
  const memberStats = await db
    .select({
      status: member.status,
      count: sql<number>`count(*)::int`,
    })
    .from(member)
    .groupBy(member.status);

  let activeMembersCount = 0;
  let atRiskCount = 0;
  for (const s of memberStats) {
    if (s.status === "active") activeMembersCount += s.count;
  }

  const atRiskMembers = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(member)
    .where(sql`${member.atRiskSince} IS NOT NULL`);
  atRiskCount = atRiskMembers[0]?.count || 0;

  // 2. Pending applications awaiting review
  const pendingApps = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(application)
    .where(eq(application.status, "submitted"));
  const pendingAppsCount = pendingApps[0]?.count || 0;

  // 3. Events needing T-7 decision (starts within next 7 days and is published_pending)
  const pendingEvents = await db
    .select()
    .from(event)
    .where(
      and(
        eq(event.status, "published_pending"),
        lte(event.startsAt, t7Date),
        gte(event.startsAt, now)
      )
    )
    .orderBy(event.startsAt);

  // 4. Financial & MRR volume
  const totalRevenue = await db
    .select({ total: sql<number>`COALESCE(sum(amount_cents), 0)::int` })
    .from(payment)
    .where(eq(payment.status, "succeeded"));
  const revenueCents = totalRevenue[0]?.total || 0;

  // 5. Active Founding Window status
  const currentWindow = await db.query.window.findFirst({
    where: eq(window.status, "open"),
  });

  // 6. Recent Audit Activity (Last 6 entries)
  const recentActivity = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      actorType: auditLog.actorType,
      createdAt: auditLog.at,
    })
    .from(auditLog)
    .orderBy(desc(auditLog.at))
    .limit(6);

  return {
    success: true,
    metrics: {
      activeMembersCount,
      atRiskCount,
      pendingAppsCount,
      t7EventsCount: pendingEvents.length,
      revenueCents,
      placesOffered: currentWindow?.placesOffered || 50,
      windowLockMonths: currentWindow?.lockMonths || 12,
    },
    alerts: {
      t7Events: pendingEvents.map((e) => ({
        id: e.id,
        title: e.title,
        startsAt: e.startsAt,
        creditCost: e.creditCost,
        minToConfirm: e.minToConfirm,
        capacityMember: e.capacityMember,
      })),
    },
    recentActivity,
  };
}

export async function runManualCron(jobKey: "threshold-decisions" | "expire-credits") {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  // Execute cron logic directly
  if (jobKey === "threshold-decisions") {
    const now = new Date();
    const t7Date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const pendingEvents = await db
      .select()
      .from(event)
      .where(
        and(
          eq(event.status, "published_pending"),
          lte(event.startsAt, t7Date),
          gte(event.startsAt, now)
        )
      );

    for (const ev of pendingEvents) {
      await db
        .update(event)
        .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(event.id, ev.id));
    }

    return { success: true, count: pendingEvents.length };
  }

  return { success: true, count: 0 };
}
