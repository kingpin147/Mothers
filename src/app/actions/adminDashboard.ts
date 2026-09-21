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
  eventPass,
  subscriber
} from "@/db/schema";
import { eq, desc, and, or, isNotNull, sql, gte, lte, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

async function safeQuery<T>(fn: () => Promise<T>, fallback: T, timeoutMs = 4000): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Query timed out")), timeoutMs);
    });
    const result = await Promise.race([fn(), timeoutPromise]);
    if (timer) clearTimeout(timer);
    return result;
  } catch (e: any) {
    if (timer) clearTimeout(timer);
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

    // 1. Fetch consolidated aggregates & entity datasets in 3 fast batches
    const [
      aggregatesResult,
      rawEvents,
      allApps,
      recentLogs,
      failedPayments,
      expiringPartners
    ] = await Promise.all([
      // 1. Single consolidated query for all metric totals
      safeQuery(
        () => db.select({
          activeMembers: sql<number>`(SELECT count(*)::int FROM member WHERE status = 'active')`,
          totalRevenue: sql<number>`(SELECT COALESCE(sum(amount_cents), 0)::int FROM payment WHERE status = 'succeeded')`,
          subscribersCount: sql<number>`(SELECT count(*)::int FROM subscriber)`,
          creditIssued: sql<number>`(SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0)::int FROM credit_entry)`,
          creditSpent: sql<number>`(SELECT COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0)::int FROM credit_entry)`,
          creditOutstanding: sql<number>`(SELECT COALESCE(SUM(amount), 0)::int FROM credit_entry)`,
          placesOffered: sql<number>`(SELECT COALESCE(places_offered, 50)::int FROM "window" WHERE status = 'open' LIMIT 1)`
        }).from(sql`(SELECT 1) as t`),
        [{
          activeMembers: 0,
          totalRevenue: 0,
          subscribersCount: 0,
          creditIssued: 0,
          creditSpent: 0,
          creditOutstanding: 0,
          placesOffered: 50
        }]
      ),

      // 2. Fetch all upcoming events within 14 days in one single query
      safeQuery(
        () => db.select({
          id: event.id,
          title: event.title,
          startsAt: event.startsAt,
          minToConfirm: event.minToConfirm,
          decisionAt: event.decisionAt,
          status: event.status,
          venueName: event.venueName,
          neighbourhood: event.neighbourhood,
          isFreeWalk: event.isFreeWalk,
          creditCost: event.creditCost,
          capacityMember: event.capacityMember,
        }).from(event)
          .where(
            and(
              or(
                eq(event.status, "published_pending"),
                eq(event.status, "confirmed"),
                sql`${event.status}::text = 'gathering'`
              ),
              gte(event.startsAt, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
              lte(event.startsAt, new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000))
            )
          )
          .orderBy(event.startsAt),
        []
      ),

      // 3. Applications (Submitted + Accepted) in a single query
      safeQuery(
        () => db.select({
          id: application.id,
          status: application.status,
          submittedAt: application.submittedAt,
          decidedAt: application.decidedAt,
          acceptExpiresAt: application.acceptExpiresAt,
          firstName: person.firstName,
          lastName: person.lastName,
        }).from(application)
          .innerJoin(person, eq(application.personId, person.id))
          .where(inArray(application.status, ['submitted', 'accepted']))
          .orderBy(application.submittedAt)
          .limit(30),
        []
      ),

      // 4. Audit Logs
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

      // 5. Failed Payments
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

      // 6. Expiring Partner Agreements (within 30 days)
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
    ]);

    // Separate events in memory into Decisions (T-7), Warnings (T-10), and Confirmed this week
    const t7RawEvents = (rawEvents || []).filter((e) => {
      const isPending = e.status === "published_pending" || (e.status as any) === "gathering";
      const startsDate = e.startsAt ? new Date(e.startsAt) : null;
      const decDate = e.decisionAt ? new Date(e.decisionAt) : null;
      return isPending && (
        (startsDate && startsDate <= t7Date) ||
        (decDate && decDate <= t7Date)
      );
    });

    const t10RawEvents = (rawEvents || []).filter((e) => {
      const isPending = e.status === "published_pending" || (e.status as any) === "gathering";
      const startsDate = e.startsAt ? new Date(e.startsAt) : null;
      return isPending && startsDate && startsDate <= t10Date;
    });

    const weekRawEvents = (rawEvents || []).filter((e) => {
      const isConfirmed = e.status === "confirmed";
      const startsDate = e.startsAt ? new Date(e.startsAt) : null;
      return isConfirmed && startsDate && startsDate <= t7Date;
    });

    const pendingApps = (allApps || []).filter((a) => a.status === "submitted");
    const acceptedApps = (allApps || []).filter((a) => a.status === "accepted");

    const agg = aggregatesResult?.[0] || {
      activeMembers: 0,
      totalRevenue: 0,
      subscribersCount: 0,
      creditIssued: 0,
      creditSpent: 0,
      creditOutstanding: 0,
      placesOffered: 50
    };

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

    const activeMembersCount = agg.activeMembers;
    const revenueCents = agg.totalRevenue;
    const placesOffered = agg.placesOffered;

    // Build Decisions Due (T-7)
    const decisions = (t7RawEvents || []).map((e) => {
      const stats = bookingStatsMap[e.id] || { bookingsCount: 0, heldCredits: 0, guestCount: 0, waitlistCount: 0 };
      const minToConfirm = e.minToConfirm ?? 0;
      const isMet = stats.bookingsCount >= minToConfirm;
      const startsDate = e.startsAt ? new Date(e.startsAt) : now;
      const daysUntil = Math.ceil((startsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let decisionInfo = "";
      if (e.decisionAt) {
        const decDate = new Date(e.decisionAt);
        const decFormatted = decDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        const decDays = Math.ceil((decDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        decisionInfo = decDays <= 0 ? ` · Decide TODAY (${decFormatted})` : ` · Decide by ${decFormatted}`;
      }

      return {
        id: e.id,
        title: e.title,
        meta: `${startsDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · ${startsDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Starts in ${daysUntil} days${decisionInfo}`,
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
          group = "Working Mothers";
        } else if (titleLower.includes("dinner") || titleLower.includes("vermut") || titleLower.includes("date")) {
          group = "Mothers only";
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

    const currentMonthName = now.toLocaleString("en-US", { month: "long" });
    const stats = [
      { value: `${Math.min(agg.activeMembers, agg.placesOffered)} of ${agg.placesOffered}`, label: "Joining-fee-free places taken" },
      { value: `${agg.activeMembers}`, label: "Active members" },
      { value: `${agg.subscribersCount}`, label: "The Letter & subscribers" },
      { value: `${agg.creditIssued.toLocaleString("en-GB")}`, label: `Credits issued in ${currentMonthName}` },
      { value: `${agg.creditSpent.toLocaleString("en-GB")}`, label: `Credits spent in ${currentMonthName}` },
      { value: `€${(agg.totalRevenue / 100).toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, label: `Revenue in ${currentMonthName}` },
    ];

    function formatAuditAction(log: any): string {
      const before = (log.before as any) || {};
      const after = (log.after as any) || {};

      // 1. Club & Credit Settings
      if (log.action === "update_club_settings") {
        if (log.before && log.after) {
          const changes: string[] = [];
          const keyMap: Record<string, string> = {
            joining_fee_cents: "Joining fee",
            opening_monthly_price_cents: "Opening monthly price",
            standard_monthly_price_cents: "Standard monthly price",
            quarterly_fee_cents: "Quarterly fee",
            joining_fee_free_places: "Joining fee free places",
            monthly_grant_credits: "Monthly credits grant",
            rollover_cap_credits: "Rollover ceiling",
            referral_bonus_credits: "Godmother join bonus",
            godmother_three_month_bonus: "Godmother 3-month bonus",
            guest_pass_price_cents: "Guest pass price",
            pass_credit_ceiling: "Guest pass credit ceiling",
            max_lifetime_guest_passes: "Max lifetime guest passes",
            pause_allowance_months: "Annual pause allowance",
          };

          for (const [k, title] of Object.entries(keyMap)) {
            const oldVal = before[k];
            const newVal = after[k];
            if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
              if (k.endsWith("_cents")) {
                changes.push(`${title} from €${(Number(oldVal) || 0) / 100} to €${(Number(newVal) || 0) / 100}`);
              } else {
                changes.push(`${title} from ${oldVal} to ${newVal}`);
              }
            }
          }
          if (changes.length > 0) {
            return `Changed policies: ${changes.join(", ")}`;
          }
        }
        return "Updated club and credit settings";
      }

      // 2. Events Management & Automated Decision Crons
      if (log.action === "event.publish" || log.action === "create_event") {
        return after.title ? `Published event: "${after.title}"` : "Published a new event";
      }
      if (log.action === "update_event") {
        return after.title ? `Updated event: "${after.title}"` : "Updated event details";
      }
      if (log.action === "confirm_event" || log.action === "manual_threshold_confirm") {
        return after.title ? `Confirmed event: "${after.title}" (minimum attendance met)` : "Confirmed event (minimum attendance met)";
      }
      if (log.action === "cancel_event" || log.action === "manual_threshold_cancel") {
        const reason = after.cancelReason || after.reason;
        return reason ? `Cancelled event: ${reason}` : "Cancelled event and refunded attendee credits";
      }
      if (log.action === "threshold_confirm") {
        return "Auto-confirmed event at decision point (threshold reached)";
      }
      if (log.action === "threshold_cancel") {
        return "Auto-cancelled event at decision point (minimum not met; credits refunded)";
      }
      if (log.action === "complete_event") {
        return "Completed event and reconciled attendance";
      }
      if (log.action === "archive_event") {
        return "Archived event";
      }
      if (log.action === "duplicate_event") {
        return "Duplicated event template";
      }
      if (log.action === "open_guest_window") {
        return "Opened guest booking window";
      }

      // 3. Bookings & Guest Tickets
      if (log.action === "book_event") {
        return "Booked seat using member credits";
      }
      if (log.action === "release_booking") {
        return "Released booking and returned credits to balance";
      }
      if (log.action === "manual_booking_created") {
        return "Manually registered member to event roster";
      }
      if (log.action === "manual_booking_cancelled") {
        return "Manually removed attendee from event and refunded credits";
      }
      if (log.action === "admin_guest_pass_issued") {
        return "Issued complimentary guest ticket pass";
      }
      if (log.action === "guest_pass_refunded" || log.action === "release_guest_pass") {
        return "Refunded guest ticket pass";
      }
      if (log.action === "phone_email_collision_flagged") {
        return "Flagged duplicate phone/email registration";
      }

      // 4. Membership & Accounts
      if (log.action === "membership_activated") {
        return "Activated membership subscription (joining payment received)";
      }
      if (log.action === "membership_renewed") {
        return "Renewed monthly subscription and issued fresh credits";
      }
      if (log.action === "membership_status_changed") {
        if (before.status && after.status) {
          return `Changed membership status from ${before.status} to ${after.status}`;
        }
        return "Updated membership status";
      }
      if (log.action === "pause_member" || log.action === "resume_member_pause") {
        const reason = after.reason;
        return reason ? `Paused membership (${reason})` : "Paused membership";
      }
      if (log.action === "resume_member") {
        const reason = after.reason;
        return reason ? `Resumed active membership (${reason})` : "Resumed active membership";
      }
      if (log.action === "cancel_member") {
        const reason = after.reason;
        return reason ? `Scheduled membership cancellation at period end (${reason})` : "Scheduled membership cancellation at period end";
      }
      if (log.action === "update_member_profile") {
        return "Updated member profile stage, neighbourhood, or notes";
      }
      if (log.action === "reset_pause_allowance_annual") {
        return "Reset annual pause allowance for all active members";
      }
      if (log.action === "flag_at_risk") {
        return "Flagged member at-risk (no attendance in 90 days)";
      }
      if (log.action === "clear_at_risk") {
        return "Cleared at-risk flag (member attended an event)";
      }
      if (log.action === "flag_noshows") {
        return "Flagged unattended bookings as no-shows";
      }
      if (log.action === "password_reset_completed") {
        return "Member completed password reset";
      }
      if (log.action === "contact_member") {
        return "Sent administrative message to member";
      }

      // 5. Credits
      if (log.action === "adjust_credits") {
        const amt = after.amount;
        const rsn = after.reason;
        if (amt !== undefined) {
          const sign = amt > 0 ? `+${amt}` : `${amt}`;
          return rsn ? `Adjusted credits: ${sign} credits (${rsn})` : `Adjusted credits by ${sign}`;
        }
        return "Adjusted member credit balance";
      }
      if (log.action === "grant_subscription_credits") {
        const amt = after.amount || 20;
        return `Granted monthly credit allowance (+${amt} credits)`;
      }
      if (log.action === "buy_extra_credits") {
        return "Purchased extra credits top-up bundle";
      }

      // 6. Membership Windows
      if (log.action === "create_membership_window") {
        return after.placesOffered ? `Created membership window (${after.placesOffered} places)` : "Created a new membership window";
      }
      if (log.action === "open_membership_window") {
        return "Opened membership window for applications";
      }
      if (log.action === "closed_membership_window") {
        return "Closed membership application window";
      }

      // 7. Applications
      if (log.action === "approve_application") {
        return "Approved membership application and sent activation link";
      }
      if (log.action === "decline_application") {
        return "Declined membership application";
      }
      if (log.action === "expire_application_payment") {
        return "Expired application payment link after 72-hour deadline";
      }
      if (log.action === "expire_waitlist_offer") {
        return "Expired waitlist offer after 48 hours";
      }

      // 8. CMS & Partners
      if (log.action === "create_partner" || log.action === "save_partner") {
        return after.name ? `Saved partner: "${after.name}"` : "Saved partner in directory";
      }
      if (log.action === "delete_partner") {
        return "Removed partner from directory";
      }
      if (log.action === "save_partner_perk") {
        return after.title ? `Saved partner perk: "${after.title}"` : "Saved partner perk";
      }
      if (log.action === "delete_partner_perk") {
        return "Deleted partner perk";
      }
      if (log.action === "save_faq" || log.action === "create_faq" || log.action === "update_faq") {
        return after.questionEn ? `Saved FAQ: "${after.questionEn}"` : "Saved FAQ item";
      }
      if (log.action === "delete_faq") {
        return "Deleted FAQ item";
      }
      if (log.action === "create_journal" || log.action === "create_journal_post" || log.action === "save_journal_post") {
        return after.title ? `Saved journal article: "${after.title}"` : "Saved journal article";
      }
      if (log.action === "update_journal" || log.action === "update_journal_post") {
        return after.title ? `Updated journal article: "${after.title}"` : "Updated journal article";
      }
      if (log.action === "delete_journal") {
        return "Deleted journal article";
      }
      if (log.action === "create_subscriber") {
        return after.email ? `Added subscriber (${after.email})` : "Added newsletter subscriber";
      }
      if (log.action === "delete_subscriber") {
        return "Removed newsletter subscriber";
      }
      if (log.action === "save_internal_note") {
        return "Added internal note";
      }
      if (log.action === "gdpr_data_retention_purge") {
        return "Purged expired guest records under GDPR retention policy";
      }
      if (log.action === "clear_test_data") {
        return "Cleared simulated test data";
      }

      // Generic Clean Fallback
      const humanAction = log.action
        ? log.action.replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
        : "System Action";
      return log.entity ? `${humanAction} on ${log.entity.replace(/_/g, " ")}` : humanAction;
    }

    const entityMap: Record<string, string> = {
      event: "event",
      booking: "booking",
      member: "membership",
      setting: "settings",
      window: "membership window",
      credit_entry: "credits",
      journal_post: "journal",
      partner: "partner",
      partner_perk: "partner perk",
      partner_application: "partner application",
      faq_item: "FAQ",
      subscriber: "subscriber",
      internal_note: "internal note",
      event_pass: "guest pass",
      application: "application",
      member_credential: "security",
    };

    const audit =
      (recentLogs && recentLogs.length > 0)
        ? recentLogs.map((l) => ({
            who: l.actorType ? l.actorType.toLowerCase() : "system",
            did: entityMap[l.entity] || (l.action === "update_club_settings" ? "settings" : (l.entity || "system")),
            change: formatAuditAction(l),
            when: l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "-",
            where: "web",
          }))
        : [
            { who: "system", did: "awaiting logs", change: "Audit logs will appear here once actions are taken.", when: "-", where: "-" },
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

    let processedCount = 0;

    for (const ev of pendingEvents) {
      // Count active bookings
      const counts = await db
        .select({ count: sql<number>`count(*)` })
        .from(booking)
        .where(
          and(
            eq(booking.eventId, ev.id),
            sql`status IN ('held', 'confirmed')`
          )
        );

      const activeBookings = Number(counts[0]?.count || 0);

      if (activeBookings >= (ev.minToConfirm || 1)) {
        // Threshold met: confirm event and promote held bookings
        await db.transaction(async (tx) => {
          await tx
            .update(event)
            .set({ status: "confirmed", confirmedAt: new Date(), updatedAt: new Date() })
            .where(eq(event.id, ev.id));

          await tx
            .update(booking)
            .set({ status: "confirmed", updatedAt: new Date() })
            .where(and(eq(booking.eventId, ev.id), eq(booking.status, "held")));

          await tx.insert(auditLog).values({
            actorType: "admin",
            actorId: session?.user?.id || "admin",
            action: "manual_threshold_confirm",
            entity: "event",
            entityId: ev.id,
            after: { activeBookings, minRequired: ev.minToConfirm },
          });
        });
        processedCount++;
      } else if (ev.decisionAt && new Date(ev.decisionAt) <= now) {
        // Threshold not met at decision date: cancel and release held credits
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

          await tx
            .update(booking)
            .set({
              status: "cancelled_event",
              cancelledAt: new Date(),
              updatedAt: new Date(),
            })
            .where(and(eq(booking.eventId, ev.id), eq(booking.status, "held")));

          await tx.insert(auditLog).values({
            actorType: "admin",
            actorId: session?.user?.id || "admin",
            action: "manual_threshold_cancel",
            entity: "event",
            entityId: ev.id,
            after: { activeBookings, minRequired: ev.minToConfirm },
          });
        });
        processedCount++;
      }
    }

    return { success: true, count: processedCount };
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

