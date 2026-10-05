"use server";

import { db } from "@/db";
import { hostRequest, person, booking, event, creditBatch, member, auditLog, adminUser } from "@/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { queueAndSendEmail, generateHostRequestStatusEmailHtml } from "@/lib/brevo";
import { getAppUrl } from "@/lib/urls";
import { revalidatePath } from "next/cache";
import { grantCreditsToPerson, getPersonWalletBalance } from "@/lib/ledger";
import { sanitizeErrorMessage } from "@/lib/errors";

// Helper for admin role check
async function assertAdminOrManager(session: any): Promise<string> {
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  const adminId = session.user.id as string;
  const role = (session.user as any).role;
  if (role === "admin" || role === "owner" || role === "manager") {
    return adminId;
  }
  // Also check adminUser table
  const adminRec = await db.query.adminUser.findFirst({
    where: eq(adminUser.id, adminId),
  });
  if (adminRec && (adminRec.role === "owner" || adminRec.role === "manager")) {
    return adminId;
  }
  throw new Error("FORBIDDEN_ADMIN_ONLY");
}

export async function checkHostEligibility() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      authenticated: false,
      eligible: false,
      reason: "login_required",
    };
  }

  const personId = (session.user as any).personId || session.user.id;
  const user = await db.query.person.findFirst({
    where: eq(person.id, personId),
  });

  if (!user) {
    return { authenticated: false, eligible: false, reason: "user_not_found" };
  }

  // Count attended events (need >= 2 attended events, or >= 3 if late host cancellation penalty active)
  const penaltyActive = Boolean(user.lateHostCancelledAt && (user.lateHostCancellations || 0) > 0);
  const attendanceCondition = penaltyActive
    ? and(
        eq(booking.personId, user.id),
        eq(booking.status, "attended"),
        eq(booking.noShow, false),
        sql`${booking.attendedAt} > ${user.lateHostCancelledAt}`
      )
    : and(
        eq(booking.personId, user.id),
        eq(booking.status, "attended"),
        eq(booking.noShow, false)
      );

  const attendedCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(booking)
    .innerJoin(event, eq(booking.eventId, event.id))
    .where(attendanceCondition);

  // Check no-shows in last 90 days from EVENT date
  const noShows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(booking)
    .innerJoin(event, eq(booking.eventId, event.id))
    .where(
      and(
        eq(booking.personId, user.id),
        eq(booking.noShow, true),
        sql`${event.startsAt} >= NOW() - INTERVAL '90 days'`
      )
    );

  const totalAttended = attendedCount[0]?.count || 0;
  const totalNoShows = noShows[0]?.count || 0;

  // Late host cancellation penalty check (§H-02): cannot host until attended 3 events after penalty
  const requiredAttended = penaltyActive ? 3 : 2;

  const meetsAttendance = totalAttended >= requiredAttended;
  const meetsNoShows = totalNoShows === 0;

  return {
    authenticated: true,
    eligible: meetsAttendance && meetsNoShows && !user.isPaused && !user.isSuspended,
    totalAttended,
    totalNoShows,
    hasLateHostPenalty: penaltyActive,
    requiredAttended,
    isPaused: user.isPaused,
    isSuspended: user.isSuspended,
    user: {
      id: user.id,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Member",
      email: user.email,
    },
  };
}

export async function getUpcomingEventsNeedingHost() {
  try {
    const session = await auth();
    const personId = session?.user?.id ? ((session.user as any).personId || session.user.id) : null;

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
    console.error("getHostEvents error:", err);
    return { success: false, events: [], userBookings: [], userHostRequests: [], error: sanitizeErrorMessage(err, "Failed to load host events") };
  }
}

export async function applyToHostEvent(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to request to host an event." };
  }

  const personId = (session.user as any).personId || session.user.id;
  const user = await db.query.person.findFirst({
    where: eq(person.id, personId),
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

  if (!ev.needsHost) {
    return { success: false, error: "This event does not need a host." };
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

  // Check eligibility using checkHostEligibility (F-11)
  const elig = await checkHostEligibility();
  if (!elig.eligible) {
    return {
      success: false,
      error: elig.hasLateHostPenalty
        ? `You must attend at least 3 events after your late cancellation before hosting again (attended: ${elig.totalAttended}/3).`
        : `You need to attend at least ${elig.requiredAttended} events before hosting (attended: ${elig.totalAttended}).`,
    };
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
      format: "event",
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

  const { renderPublicEmailTemplate } = await import("@/lib/brevo");
  const htmlContent = renderPublicEmailTemplate("Email - Host Request Received.html", {
    first_name: user.firstName || "Mother",
    event_title: ev.title,
    event_url: `${origin}/events/${ev.id}`,
  }) || generateHostRequestStatusEmailHtml({
    firstName: user.firstName || "Mother",
    status: "received",
    appUrl: origin,
    isEs,
  });

  await queueAndSendEmail({
    personId: user.id,
    toEmail: user.email,
    toName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Member",
    templateKey: "host_request_received",
    dedupeKey: `host_req_recv_${reqRecord.id}`,
    subject,
    htmlContent,
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

  const personId = (session.user as any).personId || session.user.id;

  const [reqRecord] = await db
    .delete(hostRequest)
    .where(and(eq(hostRequest.id, requestId), eq(hostRequest.personId, personId)))
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
  const adminId = await assertAdminOrManager(session);

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

  const { renderPublicEmailTemplate } = await import("@/lib/brevo");

  if (params.decision === "accept") {
    await db
      .update(hostRequest)
      .set({
        status: "confirmed",
        reviewedByAdminId: adminId,
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

      // Fetch confirmed attendee names for roster
      const attendeeBookings = await db
        .select({
          firstName: person.firstName,
          lastName: person.lastName,
        })
        .from(booking)
        .innerJoin(person, eq(booking.personId, person.id))
        .where(
          and(
            eq(booking.eventId, ev.id),
            sql`${booking.status} IN ('held', 'confirmed')`
          )
        );

      const attendeeNames = attendeeBookings
        .map((a) => (a.firstName ? `${a.firstName} ${a.lastName ? a.lastName[0] + "." : ""}`.trim() : "Member"))
        .join(", ") || "Attendees will appear as they book";

      const eventDate = new Date(ev.startsAt).toLocaleDateString(isEs ? "es-ES" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const eventTime = new Date(ev.startsAt).toLocaleTimeString(isEs ? "es-ES" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const htmlContent = renderPublicEmailTemplate("Email - Host Request Accepted.html", {
        first_name: applicant.firstName || "Mother",
        event_title: ev.title,
        event_date: eventDate,
        event_time: eventTime,
        meeting_point: ev.meetingPoint || ev.venueName || "Barcelona",
        attendee_names: attendeeNames,
        event_url: `${origin}/events/${ev.id}`,
      }) || generateHostRequestStatusEmailHtml({
        firstName: applicant.firstName || "Mother",
        status: "approved",
        appUrl: origin,
        isEs,
      });

      await queueAndSendEmail({
        personId: applicant.id,
        toEmail: applicant.email,
        toName: `${applicant.firstName || ""} ${applicant.lastName || ""}`.trim() || "Member",
        templateKey: "host_request_accepted",
        dedupeKey: `host_accept_${reqRecord.id}`,
        subject: isEs
          ? `¡Confirmada como anfitriona! — ${ev.title}`
          : `You're hosting ${ev.title} — here's the meeting point`,
        htmlContent,
        isTransactional: true,
      });
    }

    await db.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "host_request_approved",
      entity: "host_request",
      entityId: reqRecord.id,
      after: { eventId: ev?.id, personId: applicant?.id },
    });
  } else {
    await db
      .update(hostRequest)
      .set({
        status: "declined",
        reviewedByAdminId: adminId,
        reviewedAt: new Date(),
        notes: params.adminNotes || null,
      })
      .where(eq(hostRequest.id, params.requestId));

    if (applicant && ev) {
      const origin = getAppUrl();
      const isEs = applicant.locale === "es";

      const htmlContent = renderPublicEmailTemplate("Email - Host Request Declined.html", {
        first_name: applicant.firstName || "Mother",
        event_title: ev.title,
      }) || generateHostRequestStatusEmailHtml({
        firstName: applicant.firstName || "Mother",
        status: "declined",
        appUrl: origin,
        isEs,
      });

      await queueAndSendEmail({
        personId: applicant.id,
        toEmail: applicant.email,
        toName: `${applicant.firstName || ""} ${applicant.lastName || ""}`.trim() || "Member",
        templateKey: "host_request_declined",
        dedupeKey: `host_decline_${reqRecord.id}`,
        subject: isEs
          ? `Actualización de anfitriona — ${ev.title}`
          : `Host request update — ${ev.title}`,
        htmlContent,
        isTransactional: true,
      });
    }

    await db.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "host_request_declined",
      entity: "host_request",
      entityId: reqRecord.id,
      after: { eventId: ev?.id, personId: applicant?.id },
    });
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
  const adminId = await assertAdminOrManager(session);

  let totalCreditsAwarded = 0;
  let hostPersonRecord: any = null;
  let halfTicketCredits = 0;
  let eventRecord: any = null;
  let attendedAttendees: Array<{
    bookingId: string;
    personId: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    locale: string | null;
  }> = [];

  const txResult = await db.transaction(async (tx) => {
    // Select event with FOR UPDATE inside transaction to eliminate race conditions (F-14)
    const evRows = await tx.execute(
      sql`SELECT id, title, starts_at AS "startsAt", ends_at AS "endsAt", host_person_id AS "hostPersonId", is_ran AS "isRan", status FROM "event" WHERE id = ${params.eventId} FOR UPDATE`
    );
    const ev = ((evRows as any)?.[0] ?? (evRows as any)?.rows?.[0]) as any;

    if (!ev) {
      return { success: false, error: "Event not found." };
    }

    // Prevent duplicate execution (F-14)
    if (ev.isRan || ev.is_ran) {
      return { success: false, error: "This event has already been marked as run." };
    }

    eventRecord = ev;

    if (params.noShowPersonIds && params.noShowPersonIds.length > 0) {
      for (const pid of params.noShowPersonIds) {
        await tx
          .update(booking)
          .set({ noShow: true, status: "no_show" })
          .where(and(eq(booking.eventId, params.eventId), eq(booking.personId, pid)));
      }
    }

    await tx
      .update(booking)
      .set({ status: "attended", attendedAt: new Date() })
      .where(
        and(
          eq(booking.eventId, params.eventId),
          eq(booking.status, "confirmed"),
          eq(booking.noShow, false)
        )
      );

    await tx
      .update(event)
      .set({ isRan: true, ranAt: new Date(), status: "completed" })
      .where(eq(event.id, params.eventId));

    // Fetch confirmed attendees who attended (F-25)
    attendedAttendees = await tx
      .select({
        bookingId: booking.id,
        personId: booking.personId,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        locale: person.locale,
      })
      .from(booking)
      .innerJoin(person, eq(booking.personId, person.id))
      .where(
        and(
          eq(booking.eventId, params.eventId),
          eq(booking.status, "attended"),
          eq(booking.noShow, false)
        )
      );

    // Host reward (§H-05 / F-14): +2 credits + 50% of credits charged to host for their ticket
    if (ev.hostPersonId) {
      const hostPerson = await tx.query.person.findFirst({
        where: eq(person.id, ev.hostPersonId),
      });

      if (hostPerson) {
        hostPersonRecord = hostPerson;
        const hostBooking = await tx.query.booking.findFirst({
          where: and(
            eq(booking.eventId, ev.id),
            eq(booking.personId, hostPerson.id)
          ),
        });

        const creditsCharged = hostBooking?.creditsCharged || 0;
        halfTicketCredits = Math.floor(creditsCharged * 0.5);
        totalCreditsAwarded = 2 + halfTicketCredits;

        await grantCreditsToPerson(hostPerson.id, totalCreditsAwarded, "host_reward", null, tx);

        await tx
          .update(hostRequest)
          .set({ creditsAwarded: totalCreditsAwarded })
          .where(and(eq(hostRequest.eventId, params.eventId), eq(hostRequest.personId, hostPerson.id)));
      }
    }

    return { success: true };
  });

  if (!txResult.success) {
    return txResult;
  }

  // Send Host thank-you email
  if (hostPersonRecord && totalCreditsAwarded > 0) {
    const newBalance = await getPersonWalletBalance(hostPersonRecord.id);
    const origin = getAppUrl();
    const isEs = hostPersonRecord.locale === "es";

    const { renderPublicEmailTemplate } = await import("@/lib/brevo");
    const htmlContent = renderPublicEmailTemplate("Email - Host Thank You.html", {
      first_name: hostPersonRecord.firstName || "Mother",
      event_title: eventRecord.title,
      half_credits: halfTicketCredits,
      balance: newBalance,
      host_url: `${origin}/host`,
    }) || `<p>Thank you for hosting ${eventRecord.title}. We've credited ${totalCreditsAwarded} credits to your wallet.</p>`;

    await queueAndSendEmail({
      personId: hostPersonRecord.id,
      toEmail: hostPersonRecord.email,
      toName: `${hostPersonRecord.firstName || ""} ${hostPersonRecord.lastName || ""}`.trim() || "Host",
      templateKey: "host_thank_you",
      dedupeKey: `host_ty_${params.eventId}_${hostPersonRecord.id}`,
      subject: isEs
        ? `¡Gracias por ser anfitriona! — +${totalCreditsAwarded} créditos añadidos`
        : `Thanks for hosting — +${totalCreditsAwarded} credits added`,
      htmlContent,
      isTransactional: true,
    });
  }

  // Send "After Your Event" follow-up email to verified attendees (F-25)
  for (const attendee of attendedAttendees) {
    const isEs = attendee.locale === "es";
    const subject = isEs
      ? `Gracias por asistir: ${eventRecord.title} — The Mothers`
      : `Thank you for attending: ${eventRecord.title} — The Mothers`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="${isEs ? "es" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Mothers</title>
<style>
@media only screen and (max-width:620px){
  .px{padding-left:24px !important;padding-right:24px !important;}
  .h1{font-size:28px !important;line-height:34px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#efeae1;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efeae1;">
<tr>
<td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;">
<tr>
<td class="px" align="center" style="padding:34px 48px 26px;border-bottom:1px solid #ddd4c6;">
<div style="font-size:15px;line-height:20px;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;">The Mothers</div>
<div style="font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:7px;">Barcelona</div>
</td>
</tr>
<tr>
<td class="px" style="padding:38px 48px 0;">
<h1 class="h1" style="margin:0;font-size:32px;line-height:40px;font-weight:normal;color:#2A1E20;">${isEs ? "Fue un placer tenerte." : "It was good to have you."}</h1>
</td>
</tr>
<tr>
<td class="px" style="padding:22px 48px 0;font-size:16px;line-height:27px;color:#2A1E20;">
<p style="margin:0 0 16px;"><span style="color:#7b1f2c;">${attendee.firstName || (isEs ? "Amiga" : "Friend")}</span>,</p>
<p style="margin:0 0 16px;">${isEs ? `Gracias por venir a <span style="color:#7b1f2c;">${eventRecord.title}</span>. Esperamos que hayas disfrutado del encuentro.` : `Thank you for coming to <span style="color:#7b1f2c;">${eventRecord.title}</span>. I hope you left with at least one number in your phone — that is the only measure of these gatherings that matters to us.`}</p>
<p style="margin:0;">${isEs ? "Descubre los próximos encuentros en nuestro calendario o únete a la comunidad." : "If you want to keep going, explore what is coming up next on our calendar, or join our community."}</p>
</td>
</tr>
<tr>
<td class="px" style="padding:28px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #ddd4c6;background-color:#f3efe6;">
<tr>
<td style="padding:20px 24px 8px;font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;">${isEs ? "Próximos eventos" : "Next, near you"}</td>
</tr>
<tr>
<td style="padding:0 24px 20px;font-size:15px;line-height:24px;color:#2A1E20;">
<div style="padding:10px 0;border-top:1px solid #ddd4c6;">
<a href="${getAppUrl()}/events" style="color:#2A1E20;text-decoration:none;font-weight:bold;">${isEs ? "Ver todos los encuentros" : "See all upcoming gatherings"}</a><br>
<span style="color:#8a807a;font-size:14px;">Barcelona · The Mothers</span>
</div>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td class="px" style="padding:26px 48px 0;font-size:15px;line-height:25px;color:#2A1E20;">
<p style="margin:0;">${isEs ? "Con cariño," : "Warmly,"}<br><span style="color:#7b1f2c;">The Mothers Team</span><br><span style="color:#8a807a;font-size:14px;">The Mothers Barcelona</span></p>
</td>
</tr>
<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
<div style="font-size:12px;line-height:20px;color:#8a807a;padding-top:20px;">
The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
<a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a> &nbsp;·&nbsp; <a href="https://themothers.cc" style="color:#7b1f2c;text-decoration:underline;">themothers.cc</a>
</div>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
    `;

    await queueAndSendEmail({
      personId: attendee.personId,
      toEmail: attendee.email,
      toName: `${attendee.firstName || ""} ${attendee.lastName || ""}`.trim() || "Member",
      templateKey: "after_first_event",
      dedupeKey: `after_event_${params.eventId}_${attendee.personId}`,
      subject,
      htmlContent,
      isTransactional: true,
    });
  }

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "event_marked_ran",
    entity: "event",
    entityId: eventRecord.id,
    after: { noShowCount: params.noShowPersonIds?.length || 0, attendedCount: attendedAttendees.length },
  });

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
  const adminId = await assertAdminOrManager(session);

  const [reqRecord] = await db
    .update(hostRequest)
    .set({
      status: params.status,
      notes: params.notes || null,
      reviewedAt: new Date(),
      reviewedByAdminId: adminId,
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
      toName: `${applicant.firstName || ""} ${applicant.lastName || ""}`.trim() || "Member",
      templateKey: "host_request_status",
      dedupeKey: `host_status_${reqRecord.id}_${params.status}_${Date.now().toString().slice(0, 7)}`,
      subject,
      htmlContent,
      isTransactional: true,
    });
  }

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "host_application_status_updated",
    entity: "host_request",
    entityId: reqRecord.id,
    after: { status: params.status },
  });

  revalidatePath("/admin/hosts");
  return { success: true };
}

export async function recordLateHostCancellation(personId: string, eventId: string) {
  const session = await auth();
  const adminId = await assertAdminOrManager(session);

  await db
    .update(person)
    .set({
      lateHostCancellations: sql`COALESCE(${person.lateHostCancellations}, 0) + 1`,
      lateHostCancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(person.id, personId));

  await db
    .update(event)
    .set({
      hostPersonId: null,
      needsHost: true,
      updatedAt: new Date(),
    })
    .where(eq(event.id, eventId));

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "record_late_host_cancellation",
    entity: "person",
    entityId: personId,
    after: { eventId, lateHostCancelledAt: new Date() },
  });

  revalidatePath("/admin/events");
  revalidatePath("/admin/hosts");
  return { success: true };
}
