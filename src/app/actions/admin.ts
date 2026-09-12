"use server";

import { db } from "@/db";
import { application, person, member, window, adminUser, auditLog, creditEntry, eventPass } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { queueAndSendEmail } from "@/lib/brevo";
import crypto from "crypto";
import { z } from "zod";

// List applications for admin review queue
export async function getApplicationsForAdmin(statusFilter?: "submitted" | "accepted" | "declined" | "all") {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "host", "super_admin"];
  if (!role || !allowed.includes(role)) {
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

const acceptAppSchema = z.object({ applicationId: z.string().uuid() });

// Accept an application: Generates 72-hour signed payment link and sends Email - Accepted.html (§19, §20.1)
export async function acceptApplication(applicationId: string) {
  const parsed = acceptAppSchema.safeParse({ applicationId });
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };
  applicationId = parsed.data.applicationId;

  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];

  if (!role || !allowed.includes(role)) {
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
  const isQuarterly = answers.billingPreference === "quarterly";

  if (!existingMember) {
    await db.insert(member).values({
      personId: personRecord.id,
      status: "accepted_awaiting_payment",
      stage: answers.stage || "Pregnant",
      neighbourhood: answers.neighbourhood || "Barcelona",
      billingFrequency: isQuarterly ? "quarterly" : "monthly",
      monthlyPriceCents: 3900,
      priceCents: isQuarterly ? 9900 : 3900,
    });
  } else {
    await db
      .update(member)
      .set({
        status: "accepted_awaiting_payment",
        stage: answers.stage || existingMember.stage,
        neighbourhood: answers.neighbourhood || existingMember.neighbourhood,
        billingFrequency: isQuarterly ? "quarterly" : "monthly",
        priceCents: isQuarterly ? 9900 : 3900,
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

  // Check joining fee waiver
  const [totalAcceptedCount, recentPass] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(member).where(sql`status IN ('active', 'accepted_awaiting_payment')`),
    db.query.eventPass.findFirst({
      where: and(
        eq(eventPass.personId, personRecord.id),
        sql`purchased_at >= NOW() - INTERVAL '30 days'`
      ),
    }),
  ]);

  const isFirst50 = Number(totalAcceptedCount[0]?.count || 0) <= 50;
  const hasRecentPass = !!recentPass;

  let paymentBreakdownHtml = "";
  if (isFirst50) {
    paymentBreakdownHtml = `
<tr>
<td style="padding:6px 0;">Joining fee — one time</td>
<td align="right" style="padding:6px 0;color:#568b05;">Waived (€0)</td>
</tr>
<tr>
<td style="padding:6px 0;border-top:1px solid #ddd4c6;">First month</td>
<td align="right" style="padding:6px 0;border-top:1px solid #ddd4c6;">€39</td>
</tr>
<tr>
<td style="padding:8px 0 0;border-top:1px solid #ddd4c6;font-size:17px;font-weight:bold;">Total today</td>
<td align="right" style="padding:8px 0 0;border-top:1px solid #ddd4c6;font-size:17px;color:#7b1f2c;font-weight:bold;">€39</td>
</tr>`;
  } else if (hasRecentPass) {
    paymentBreakdownHtml = `
<tr>
<td style="padding:6px 0;">Joining fee — one time</td>
<td align="right" style="padding:6px 0;">€19</td>
</tr>
<tr>
<td style="padding:6px 0;border-top:1px solid #ddd4c6;">First month</td>
<td align="right" style="padding:6px 0;border-top:1px solid #ddd4c6;">€39</td>
</tr>
<tr>
<td style="padding:6px 0;border-top:1px solid #ddd4c6;">Event Pass credit (last 30 days)</td>
<td align="right" style="padding:6px 0;border-top:1px solid #ddd4c6;color:#568b05;">−€19</td>
</tr>
<tr>
<td style="padding:8px 0 0;border-top:1px solid #ddd4c6;font-size:17px;font-weight:bold;">Total today</td>
<td align="right" style="padding:8px 0 0;border-top:1px solid #ddd4c6;font-size:17px;color:#7b1f2c;font-weight:bold;">€39</td>
</tr>`;
  } else {
    paymentBreakdownHtml = `
<tr>
<td style="padding:6px 0;">Joining fee — one time</td>
<td align="right" style="padding:6px 0;">€19</td>
</tr>
<tr>
<td style="padding:6px 0;border-top:1px solid #ddd4c6;">First month</td>
<td align="right" style="padding:6px 0;border-top:1px solid #ddd4c6;">€39</td>
</tr>
<tr>
<td style="padding:8px 0 0;border-top:1px solid #ddd4c6;font-size:17px;font-weight:bold;">Total today</td>
<td align="right" style="padding:8px 0 0;border-top:1px solid #ddd4c6;font-size:17px;color:#7b1f2c;font-weight:bold;">€58</td>
</tr>`;
  }

  // Send Email - Accepted.html
  const activationUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/membership/activate/${paymentLinkToken}`;
  const subject =
    personRecord.locale === "es"
      ? "Tu plaza en The Mothers está lista — Enlace de activación (72h)"
      : "Your spot at The Mothers is ready — 72-hour Activation Link";

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>You're in — The Mothers</title>
<!--[if mso]>
<style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style>
<![endif]-->
<style>
@media only screen and (max-width:620px){
  .px{padding-left:24px !important;padding-right:24px !important;}
  .h1{font-size:30px !important;line-height:36px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#efeae1;">
<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">You have a place. Your payment link holds it for 72 hours — here is what opens the moment it clears.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efeae1;">
<tr>
<td align="center" style="padding:32px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;">

<tr>
<td class="px" align="center" style="padding:34px 48px 26px;border-bottom:1px solid #ddd4c6;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:20px;mso-line-height-rule:exactly;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;">The Mothers</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:7px;">Barcelona</div>
</td>
</tr>

<tr>
<td class="px" style="padding:38px 48px 0;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">Your application — accepted</div>
<h1 class="h1" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:42px;mso-line-height-rule:exactly;font-weight:normal;color:#2A1E20;">You have a place.</h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:27px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0 0 16px;">Hello <span style="color:#7b1f2c;">${personRecord.firstName}</span>,</p>
<p style="margin:0 0 16px;">Thank you for choosing us. Of all the places you could look for this, you came here — we feel honoured.<br>Welcome to The Mothers Tribe!</p>
<p style="margin:0;">One step left. The link below holds your place for <strong style="font-weight:normal;color:#7b1f2c;">72 hours</strong> — you become a member the moment it clears.</p>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td bgcolor="#7b1f2c" style="border-radius:4px;">
<a href="${activationUrl}" style="display:block;padding:16px 34px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:22px;mso-line-height-rule:exactly;color:#faf7f1;text-decoration:none;">Complete your membership</a>
</td>
</tr>
</table>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:#8a807a;padding-top:12px;">Expires <span style="color:#7b1f2c;">${expiresAt.toLocaleString()}</span>. After that the place returns to the Window.</div>
</td>
</tr>

<tr>
<td class="px" style="padding:30px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #ddd4c6;background-color:#f3efe6;">
<tr>
<td style="padding:22px 24px 12px;font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;">What you pay</td>
</tr>
<tr>
<td style="padding:0 24px 6px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#2A1E20;">
${paymentBreakdownHtml}
</table>
</td>
</tr>
<tr>
<td style="padding:12px 24px 22px;font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:21px;mso-line-height-rule:exactly;color:#5c534e;">Then €39 a month. Billing every 3 months, at €99, is available at checkout. Pause or cancel anytime.</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:32px 48px 0;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">The moment you pay</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#2A1E20;">
<tr>
<td width="26" valign="top" style="width:26px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">01</td>
<td valign="top">Your stage group opens — the mothers at your point in motherhood.</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding-top:10px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">02</td>
<td valign="top" style="padding-top:10px;">The full walks and events calendar, with member-first booking.</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding-top:10px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">03</td>
<td valign="top" style="padding-top:10px;">Your first 20 credits, to spend on whatever you like on the calendar.</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:30px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#5c534e;">
<p style="margin:0;">If anything is unclear before you pay, reply to this email — it reaches us, not a helpdesk.</p>
</td>
</tr>

<tr>
<td class="px" style="padding:26px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0;">Warmly,<br>The Mothers Team</p>
</td>
</tr>

<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;line-height:20px;mso-line-height-rule:exactly;color:#8a807a;padding-top:20px;">
The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
<a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a> &nbsp;·&nbsp;
<a href="https://themothers.cc" style="color:#7b1f2c;text-decoration:underline;">themothers.cc</a>
</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:18px;mso-line-height-rule:exactly;color:#8a807a;padding-top:12px;">
You're receiving this because you applied to join The Mothers.<br>
<a href="https://themothers.cc/unsubscribe" style="color:#8a807a;text-decoration:underline;">Unsubscribe</a> from club emails at any time.
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

const declineAppSchema = z.object({
  applicationId: z.string().uuid(),
  reasonCode: z.string().optional(),
  declineNote: z.string().optional(),
});

// Decline an application (§4.2, §19)
export async function declineApplication(applicationId: string, reasonCode?: string, declineNote?: string) {
  const parsed = declineAppSchema.safeParse({ applicationId, reasonCode, declineNote });
  if (!parsed.success) return { success: false, error: "INVALID_INPUT" };
  ({ applicationId, reasonCode, declineNote } = parsed.data);

  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];

  if (!role || !allowed.includes(role)) {
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

  const htmlContent = `\n<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>About your application — The Mothers</title>
<!--[if mso]>
<style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style>
<![endif]-->
<style>
@media only screen and (max-width:620px){
  .px{padding-left:24px !important;padding-right:24px !important;}
  .h1{font-size:28px !important;line-height:36px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#efeae1;">
<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">We could not offer you a place in this Window — here is what that does and does not mean.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efeae1;">
<tr>
<td align="center" style="padding:32px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;">

<tr>
<td class="px" align="center" style="padding:34px 48px 26px;border-bottom:1px solid #ddd4c6;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:20px;mso-line-height-rule:exactly;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;">The Mothers</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:7px;">Barcelona</div>
</td>
</tr>

<tr>
<td class="px" style="padding:38px 48px 0;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">About your application</div>
<h1 class="h1" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:40px;mso-line-height-rule:exactly;font-weight:normal;color:#2A1E20;">Not this time — and we're sorry.</h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:27px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0 0 16px;">Hello <span style="color:#7b1f2c;">${personRecord.firstName}</span>,</p>
<p style="margin:0 0 16px;">Thank you for applying to The Mothers, and for the honesty you put into it. We couldn't offer you a place in this Membership Window.</p>
<p style="margin:0;">This Window has reached the maximum number of members we can welcome, so we had to close it before we could offer everyone a place. That is what happened here, and it is not a judgement of you.</p>
</td>
</tr>

<tr>
<td class="px" style="padding:30px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #ddd4c6;background-color:#f3efe6;">
<tr>
<td style="padding:22px 24px 12px;font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;">You're still welcome here</td>
</tr>
<tr>
<td style="padding:0 24px 22px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#2A1E20;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr>
<td width="26" valign="top" style="width:26px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">01</td>
<td valign="top">Our walks are free and open to everyone — no membership, no application. Come to one and meet us properly.</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding-top:10px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">02</td>
<td valign="top" style="padding-top:10px;">Your application stays with us. There's nothing to submit again — we read it once more at our next Window.</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding-top:10px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">03</td>
<td valign="top" style="padding-top:10px;">We'll email you when it opens, so you don't have to watch for it.</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 4px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td bgcolor="#7b1f2c" style="border-radius:4px;">
<a href="https://themothers.cc/events" style="display:block;padding:14px 30px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:20px;mso-line-height-rule:exactly;color:#faf7f1;text-decoration:none;">See the next walks</a>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:26px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#5c534e;">
<p style="margin:0;">If you'd like to know more, reply to this email — it reaches us directly.</p>
</td>
</tr>

<tr>
<td class="px" style="padding:26px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0;">Warmly,<br>The Mothers Team</p>
</td>
</tr>

<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
<tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;line-height:20px;mso-line-height-rule:exactly;color:#8a807a;padding-top:20px;">
The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
<a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a> &nbsp;·&nbsp;
<a href="https://themothers.cc" style="color:#7b1f2c;text-decoration:underline;">themothers.cc</a>
</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:18px;mso-line-height-rule:exactly;color:#8a807a;padding-top:12px;">
You're receiving this because you applied to join The Mothers.<br>
<a href="https://themothers.cc/unsubscribe" style="color:#8a807a;text-decoration:underline;">Unsubscribe</a> from club emails at any time.
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

// Extend payment window by 72 hours
export async function extendApplicationPayment(applicationId: string) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) return { success: false, error: "UNAUTHORIZED_ADMIN" };

  const appRecord = await db.query.application.findFirst({
    where: eq(application.id, applicationId),
  });

  if (!appRecord || appRecord.status !== "accepted") {
    return { success: false, error: "APPLICATION_NOT_ELIGIBLE" };
  }

  const newExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  await db.update(application)
    .set({
      acceptExpiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(application.id, applicationId));

  await db.insert(auditLog).values({
    actorId: session?.user?.id,
    actorType: "admin",
    action: "extend_application",
    entity: "application",
    entityId: applicationId,
    after: { acceptExpiresAt: newExpiresAt.toISOString() },
  });

  return { success: true };
}

// Release the place (cancel application and member awaiting payment)
export async function releaseApplicationPlace(applicationId: string) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) return { success: false, error: "UNAUTHORIZED_ADMIN" };

  const appRecord = await db.query.application.findFirst({
    where: eq(application.id, applicationId),
  });

  if (!appRecord || appRecord.status !== "accepted") {
    return { success: false, error: "APPLICATION_NOT_ELIGIBLE" };
  }

  await db.transaction(async (tx) => {
    await tx.update(application)
      .set({
        status: "declined",
        declineReasonCode: "RELEASED_BY_ADMIN",
        updatedAt: new Date(),
      })
      .where(eq(application.id, applicationId));

    await tx.update(member)
      .set({
        status: "lapsed",
        updatedAt: new Date(),
      })
      .where(eq(member.personId, appRecord.personId));

    await tx.insert(auditLog).values({
      actorId: session?.user?.id,
      actorType: "admin",
      action: "release_application_place",
      entity: "application",
      entityId: applicationId,
    });
  });

  return { success: true };
}
