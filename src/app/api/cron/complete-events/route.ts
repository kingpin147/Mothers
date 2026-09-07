import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { event, booking, person, member, jobRun, auditLog } from "@/db/schema";
import { eq, and, lt, inArray } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/cron-auth";
import { queueAndSendEmail } from "@/lib/brevo";

/**
 * Complete Events Cron (§4.3, §8)
 * 
 * - Mark confirmed events where ends_at < NOW() as "completed"
 * - Queue "After Your Event" email to all attendees the following morning
 * - Only completed events can have attendance marked
 */
export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req);
  if (authError) return authError;

  const startedAt = new Date();
  let completed = 0;
  let emailsQueued = 0;

  try {
    // Find confirmed events that have ended
    const finishedEvents = await db
      .select()
      .from(event)
      .where(
        and(
          eq(event.status, "confirmed"),
          lt(event.endsAt, new Date())
        )
      );

    for (const ev of finishedEvents) {
      // Mark as completed
      await db
        .update(event)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(event.id, ev.id));

      // Settle any remaining unfilled returns for this finished event (§5 & §7.3)
      await db
        .update(booking)
        .set({
          pendingReturnState: "settled_unfilled",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(booking.eventId, ev.id),
            eq(booking.pendingReturnState, "awaiting_replacement")
          )
        );

      await db.insert(auditLog).values({
        actorType: "system",
        action: "complete_event",
        entity: "event",
        entityId: ev.id,
        after: { title: ev.title, endsAt: ev.endsAt },
      });

      completed++;

      // Queue "After Your Event" email to all attendees
      const attendeeBookings = await db
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
            eq(booking.eventId, ev.id),
            inArray(booking.status, ["confirmed", "attended"])
          )
        );

      for (const attendee of attendeeBookings) {
        const subject =
          attendee.locale === "es"
            ? `Gracias por asistir: ${ev.title} — The Mothers`
            : `Thank you for attending: ${ev.title} — The Mothers`;

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Last night — The Mothers</title>
<!--[if mso]>
<style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style>
<![endif]-->
<style>
@media only screen and (max-width:620px){
  .px{padding-left:24px !important;padding-right:24px !important;}
  .h1{font-size:28px !important;line-height:34px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#efeae1;">
<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">It was good to have you. Your €35 comes off your membership for the next thirty days.</span>

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
<h1 class="h1" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:40px;mso-line-height-rule:exactly;font-weight:normal;color:#2A1E20;">It was good to have you.</h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:27px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0 0 16px;"><span style="color:#7b1f2c;">${attendee.firstName || "Member"}</span>,</p>
<p style="margin:0 0 16px;">Thank you for coming to <span style="color:#7b1f2c;">${ev.title}</span>. I hope you left with at least one number in your phone — that is the only measure of these nights that matters to us.</p>
<p style="margin:0;">If you want to keep going, here is what is coming up for mothers at your stage. You have one Event Pass left — after that it is membership, or the free walks, which are always open to you.</p>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #ddd4c6;background-color:#f3efe6;">
<tr>
<td style="padding:20px 24px 8px;font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;">Next, near you</td>
</tr>
<tr>
<td style="padding:0 24px 20px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#2A1E20;">
<div style="padding:10px 0;border-top:1px solid #ddd4c6;">
<span style="color:#2A1E20;">See all upcoming walks & gatherings</span><br>
<span style="color:#8a807a;font-size:14px;">Barcelona · Free & Member Events</span>
</div>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #ddd4c6;background-color:#f3efe6;">
<tr>
<td style="padding:22px 24px;font-family:Georgia,'Times New Roman',serif;color:#2A1E20;">
<div style="font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:10px;">Your €35 is waiting</div>
<p style="margin:0 0 14px;font-size:15px;line-height:25px;mso-line-height-rule:exactly;">Join within <strong style="font-weight:normal;color:#7b1f2c;">thirty days</strong> of last night and the €35 you already paid comes off your membership — against the €19 joining fee first, then your first month.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td bgcolor="#7b1f2c" style="border-radius:4px;">
<a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/membership" style="display:block;padding:14px 30px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:22px;mso-line-height-rule:exactly;color:#faf7f1;text-decoration:none;">Join The Mothers</a>
</td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:30px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#5c534e;">
<p style="margin:0 0 14px;">And if it was not for you, that is genuinely fine — tell me why and it will make the next one better. Reply straight to this email.</p>
<p style="margin:0;">Either way, our walks stay free and open to you. No membership, no pass, just come.</p>
</td>
</tr>

<tr>
<td class="px" style="padding:26px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0;">Warmly,<br><span style="color:#7b1f2c;">The Mothers Team</span><br><span style="color:#8a807a;font-size:14px;">The Mothers Barcelona</span></p>
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
You're receiving this because you came to one of our events.<br>
<a href="https://themothers.cc/unsubscribe" style="color:#8a807a;text-decoration:underline;">Unsubscribe</a> and we won't write again.
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
          toName: `${attendee.firstName} ${attendee.lastName}`,
          templateKey: "after_your_event",
          dedupeKey: `after_event_${ev.id}_${attendee.personId}`,
          subject,
          htmlContent,
          isTransactional: false,
          marketingOptIn: true, // Promotional — requires consent
        });

        emailsQueued++;
      }
    }

    await db.insert(jobRun).values({
      jobKey: "complete_events",
      outcome: "success",
      startedAt,
      finishedAt: new Date(),
      counts: { completed, emailsQueued },
    });

    return NextResponse.json({ success: true, completed, emailsQueued });
  } catch (error: any) {
    console.error("complete_events cron error:", error);
    await db.insert(jobRun).values({
      jobKey: "complete_events",
      outcome: "failed",
      startedAt,
      finishedAt: new Date(),
      error: error?.message || "Unknown error",
    });

    return NextResponse.json(
      { error: error?.message || "CRON_FAILED" },
      { status: 500 }
    );
  }
}
