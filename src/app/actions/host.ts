"use server";

import { db } from "@/db";
import { hostRequest, person, booking, event, creditEntry, creditBatch, member } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { queueAndSendEmail, generateHostRequestStatusEmailHtml } from "@/lib/brevo";
import { getAppUrl } from "@/lib/urls";
import { revalidatePath } from "next/cache";

export async function checkHostEligibility() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      authenticated: false,
      eligible: false,
      reason: "login_required",
    };
  }

  const user = await db.query.person.findFirst({
    where: eq(person.id, session.user.id),
  });

  if (!user) {
    return { authenticated: false, eligible: false, reason: "user_not_found" };
  }

  // Count attended events (need >= 2 past completed/attended events)
  const attendedCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(booking)
    .innerJoin(event, eq(booking.eventId, event.id))
    .where(
      and(
        eq(booking.personId, user.id),
        sql`(${booking.status} = 'attended' OR (${booking.status} = 'confirmed' AND ${event.startsAt} < NOW()))`
      )
    );

  // Check no-shows in last 90 days
  const noShows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(booking)
    .where(
      and(
        eq(booking.personId, user.id),
        eq(booking.noShow, true),
        sql`${booking.createdAt} >= NOW() - INTERVAL '90 days'`
      )
    );

  const totalAttended = attendedCount[0]?.count || 0;
  const totalNoShows = noShows[0]?.count || 0;

  const meetsAttendance = totalAttended >= 2;
  const meetsNoShows = totalNoShows === 0;

  return {
    authenticated: true,
    eligible: meetsAttendance && meetsNoShows && !user.isPaused && !user.isSuspended,
    totalAttended,
    totalNoShows,
    isPaused: user.isPaused,
    isSuspended: user.isSuspended,
    user: {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
    },
  };
}

export async function getUpcomingEventsNeedingHost() {
  try {
    const session = await auth();
    const personId = session?.user?.id;

    const events = await db
      .select({
        id: event.id,
        title: event.title,
        startsAt: event.startsAt,
        neighbourhood: event.neighbourhood,
        venueName: event.venueName,
        languages: event.languages,
        creditCost: event.creditCost,
        needsHost: event.needsHost,
        hostPersonId: event.hostPersonId,
        status: event.status,
      })
      .from(event)
      .where(
        and(
          eq(event.needsHost, true),
          sql`${event.startsAt} > NOW()`,
          sql`${event.status} IN ('published_pending', 'confirmed')`
        )
      )
      .orderBy(sql`${event.startsAt} ASC`);

    let userBookings: string[] = [];
    let userHostRequests: { id: string; eventId: string; status: string }[] = [];

    if (personId) {
      const bRows = await db
        .select({ eventId: booking.eventId })
        .from(booking)
        .where(and(eq(booking.personId, personId), sql`${booking.status} IN ('held', 'confirmed')`));
      userBookings = bRows.map((b) => b.eventId);

      const rRows = await db
        .select({ id: hostRequest.id, eventId: hostRequest.eventId, status: hostRequest.status })
        .from(hostRequest)
        .where(eq(hostRequest.personId, personId));
      userHostRequests = rRows.filter((r): r is { id: string; eventId: string; status: string } => r.eventId !== null);
    }

    return { success: true, events, userBookings, userHostRequests };
  } catch (err: any) {
    return { success: false, events: [], userBookings: [], userHostRequests: [], error: err.message };
  }
}

export async function submitHostRequest(data: {
  format: string;
  neighbourhood: string;
  preferredDays: string;
  languages: string[];
  reason: string;
  charterAgreed: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to apply to become a host.");
  }

  if (!data.charterAgreed) {
    throw new Error("You must agree to the Host Charter to submit.");
  }

  if (!data.reason || data.reason.trim().length < 15) {
    throw new Error("Please tell us a bit more about why you would like to host (at least 15 characters).");
  }

  const user = await db.query.person.findFirst({
    where: eq(person.id, session.user.id),
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const [reqRecord] = await db
    .insert(hostRequest)
    .values({
      personId: session.user.id,
      format: data.format || "walk",
      neighbourhood: data.neighbourhood || "Barcelona",
      preferredDays: data.preferredDays || "Weekday mornings",
      languages: data.languages || ["English"],
      reason: data.reason.trim(),
      charterAgreed: true,
      status: "pending",
    })
    .returning();

  // Send Host Application Received Email
  const origin = getAppUrl();
  const isEs = user.locale === "es";
  const subject = isEs
    ? "Tu solicitud para ser anfitriona — The Mothers"
    : "Your host application with The Mothers";

  const htmlContent = generateHostRequestStatusEmailHtml({
    firstName: user.firstName || "Member",
    status: "received",
    appUrl: origin,
    isEs,
  });

  await queueAndSendEmail({
    personId: user.id,
    toEmail: user.email,
    toName: `${user.firstName} ${user.lastName}`,
    templateKey: "host_request_status",
    dedupeKey: `host_request_received_${reqRecord.id}`,
    subject,
    htmlContent,
    isTransactional: true,
  });

  return { success: true, hostRequestId: reqRecord.id };
}

export async function applyToHostEvent(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to request to host an event." };
  }

  const user = await db.query.person.findFirst({
    where: eq(person.id, session.user.id),
  });

  if (!user) {
    return { success: false, error: "User not found." };
  }

  if (user.isSuspended || user.isPaused) {
    return { success: false, error: "Your account is currently paused or suspended." };
  }

  const ev = await db.query.event.findFirst({
    where: eq(event.id, eventId),
  });

  if (!ev) {
    return { success: false, error: "Event not found." };
  }

  if (ev.status === "cancelled") {
    return { success: false, error: "This event has been cancelled." };
  }

  if (ev.partnerId) {
    return { success: false, error: "Partner events are hosted directly by our partners." };
  }

  if (ev.hostPersonId) {
    return { success: false, error: "This event already has a confirmed host." };
  }

  const userBooking = await db.query.booking.findFirst({
    where: and(
      eq(booking.eventId, eventId),
      eq(booking.personId, user.id),
      sql`${booking.status} IN ('held', 'confirmed')`
    ),
  });

  if (!userBooking) {
    return { success: false, error: "You must book this event before you can request to host it." };
  }

  const attendedRes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(booking)
    .innerJoin(event, eq(booking.eventId, event.id))
    .where(
      and(
        eq(booking.personId, user.id),
        sql`(${booking.status} = 'attended' OR (${booking.status} = 'confirmed' AND ${event.startsAt} < NOW()))`
      )
    );

  const noShowsRes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(booking)
    .where(
      and(
        eq(booking.personId, user.id),
        eq(booking.noShow, true),
        sql`${booking.createdAt} >= NOW() - INTERVAL '90 days'`
      )
    );

  const attended = attendedRes[0]?.count || 0;
  const noShows = noShowsRes[0]?.count || 0;

  if (attended < 2) {
    return { success: false, error: `You need to attend at least 2 events before hosting (attended: ${attended}).` };
  }

  if (noShows > 0) {
    return { success: false, error: "Hosting is paused for 90 days following a recorded no-show." };
  }

  const existingPending = await db.query.hostRequest.findFirst({
    where: and(
      eq(hostRequest.eventId, eventId),
      eq(hostRequest.status, "pending")
    ),
  });

  if (existingPending && existingPending.personId !== user.id) {
    return { success: false, error: "Another mother has already requested to host this event and is awaiting review." };
  }

  const [reqRecord] = await db
    .insert(hostRequest)
    .values({
      eventId,
      personId: user.id,
      format: ev.isFreeWalk ? "walk" : "event",
      neighbourhood: ev.neighbourhood,
      charterAgreed: true,
      status: "pending",
    })
    .returning();

  const origin = getAppUrl();
  const isEs = user.locale === "es";
  const subject = isEs
    ? `Hemos recibido tu solicitud para ser anfitriona — ${ev.title}`
    : `Host request received — ${ev.title}`;

  await queueAndSendEmail({
    personId: user.id,
    toEmail: user.email,
    toName: `${user.firstName} ${user.lastName}`,
    templateKey: "host_request_received",
    dedupeKey: `host_req_recv_${reqRecord.id}`,
    subject,
    htmlContent: generateHostRequestStatusEmailHtml({
      firstName: user.firstName || "Mother",
      status: "received",
      appUrl: origin,
      isEs,
    }),
    isTransactional: true,
  });

  revalidatePath("/account");
  revalidatePath("/events");
  revalidatePath("/host");
  revalidatePath("/admin/pre-launch");

  return { success: true, hostRequestId: reqRecord.id };
}

export async function withdrawHostRequest(requestId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized." };
  }

  const [reqRecord] = await db
    .delete(hostRequest)
    .where(and(eq(hostRequest.id, requestId), eq(hostRequest.personId, session.user.id)))
    .returning();

  if (!reqRecord) {
    return { success: false, error: "Request not found or not owned by you." };
  }

  revalidatePath("/account");
  revalidatePath("/events");
  revalidatePath("/host");
  revalidatePath("/admin/pre-launch");

  return { success: true };
}

export async function decideHostRequest(params: {
  requestId: string;
  decision: "accept" | "decline";
  adminNotes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Admin authorization required." };
  }

  const reqRecord = await db.query.hostRequest.findFirst({
    where: eq(hostRequest.id, params.requestId),
  });

  if (!reqRecord) {
    return { success: false, error: "Host request not found." };
  }

  const applicant = await db.query.person.findFirst({
    where: eq(person.id, reqRecord.personId),
  });

  const ev = reqRecord.eventId
    ? await db.query.event.findFirst({ where: eq(event.id, reqRecord.eventId) })
    : null;

  if (params.decision === "accept") {
    await db
      .update(hostRequest)
      .set({
        status: "confirmed",
        reviewedByAdminId: session.user.id,
        reviewedAt: new Date(),
        notes: params.adminNotes || null,
      })
      .where(eq(hostRequest.id, params.requestId));

    if (ev) {
      await db
        .update(event)
        .set({ hostPersonId: reqRecord.personId })
        .where(eq(event.id, ev.id));
    }

    if (applicant && ev) {
      const origin = getAppUrl();
      const isEs = applicant.locale === "es";
      await queueAndSendEmail({
        personId: applicant.id,
        toEmail: applicant.email,
        toName: `${applicant.firstName} ${applicant.lastName}`,
        templateKey: "host_request_accepted",
        dedupeKey: `host_accept_${reqRecord.id}`,
        subject: isEs
          ? `¡Confirmada como anfitriona! — ${ev.title}`
          : `You're hosting ${ev.title} — here's the meeting point`,
        htmlContent: generateHostRequestStatusEmailHtml({
          firstName: applicant.firstName || "Mother",
          status: "approved",
          appUrl: origin,
          isEs,
        }),
        isTransactional: true,
      });
    }
  } else {
    await db
      .update(hostRequest)
      .set({
        status: "declined",
        reviewedByAdminId: session.user.id,
        reviewedAt: new Date(),
        notes: params.adminNotes || null,
      })
      .where(eq(hostRequest.id, params.requestId));

    if (applicant && ev) {
      const origin = getAppUrl();
      const isEs = applicant.locale === "es";
      await queueAndSendEmail({
        personId: applicant.id,
        toEmail: applicant.email,
        toName: `${applicant.firstName} ${applicant.lastName}`,
        templateKey: "host_request_declined",
        dedupeKey: `host_decline_${reqRecord.id}`,
        subject: isEs
          ? `Actualización de anfitriona — ${ev.title}`
          : `Host request update — ${ev.title}`,
        htmlContent: generateHostRequestStatusEmailHtml({
          firstName: applicant.firstName || "Mother",
          status: "declined",
          appUrl: origin,
          isEs,
        }),
        isTransactional: true,
      });
    }
  }

  revalidatePath("/admin/pre-launch");
  revalidatePath("/account");
  revalidatePath("/events");

  return { success: true };
}

export async function markEventAsRun(params: {
  eventId: string;
  noShowPersonIds?: string[];
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Admin authorization required." };
  }

  const ev = await db.query.event.findFirst({
    where: eq(event.id, params.eventId),
  });

  if (!ev) {
    return { success: false, error: "Event not found." };
  }

  if (params.noShowPersonIds && params.noShowPersonIds.length > 0) {
    for (const pid of params.noShowPersonIds) {
      await db
        .update(booking)
        .set({ noShow: true, status: "no_show" })
        .where(and(eq(booking.eventId, params.eventId), eq(booking.personId, pid)));
    }
  }

  await db
    .update(booking)
    .set({ status: "attended", attendedAt: new Date() })
    .where(
      and(
        eq(booking.eventId, params.eventId),
        eq(booking.status, "confirmed"),
        eq(booking.noShow, false)
      )
    );

  await db
    .update(event)
    .set({ isRan: true, ranAt: new Date(), status: "completed" })
    .where(eq(event.id, params.eventId));

  if (ev.hostPersonId) {
    const hostPerson = await db.query.person.findFirst({
      where: eq(person.id, ev.hostPersonId),
    });

    if (hostPerson) {
      const halfTicketCredits = Math.floor((ev.creditCost || 0) * 0.5);
      const totalCreditsAwarded = 2 + halfTicketCredits;
      const sixMonthsExpiry = new Date();
      sixMonthsExpiry.setMonth(sixMonthsExpiry.getMonth() + 6);

      await db.insert(creditBatch).values({
        personId: hostPerson.id,
        amount: totalCreditsAwarded,
        remaining: totalCreditsAwarded,
        source: "hosting",
        expiresAt: sixMonthsExpiry,
      });

      await db
        .update(hostRequest)
        .set({ creditsAwarded: totalCreditsAwarded })
        .where(and(eq(hostRequest.eventId, params.eventId), eq(hostRequest.personId, hostPerson.id)));

      const origin = getAppUrl();
      const isEs = hostPerson.locale === "es";
      await queueAndSendEmail({
        personId: hostPerson.id,
        toEmail: hostPerson.email,
        toName: `${hostPerson.firstName} ${hostPerson.lastName}`,
        templateKey: "host_thank_you",
        dedupeKey: `host_ty_${params.eventId}_${hostPerson.id}`,
        subject: isEs
          ? `¡Gracias por ser anfitriona! — +${totalCreditsAwarded} créditos añadidos`
          : `Thanks for hosting — +${totalCreditsAwarded} credits added`,
        htmlContent: `<p>Thank you for hosting ${ev.title}. We've credited ${totalCreditsAwarded} credits to your wallet.</p>`,
        isTransactional: true,
      });
    }
  }

  revalidatePath("/admin/pre-launch");
  revalidatePath("/admin/events");
  revalidatePath("/account");

  return { success: true };
}

export async function updateAdminHostRequestStatus(params: {
  requestId: string;
  status: "submitted" | "call_scheduled" | "approved" | "declined";
  notes?: string;
  callDateFormatted?: string;
}) {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== "admin") {
    throw new Error("Admin authorization required.");
  }

  const [reqRecord] = await db
    .update(hostRequest)
    .set({
      status: params.status,
      notes: params.notes || null,
      reviewedAt: new Date(),
      reviewedByAdminId: session.user.id,
    })
    .where(eq(hostRequest.id, params.requestId))
    .returning();

  if (!reqRecord) {
    throw new Error("Host request not found.");
  }

  const applicant = await db.query.person.findFirst({
    where: eq(person.id, reqRecord.personId),
  });

  if (applicant) {
    const origin = getAppUrl();
    const isEs = applicant.locale === "es";
    const statusKey =
      params.status === "call_scheduled"
        ? "call_scheduled"
        : params.status === "approved"
        ? "approved"
        : params.status === "declined"
        ? "declined"
        : "received";

    const subject = isEs
      ? `Actualización de solicitud de anfitriona — The Mothers`
      : `Your host application with The Mothers — Update`;

    const htmlContent = generateHostRequestStatusEmailHtml({
      firstName: applicant.firstName || "Member",
      status: statusKey,
      callDateFormatted: params.callDateFormatted,
      notes: params.notes,
      appUrl: origin,
      isEs,
    });

    await queueAndSendEmail({
      personId: applicant.id,
      toEmail: applicant.email,
      toName: `${applicant.firstName} ${applicant.lastName}`,
      templateKey: "host_request_status",
      dedupeKey: `host_status_${reqRecord.id}_${params.status}_${Date.now().toString().slice(0, 7)}`,
      subject,
      htmlContent,
      isTransactional: true,
    });
  }

  revalidatePath("/admin/hosts");
  return { success: true };
}
