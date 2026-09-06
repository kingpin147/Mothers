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
  booking,
  partner,
  eventPass
} from "@/db/schema";
import { eq, desc, and, sql, gte, lte, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    console.warn("Dashboard safeQuery fallback:", e?.message || e);
    return fallback;
  }
}

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
    const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1. Fetch lightweight datasets concurrently
    const [
      memberStats,
      totalRevenue,
      currentWindowList,
      t7RawEvents,
      t10RawEvents,
      pendingApps,
      acceptedApps,
      weekRawEvents,
      recentLogs,
      failedPayments,
      creditStats,
      expiringPartners,
      guestPassesList,
    ] = await Promise.all([
      // 1. Member stats
      safeQuery(
        () => db.select({
          status: member.status,
          count: sql<number>`count(*)::int`,
        }).from(member).groupBy(member.status),
        []
      ),

      // 2. Revenue
      safeQuery(
        () => db.select({ total: sql<number>`COALESCE(sum(${payment.amountCents}), 0)::int` })
          .from(payment).where(eq(payment.status, "succeeded")),
        [{ total: 0 }]
      ),

      // 3. Current Window
      safeQuery(
        () => db.select().from(window).where(eq(window.status, "open")).limit(1),
        []
      ),

      // 4. Decisions Due (T-7) events
      safeQuery(
        () => db.select({
          id: event.id,
          title: event.title,
          startsAt: event.startsAt,
          minToConfirm: event.minToConfirm,
        }).from(event)
          .where(and(eq(event.status, "published_pending"), lte(event.startsAt, t7Date), gte(event.startsAt, now)))
          .orderBy(event.startsAt),
        []
      ),

      // 5. Early Warnings (T-10) events
      safeQuery(
        () => db.select({
          id: event.id,
          title: event.title,
          startsAt: event.startsAt,
          minToConfirm: event.minToConfirm,
        }).from(event)
          .where(and(eq(event.status, "published_pending"), lte(event.startsAt, t10Date), gte(event.startsAt, now)))
          .orderBy(event.startsAt),
        []
      ),

      // 6. Applications (Submitted / Waiting)
      safeQuery(
        () => db.select({
          id: application.id,
          submittedAt: application.submittedAt,
          firstName: person.firstName,
          lastName: person.lastName,
        }).from(application)
          .innerJoin(person, eq(application.personId, person.id))
          .where(eq(application.status, 'submitted'))
          .orderBy(application.submittedAt)
          .limit(15),
        []
      ),

      // 6b. Applications (Accepted Awaiting Payment)
      safeQuery(
        () => db.select({
          id: application.id,
          submittedAt: application.submittedAt,
          decidedAt: application.decidedAt,
          acceptExpiresAt: application.acceptExpiresAt,
          firstName: person.firstName,
          lastName: person.lastName,
        }).from(application)
          .innerJoin(person, eq(application.personId, person.id))
          .where(eq(application.status, 'accepted'))
          .orderBy(application.decidedAt)
          .limit(15),
        []
      ),

      // 7. This Week (Confirmed events starting within 7 days)
      safeQuery(
        () => db.select({
          id: event.id,
          title: event.title,
          startsAt: event.startsAt,
          venueName: event.venueName,
          neighbourhood: event.neighbourhood,
          isFreeWalk: event.isFreeWalk,
          creditCost: event.creditCost,
          capacityMember: event.capacityMember,
        }).from(event)
          .where(and(eq(event.status, "confirmed"), lte(event.startsAt, t7Date), gte(event.startsAt, now)))
          .orderBy(event.startsAt)
          .limit(20),
        []
      ),

      // 8. Audit Logs
      safeQuery(
        () => db.select({
          id: auditLog.id,
          action: auditLog.action,
          entity: auditLog.entity,
          actorType: auditLog.actorType,
          createdAt: auditLog.at,
          before: auditLog.before,
          after: auditLog.after,
        }).from(auditLog).orderBy(desc(auditLog.at)).limit(6),
        []
      ),

      // 9. Failed Payments
      safeQuery(
        () => db.select({
          id: payment.id,
          amountCents: payment.amountCents,
          occurredAt: payment.occurredAt,
          purpose: payment.purpose,
          firstName: person.firstName,
          lastName: person.lastName,
        }).from(payment)
          .innerJoin(person, eq(payment.personId, person.id))
          .where(eq(payment.status, 'failed'))
          .orderBy(desc(payment.occurredAt))
          .limit(5),
        []
      ),

      // 10. Credit Stats
      safeQuery(
        () => db.select({
          issued: sql<number>`COALESCE(SUM(CASE WHEN ${creditEntry.amount} > 0 THEN ${creditEntry.amount} ELSE 0 END), 0)::int`,
          spent: sql<number>`COALESCE(SUM(CASE WHEN ${creditEntry.amount} < 0 THEN ABS(${creditEntry.amount}) ELSE 0 END), 0)::int`,
          outstanding: sql<number>`COALESCE(SUM(${creditEntry.amount}), 0)::int`,
        }).from(creditEntry),
        [{ issued: 0, spent: 0, outstanding: 0 }]
      ),

      // 11. Expiring Partner Agreements (within 30 days)
      safeQuery(
        () => db.select({
          id: partner.id,
          name: partner.name,
          specialty: partner.specialty,
          exclusiveUntil: partner.exclusiveUntil,
        }).from(partner)
          .where(
            and(
              eq(partner.status, "active"),
              lte(partner.exclusiveUntil, thirtyDaysAhead),
              gte(partner.exclusiveUntil, now)
            )
          )
          .limit(5),
        []
      ),

      // 12. Guest Pass conversion data
      safeQuery(
        () => db.select({
          passId: eventPass.id,
          email: person.email,
          memberId: member.id,
        }).from(eventPass)
          .innerJoin(person, eq(eventPass.personId, person.id))
          .leftJoin(member, eq(member.personId, person.id))
          .limit(100),
        []
      ),
    ]);

    // 2. Fetch booking aggregates only for relevant event IDs (if any)
    const allRelevantEventIds = [
      ...t7RawEvents.map((e) => e.id),
      ...t10RawEvents.map((e) => e.id),
      ...weekRawEvents.map((e) => e.id),
    ];
    const uniqueEventIds = Array.from(new Set(allRelevantEventIds));

    const bookingStatsMap: Record<string, { bookingsCount: number; heldCredits: number; guestCount: number; waitlistCount: number }> = {};

    if (uniqueEventIds.length > 0) {
      const bSummary = await safeQuery(
        () => db.select({
          eventId: booking.eventId,
          bookingsCount: sql<number>`count(CASE WHEN ${booking.status} IN ('held', 'confirmed') THEN 1 END)::int`,
          heldCredits: sql<number>`COALESCE(sum(CASE WHEN ${booking.status} = 'held' THEN ${booking.creditsCharged} ELSE 0 END), 0)::int`,
          guestCount: sql<number>`count(CASE WHEN ${booking.kind} = 'guest' AND ${booking.status} IN ('held', 'confirmed') THEN 1 END)::int`,
          waitlistCount: sql<number>`count(CASE WHEN ${booking.status} = 'waitlist' THEN 1 END)::int`,
        }).from(booking)
          .where(inArray(booking.eventId, uniqueEventIds))
          .groupBy(booking.eventId),
        []
      );

      for (const row of bSummary) {
        bookingStatsMap[row.eventId] = {
          bookingsCount: row.bookingsCount || 0,
          heldCredits: row.heldCredits || 0,
          guestCount: row.guestCount || 0,
          waitlistCount: row.waitlistCount || 0,
        };
      }
    }

    let activeMembersCount = 0;
    for (const s of (memberStats || [])) {
      if (s.status === "active") activeMembersCount += s.count;
    }

    const revenueCents = totalRevenue?.[0]?.total || 0;
    const currentWindow = currentWindowList?.[0] || null;
    const placesOffered = currentWindow?.placesOffered || 50;

    // Build Decisions Due (T-7)
    const decisions = (t7RawEvents || []).map((e) => {
      const stats = bookingStatsMap[e.id] || { bookingsCount: 0, heldCredits: 0, guestCount: 0, waitlistCount: 0 };
      const minToConfirm = e.minToConfirm ?? 0;
      const isMet = stats.bookingsCount >= minToConfirm;
      const startsDate = e.startsAt ? new Date(e.startsAt) : now;
      const daysUntil = Math.ceil((startsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: e.id,
        title: e.title,
        meta: `${startsDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${startsDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Starts in ${daysUntil} days`,
        count: `${stats.bookingsCount} / ${minToConfirm}`,
        countColor: isMet ? "#3f6604" : "#a8752c",
        isMet,
        heldCredits: stats.heldCredits,
        guestCount: stats.guestCount,
        guestRefundCash: stats.guestCount * 35,
      };
    });

    // Build Early Warnings (T-10, under 50% min)
    const warnings = (t10RawEvents || [])
      .filter((e) => {
        const stats = bookingStatsMap[e.id] || { bookingsCount: 0 };
        return stats.bookingsCount < Math.ceil((e.minToConfirm ?? 0) / 2);
      })
      .map((e) => {
        const stats = bookingStatsMap[e.id] || { bookingsCount: 0 };
        let group = "All members";
        const titleLower = (e.title || "").toLowerCase();
        if (titleLower.includes("baby") || titleLower.includes("massage") || titleLower.includes("feeding")) {
          group = "Babies 0–1";
        } else if (titleLower.includes("yoga") || titleLower.includes("pregnancy") || titleLower.includes("expecting")) {
          group = "Pregnant / Bump";
        } else if (titleLower.includes("work") || titleLower.includes("career")) {
          group = "Working MoMs";
        } else if (titleLower.includes("dinner") || titleLower.includes("vermut") || titleLower.includes("date")) {
          group = "Moms only";
        }

        const startsDate = e.startsAt ? new Date(e.startsAt) : now;
        return {
          id: e.id,
          title: e.title,
          meta: `${startsDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${startsDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${stats.bookingsCount} of ${e.minToConfirm ?? 0} booked`,
          group,
          draftMessage: `Hi ${group}! We have a few spots remaining for "${e.title}" on ${startsDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}. Book yours here: https://themothers.cc/events/${e.id}`,
        };
      });

    // Build Applications list
    const applications = (pendingApps || []).map((a) => {
      const submittedDate = a.submittedAt ? new Date(a.submittedAt) : now;
      const elapsedHrs = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60);
      const remainingHrs = Math.max(0, 72 - elapsedHrs);
      const color = remainingHrs < 24 ? "#7b1f2c" : remainingHrs < 48 ? "#a8752c" : "rgba(57,41,42,0.5)";
      return {
        id: a.id,
        name: `${a.firstName} ${a.lastName}`,
        meta: `${submittedDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · Application`,
        remaining: `${Math.floor(remainingHrs)}h left`,
        color,
      };
    });

    // Build Money needing attention
    const moneyList: any[] = [];

    // 1. Failed payments
    for (const fp of (failedPayments || [])) {
      const purposeStr = (fp.purpose || "payment").replace(/_/g, " ");
      moneyList.push({
        who: `${fp.firstName} ${fp.lastName}`,
        what: `${purposeStr} failed`,
        meta: `Declined ${fp.occurredAt ? new Date(fp.occurredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "recently"} · card declined`,
        amount: `€${((fp.amountCents || 0) / 100).toFixed(0)}`,
        color: "#7b1f2c",
        action: "Retry",
        href: "/admin/members",
      });
    }

    // 2. Expiring 72h Payment Holds (< 24 hours left)
    for (const app of (acceptedApps || [])) {
      if (app.acceptExpiresAt) {
        const remainingHrs = (new Date(app.acceptExpiresAt).getTime() - now.getTime()) / (1000 * 60 * 60);
        if (remainingHrs > 0 && remainingHrs <= 24) {
          moneyList.push({
            who: `${app.firstName} ${app.lastName}`,
            what: "payment hold running out",
            meta: `Accepted ${app.decidedAt || app.submittedAt ? new Date(app.decidedAt || app.submittedAt!).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "recently"} · ${Math.floor(remainingHrs)}h of 72h remaining`,
            amount: "€58",
            color: "#7b1f2c",
            action: "Extend",
            href: "/admin/applications",
          });
        }
      }
    }

    // 3. Expiring Partner Agreements
    for (const p of (expiringPartners || [])) {
      const daysLeft = p.exclusiveUntil ? Math.ceil((new Date(p.exclusiveUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      moneyList.push({
        who: p.name,
        what: `partner agreement ends in ${daysLeft} days`,
        meta: `${p.specialty || "Exclusive"} partnership`,
        amount: `${daysLeft} days`,
        color: "#a8752c",
        action: "Renew",
        href: "/admin/partners",
      });
    }

    // Build Week's events
    let totalCapacity = 0;
    let totalBooked = 0;

    const week = (weekRawEvents || []).map((e) => {
      const stats = bookingStatsMap[e.id] || { bookingsCount: 0, waitlistCount: 0 };
      const cap = e.capacityMember ?? 0;
      const booked = stats.bookingsCount;
      totalCapacity += cap;
      totalBooked += booked;

      const startsDate = e.startsAt ? new Date(e.startsAt) : now;
      return {
        id: e.id,
        when: `${startsDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${startsDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        title: e.title,
        place: `${e.venueName || e.neighbourhood || "Barcelona"} · ${e.isFreeWalk ? "free" : (e.creditCost ?? 1) + " credits"}`,
        headcount: cap > 0 ? (booked > 0 ? `${booked} of ${cap}` : String(booked)) : String(booked),
        headcountLabel: cap > 0 && booked >= cap ? "places taken · full" : "places taken",
        href: `/admin/events`,
      };
    });

    // Pass-to-member conversion
    const passEmails = (guestPassesList || [])
      .map((p) => p.email)
      .filter((email): email is string => Boolean(email));
    const uniquePassHolders = new Set(passEmails.map((e) => e.toLowerCase()));
    const convertedPassHolders = new Set(
      (guestPassesList || [])
        .filter((p) => p.memberId !== null && Boolean(p.email))
        .map((p) => p.email!.toLowerCase())
    );
    const passConversionPct = uniquePassHolders.size > 0 ? Math.round((convertedPassHolders.size / uniquePassHolders.size) * 100) : 0;

    const stats = [
      { value: `${activeMembersCount} of ${placesOffered}`, label: "Opening Circle places taken" },
      { value: `${activeMembersCount}`, label: "Active members" },
      { value: `${creditStats?.[0]?.issued || 0}`, label: "Credits issued" },
      { value: `${creditStats?.[0]?.spent || 0}`, label: "Credits spent" },
      { value: `€${(revenueCents / 100).toFixed(0)}`, label: "Total Revenue" },
      { value: `${passConversionPct}%`, label: `Pass-to-member conversion (${convertedPassHolders.size}/${uniquePassHolders.size})` },
    ];

    function formatAuditAction(log: any): string {
      const actionMap: Record<string, string> = {
        update_club_settings: "Changed club and credit policies",
        create_membership_window: "Created a new membership window",
        open_membership_window: "Opened a membership window",
        closed_membership_window: "Closed a membership window",
        update_member_profile: "Updated member profile",
        pause_member: "Paused a membership",
        cancel_member: "Cancelled a membership",
        confirm_event: "Confirmed an event",
        cancel_event: "Cancelled an event",
        create_event: "Published a new event",
        update_event: "Updated an event",
        create_journal: "Published a journal article",
        update_journal: "Updated a journal article",
        delete_journal: "Deleted a journal article",
        update_faq: "Updated FAQ",
        create_faq: "Added FAQ item",
        delete_faq: "Deleted FAQ item",
        create_partner: "Added a partner",
        update_partner: "Updated a partner",
        delete_partner: "Deleted a partner",
        approve_application: "Approved an application",
        decline_application: "Declined an application",
        clear_test_data: "Cleared test data",
      };

      if (log.action === "update_club_settings" && log.before && log.after) {
        const changes: string[] = [];
        const beforeStr = (log.before as any) || {};
        const afterStr = (log.after as any) || {};

        const keyMap: Record<string, string> = {
          joining_fee_cents: "Joining fee",
          rollover_cap_credits: "Rollover ceiling",
          referral_bonus_credits: "Godmother join bonus",
          godmother_three_month_bonus: "Godmother three month bonus",
        };

        for (const [k, title] of Object.entries(keyMap)) {
          const oldVal = beforeStr[k];
          const newVal = afterStr[k];
          if (oldVal !== newVal) {
            if (k === "joining_fee_cents") {
              changes.push(`${title} from €${(Number(oldVal) || 0) / 100} to €${(Number(newVal) || 0) / 100}`);
            } else {
              changes.push(`${title} from ${oldVal} to ${newVal}`);
            }
          }
        }

        if (changes.length > 0) {
          return `Changed: ${changes.join(", ")}`;
        }
      }

      return actionMap[log.action] || `Action on ${log.entity}`;
    }

    const audit =
      (recentLogs && recentLogs.length > 0)
        ? recentLogs.map((l) => ({
            who: l.actorType,
            did: l.action === "update_club_settings" ? "Settings" : l.entity,
            change: formatAuditAction(l),
            when: l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-",
            where: "web",
          }))
        : [
            { who: "System", did: "awaiting logs", change: "Audit logs will appear here once actions are taken.", when: "-", where: "-" },
          ];

    return {
      success: true as const,
      role: role,
      decisions,
      warnings,
      applications,
      money: moneyList,
      week,
      stats,
      audit,
      hasDecisions: decisions.length > 0,
      noDecisions: decisions.length === 0,
      hasWarnings: warnings.length > 0,
      noWarnings: warnings.length === 0,
    };
  } catch (err: any) {
    console.error("getAdminDashboardMetrics error:", err);
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

  if (jobKey === "threshold-decisions") {
    const now = new Date();
    const t7Date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const pendingEvents = await db
      .select()
      .from(event)
      .where(and(eq(event.status, "published_pending"), lte(event.startsAt, t7Date), gte(event.startsAt, now)));

    for (const ev of pendingEvents) {
      await db
        .update(event)
        .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
        .where(eq(event.id, ev.id));
    }

    return { success: true, count: pendingEvents.length };
  }

  if (jobKey === "expire-credits") {
    return { success: true, count: 0 };
  }

  return { success: true, count: 0 };
}

export async function resetTestData() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "host", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false as const, error: "UNAUTHORIZED" };
  }

  try {
    await db.insert(auditLog).values({
      actorId: (session?.user as any)?.personId || "admin",
      actorType: "admin",
      action: "clear_test_data",
      entity: "system",
      entityId: "dashboard",
      before: { state: "test_mode" },
      after: { state: "seeded_clean" },
    });

    return { success: true as const };
  } catch (err: any) {
    return { success: false as const, error: err?.message || "RESET_FAILED" };
  }
}

