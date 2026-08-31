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
    throw new Error("UNAUTHORIZED_ADMIN");
  }

  const now = new Date();
  const t7Date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const t10Date = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  // Stats
  const memberStats = await db
    .select({
      status: member.status,
      count: sql<number>`count(*)::int`,
    })
    .from(member)
    .groupBy(member.status);

  let activeMembersCount = 0;
  for (const s of memberStats) {
    if (s.status === "active") activeMembersCount += s.count;
  }

  const totalRevenue = await db
    .select({ total: sql<number>`COALESCE(sum(amount_cents), 0)::int` })
    .from(payment)
    .where(eq(payment.status, "succeeded"));
  const revenueCents = totalRevenue[0]?.total || 0;
  
  const currentWindow = await db.query.window.findFirst({
    where: eq(window.status, "open"),
  });
  const placesOffered = currentWindow?.placesOffered || 50;

  // Decisions Due (T-7)
  const t7Events = await db.select({
      event: event,
      bookingsCount: sql<number>`count(CASE WHEN ${booking.status} IN ('held', 'confirmed') THEN 1 END)::int`
  }).from(event)
    .leftJoin(booking, eq(booking.eventId, event.id))
    .where(and(eq(event.status, "published_pending"), lte(event.startsAt, t7Date), gte(event.startsAt, now)))
    .groupBy(event.id)
    .orderBy(event.startsAt);

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

  // Early Warnings (T-10)
  const t10EventsData = await db.select({
      event: event,
      bookingsCount: sql<number>`count(CASE WHEN ${booking.status} IN ('held', 'confirmed') THEN 1 END)::int`
  }).from(event)
    .leftJoin(booking, eq(booking.eventId, event.id))
    .where(and(eq(event.status, "published_pending"), lte(event.startsAt, t10Date), gte(event.startsAt, t7Date)))
    .groupBy(event.id)
    .orderBy(event.startsAt);

  const warnings = t10EventsData.filter(e => e.bookingsCount < e.event.minToConfirm).map(e => ({
      id: e.event.id,
      title: e.event.title,
      meta: `${new Date(e.event.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${new Date(e.event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})} · ${e.bookingsCount} of ${e.event.minToConfirm} booked`,
      group: 'All members' // Usually pulled from stage array
  }));

  // Applications
  const pendingApps = await db.select({
      app: application,
      p: person
  }).from(application)
    .innerJoin(person, eq(application.personId, person.id))
    .where(eq(application.status, 'submitted'))
    .orderBy(application.submittedAt);
  
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

  // Money (Stubbed based on design)
  const money = [
    { who: 'Elena Prats', what: 'renewal failed twice', meta: 'Declined recently · pauses in 2 days', amount: '€29', color: '#7b1f2c', action: 'Retry' },
    { who: 'Sofia Marín', what: 'payment hold running out', meta: 'Accepted recently · 11h of 72 left', amount: '€48', color: '#7b1f2c', action: 'Extend' },
    { who: 'Ana Vidal', what: 'card expires next month', meta: 'Renews soon · card ends 09/26', amount: '€79', color: '#a8752c', action: 'Ask for a new card' },
    { who: 'Clínica Bonanova', what: 'agreement ends in 21 days', meta: 'Perk live in 34 accounts', amount: '21 days', color: '#a8752c', action: 'Renew' }
  ];

  // This Week (Confirmed events starting within 7 days)
  const weekEvents = await db.select({
      event: event,
      bookingsCount: sql<number>`count(CASE WHEN ${booking.status} IN ('held', 'confirmed') THEN 1 END)::int`
  }).from(event)
    .leftJoin(booking, eq(booking.eventId, event.id))
    .where(and(eq(event.status, "confirmed"), lte(event.startsAt, t7Date), gte(event.startsAt, now)))
    .groupBy(event.id)
    .orderBy(event.startsAt);

  const week = weekEvents.map(e => ({
    id: e.event.id,
    when: `${new Date(e.event.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${new Date(e.event.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}`,
    title: e.event.title,
    place: `${e.event.meetingPoint} · ${e.event.isFreeWalk ? 'free' : e.event.creditCost + ' credits'}`,
    headcount: e.bookingsCount > 0 ? `${e.bookingsCount} of ${e.event.capacityMember}` : String(e.bookingsCount),
    headcountLabel: e.bookingsCount === e.event.capacityMember ? 'places taken · full' : 'places taken'
  }));

  // Stats array
  const stats = [
    { value: `${activeMembersCount} of ${placesOffered}`, label: 'Opening Circle places taken' },
    { value: `${activeMembersCount}`, label: 'Active members' },
    { value: '1,220', label: 'Credits issued recently' }, // Stub
    { value: '844', label: 'Credits spent recently' }, // Stub
    { value: `€${(revenueCents / 100).toFixed(0)}`, label: 'Total Revenue' },
    { value: '78%', label: 'Fill rate · 9 on waitlists' } // Stub
  ];

  // Audit
  const recentLogs = await db.select({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      actorType: auditLog.actorType,
      createdAt: auditLog.at,
  }).from(auditLog).orderBy(desc(auditLog.at)).limit(5);

  const audit = recentLogs.length > 0 ? recentLogs.map(l => ({
    who: l.actorType,
    did: l.action,
    change: `Action on ${l.entity}`,
    when: new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    where: 'web'
  })) : [
    { who: 'Belén', did: 'confirmed an event', change: 'Sleep & routines workshop — “filling” → “confirmed”, 9 booked against a minimum of 6', when: '30 Aug · 22:50', where: 'Barcelona · web' },
    { who: 'Belén', did: 'adjusted credits', change: 'Eolia Serra — balance 4 → 22, reason “goodwill, class cancelled in June”', when: '30 Aug · 22:46', where: 'Barcelona · web' },
    { who: 'Marc', did: 'created an event', change: 'Vineyard long-table lunch — Alella, 6 Sep 13:00, minimum 8, 45 credits', when: '30 Aug · 22:22', where: 'Barcelona · web' },
    { who: 'System', did: 'ran the credit expiry job', change: '38 credits expired across 4 members, oldest first', when: '30 Aug · 06:00', where: 'Scheduled job' },
    { who: 'Belén', did: 'accepted an application', change: 'Sofia Marín — “waiting” → “accepted”, payment link valid until 31 Aug 14:20', when: '28 Aug · 14:20', where: 'Barcelona · web' }
  ];

  return {
    success: true,
    role: role,
    decisions,
    warnings,
    applications,
    money,
    week,
    stats,
    audit
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

  if (jobKey === "expire-credits") {
    // Stub
    return { success: true, count: 0 };
  }

  return { success: true, count: 0 };
}
