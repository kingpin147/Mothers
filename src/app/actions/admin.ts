"use server";

import { db } from "@/db";
import { application, person, member, window, adminUser, auditLog, creditEntry } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { queueAndSendEmail } from "@/lib/brevo";
import crypto from "crypto";

// List applications for admin review queue
export async function getApplicationsForAdmin(statusFilter?: "submitted" | "accepted" | "declined" | "all") {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "owner" && role !== "manager" && role !== "host")) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const query = db
    .select({
      id: application.id,
      windowId: application.windowId,
      personId: application.personId,
      status: application.status,
      answers: application.answers,
      submittedAt: application.submittedAt,
      decidedAt: application.decidedAt,
      declineReasonCode: application.declineReasonCode,
      acceptExpiresAt: application.acceptExpiresAt,
      paymentLinkToken: application.paymentLinkToken,
      personName: person.firstName,
      personLastName: person.lastName,
      personEmail: person.email,
      personLocale: person.locale,
    })
    .from(application)
    .innerJoin(person, eq(application.personId, person.id))
    .orderBy(desc(application.submittedAt));

  const allApps = await query;
  if (!statusFilter || statusFilter === "all") {
    return { success: true, applications: allApps };
  }
  return { success: true, applications: allApps.filter((a) => a.status === statusFilter) };
}

// Accept an application: Generates 72-hour signed payment link and sends Email - Accepted.html (§19, §20.1)
export async function acceptApplication(applicationId: string) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;

  if (!role || (role !== "owner" && role !== "manager")) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  const appRecord = await db.query.application.findFirst({
    where: eq(application.id, applicationId),
  });

  if (!appRecord || appRecord.status !== "submitted") {
    return { success: false, error: "APPLICATION_NOT_ELIGIBLE_FOR_ACCEPTANCE" };
  }

  const personRecord = await db.query.person.findFirst({
    where: eq(person.id, appRecord.personId),
  });

  if (!personRecord) {
    return { success: false, error: "PERSON_NOT_FOUND" };
  }

  // 72-hour countdown
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
  const paymentLinkToken = crypto.randomBytes(24).toString("hex");

  // Update application
  await db
    .update(application)
    .set({
      status: "accepted",
      decidedAt: new Date(),
      decidedByAdminId: adminId,
      acceptExpiresAt: expiresAt,
      paymentLinkToken,
      updatedAt: new Date(),
    })
    .where(eq(application.id, applicationId));

  // Update or create member record with status 'accepted_awaiting_payment'
  const existingMember = await db.query.member.findFirst({
    where: eq(member.personId, personRecord.id),
  });

  const answers = (appRecord.answers as any) || {};

  if (!existingMember) {
    await db.insert(member).values({
      personId: personRecord.id,
      status: "accepted_awaiting_payment",
      stage: answers.stage || "Pregnancy & Postpartum",
      neighbourhood: answers.neighbourhood || "Barcelona",
      monthlyPriceCents: 2900,
    });
  } else {
    await db
      .update(member)
      .set({
        status: "accepted_awaiting_payment",
        stage: answers.stage || existingMember.stage,
        neighbourhood: answers.neighbourhood || existingMember.neighbourhood,
        updatedAt: new Date(),
      })
      .where(eq(member.id, existingMember.id));
  }

  // Write audit log
  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "accept_application",
    entity: "application",
    entityId: applicationId,
    before: { status: "submitted" },
    after: { status: "accepted", acceptExpiresAt: expiresAt.toISOString() },
  });

  // Send Email - Accepted.html
  const activationUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/membership/activate/${paymentLinkToken}`;
  const subject =
    personRecord.locale === "es"
      ? "Tu plaza en The Mothers está lista — Enlace de activación (72h)"
      : "Your spot at The Mothers is ready — 72-hour Activation Link";

  const htmlContent = `
    <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; margin: 0 0 16px;">
        ${personRecord.locale === "es" ? "Bienvenida a The Mothers" : "Welcome to The Mothers"}
      </h2>
      <p style="font-size: 15px; line-height: 1.6;">
        ${
          personRecord.locale === "es"
            ? `Hola ${personRecord.firstName}, nos alegra confirmarte que tu solicitud ha sido aceptada. Tienes 72 horas para completar tu activación y asegurar tu cuota fundadora de 29€/mes (bloqueada durante un año completo).`
            : `Hi ${personRecord.firstName}, we are delighted to accept your application. You have 72 hours to complete your activation and secure your founding rate of €29/month (locked for a full year).`
        }
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${activationUrl}" style="background-color: #7b1f2c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 16px; display: inline-block;">
          ${personRecord.locale === "es" ? "Completar mi Membresía (72h)" : "Complete My Membership (72h)"}
        </a>
      </div>
      <p style="font-size: 13px; color: rgba(57,41,42,0.6); line-height: 1.5; border-top: 1px solid rgba(57,41,42,0.16); padding-top: 16px;">
        ${personRecord.locale === "es" ? "Este enlace expira en 72 horas. Si no se completa, la plaza pasa automáticamente a la lista de espera." : "This link expires in 72 hours. If uncompleted, the spot passes down to the waitlist."}
      </p>
    </div>
  `;

  await queueAndSendEmail({
    personId: personRecord.id,
    toEmail: personRecord.email,
    toName: `${personRecord.firstName} ${personRecord.lastName}`,
    templateKey: "application_accepted",
    dedupeKey: `app_accepted_${applicationId}`,
    subject,
    htmlContent,
    isTransactional: true,
  });

  return { success: true, paymentLinkToken, expiresAt };
}

// Decline an application (§4.2, §19)
export async function declineApplication(applicationId: string, reasonCode?: string, declineNote?: string) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;

  if (!role || (role !== "owner" && role !== "manager")) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  const appRecord = await db.query.application.findFirst({
    where: eq(application.id, applicationId),
  });

  if (!appRecord) {
    return { success: false, error: "APPLICATION_NOT_FOUND" };
  }

  const personRecord = await db.query.person.findFirst({
    where: eq(person.id, appRecord.personId),
  });

  if (!personRecord) {
    return { success: false, error: "PERSON_NOT_FOUND" };
  }

  await db
    .update(application)
    .set({
      status: "declined",
      decidedAt: new Date(),
      decidedByAdminId: adminId,
      declineReasonCode: reasonCode || "CAPACITY_REACHED",
      declineNote: declineNote || null,
      updatedAt: new Date(),
    })
    .where(eq(application.id, applicationId));

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "decline_application",
    entity: "application",
    entityId: applicationId,
    before: { status: appRecord.status },
    after: { status: "declined", reasonCode },
  });

  // Send polite Application Not Accepted email with waitlist offer (§4.2)
  const subject =
    personRecord.locale === "es"
      ? "Tu solicitud en The Mothers"
      : "Your application at The Mothers";

  const htmlContent = `
    <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px;">
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 24px;">
        The Mothers
      </h2>
      <p style="font-size: 15px; line-height: 1.6;">
        ${
          personRecord.locale === "es"
            ? `Hola ${personRecord.firstName}, gracias por tu interés en The Mothers. En esta Ventana hemos alcanzado el límite de plazas para mantener los grupos reducidos. Te hemos añadido a la lista de espera prioritaria para nuestra próxima apertura.`
            : `Hi ${personRecord.firstName}, thank you for your interest in The Mothers. For this Window, we have reached capacity to keep our circle small and intimate. We have placed you on our priority waitlist for the next opening.`
        }
      </p>
      <p style="font-size: 13px; color: rgba(57,41,42,0.6); margin-top: 24px;">
        The Mothers · Barcelona · hello@themothers.cc
      </p>
    </div>
  `;

  await queueAndSendEmail({
    personId: personRecord.id,
    toEmail: personRecord.email,
    toName: `${personRecord.firstName} ${personRecord.lastName}`,
    templateKey: "application_not_accepted",
    dedupeKey: `app_declined_${applicationId}`,
    subject,
    htmlContent,
    isTransactional: true,
  });

  return { success: true };
}
