"use server";

import { db } from "@/db";
import {
  person,
  member,
  event,
  booking,
  hostRequest,
  circlePost,
  circleReport,
  subscriber,
  leadEntry,
  setting,
} from "@/db/schema";
import { eq, desc, asc, and, sql, or, lt, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getPreLaunchDeskData() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const isAdmin = ["owner", "manager", "host", "super_admin"].includes(role);

  if (!isAdmin) {
    return { success: false as const, error: "UNAUTHORIZED_ADMIN" };
  }

  try {
    const now = new Date();

    // 1. Fetch Stats & Aggregates
    const [
      accountsCountRow,
      pendingHostsCountRow,
      pastEventsToRunCountRow,
      openReportsCountRow,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(member)
        .innerJoin(person, eq(member.personId, person.id))
        .where(sql`${person.firstName} != 'Subscriber'`),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(hostRequest)
        .where(eq(hostRequest.status, "pending")),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(event)
        .where(and(lt(event.startsAt, now), or(eq(event.isRan, false), sql`${event.isRan} IS NULL`))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(circleReport)
        .where(sql`${circleReport.status} IN ('pending', 'open')`),
    ]);

    const stats = [
      {
        label: "Host requests to review",
        value: Number(pendingHostsCountRow[0]?.count || 0),
        color: Number(pendingHostsCountRow[0]?.count || 0) > 0 ? "#7a5612" : "#39292a",
      },
      {
        label: "Gazette reports open",
        value: Number(openReportsCountRow[0]?.count || 0),
        color: Number(openReportsCountRow[0]?.count || 0) > 0 ? "#993842" : "#39292a",
      },
      {
        label: "Past events to mark",
        value: Number(pastEventsToRunCountRow[0]?.count || 0),
        color: Number(pastEventsToRunCountRow[0]?.count || 0) > 0 ? "#7a5612" : "#39292a",
      },
      {
        label: "Accounts before launch",
        value: Number(accountsCountRow[0]?.count || 0),
        color: "#3b5e04",
      },
    ];

    // 2. Tab 1: Host Requests
    const hostRequestsRaw = await db
      .select({
        id: hostRequest.id,
        status: hostRequest.status,
        createdAt: hostRequest.createdAt,
        reviewedAt: hostRequest.reviewedAt,
        personId: hostRequest.personId,
        personName: sql<string>`concat(${person.firstName}, ' ', ${person.lastName})`,
        personEmail: person.email,
        eventId: hostRequest.eventId,
        eventTitle: event.title,
        eventStartsAt: event.startsAt,
        creditsAwarded: hostRequest.creditsAwarded,
      })
      .from(hostRequest)
      .innerJoin(person, eq(hostRequest.personId, person.id))
      .leftJoin(event, eq(hostRequest.eventId, event.id))
      .orderBy(desc(hostRequest.createdAt));

    const hostRequests = hostRequestsRaw.map((r) => ({
      id: r.id,
      status: r.status,
      name: r.personName || "Mother",
      email: r.personEmail || "",
      at: new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      event: r.eventTitle || "Event",
      eventId: r.eventId,
      when: r.eventStartsAt
        ? new Date(r.eventStartsAt).toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      creditsAwarded: r.creditsAwarded,
    }));

    // 3. Tab 2: Attendance & Past Events to Run
    const pastEvents = await db
      .select({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        neighbourhood: event.neighbourhood,
        isRan: event.isRan,
        ranAt: event.ranAt,
        hostPersonId: event.hostPersonId,
        hostName: sql<string>`(SELECT concat(first_name, ' ', last_name) FROM person WHERE id = ${event.hostPersonId})`,
      })
      .from(event)
      .where(lt(event.startsAt, now))
      .orderBy(desc(event.startsAt))
      .limit(30);

    const pastEventIds = pastEvents.map((e) => e.id);
    let eventBookings: any[] = [];
    if (pastEventIds.length > 0) {
      eventBookings = await db
        .select({
          id: booking.id,
          eventId: booking.eventId,
          personId: booking.personId,
          email: person.email,
          name: sql<string>`concat(${person.firstName}, ' ', ${person.lastName})`,
          status: booking.status,
          noShow: booking.noShow,
        })
        .from(booking)
        .innerJoin(person, eq(booking.personId, person.id))
        .where(
          and(
            inArray(booking.eventId, pastEventIds),
            sql`${booking.status} IN ('held', 'confirmed', 'attended')`
          )
        );
    }

    const attendanceEvents = pastEvents.map((e) => {
      const attendees = eventBookings.filter((b) => b.eventId === e.id);
      return {
        id: e.id,
        title: e.title,
        meta: `${new Date(e.startsAt).toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })} · ${e.neighbourhood || "Barcelona"} · ${attendees.length} booked`,
        isRan: !!e.isRan,
        ranAt: e.ranAt ? new Date(e.ranAt).toLocaleDateString("en-GB") : null,
        hostName: e.hostName || null,
        people: attendees.map((a) => ({
          bookingId: a.id,
          personId: a.personId,
          email: a.email,
          name: a.name,
          noShow: !!a.noShow,
        })),
      };
    });

    // 4. Tab 3: Circle Reports
    const circleReportsRaw = await db
      .select({
        id: circleReport.id,
        reason: circleReport.reason,
        details: circleReport.details,
        status: circleReport.status,
        createdAt: circleReport.createdAt,
        postId: circleReport.postId,
        postBody: circlePost.body,
        postStatus: circlePost.status,
        postAuthorName: sql<string>`concat(${person.firstName}, ' ', ${person.lastName})`,
        postAuthorEmail: person.email,
      })
      .from(circleReport)
      .leftJoin(circlePost, eq(circleReport.postId, circlePost.id))
      .leftJoin(person, eq(circlePost.personId, person.id))
      .orderBy(desc(circleReport.createdAt));

    const circleReports = circleReportsRaw.map((r) => ({
      id: r.id,
      postId: r.postId,
      reason: r.reason,
      status: r.status,
      body: r.postBody || "[Post removed]",
      postStatus: r.postStatus || "visible",
      author: r.postAuthorName || "Anonymous Mother",
      at: new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    }));

    // 5. Tab 4: Pre-launch Accounts & Waitlist
    const preLaunchAccountsRaw = await db
      .select({
        id: member.id,
        personId: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        phone: person.phoneE164,
        createdAt: person.createdAt,
        profileDone: person.profileDone,
        isSuspended: person.isSuspended,
        createdBeforeLaunch: person.createdBeforeLaunch,
      })
      .from(member)
      .innerJoin(person, eq(member.personId, person.id))
      .where(sql`${person.firstName} != 'Subscriber'`)
      .orderBy(desc(person.createdAt))
      .limit(100);

    const [subscribersRaw, leadsRaw] = await Promise.all([
      db
        .select({
          id: subscriber.id,
          email: subscriber.email,
          source: subscriber.source,
          createdAt: subscriber.createdAt,
        })
        .from(subscriber)
        .orderBy(desc(subscriber.createdAt))
        .limit(100),
      db
        .select({
          id: leadEntry.id,
          email: leadEntry.email,
          source: leadEntry.source,
          createdAt: leadEntry.createdAt,
        })
        .from(leadEntry)
        .orderBy(desc(leadEntry.createdAt))
        .limit(100),
    ]);

    // Merge and deduplicate waitlist leads
    const seenEmails = new Set<string>();
    const allLeads: Array<{ id: string; email: string; source: string; createdAt: Date }> = [];

    for (const s of [...subscribersRaw, ...leadsRaw]) {
      const lower = (s.email || "").toLowerCase().trim();
      if (lower && !seenEmails.has(lower)) {
        seenEmails.add(lower);
        allLeads.push({
          id: s.id,
          email: s.email,
          source: s.source || "The Letter",
          createdAt: s.createdAt,
        });
      }
    }

    // 6. Topics & Tags
    let topics = { pinned: "Winter walks", blocked: ["Selling", "Politics"] };
    try {
      const topicRow = await db.query.setting.findFirst({
        where: eq(setting.key, "gazette_topics"),
      });
      if (topicRow?.value) {
        topics = typeof topicRow.value === "string" ? JSON.parse(topicRow.value) : topicRow.value;
      }
    } catch {}

    return {
      success: true as const,
      stats,
      hostRequests,
      attendanceEvents,
      circleReports,
      topics,
      preLaunchAccounts: preLaunchAccountsRaw.map((a) => ({
        id: a.id,
        name: `${a.firstName} ${a.lastName}`.trim() || "Mother",
        email: a.email,
        phone: a.phone || "—",
        joinedAt: new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        profileDone: !!a.profileDone,
        isSuspended: !!a.isSuspended,
        createdBeforeLaunch: a.createdBeforeLaunch !== false,
      })),
      subscribers: allLeads.map((s) => ({
        id: s.id,
        email: s.email,
        source: s.source || "The Letter",
        createdAt: new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      })),
    };
  } catch (error: any) {
    console.error("getPreLaunchDeskData error:", error);
    return { success: false as const, error: error?.message || "Failed to fetch pre-launch data" };
  }
}

export async function saveGazetteTopics(data: { pinned: string; blocked: string[] }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const isAdmin = ["owner", "manager", "super_admin"].includes(role);
  if (!isAdmin) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  try {
    const existing = await db.query.setting.findFirst({
      where: eq(setting.key, "gazette_topics"),
    });

    if (existing) {
      await db
        .update(setting)
        .set({ value: data, updatedAt: new Date() })
        .where(eq(setting.key, "gazette_topics"));
    } else {
      await db.insert(setting).values({
        key: "gazette_topics",
        value: data,
      });
    }

    revalidatePath("/gazette");
    revalidatePath("/admin/pre-launch");
    revalidatePath("/admin/reports");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save topics" };
  }
}
