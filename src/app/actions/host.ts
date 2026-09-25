"use server";

import { db } from "@/db";
import { hostRequest, person, booking, creditEntry, creditBatch, member } from "@/db/schema";
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

  // Count attended events (need >= 2)
  const attendedCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(booking)
    .where(
      and(
        eq(booking.personId, user.id),
        sql`${booking.status} IN ('attended', 'confirmed')`
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
    eligible: meetsAttendance && meetsNoShows && !user.isPaused,
    totalAttended,
    totalNoShows,
    isPaused: user.isPaused,
    user: {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
    },
  };
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
      status: "submitted",
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
