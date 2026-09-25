import * as brevo from "@getbrevo/brevo";
import { db } from "@/db";
import { emailLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateIcsDataUri } from "./ics";

export const BREVO_TEMPLATES = {
  WELCOME_CONFIRMATION: "welcome_confirmation",
  APPLICATION_RECEIVED: "application_received",
  APPLICATION_ACCEPTED: "application_accepted",
  APPLICATION_DECLINED: "application_declined",
  PAYMENT_RECEIPT: "payment_receipt",
  PAYMENT_FAILED: "payment_failed",
  PASSWORD_RESET: "password_reset",
  GUEST_PASS_ISSUED: "guest_pass_issued",
  TICKET_RELEASED: "ticket_released",
  EVENT_BOOKING_CONFIRMED: "event_booking_confirmed",
  EVENT_REMINDER_24H: "event_reminder_24h",
  EVENT_REMINDER_48H: "event_reminder_48h",
  EVENT_CANCELLED_REFUND: "event_cancelled_refund",
  WAITLIST_PROMOTED: "waitlist_promoted",
  CREDITS_EXPIRING_30D: "credits_expiring_30d",
  CREDITS_EXPIRING_7D: "credits_expiring_7d",
  HOST_REQUEST_STATUS: "host_request_status",
  MEMBERSHIP_PAUSED: "membership_paused",
  MEMBERSHIP_CANCELLED: "membership_cancelled",
  TIER_UPGRADE: "tier_upgrade",
  GODMOTHER_BONUS_EARNED: "godmother_bonus_earned",
  JOURNAL_POST_NOTIFICATION: "journal_post_notification",
} as const;

// ─── 1. JOURNAL POST EMAIL ──────────────────────────────────────────────────
export function generateJournalPostEmailHtml(params: {
  title: string;
  excerpt: string;
  slug: string;
  category?: string;
  author?: string;
  heroImageUrl?: string | null;
  toEmail?: string;
  isEs?: boolean;
}): string {
  const isEs = params.isEs || false;
  const articleUrl = `https://themothers.cc/journal/${params.slug}`;
  const unsubscribeUrl = `https://themothers.cc/unsubscribe?email=${encodeURIComponent(params.toEmail || "")}`;
  const categoryLabel = params.category ? params.category.toUpperCase() : (isEs ? "EL JOURNAL" : "THE JOURNAL");
  const authorName = params.author || "The Mothers";

  return `<!DOCTYPE html>
<html lang="${isEs ? "es" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${params.title} — The Mothers</title>
<style>
@media only screen and (max-width:620px){
  .px{padding-left:24px !important;padding-right:24px !important;}
  .h1{font-size:26px !important;line-height:32px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#efeae1;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efeae1;">
<tr>
<td align="center" style="padding:32px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;border-radius:6px;overflow:hidden;">

<tr>
<td class="px" align="center" style="padding:32px 48px 24px;border-bottom:1px solid #ddd4c6;">
  <div style="font-size:16px;line-height:20px;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;font-weight:bold;">The Mothers</div>
  <div style="font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:6px;">Barcelona · The Letter</div>
</td>
</tr>

${params.heroImageUrl ? `
<tr>
<td style="padding:0;">
  <img src="${params.heroImageUrl}" alt="${params.title}" width="600" style="width:100%;max-width:600px;height:auto;display:block;object-fit:cover;max-height:300px;" />
</td>
</tr>
` : ''}

<tr>
<td class="px" style="padding:32px 48px 0;">
  <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:12px;">${categoryLabel}</div>
  <h1 class="h1" style="margin:0 0 12px;font-size:30px;line-height:36px;font-weight:normal;color:#2A1E20;">${params.title}</h1>
  <div style="font-size:13px;line-height:18px;color:#8a807a;">${isEs ? "Por" : "By"} ${authorName}</div>
</td>
</tr>

<tr>
<td class="px" style="padding:20px 48px 0;font-size:16px;line-height:27px;color:#2A1E20;">
  <p style="margin:0 0 16px;color:#39292a;font-style:italic;">"${params.excerpt}"</p>
</td>
</tr>

<tr>
<td class="px" style="padding:20px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
  <td bgcolor="#7b1f2c" style="border-radius:4px;">
    <a href="${articleUrl}" style="display:block;padding:14px 30px;font-size:15px;line-height:20px;color:#faf7f1;text-decoration:none;font-weight:bold;letter-spacing:0.5px;">${isEs ? "Leer artículo completo" : "Read the full article"} &rarr;</a>
  </td>
  </tr>
  </table>
</td>
</tr>

<tr>
<td class="px" style="padding:32px 48px 0;font-size:15px;line-height:24px;color:#5c534e;">
  <p style="margin:0;">${isEs ? "Con cariño," : "Warmly,"}<br>The Mothers Team</p>
</td>
</tr>

<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>
  <div style="font-size:12px;line-height:20px;color:#8a807a;padding-top:20px;">
    The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
    <a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a> &nbsp;·&nbsp;
    <a href="https://themothers.cc" style="color:#7b1f2c;text-decoration:underline;">themothers.cc</a>
  </div>
  <div style="font-size:11px;line-height:18px;color:#8a807a;padding-top:12px;">
    You are receiving this because you subscribed to The Letter from The Mothers.<br>
    <a href="${unsubscribeUrl}" style="color:#8a807a;text-decoration:underline;">Unsubscribe</a> from future letters at any time.
  </div>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}


export function generateSubscriptionConfirmationEmailHtml(params: {
  firstName: string;
  planName?: string;
  creditsGranted?: number;
  appUrl?: string;
  isEs?: boolean;
}): string {
  const isEs = params.isEs || false;
  const baseUrl = params.appUrl || "https://themothers.cc";
  const credits = params.creditsGranted ?? 20;
  const plan = params.planName || (isEs ? "Membresía Mensual (39€ / mes)" : "Monthly Membership (€39 / month)");
  const waCircleUrl = "https://chat.whatsapp.com/FjzdbYTUcbmGvVEVSXY23J?s=cl&p=i&mlu=4&ilr=4";

  return `<!DOCTYPE html>
<html lang="${isEs ? "es" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${isEs ? "Bienvenida a The Mothers" : "Welcome to The Mothers"}</title>
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
  <div style="font-size:15px;line-height:20px;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;font-weight:bold;">The Mothers</div>
  <div style="font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:7px;">Barcelona</div>
</td>
</tr>

<tr>
<td class="px" style="padding:38px 48px 0;">
  <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">${isEs ? "Membresía confirmada" : "Membership confirmed"}</div>
  <h1 class="h1" style="margin:0;font-size:32px;line-height:38px;font-weight:normal;color:#2A1E20;">
    ${isEs ? `Bienvenida a The Mothers, ${params.firstName}.` : `Welcome to The Mothers, ${params.firstName}.`}
  </h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-size:15.5px;line-height:26px;color:#2A1E20;">
  <p style="margin:0 0 16px;">
    ${
      isEs
        ? `El pago de tu membresía ha sido confirmado y tu cuenta ya está activa. Hemos cargado <strong>${credits} créditos de eventos</strong> en tu saldo para reservar cualquier encuentro de nuestro calendario.`
        : `Your membership payment has been confirmed and your account is ready. <strong>${credits} event credits</strong> have been loaded into your balance to book any upcoming gathering on our calendar.`
    }
  </p>
</td>
</tr>

<tr>
<td class="px" style="padding:16px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #ddd4c6;background-color:#f3efe6;">
  <tr>
  <td style="padding:20px 24px;color:#2A1E20;">
    <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:10px;">${isEs ? "Detalles de tu membresía" : "Membership Details"}</div>
    <div style="font-size:14.5px;line-height:24px;color:#2A1E20;">
      <strong>${isEs ? "Plan" : "Plan"}:</strong> ${plan}<br>
      <strong>${isEs ? "Créditos cargados" : "Event Credits"}:</strong> ${credits} ${isEs ? "créditos (validez 6 meses)" : "credits loaded (valid for 6 months)"}<br>
      <strong>${isEs ? "Estado" : "Status"}:</strong> ${isEs ? "Activa y confirmada" : "Confirmed & Active"}
    </div>
  </td>
  </tr>
  </table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
  <td bgcolor="#7b1f2c" style="border-radius:4px;">
    <a href="${baseUrl}/account" style="display:block;padding:15px 32px;font-size:15px;line-height:20px;color:#faf7f1;text-decoration:none;font-weight:bold;">
      ${isEs ? "Ir a mi Cuenta de Miembro &rarr;" : "Go to your Member Account &rarr;"}
    </a>
  </td>
  </tr>
  </table>
</td>
</tr>

<tr>
<td class="px" style="padding:26px 48px 0;">
  <div style="background-color:#f4f7ee;border:1px solid rgba(86,139,5,0.35);border-radius:6px;padding:18px 22px;">
    <div style="font-size:11.5px;letter-spacing:1.5px;text-transform:uppercase;color:#568b05;font-weight:bold;margin-bottom:6px;">
      ${isEs ? "Comunidad The Circle en WhatsApp" : "WhatsApp Community Circle"}
    </div>
    <p style="font-size:14px;line-height:22px;color:rgba(57,41,42,0.85);margin:0 0 10px;">
      ${
        isEs
          ? "Únete a <strong>The Circle en WhatsApp</strong> para conectar con otras madres de Barcelona y recibir avisos de nuevos encuentros."
          : "Join <strong>The Circle WhatsApp Group</strong> to connect with other mothers in Barcelona and receive updates."
      }
    </p>
    <a href="${waCircleUrl}" style="color:#456f04;font-weight:bold;font-size:14px;text-decoration:underline;">
      ${isEs ? "Unirme al grupo de WhatsApp &rarr;" : "Join The Circle on WhatsApp &rarr;"}
    </a>
  </div>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;font-size:15px;line-height:24px;color:#5c534e;">
  <p style="margin:0;">${isEs ? "Con cariño," : "Warmly,"}<br>The Mothers Team</p>
</td>
</tr>

<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>
  <div style="font-size:12px;line-height:20px;color:#8a807a;padding-top:20px;">
    The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
    <a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a> &nbsp;·&nbsp;
    <a href="https://themothers.cc" style="color:#7b1f2c;text-decoration:underline;">themothers.cc</a>
  </div>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}

export function generateGuestPassEmailHtml(params: {
  firstName: string;
  eventTitle: string;
  eventDate: string;
  meetingPoint: string;
  neighbourhood?: string;
  amountPaidEur?: number;
  last4?: string;
  passNumber?: number;
  receiptNumber?: string;
  ticketUrl: string;
  isEs?: boolean;
}): string {
  const isEs = params.isEs || false;
  const passNum = params.passNumber || 1;
  const amount = params.amountPaidEur || 35;
  const receipt = params.receiptNumber || `TM-${Math.floor(1000 + Math.random() * 9000)}`;
  const cardNote = params.last4 ? `card ending ${params.last4}` : (isEs ? "tarjeta de pago" : "payment card");

  return `<!DOCTYPE html>
<html lang="${isEs ? "es" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${isEs ? "Tu Event Pass — The Mothers" : "Your Event Pass — The Mothers"}</title>
<style>
@media only screen and (max-width:620px){
  .px{padding-left:24px !important;padding-right:24px !important;}
  .h1{font-size:30px !important;line-height:36px !important;}
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
<div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">${isEs ? "Tu Event Pass — confirmado" : "Your Event Pass — confirmed"}</div>
<h1 class="h1" style="margin:0;font-size:34px;line-height:42px;font-weight:normal;color:#2A1E20;">${isEs ? "Tu plaza está reservada." : "Your place is booked."}</h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-size:16px;line-height:27px;color:#2A1E20;">
<p style="margin:0 0 16px;">${isEs ? "Hola" : "Hello"} <span style="color:#7b1f2c;">${params.firstName}</span>,</p>
<p style="margin:0 0 16px;">${isEs ? "Tienes tu asiento en la mesa. No hay nada más que gestionar ni cuenta que configurar — <strong style=\"font-weight:normal;color:#7b1f2c;\">este correo es tu ticket</strong>. Guárdalo bien." : "You have a seat at the table. There is nothing else to arrange and no account to set up — <strong style=\"font-weight:normal;color:#7b1f2c;\">this email is your ticket</strong>. Keep it somewhere you'll find it."}</p>
</td>
</tr>

<tr>
<td class="px" style="padding:30px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #ddd4c6;background-color:#f3efe6;">
<tr>
<td style="padding:22px 24px 14px;font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;">${isEs ? "Dónde y cuándo" : "Where and when"}</td>
</tr>
<tr>
<td style="padding:0 24px 22px;color:#2A1E20;">
<div style="font-size:20px;line-height:28px;padding-bottom:12px;">${params.eventTitle}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:15px;line-height:24px;color:#2A1E20;">
<tr>
<td width="96" valign="top" style="width:96px;padding:7px 0;border-top:1px solid #ddd4c6;font-size:13px;color:#8a807a;">${isEs ? "Fecha" : "Date"}</td>
<td valign="top" style="padding:7px 0;border-top:1px solid #ddd4c6;">${params.eventDate}</td>
</tr>
<tr>
<td width="96" valign="top" style="width:96px;padding:7px 0;border-top:1px solid #ddd4c6;font-size:13px;color:#8a807a;">${isEs ? "Punto de encuentro" : "Meeting point"}</td>
<td valign="top" style="padding:7px 0;border-top:1px solid #ddd4c6;">${params.meetingPoint}${params.neighbourhood ? `<br><span style="color:#8a807a;font-size:14px;">${params.neighbourhood}</span>` : ""}</td>
</tr>
<tr>
<td width="96" valign="top" style="width:96px;padding:7px 0;border-top:1px solid #ddd4c6;font-size:13px;color:#8a807a;">${isEs ? "Pagado" : "Paid"}</td>
<td valign="top" style="padding:7px 0;border-top:1px solid #ddd4c6;">€${amount} · ${cardNote}<br><span style="color:#8a807a;font-size:14px;">Event Pass [${passNum}] of 2 · receipt [${receipt}]</span></td>
</tr>
</table>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td bgcolor="#7b1f2c" style="border-radius:4px;">
<a href="${params.ticketUrl}" style="display:block;padding:16px 34px;font-size:16px;line-height:22px;color:#faf7f1;text-decoration:none;">${isEs ? "Ver o liberar mi plaza" : "View or release my place"}</a>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%;">
<tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
<div style="font-size:12px;line-height:20px;color:#8a807a;padding-top:20px;">
The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
<a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a>
</div>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}

// ─── 2. BOOKING CONFIRMATION EMAIL (§7.1) ──────────────────────────────────
export function generateBookingConfirmedEmailHtml(params: {
  firstName: string;
  eventTitle: string;
  eventDateFormatted: string;
  eventTimeFormatted: string;
  venueName?: string;
  meetingPoint?: string;
  creditsCharged: number;
  startsAt: Date | string;
  appUrl?: string;
  isEs?: boolean;
}): string {
  const isEs = params.isEs || false;
  const baseUrl = params.appUrl || "https://themothers.cc";
  const icsDataUri = generateIcsDataUri({
    title: params.eventTitle,
    description: `The Mothers gathering: ${params.eventTitle}. Meeting point: ${params.meetingPoint || params.venueName || "Barcelona"}`,
    location: params.meetingPoint || params.venueName || "Barcelona, Spain",
    startsAt: params.startsAt,
    url: `${baseUrl}/account`,
  });

  return `<!DOCTYPE html>
<html lang="${isEs ? "es" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${isEs ? `Reserva confirmada: ${params.eventTitle}` : `You're booked — ${params.eventTitle}`}</title>
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

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;border-radius:6px;overflow:hidden;">

<tr>
<td class="px" align="center" style="padding:34px 48px 26px;border-bottom:1px solid #ddd4c6;">
  <div style="font-size:15px;line-height:20px;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;font-weight:bold;">The Mothers</div>
  <div style="font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:7px;">Barcelona</div>
</td>
</tr>

<tr>
<td class="px" style="padding:38px 48px 0;">
  <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">${isEs ? "Plaza reservada" : "Place confirmed"}</div>
  <h1 class="h1" style="margin:0;font-size:32px;line-height:38px;font-weight:normal;color:#2A1E20;">
    ${isEs ? `Tu plaza está reservada, ${params.firstName}.` : `You're booked, ${params.firstName}.`}
  </h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-size:15.5px;line-height:26px;color:#2A1E20;">
  <p style="margin:0 0 16px;">
    ${
      isEs
        ? `Tienes tu asiento para <strong>${params.eventTitle}</strong>. A continuación encontrarás todos los detalles y el punto de encuentro.`
        : `You're in. <strong>${params.eventTitle}</strong> is locked in your schedule. Below are the details and meeting instructions.`
    }
  </p>
</td>
</tr>

<tr>
<td class="px" style="padding:16px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #ddd4c6;background-color:#f3efe6;border-radius:4px;">
  <tr>
  <td style="padding:20px 24px;color:#2A1E20;">
    <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:10px;">${isEs ? "Dónde y cuándo" : "Where and When"}</div>
    <div style="font-size:18px;line-height:24px;font-weight:bold;color:#2A1E20;margin-bottom:12px;">${params.eventTitle}</div>
    <div style="font-size:14.5px;line-height:24px;color:#2A1E20;">
      <strong>${isEs ? "Fecha" : "Date"}:</strong> ${params.eventDateFormatted} · ${params.eventTimeFormatted}<br>
      <strong>${isEs ? "Punto de encuentro" : "Meeting Point"}:</strong> ${params.meetingPoint || params.venueName || (isEs ? "Consultar en cuenta" : "Check in account")}<br>
      <strong>${isEs ? "Créditos utilizados" : "Credits used"}:</strong> ${params.creditsCharged} ${params.creditsCharged === 1 ? "crédito" : "credits"}
    </div>
  </td>
  </tr>
  </table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
  <td bgcolor="#7b1f2c" style="border-radius:4px;">
    <a href="${baseUrl}/account" style="display:block;padding:15px 32px;font-size:15px;line-height:20px;color:#faf7f1;text-decoration:none;font-weight:bold;">
      ${isEs ? "Ver o gestionar mi reserva &rarr;" : "View or manage in your Account &rarr;"}
    </a>
  </td>
  <td style="padding-left:14px;">
    <a href="${icsDataUri}" download="mothers-event.ics" style="display:block;padding:14px 22px;font-size:14px;line-height:20px;color:#7b1f2c;border:1px solid #7b1f2c;border-radius:4px;text-decoration:none;">
      ${isEs ? "📅 Añadir a calendario (.ics)" : "📅 Add to Calendar (.ics)"}
    </a>
  </td>
  </tr>
  </table>
</td>
</tr>

<tr>
<td class="px" style="padding:30px 48px 0;">
  <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:10px;">${isEs ? "Política de cancelación y créditos" : "Worth knowing"}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:14px;line-height:22px;color:#5c534e;">
  <tr>
  <td width="24" valign="top" style="color:#7b1f2c;font-weight:bold;">01</td>
  <td>${isEs ? "Si liberas tu plaza con más de 24 horas de antelación, tus créditos vuelven íntegramente a tu cuenta." : "Release your place more than 24 hours before and your credits return in full immediately."}</td>
  </tr>
  <tr>
  <td width="24" valign="top" style="padding-top:8px;color:#7b1f2c;font-weight:bold;">02</td>
  <td style="padding-top:8px;">${isEs ? "Si cancelamos por clima o fuerza mayor, se te reembolsan los créditos automáticamente." : "If we cancel for weather or any reason, your credits are refunded automatically."}</td>
  </tr>
  </table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;font-size:15px;line-height:24px;color:#5c534e;">
  <p style="margin:0;">${isEs ? "Con cariño," : "Warmly,"}<br>The Mothers Team</p>
</td>
</tr>

<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>
  <div style="font-size:12px;line-height:20px;color:#8a807a;padding-top:20px;">
    The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
    <a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a> &nbsp;·&nbsp;
    <a href="https://themothers.cc" style="color:#7b1f2c;text-decoration:underline;">themothers.cc</a>
  </div>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}

// ─── 3. PAYMENT RECEIPT EMAIL (TOP-UP / PASSES) ─────────────────────────────
export function generatePaymentReceiptEmailHtml(params: {
  firstName: string;
  orderId: string;
  amountEur: number;
  creditsPurchased: number;
  expiryDateFormatted: string;
  last4?: string;
  appUrl?: string;
  isEs?: boolean;
}): string {
  const isEs = params.isEs || false;
  const baseUrl = params.appUrl || "https://themothers.cc";

  return `<!DOCTYPE html>
<html lang="${isEs ? "es" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${isEs ? `Recibo de compra — ${params.creditsPurchased} créditos` : `Your receipt — ${params.creditsPurchased} credits`}</title>
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

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;border-radius:6px;overflow:hidden;">

<tr>
<td class="px" align="center" style="padding:34px 48px 26px;border-bottom:1px solid #ddd4c6;">
  <div style="font-size:15px;line-height:20px;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;font-weight:bold;">The Mothers</div>
  <div style="font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:7px;">Barcelona · Recibo oficial</div>
</td>
</tr>

<tr>
<td class="px" style="padding:38px 48px 0;">
  <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">${isEs ? "Pago confirmado" : "Payment Confirmed"}</div>
  <h1 class="h1" style="margin:0;font-size:30px;line-height:36px;font-weight:normal;color:#2A1E20;">
    ${isEs ? `Recibo de compra: ${params.creditsPurchased} créditos` : `Your receipt: ${params.creditsPurchased} credits`}
  </h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-size:15.5px;line-height:26px;color:#2A1E20;">
  <p style="margin:0 0 16px;">
    ${
      isEs
        ? `Gracias, ${params.firstName}. Hemos recibido tu pago de <strong>€${params.amountEur.toFixed(2)}</strong>. Tus <strong>${params.creditsPurchased} créditos</strong> ya están disponibles en tu cuenta.`
        : `Thank you, ${params.firstName}. We received your payment of <strong>€${params.amountEur.toFixed(2)}</strong>. Your <strong>${params.creditsPurchased} credits</strong> are loaded and ready to use.`
    }
  </p>
</td>
</tr>

<tr>
<td class="px" style="padding:16px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #ddd4c6;background-color:#f3efe6;border-radius:4px;">
  <tr>
  <td style="padding:20px 24px;color:#2A1E20;">
    <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:10px;">${isEs ? "Detalles del pedido" : "Order Breakdown"}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:14px;line-height:22px;">
      <tr>
        <td style="padding:4px 0;color:#8a807a;">${isEs ? "Número de recibo" : "Receipt No."}</td>
        <td align="right" style="padding:4px 0;font-weight:bold;color:#2A1E20;">${params.orderId}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#8a807a;">${isEs ? "Créditos adquiridos" : "Credits loaded"}</td>
        <td align="right" style="padding:4px 0;font-weight:bold;color:#7b1f2c;">+${params.creditsPurchased} credits</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#8a807a;">${isEs ? "Válidos hasta" : "Valid until"}</td>
        <td align="right" style="padding:4px 0;color:#2A1E20;">${params.expiryDateFormatted} (6 months)</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#8a807a;">${isEs ? "Método de pago" : "Payment method"}</td>
        <td align="right" style="padding:4px 0;color:#2A1E20;">${params.last4 ? `Card ending ${params.last4}` : "Credit / Debit Card"}</td>
      </tr>
      <tr>
        <td style="padding:8px 0 0;border-top:1px solid #ddd4c6;font-weight:bold;color:#2A1E20;">${isEs ? "Total pagado (IVA incl.)" : "Total Paid (incl. VAT)"}</td>
        <td align="right" style="padding:8px 0 0;border-top:1px solid #ddd4c6;font-size:16px;font-weight:bold;color:#2A1E20;">€${params.amountEur.toFixed(2)}</td>
      </tr>
    </table>
  </td>
  </tr>
  </table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
  <td bgcolor="#7b1f2c" style="border-radius:4px;">
    <a href="${baseUrl}/events" style="display:block;padding:15px 32px;font-size:15px;line-height:20px;color:#faf7f1;text-decoration:none;font-weight:bold;">
      ${isEs ? "Explorar calendario de encuentros &rarr;" : "Explore Gatherings Calendar &rarr;"}
    </a>
  </td>
  </tr>
  </table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;font-size:15px;line-height:24px;color:#5c534e;">
  <p style="margin:0;">${isEs ? "Con cariño," : "Warmly,"}<br>The Mothers Team</p>
</td>
</tr>

<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>
  <div style="font-size:12px;line-height:20px;color:#8a807a;padding-top:20px;">
    The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
    CIF / Tax ID: B-67891234 · <a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a>
  </div>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}

// ─── 4. 24H MEETING-POINT REMINDER EMAIL ────────────────────────────────────
export function generateEventReminder24hEmailHtml(params: {
  firstName: string;
  eventTitle: string;
  eventDateFormatted: string;
  eventTimeFormatted: string;
  meetingPoint: string;
  hostName?: string;
  hostContact?: string;
  notes?: string;
  appUrl?: string;
  isEs?: boolean;
}): string {
  const isEs = params.isEs || false;
  const baseUrl = params.appUrl || "https://themothers.cc";

  return `<!DOCTYPE html>
<html lang="${isEs ? "es" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${isEs ? `Mañana: dónde nos encontramos para ${params.eventTitle}` : `Tomorrow: where to meet for ${params.eventTitle}`}</title>
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

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;border-radius:6px;overflow:hidden;">

<tr>
<td class="px" align="center" style="padding:34px 48px 26px;border-bottom:1px solid #ddd4c6;">
  <div style="font-size:15px;line-height:20px;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;font-weight:bold;">The Mothers</div>
  <div style="font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:7px;">Barcelona · Recordatorio de mañana</div>
</td>
</tr>

<tr>
<td class="px" style="padding:38px 48px 0;">
  <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">${isEs ? "Nos vemos mañana" : "See you tomorrow"}</div>
  <h1 class="h1" style="margin:0;font-size:30px;line-height:36px;font-weight:normal;color:#2A1E20;">
    ${isEs ? `Mañana: ${params.eventTitle}` : `Tomorrow: ${params.eventTitle}`}
  </h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-size:15.5px;line-height:26px;color:#2A1E20;">
  <p style="margin:0 0 16px;">
    ${
      isEs
        ? `Hola ${params.firstName}, nos vemos mañana. Aquí tienes las indicaciones exactas del punto de encuentro y la anfitriona que te dará la bienvenida:`
        : `Hello ${params.firstName}, we are gathering tomorrow. Here are the exact meeting instructions and host details:`
    }
  </p>
</td>
</tr>

<tr>
<td class="px" style="padding:16px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #ddd4c6;background-color:#f3efe6;border-radius:4px;">
  <tr>
  <td style="padding:20px 24px;color:#2A1E20;">
    <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:10px;">${isEs ? "Punto de encuentro" : "Meeting Point & Time"}</div>
    <div style="font-size:18px;line-height:24px;font-weight:bold;color:#2A1E20;margin-bottom:12px;">📍 ${params.meetingPoint}</div>
    <div style="font-size:14.5px;line-height:24px;color:#2A1E20;">
      <strong>${isEs ? "Hora" : "Time"}:</strong> ${params.eventTimeFormatted}<br>
      <strong>${isEs ? "Anfitriona" : "Host"}:</strong> ${params.hostName || "The Mothers Host"}<br>
      ${params.notes ? `<strong>${isEs ? "Notas de llegada" : "Arrival notes"}:</strong> ${params.notes}` : ""}
    </div>
  </td>
  </tr>
  </table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
  <td bgcolor="#7b1f2c" style="border-radius:4px;">
    <a href="${baseUrl}/account" style="display:block;padding:15px 32px;font-size:15px;line-height:20px;color:#faf7f1;text-decoration:none;font-weight:bold;">
      ${isEs ? "Ver detalles en mi cuenta &rarr;" : "View details in account &rarr;"}
    </a>
  </td>
  </tr>
  </table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;font-size:15px;line-height:24px;color:#5c534e;">
  <p style="margin:0;">${isEs ? "¡Hasta mañana!" : "See you tomorrow,"}<br>The Mothers Team</p>
</td>
</tr>

<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>
  <div style="font-size:12px;line-height:20px;color:#8a807a;padding-top:20px;">
    The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
    <a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a>
  </div>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}

// ─── 5. CREDIT EXPIRY ALERT EMAIL (30D / 7D) ───────────────────────────────
export function generateCreditsExpiringEmailHtml(params: {
  firstName: string;
  creditsExpiring: number;
  daysRemaining: number;
  expiryDateFormatted: string;
  appUrl?: string;
  isEs?: boolean;
}): string {
  const isEs = params.isEs || false;
  const baseUrl = params.appUrl || "https://themothers.cc";

  return `<!DOCTYPE html>
<html lang="${isEs ? "es" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${isEs ? `Tus créditos caducan en ${params.daysRemaining} días` : `Your ${params.creditsExpiring} credits expire in ${params.daysRemaining} days`}</title>
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

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;border-radius:6px;overflow:hidden;">

<tr>
<td class="px" align="center" style="padding:34px 48px 26px;border-bottom:1px solid #ddd4c6;">
  <div style="font-size:15px;line-height:20px;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;font-weight:bold;">The Mothers</div>
  <div style="font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:7px;">Barcelona · Aviso de créditos</div>
</td>
</tr>

<tr>
<td class="px" style="padding:38px 48px 0;">
  <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">${isEs ? "Recordatorio de saldo" : "Balance Reminder"}</div>
  <h1 class="h1" style="margin:0;font-size:30px;line-height:36px;font-weight:normal;color:#2A1E20;">
    ${isEs ? `Tienes ${params.creditsExpiring} créditos por vencer` : `You have ${params.creditsExpiring} credits expiring soon`}
  </h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-size:15.5px;line-height:26px;color:#2A1E20;">
  <p style="margin:0 0 16px;">
    ${
      isEs
        ? `Hola ${params.firstName}, un lote de <strong>${params.creditsExpiring} créditos</strong> caducará el <strong>${params.expiryDateFormatted}</strong> (en ${params.daysRemaining} días). Puedes utilizarlos para reservar cualquier encuentro de nuestro calendario antes de esa fecha.`
        : `Hello ${params.firstName}, a batch of <strong>${params.creditsExpiring} credits</strong> is set to expire on <strong>${params.expiryDateFormatted}</strong> (in ${params.daysRemaining} days). You can use them on any upcoming gathering on our calendar.`
    }
  </p>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
  <td bgcolor="#7b1f2c" style="border-radius:4px;">
    <a href="${baseUrl}/events" style="display:block;padding:15px 32px;font-size:15px;line-height:20px;color:#faf7f1;text-decoration:none;font-weight:bold;">
      ${isEs ? "Ver encuentros disponibles &rarr;" : "Browse upcoming gatherings &rarr;"}
    </a>
  </td>
  </tr>
  </table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;font-size:15px;line-height:24px;color:#5c534e;">
  <p style="margin:0;">${isEs ? "Con cariño," : "Warmly,"}<br>The Mothers Team</p>
</td>
</tr>

<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>
  <div style="font-size:12px;line-height:20px;color:#8a807a;padding-top:20px;">
    The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
    <a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a>
  </div>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}

// ─── 6. WAITLIST PROMOTED EMAIL ─────────────────────────────────────────────
export function generateWaitlistPromotedEmailHtml(params: {
  firstName: string;
  eventTitle: string;
  eventId: string;
  claimWindowHours?: number;
  appUrl?: string;
  isEs?: boolean;
}): string {
  const isEs = params.isEs || false;
  const baseUrl = params.appUrl || "https://themothers.cc";
  const hours = params.claimWindowHours || 12;

  return `<!DOCTYPE html>
<html lang="${isEs ? "es" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${isEs ? `Se ha liberado una plaza: ${params.eventTitle}` : `A spot opened up: ${params.eventTitle}`}</title>
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

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;border-radius:6px;overflow:hidden;">

<tr>
<td class="px" align="center" style="padding:34px 48px 26px;border-bottom:1px solid #ddd4c6;">
  <div style="font-size:15px;line-height:20px;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;font-weight:bold;">The Mothers</div>
  <div style="font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:7px;">Barcelona · Lista de espera</div>
</td>
</tr>

<tr>
<td class="px" style="padding:38px 48px 0;">
  <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">${isEs ? "¡Buenas noticias!" : "Good news!"}</div>
  <h1 class="h1" style="margin:0;font-size:30px;line-height:36px;font-weight:normal;color:#2A1E20;">
    ${isEs ? `Una plaza disponible para ti en ${params.eventTitle}` : `A spot opened up for ${params.eventTitle}`}
  </h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-size:15.5px;line-height:26px;color:#2A1E20;">
  <p style="margin:0 0 16px;">
    ${
      isEs
        ? `Hola ${params.firstName}, estabas en la lista de espera y se acaba de liberar una plaza para <strong>${params.eventTitle}</strong>. Tienes <strong>${hours} horas</strong> de prioridad para confirmarla antes de que pase a la siguiente persona.`
        : `Hello ${params.firstName}, a place just became available for <strong>${params.eventTitle}</strong>. You have priority to claim this spot for the next <strong>${hours} hours</strong> before it is offered to the next person on the list.`
    }
  </p>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
  <td bgcolor="#7b1f2c" style="border-radius:4px;">
    <a href="${baseUrl}/events/${params.eventId}" style="display:block;padding:15px 32px;font-size:15px;line-height:20px;color:#faf7f1;text-decoration:none;font-weight:bold;">
      ${isEs ? "Confirmar mi plaza ahora &rarr;" : "Claim your spot now &rarr;"}
    </a>
  </td>
  </tr>
  </table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;font-size:15px;line-height:24px;color:#5c534e;">
  <p style="margin:0;">${isEs ? "Con cariño," : "Warmly,"}<br>The Mothers Team</p>
</td>
</tr>

<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>
  <div style="font-size:12px;line-height:20px;color:#8a807a;padding-top:20px;">
    The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
    <a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a>
  </div>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}

// ─── 7. HOST REQUEST STATUS EMAIL ───────────────────────────────────────────
export function generateHostRequestStatusEmailHtml(params: {
  firstName: string;
  status: "received" | "call_scheduled" | "approved" | "declined";
  callDateFormatted?: string;
  notes?: string;
  appUrl?: string;
  isEs?: boolean;
}): string {
  const isEs = params.isEs || false;
  const baseUrl = params.appUrl || "https://themothers.cc";

  let title = isEs ? "Solicitud de anfitriona recibida" : "Host application received";
  let body = isEs
    ? `Hola ${params.firstName}, hemos recibido tu propuesta para ser anfitriona en The Mothers. Revisamos cada propuesta con cariño y te responderemos en 48 horas.`
    : `Hello ${params.firstName}, we received your proposal to host a gathering with The Mothers. We review each application personally and will get back to you within 48 hours.`;

  if (params.status === "call_scheduled") {
    title = isEs ? "Llamada de anfitriona programada" : "Host call scheduled";
    body = isEs
      ? `Hola ${params.firstName}, estamos encantadas de avanzar con tu solicitud. Tenemos agendada una videollamada informativa ${params.callDateFormatted ? `para el ${params.callDateFormatted}` : "próximamente"}.`
      : `Hello ${params.firstName}, we are excited to move forward with your host application. We have scheduled an intro call ${params.callDateFormatted ? `on ${params.callDateFormatted}` : "shortly"}.`;
  } else if (params.status === "approved") {
    title = isEs ? "¡Felicidades! Eres anfitriona de The Mothers" : "Congratulations! You are now a Host";
    body = isEs
      ? `Hola ${params.firstName}, nos complace confirmarte que has sido aprobada como anfitriona de The Mothers. Ya puedes coordinar tus encuentros y recibirás +2 créditos por cada reunión organizada que se celebre.`
      : `Hello ${params.firstName}, we are thrilled to confirm that your host application has been approved. You can now curate gatherings and you will earn +2 credits for each hosted session that runs.`;
  } else if (params.status === "declined") {
    title = isEs ? "Actualización sobre tu solicitud" : "Update on your host application";
    body = isEs
      ? `Hola ${params.firstName}, gracias de corazón por tu interés en hospedar encuentros. En este momento no podemos incorporar nuevas anfitrionas en tu zona temática, pero guardamos tus datos para futuras aperturas.`
      : `Hello ${params.firstName}, thank you warmly for your interest in hosting with us. At this time we are unable to accept new gathering formats in your specific area, but we will keep your profile on file for future openings.`;
  }

  return `<!DOCTYPE html>
<html lang="${isEs ? "es" : "en"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — The Mothers</title>
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

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;border-radius:6px;overflow:hidden;">

<tr>
<td class="px" align="center" style="padding:34px 48px 26px;border-bottom:1px solid #ddd4c6;">
  <div style="font-size:15px;line-height:20px;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;font-weight:bold;">The Mothers</div>
  <div style="font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:7px;">Barcelona · Host Network</div>
</td>
</tr>

<tr>
<td class="px" style="padding:38px 48px 0;">
  <div style="font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">Host Application</div>
  <h1 class="h1" style="margin:0;font-size:30px;line-height:36px;font-weight:normal;color:#2A1E20;">${title}</h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-size:15.5px;line-height:26px;color:#2A1E20;">
  <p style="margin:0 0 16px;">${body}</p>
  ${params.notes ? `<p style="margin:0 0 16px;background:#f3efe6;padding:16px;border-radius:4px;font-style:italic;">"${params.notes}"</p>` : ""}
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;font-size:15px;line-height:24px;color:#5c534e;">
  <p style="margin:0;">${isEs ? "Con cariño," : "Warmly,"}<br>The Mothers Team</p>
</td>
</tr>

<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>
  <div style="font-size:12px;line-height:20px;color:#8a807a;padding-top:20px;">
    The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
    <a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a>
  </div>
</td>
</tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}

// ─── 8. CORE QUEUE AND SEND FUNCTION ────────────────────────────────────────
export interface SendEmailParams {
  personId: string;
  toEmail: string;
  toName: string;
  templateKey: string;
  dedupeKey: string;
  subject: string;
  htmlContent: string;
  isTransactional?: boolean; // Default true
  marketingOptIn?: boolean;
}

export async function queueAndSendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  // Check promotional consent
  if (!params.isTransactional && !params.marketingOptIn) {
    return { success: false, error: "MARKETING_CONSENT_REQUIRED" };
  }

  // 1. Idempotency check: dedupe_key
  const existingLog = await db.query.emailLog.findFirst({
    where: eq(emailLog.dedupeKey, params.dedupeKey),
  });

  if (existingLog && (existingLog.status === "sent" || existingLog.status === "delivered")) {
    return { success: true }; // Already sent, idempotent exit
  }

  // 2. Insert or update log entry
  let logId = existingLog?.id;
  if (!logId) {
    const inserted = await db
      .insert(emailLog)
      .values({
        personId: params.personId,
        templateKey: params.templateKey,
        dedupeKey: params.dedupeKey,
        payload: { subject: params.subject, to: params.toEmail },
        status: "queued",
      })
      .returning({ id: emailLog.id });
    logId = inserted[0]?.id;
  }

  // 3. Dispatch to Brevo or Dev Simulation
  const apiKey = process.env.BREVO_API_KEY;
  const isRealApiKey = apiKey && apiKey !== "your-brevo-api-key" && !apiKey.startsWith("your-");

  if (!isRealApiKey) {
    console.log(`[Brevo Email Simulated] To: ${params.toEmail} | Subject: "${params.subject}" | Template: ${params.templateKey}`);
    if (logId) {
      await db
        .update(emailLog)
        .set({
          status: "sent",
          providerId: `dev-sim-${Date.now()}`,
          sentAt: new Date(),
        })
        .where(eq(emailLog.id, logId));
    }
    return { success: true };
  }

  try {
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = params.subject;
    sendSmtpEmail.htmlContent = params.htmlContent;
    sendSmtpEmail.sender = {
      name: process.env.BREVO_SENDER_NAME || "The Mothers",
      email: process.env.BREVO_SENDER_EMAIL || "hello@themothers.cc",
    };
    sendSmtpEmail.to = [{ email: params.toEmail, name: params.toName }];

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    const messageId = (result as any).body?.messageId || "sent";

    if (logId) {
      await db
        .update(emailLog)
        .set({
          status: "sent",
          providerId: messageId,
          sentAt: new Date(),
        })
        .where(eq(emailLog.id, logId));
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Brevo Email Error]", error);
    if (logId) {
      await db
        .update(emailLog)
        .set({
          status: "failed",
          error: error?.message || "Send failed",
        })
        .where(eq(emailLog.id, logId));
    }
    return { success: false, error: error?.message || "Brevo dispatch failed" };
  }
}
