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
  window,
  booking
} from "@/db/schema";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function getAdminDashboardMetrics() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "host", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false as const, error: "UNAUTHORIZED_ADMIN" };
  }

  try {
    const now = new Date();
    const t7Date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const t10Date = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    // Start all queries concurrently
  const [
    memberStats,
    totalRevenue,
    currentWindow,
    t7Events,
    t10EventsData,
    pendingApps,
    weekEvents,
    recentLogs,
    failedPayments,
    creditStats
  ] = await Promise.all([
    // 1. Stats
    db.select({
      status: member.status,
      count: sql<number>`count(*)::int`,
    }).from(member).groupBy(member.status),

    // 2. Revenue
    db.select({ total: sql<number>`COALESCE(sum(${payment.amountCents}), 0)::int` })
      .from(payment).where(eq(payment.status, "succeeded")),

    // 3. Current Window
    db.query.window.findFirst({
      where: eq(window.status, "open"),
    }),

    // 4. Decisions Due (T-7)
    db.select({
      event: event,
      bookingsCount: sql<number>`count(CASE WHEN ${booking.status} IN ('held', 'confirmed') THEN 1 END)::int`
    }).from(event)
      .leftJoin(booking, eq(booking.eventId, event.id))
      .where(and(eq(event.status, "published_pending"), lte(event.startsAt, t7Date), gte(event.startsAt, now)))
      .groupBy(event.id).orderBy(event.startsAt),

    // 5. Early Warnings (T-10)
    db.select({
      event: event,
      bookingsCount: sql<number>`count(CASE WHEN ${booking.status} IN ('held', 'confirmed') THEN 1 END)::int`
    }).from(event)
      .leftJoin(booking, eq(booking.eventId, event.id))
      .where(and(eq(event.status, "published_pending"), lte(event.startsAt, t10Date), gte(event.startsAt, t7Date)))
      .groupBy(event.id).orderBy(event.startsAt),

    // 6. Applications
    db.select({
      app: application,
      p: person
    }).from(application)
      .innerJoin(person, eq(application.personId, person.id))
      .where(eq(application.status, 'submitted'))
      .orderBy(application.submittedAt),

    // 7. This Week (Confirmed events starting within 7 days)
    db.select({
      event: event,
      bookingsCount: sql<number>`count(CASE WHEN ${booking.status} IN ('held', 'confirmed') THEN 1 END)::int`,
      waitlistCount: sql<number>`count(CASE WHEN ${booking.status} = 'waitlist' THEN 1 END)::int`
    }).from(event)
      .leftJoin(booking, eq(booking.eventId, event.id))
      .where(and(eq(event.status, "confirmed"), lte(event.startsAt, t7Date), gte(event.startsAt, now)))
      .groupBy(event.id).orderBy(event.startsAt),

    // 8. Audit
    db.select({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      actorType: auditLog.actorType,
      createdAt: auditLog.at,
    }).from(auditLog).orderBy(desc(auditLog.at)).limit(5),

    // 9. Failed Payments
    db.select({
      id: payment.id,
      amountCents: payment.amountCents,
      occurredAt: payment.occurredAt,
      purpose: payment.purpose,
      p: person
    }).from(payment)
      .innerJoin(person, eq(payment.personId, person.id))
      .where(eq(payment.status, 'failed'))
      .orderBy(desc(payment.occurredAt)).limit(5),

    // 10. Credit Stats
    db.select({
      issued: sql<number>`COALESCE(SUM(CASE WHEN ${creditEntry.amount} > 0 THEN ${creditEntry.amount} ELSE 0 END), 0)::int`,
      spent: sql<number>`COALESCE(SUM(CASE WHEN ${creditEntry.amount} < 0 THEN ABS(${creditEntry.amount}) ELSE 0 END), 0)::int`,
    }).from(creditEntry)
  ]);

  let activeMembersCount = 0;
  for (const s of memberStats) {
    if (s.status === "active") activeMembersCount += s.count;
  }

  const revenueCents = totalRevenue[0]?.total || 0;
  const placesOffered = currentWindow?.placesOffered || 50;

  const decisions = t7Events.map(e => {
    const isMet = e.bookingsCount >= e.event.minToConfirm;
    return {
      id: e.event.id,
      title: e.event.title,
      meta: `${new Date(e.event.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${new Date(e.event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})} · decision due soon`,
      count: `${e.bookingsCount} / ${e.event.minToConfirm}`,
      countColor: isMet ? '#3f6604' : '#a8752c',
      isMet
    };
  });

  const warnings = t10EventsData.filter(e => e.bookingsCount < e.event.minToConfirm).map(e => ({
      id: e.event.id,
      title: e.event.title,
      meta: `${new Date(e.event.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${new Date(e.event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})} · ${e.bookingsCount} of ${e.event.minToConfirm} booked`,
      group: 'All members'
  }));

  const applications = pendingApps.map(a => {
    const elapsedHrs = (now.getTime() - new Date(a.app.submittedAt).getTime()) / (1000 * 60 * 60);
    const remainingHrs = Math.max(0, 72 - elapsedHrs);
    const color = remainingHrs < 24 ? '#7b1f2c' : (remainingHrs < 48 ? '#a8752c' : 'rgba(57,41,42,0.5)');
    return {
      id: a.app.id,
      name: `${a.p.firstName} ${a.p.lastName}`,
      meta: `${new Date(a.app.submittedAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · Application`,
      remaining: `${Math.floor(remainingHrs)}h left`,
      color
    };
  });

  const money = failedPayments.map(fp => {
    const purposeStr = fp.purpose.replace(/_/g, " ");
    return {
      who: `${fp.p.firstName} ${fp.p.lastName}`,
      what: `${purposeStr} failed`,
      meta: `Declined ${new Date(fp.occurredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
      amount: `€${(fp.amountCents / 100).toFixed(0)}`,
      color: '#7b1f2c',
      action: 'Retry'
    };
  });

  let totalCapacity = 0;
  let totalBooked = 0;
  let totalWaitlist = 0;

  const week = weekEvents.map(e => {
    totalCapacity += e.event.capacityMember;
    totalBooked += e.bookingsCount;
    totalWaitlist += e.waitlistCount;

    return {
      id: e.event.id,
      when: `${new Date(e.event.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${new Date(e.event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}`,
      title: e.event.title,
      place: `${e.event.meetingPoint || "TBD"} · ${e.event.isFreeWalk ? 'free' : e.event.creditCost + ' credits'}`,
      headcount: e.bookingsCount > 0 ? `${e.bookingsCount} of ${e.event.capacityMember}` : String(e.bookingsCount),
      headcountLabel: e.bookingsCount === e.event.capacityMember ? 'places taken · full' : 'places taken'
    };
  });

  const fillRate = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

  const stats = [
    { value: `${activeMembersCount} of ${placesOffered}`, label: 'Opening Circle places taken' },
    { value: `${activeMembersCount}`, label: 'Active members' },
    { value: `${creditStats[0]?.issued || 0}`, label: 'Credits issued recently' },
    { value: `${creditStats[0]?.spent || 0}`, label: 'Credits spent recently' },
    { value: `€${(revenueCents / 100).toFixed(0)}`, label: 'Total Revenue' },
    { value: `${fillRate}%`, label: `Fill rate · ${totalWaitlist} on waitlists` }
  ];

  const audit = recentLogs.length > 0 ? recentLogs.map(l => ({
    who: l.actorType,
    did: l.action,
    change: `Action on ${l.entity}`,
    when: new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    where: 'web'
  })) : [
    { who: 'System', did: 'awaiting logs', change: 'Audit logs will appear here once actions are taken.', when: '-', where: '-' }
  ];

  return {
    success: true as const,
    role: role,
    decisions,
    warnings,
    applications,
    money,
    week,
    stats,
    audit
  };
  } catch (err: any) {
    console.error(err);
    return { success: false as const, error: err.message || "Failed to load dashboard metrics" };
  }
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

  if (jobKey === "expire-credits") {
    // Stub
    return { success: true, count: 0 };
  }

  return { success: true, count: 0 };
}
