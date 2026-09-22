import * as brevo from "@getbrevo/brevo";
import { db } from "@/db";
import { emailLog } from "@/db/schema";
import { eq } from "drizzle-orm";

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
  EVENT_REMINDER_48H: "event_reminder_48h",
  EVENT_CANCELLED_REFUND: "event_cancelled_refund",
  WAITLIST_PROMOTED: "waitlist_promoted",
  CREDITS_EXPIRING_30D: "credits_expiring_30d",
  MEMBERSHIP_PAUSED: "membership_paused",
  MEMBERSHIP_CANCELLED: "membership_cancelled",
  TIER_UPGRADE: "tier_upgrade",
  GODMOTHER_BONUS_EARNED: "godmother_bonus_earned",
  JOURNAL_POST_NOTIFICATION: "journal_post_notification",
} as const;

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
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${params.title} — The Mothers</title>
<!--[if mso]>
<style>body,table,td,p,a{font-family:Georgia,'Times New Roman',serif !important;}</style>
<![endif]-->
<style>
@media only screen and (max-width:620px){
  .px{padding-left:24px !important;padding-right:24px !important;}
  .h1{font-size:26px !important;line-height:32px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#efeae1;">
<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${params.excerpt.slice(0, 120)}...</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#efeae1;">
<tr>
<td align="center" style="padding:32px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#faf7f1;border:1px solid #ddd4c6;border-radius:6px;overflow:hidden;">

<!-- Header / Logo -->
<tr>
<td class="px" align="center" style="padding:32px 48px 24px;border-bottom:1px solid #ddd4c6;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:20px;letter-spacing:3px;text-transform:uppercase;color:#7b1f2c;font-weight:bold;">The Mothers</div>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;letter-spacing:1.5px;text-transform:uppercase;color:#8a807a;padding-top:6px;">Barcelona · The Letter</div>
</td>
</tr>

${params.heroImageUrl ? `
<!-- Hero Image -->
<tr>
<td style="padding:0;">
  <img src="${params.heroImageUrl}" alt="${params.title}" width="600" style="width:100%;max-width:600px;height:auto;display:block;object-fit:cover;max-height:300px;" />
</td>
</tr>
` : ''}

<!-- Category & Title -->
<tr>
<td class="px" style="padding:32px 48px 0;">
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:12px;">${categoryLabel}</div>
  <h1 class="h1" style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:36px;font-weight:normal;color:#2A1E20;">${params.title}</h1>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:18px;color:#8a807a;">${isEs ? "Por" : "By"} ${authorName}</div>
</td>
</tr>

<!-- Excerpt -->
<tr>
<td class="px" style="padding:20px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:27px;color:#2A1E20;">
  <p style="margin:0 0 16px;color:#39292a;font-style:italic;">"${params.excerpt}"</p>
</td>
</tr>

<!-- CTA Button -->
<tr>
<td class="px" style="padding:20px 48px 0;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
  <tr>
  <td bgcolor="#7b1f2c" style="border-radius:4px;">
    <a href="${articleUrl}" style="display:block;padding:14px 30px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:20px;color:#faf7f1;text-decoration:none;font-weight:bold;letter-spacing:0.5px;">${isEs ? "Leer artículo completo" : "Read the full article"} &rarr;</a>
  </td>
  </tr>
  </table>
</td>
</tr>

<!-- Closing -->
<tr>
<td class="px" style="padding:32px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:24px;color:#5c534e;">
  <p style="margin:0;">${isEs ? "Con cariño," : "Warmly,"}<br>The Mothers Team</p>
</td>
</tr>

<!-- Footer -->
<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
  <tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;line-height:20px;color:#8a807a;padding-top:20px;">
    The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
    <a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a> &nbsp;·&nbsp;
    <a href="https://themothers.cc" style="color:#7b1f2c;text-decoration:underline;">themothers.cc</a>
  </div>
  <div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:18px;color:#8a807a;padding-top:12px;">
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
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${isEs ? "Tu Event Pass — The Mothers" : "Your Event Pass — The Mothers"}</title>
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
<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
${isEs ? "Este correo es tu ticket — incluye el punto de encuentro y el enlace para gestionar tu plaza." : "This email is your ticket — it carries the meeting point and a link to release your place. Keep it."}
</span>

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
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">${isEs ? "Tu Event Pass — confirmado" : "Your Event Pass — confirmed"}</div>
<h1 class="h1" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:42px;mso-line-height-rule:exactly;font-weight:normal;color:#2A1E20;">${isEs ? "Tu plaza está reservada." : "Your place is booked."}</h1>
</td>
</tr>

<tr>
<td class="px" style="padding:22px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:27px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0 0 16px;">${isEs ? "Hola" : "Hello"} <span style="color:#7b1f2c;">${params.firstName}</span>,</p>
<p style="margin:0 0 16px;">${isEs ? "Tienes tu asiento en la mesa. No hay nada más que gestionar ni cuenta que configurar — <strong style=\"font-weight:normal;color:#7b1f2c;\">este correo es tu ticket</strong>. Guárdalo bien." : "You have a seat at the table. There is nothing else to arrange and no account to set up — <strong style=\"font-weight:normal;color:#7b1f2c;\">this email is your ticket</strong>. Keep it somewhere you'll find it."}</p>
<p style="margin:0;">${isEs ? "Un pequeño detalle importante: el grupo estará formado por madres que en su mayoría se conocen. Ven tal como eres, llega unos minutos antes si puedes, y alguien estará esperándote." : "A small thing that matters: the group will be mothers who mostly know each other. Come as you are, arrive a few minutes early if you can, and someone will be looking out for you."}</p>
</td>
</tr>

<tr>
<td class="px" style="padding:30px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border:1px solid #ddd4c6;background-color:#f3efe6;">
<tr>
<td style="padding:22px 24px 14px;font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;">${isEs ? "Dónde y cuándo" : "Where and when"}</td>
</tr>
<tr>
<td style="padding:0 24px 22px;font-family:Georgia,'Times New Roman',serif;color:#2A1E20;">
<div style="font-size:20px;line-height:28px;mso-line-height-rule:exactly;padding-bottom:12px;">${params.eventTitle}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#2A1E20;">
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
<a href="${params.ticketUrl}" style="display:block;padding:16px 34px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:22px;mso-line-height-rule:exactly;color:#faf7f1;text-decoration:none;">${isEs ? "Ver o liberar mi plaza" : "View or release my place"}</a>
</td>
</tr>
</table>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:#8a807a;padding-top:12px;">${isEs ? "Este enlace es solo tuyo y funciona hasta que termine el encuentro. Sin contraseña." : "This link is yours alone and works until the evening is over. No password needed."}</div>
</td>
</tr>

<tr>
<td class="px" style="padding:32px 48px 0;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:16px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#7b1f2c;padding-bottom:14px;">${isEs ? "Conviene saber" : "Worth knowing"}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#2A1E20;">
<tr>
<td width="26" valign="top" style="width:26px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">01</td>
<td valign="top">${isEs ? "Los cambios de planes no son reembolsables — pero si no puedes venir, libera tu plaza con el enlace superior para que otra madre pueda asistir." : "Changing your mind is not refunded — but if you can't come, release the place through the link above and another mother can take it."}</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding-top:10px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">02</td>
<td valign="top" style="padding-top:10px;">${isEs ? "Si el evento no llegase a celebrarse, se te reembolsa íntegramente de forma automática — no tienes que hacer nada." : "If the event itself does not go ahead, you are refunded in full — you need do nothing."}</td>
</tr>
<tr>
<td width="26" valign="top" style="width:26px;padding-top:10px;font-size:14px;line-height:25px;mso-line-height-rule:exactly;color:#7b1f2c;">03</td>
<td valign="top" style="padding-top:10px;">${isEs ? `Este es tu [${passNum === 1 ? "primer" : "segundo"}] de dos Event Passes. Nuestros paseos y encuentros en parques son siempre gratuitos y abiertos para ti, seas o no miembro.` : `This was your [${passNum === 1 ? "first" : "second"}] of two Event Passes. Our walks and park socials stay free and open to you either way, member or not.`}</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:30px 48px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-top:1px solid #ddd4c6;">
<tr>
<td style="padding:22px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#5c534e;">
<p style="margin:0 0 14px;">${isEs ? "<strong style=\"font-weight:normal;color:#7b1f2c;\">Te eximimos de la cuota de alta</strong> si te unes a The Mothers dentro de los 30 días posteriores al evento. La membresía es de 39€ al mes, o 99€ cada tres meses, y cubre todo el calendario." : "If this turns out to be your kind of room, <strong style=\"font-weight:normal;color:#7b1f2c;\">we waive the joining fee</strong> when you join within 30 days of the event, so your first payment is just the month itself. Membership is €39 a month, or €99 every three months, and it covers the whole calendar rather than one table."}</p>
<a href="https://themothers.cc/membership" style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#7b1f2c;text-decoration:underline;">${isEs ? "Ver qué incluye la membresía" : "See what membership includes"}</a>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td class="px" style="padding:28px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#5c534e;">
<p style="margin:0;">${isEs ? "Cualquier consulta antes del día, responde a este correo — nos llega a nosotras directamente." : "Anything at all before the day, reply to this email — it reaches us, not a helpdesk."}</p>
</td>
</tr>

<tr>
<td class="px" style="padding:26px 48px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;mso-line-height-rule:exactly;color:#2A1E20;">
<p style="margin:0;">${isEs ? "Nos vemos allí," : "See you there,"}<br>The Mothers Team</p>
</td>
</tr>

<tr>
<td class="px" align="center" style="padding:32px 48px 34px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%;">
<tr><td style="border-top:1px solid #ddd4c6;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;line-height:20px;mso-line-height-rule:exactly;color:#8a807a;padding-top:20px;">
The Mothers · Carrer de Girona, 08009 Barcelona, Spain<br>
<a href="mailto:hello@themothers.cc" style="color:#7b1f2c;text-decoration:underline;">hello@themothers.cc</a> &nbsp;·&nbsp;
<a href="https://themothers.cc" style="color:#7b1f2c;text-decoration:underline;">themothers.cc</a>
</div>
<div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:18px;mso-line-height-rule:exactly;color:#8a807a;padding-top:12px;">
${isEs ? "Recibes este correo porque reservaste una plaza en uno de nuestros eventos.<br>Esta es una confirmación de reserva, no un correo publicitario." : "You're receiving this because you booked a place at one of our events.<br>This is a booking confirmation, not a marketing email — we keep your details only for this evening."}
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

