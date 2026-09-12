"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getGuestTicketByToken, releaseGuestTicket } from "@/app/actions/ticket";
import { Locale } from "@/lib/i18n";

const STRINGS = {
  en: {
    kicker: 'Your place — confirmed',
    title: 'You have a seat.',
    greeting: (name: string) => `Hello ${name}. This page is your ticket — no account, no password. Keep the email that brought you here and you have everything.`,
    eventKicker: 'Your event',
    dateLabel: 'Date', whereLabel: 'Meeting point', paidLabel: 'Paid',
    keepNote: 'Arrive a few minutes early if you can, and someone will be looking out for you. The group will mostly know each other — come as you are.',
    joinKicker: 'After the event',
    joinBody: 'If this turns out to be your kind of room, we waive the joining fee when you join within 30 days of the event — so your first payment is just the month itself, €39 — and you begin with 20 credits.',
    joinCta: 'See what membership includes',
    changeKicker: 'If your plans change',
    changeBody: 'Changing your mind is not refunded, but the place should not sit empty. Release it here and it goes to the next mother waiting. If the event itself does not go ahead, you are refunded in full without doing anything.',
    releaseCta: 'Release my place',
    releaseConfirmTitle: 'Release your place?',
    releaseConfirmBody: 'This frees your seat for another mother. It cannot be undone, and the €35 is not refunded — you would need to book again if you change your mind. (If we cancel the event, you are refunded in full automatically.)',
    releaseConfirmCta: 'Yes, release it',
    releaseKeep: 'Keep my place',
    releasedKicker: 'Place released',
    releasedTitle: 'Thank you for telling us.',
    releasedBody: (title: string) => `Your seat at "${title}" is back on the calendar for someone else. We hope to see you at another one — the walks are free and open to you any time.`,
    releasedCta: 'See what else is on',
    releasedSecondary: 'Look at membership',
    expiredKicker: 'This link has expired',
    expiredTitle: 'That event has passed.',
    expiredBody: 'Event Pass links close once the event is over. If you came, we hope it was a good table. If something went wrong, write to us — we read every message.',
    help: 'Anything at all,',
    footer: 'A private membership club for mothers · Barcelona',
    demoKicker: 'Prototype states',
    demoBooked: 'Booked',
    demoReleased: 'Released',
    demoExpired: 'Expired link'
  },
  es: {
    kicker: 'Tu plaza — confirmada',
    title: 'Tienes sitio.',
    greeting: (name: string) => `Hola ${name}. Esta página es tu entrada — sin cuenta y sin contraseña. Guarda el correo que te trajo aquí y lo tienes todo.`,
    eventKicker: 'La tarde',
    dateLabel: 'Fecha', whereLabel: 'Punto de encuentro', paidLabel: 'Pagado',
    keepNote: 'Llega unos minutos antes si puedes, y alguien estará pendiente de ti. La mayoría del grupo ya se conoce — ven tal como eres.',
    joinKicker: 'Después del evento',
    joinBody: 'Si esta resulta ser tu sala, te quitamos la cuota de inscripción si te unes en los 30 días siguientes al evento — tu primer pago es solo el mes, 39€ — y empiezas con 20 créditos.',
    joinCta: 'Ver qué incluye la membresía',
    changeKicker: 'Si te cambian los planes',
    changeBody: 'Si cambias de idea no hay devolución, pero la plaza no debería quedarse vacía. Libérala aquí y pasa a la siguiente madre en espera. Si el evento no se celebra, te devolvemos el importe íntegro sin que tengas que hacer nada.',
    releaseCta: 'Liberar mi plaza',
    releaseConfirmTitle: '¿Liberar tu plaza?',
    releaseConfirmBody: 'Esto deja tu sitio libre para otra madre. No se puede deshacer y los 35€ no se devuelven — tendrías que reservar de nuevo si cambias de idea.',
    releaseConfirmCta: 'Sí, liberarla',
    releaseKeep: 'Quedarme con mi plaza',
    releasedKicker: 'Plaza liberada',
    releasedTitle: 'Gracias por avisarnos.',
    releasedBody: (title: string) => `Tu sitio en "${title}" vuelve al calendario para otra persona. Esperamos verte en otra — los paseos son gratuitos y están abiertos para ti cuando quieras.`,
    releasedCta: 'Ver qué más hay',
    releasedSecondary: 'Ver la membresía',
    expiredKicker: 'Este enlace ha caducado',
    expiredTitle: 'Esa tarde ya ha pasado.',
    expiredBody: 'Los enlaces de entrada se cierran cuando termina el evento. Si viniste, esperamos que fuera una buena mesa. Si algo salió mal, escríbenos — leemos todos los mensajes.',
    help: 'Lo que necesites,',
    footer: 'Club privado de membresía para madres · Barcelona',
    demoKicker: 'Estados del prototipo',
    demoBooked: 'Reservada',
    demoReleased: 'Liberada',
    demoExpired: 'Enlace caducado'
  }
};

const DEMO = {
  en: {
    name: 'Alex',
    title: "MoM's date — Vermut on Bonavista",
    meetingPoint: 'Carrer de Bonavista 6 — the back room, ask for The Mothers',
    neighbourhood: 'Gràcia',
    paid: '€35 · card ending 4242'
  },
  es: {
    name: 'Alex',
    title: "MoM's date — Vermut en Bonavista",
    meetingPoint: 'Carrer de Bonavista 6 — la sala del fondo, pregunta por The Mothers',
    neighbourhood: 'Gràcia',
    paid: '35€ · tarjeta terminada en 4242'
  }
};

const fmtDate = (d: Date, lang: string) => {
  const day = new Intl.DateTimeFormat(lang === 'es' ? 'es-ES' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(d);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${hours}:${minutes}`;
};

export default function GuestTicketPage() {
  const params = useParams();
  const token = params?.token as string;

  const [lang, setLang] = useState<Locale>("en");
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [askingRelease, setAskingRelease] = useState(false);
  const [released, setReleased] = useState(false);
  const [releasing, setReleasing] = useState(false);

  // Prototype state switch for testing
  const [demoStateOverride, setDemoStateOverride] = useState<"booked" | "released" | "expired" | null>(null);

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  useEffect(() => {
    async function load() {
      if (!token || token === "demo") {
        setLoading(false);
        return;
      }
      const res = await getGuestTicketByToken(token);
      setLoading(false);
      if (res.success && res.ticket) {
        setTicket(res.ticket);
        if (res.ticket.status === "released") {
          setReleased(true);
        }
      } else {
        setErrorMsg(res.error || "Ticket not found or expired.");
      }
    }
    load();
  }, [token]);

  const handleConfirmRelease = async () => {
    if (token === "demo" || !token) {
      setReleased(true);
      setAskingRelease(false);
      return;
    }
    setReleasing(true);
    try {
      const res = await releaseGuestTicket(token);
      setReleasing(false);
      if (res.success) {
        setReleased(true);
        setAskingRelease(false);
      } else {
        setErrorMsg(res.error || (lang === "es" ? "No se pudo liberar la plaza." : "Failed to release place."));
        setAskingRelease(false);
      }
    } catch (error) {
      setReleasing(false);
      setErrorMsg(lang === "es" ? "Ocurrió un error al liberar tu plaza." : "An error occurred while releasing your place.");
      setAskingRelease(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", color: "#7b1f2c" }}>Loading...</p>
      </div>
    );
  }

  const t = STRINGS[lang] || STRINGS.en;
  const demo = DEMO[lang] || DEMO.en;

  const isDemo = !ticket || token === "demo";
  const displayTitle = ticket?.eventTitle || demo.title;
  const displayGuestName = ticket?.guestName || demo.name;
  const displayMeetingPoint = ticket?.meetingPoint || demo.meetingPoint;
  const displayNeighbourhood = ticket?.neighbourhood || demo.neighbourhood;
  const displayPaid = ticket?.priceCents
    ? (lang === 'es' ? `${Math.round(ticket.priceCents / 100)}€ · tarjeta terminada en 4242` : `€${Math.round(ticket.priceCents / 100)} · card ending 4242`)
    : demo.paid;

  const displayDate = ticket?.startsAt
    ? fmtDate(new Date(ticket.startsAt), lang)
    : fmtDate(new Date(Date.now() + 9 * 24 * 60 * 60 * 1000), lang);

  // Status calculation
  let status: "booked" | "released" | "expired" = "booked";
  if (demoStateOverride) {
    status = demoStateOverride;
  } else if (released || ticket?.status === "released") {
    status = "released";
  } else if (errorMsg && !isDemo) {
    status = "expired";
  } else {
    status = "booked";
  }

  const isBooked = status === "booked";
  const isReleased = status === "released";
  const isExpired = status === "expired";

  const chipStyle = (active: boolean) => ({
    border: active ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.25)",
    color: active ? "#7b1f2c" : "rgba(57,41,42,0.6)",
    background: "transparent",
    borderRadius: "16px",
    padding: "5px 14px",
    fontFamily: "'Lora', Georgia, serif",
    fontSize: "12px",
    cursor: "pointer"
  });

  return (
    <div style={{ background: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Standalone Brand Header matching Ticket.dc.html */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "18px", padding: "20px clamp(24px, 5vw, 64px)", borderBottom: "1px solid rgba(57,41,42,0.16)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <Image src="/assets/logo-mark-alpha.png" alt="The Mothers" width={64} height={64} style={{ height: "64px", width: "auto", display: "block" }} />
          <span aria-hidden="true" style={{ width: "1px", height: "26px", background: "rgba(57,41,42,0.28)", flex: "none" }} />
          <Image src="/assets/logo-wordmark-alpha.png" alt="The Mothers" width={110} height={14} style={{ height: "14px", width: "auto", display: "block" }} />
        </Link>
      </header>

      {/* Main Ticket Card Content */}
      <main style={{ flex: "1 1 auto", width: "100%", maxWidth: "600px", margin: "0 auto", padding: "clamp(34px, 5vw, 60px) clamp(20px, 5vw, 40px) clamp(52px, 7vw, 80px)" }}>
        
        {/* STATE 1: BOOKED */}
        {isBooked && (
          <>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#568b05", marginBottom: "12px" }}>
              {t.kicker}
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(28px, 4.4vw, 40px)", lineHeight: 1.15, margin: "0 0 12px" }}>
              {t.title}
            </h1>
            <p style={{ fontSize: "15.5px", lineHeight: 1.65, color: "rgba(57,41,42,0.72)", margin: "0 0 28px", maxWidth: "46ch", textWrap: "pretty" }}>
              {t.greeting(displayGuestName)}
            </p>

            <div style={{ border: "1px solid rgba(57,41,42,0.2)", borderRadius: "8px", background: "#fff", overflow: "hidden", marginBottom: "22px" }}>
              <div style={{ padding: "22px clamp(20px,3.5vw,28px) 18px", borderBottom: "1px solid rgba(57,41,42,0.14)" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "8px" }}>
                  {t.eventKicker}
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "clamp(20px,3vw,25px)", lineHeight: 1.25 }}>
                  {displayTitle}
                </div>
              </div>
              <dl style={{ margin: 0, padding: "6px clamp(20px,3.5vw,28px) 20px", display: "grid", gridTemplateColumns: "auto 1fr", gap: 0 }}>
                <dt style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.55)", padding: "12px 20px 12px 0", borderBottom: "1px solid rgba(57,41,42,0.1)", whiteSpace: "nowrap" }}>
                  {t.dateLabel}
                </dt>
                <dd style={{ margin: 0, fontSize: "15px", padding: "12px 0", borderBottom: "1px solid rgba(57,41,42,0.1)", fontFeatureSettings: "'tnum'" }}>
                  {displayDate}
                </dd>
                <dt style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.55)", padding: "12px 20px 12px 0", borderBottom: "1px solid rgba(57,41,42,0.1)", whiteSpace: "nowrap" }}>
                  {t.whereLabel}
                </dt>
                <dd style={{ margin: 0, fontSize: "15px", lineHeight: 1.5, padding: "12px 0", borderBottom: "1px solid rgba(57,41,42,0.1)" }}>
                  {displayMeetingPoint}<br />
                  <span style={{ color: "rgba(57,41,42,0.55)", fontSize: "13.5px" }}>{displayNeighbourhood}</span>
                </dd>
                <dt style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.55)", padding: "12px 20px 12px 0", whiteSpace: "nowrap" }}>
                  {t.paidLabel}
                </dt>
                <dd style={{ margin: 0, fontSize: "15px", padding: "12px 0", fontFeatureSettings: "'tnum'" }}>
                  {displayPaid}
                </dd>
              </dl>
            </div>

            <div style={{ display: "flex", gap: "10px", border: "1px solid rgba(86,139,5,0.35)", background: "rgba(86,139,5,0.07)", borderRadius: "6px", padding: "14px 16px", marginBottom: "26px" }}>
              <span style={{ color: "#568b05", flex: "none", marginTop: "2px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)", margin: 0, textWrap: "pretty" }}>
                {t.keepNote}
              </p>
            </div>

            {askingRelease && (
              <div style={{ border: "1px solid rgba(153,56,66,0.4)", background: "rgba(153,56,66,0.05)", borderRadius: "8px", padding: "20px clamp(18px,3vw,24px)", marginBottom: "26px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", marginBottom: "8px" }}>
                  {t.releaseConfirmTitle}
                </div>
                <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 18px", textWrap: "pretty" }}>
                  {t.releaseConfirmBody}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={handleConfirmRelease}
                    disabled={releasing}
                    style={{ border: "1px solid #993842", background: "#993842", color: "#f8efe2", padding: "12px 22px", borderRadius: "5px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px", cursor: "pointer", transition: "background 0.15s ease" }}
                  >
                    {releasing ? "..." : t.releaseConfirmCta}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAskingRelease(false)}
                    style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "rgba(57,41,42,0.7)", padding: "12px 22px", borderRadius: "5px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px", cursor: "pointer" }}
                  >
                    {t.releaseKeep}
                  </button>
                </div>
              </div>
            )}

            <div style={{ border: "1px solid rgba(86,139,5,0.35)", background: "rgba(86,139,5,0.06)", borderRadius: "8px", padding: "20px clamp(18px,3vw,24px)", marginBottom: "26px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.13em", textTransform: "uppercase", color: "#568b05", marginBottom: "10px" }}>
                {t.joinKicker}
              </div>
              <p style={{ fontSize: "14px", lineHeight: 1.65, color: "rgba(57,41,42,0.75)", margin: "0 0 14px", textWrap: "pretty" }}>
                {t.joinBody}
              </p>
              <Link href="/membership" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14.5px", color: "#568b05", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                {t.joinCta}
              </Link>
            </div>

            <div style={{ borderTop: "1px solid rgba(57,41,42,0.16)", paddingTop: "22px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "12px" }}>
                {t.changeKicker}
              </div>
              <p style={{ fontSize: "14px", lineHeight: 1.65, color: "rgba(57,41,42,0.68)", margin: "0 0 16px", maxWidth: "52ch", textWrap: "pretty" }}>
                {t.changeBody}
              </p>
              <button
                type="button"
                onClick={() => setAskingRelease(true)}
                disabled={askingRelease}
                style={{ border: "1px solid rgba(57,41,42,0.32)", background: "transparent", color: "rgba(57,41,42,0.72)", padding: "12px 22px", borderRadius: "5px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14.5px", cursor: "pointer" }}
              >
                {t.releaseCta}
              </button>
            </div>
          </>
        )}

        {/* STATE 2: RELEASED */}
        {isReleased && (
          <div style={{ textAlign: "center", padding: "clamp(20px,4vw,40px) 0" }}>
            <div style={{ color: "rgba(57,41,42,0.45)", marginBottom: "18px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="40" height="40" style={{ margin: "0 auto", display: "block" }}>
                <circle cx="12" cy="12" r="9" />
                <path d="M15 9 9 15M9 9l6 6" />
              </svg>
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "12px" }}>
              {t.releasedKicker}
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(26px,4vw,34px)", lineHeight: 1.2, margin: "0 0 14px" }}>
              {t.releasedTitle}
            </h1>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "rgba(57,41,42,0.72)", margin: "0 auto 28px", maxWidth: "44ch", textWrap: "pretty" }}>
              {t.releasedBody(displayTitle)}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
              <Link
                href="/events"
                style={{ border: "1px solid #7b1f2c", color: "#7b1f2c", padding: "13px 24px", borderRadius: "5px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px", display: "inline-block", textDecoration: "none" }}
              >
                {t.releasedCta}
              </Link>
              <Link
                href="/membership"
                style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", padding: "13px 24px", borderRadius: "5px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px", display: "inline-block", textDecoration: "none" }}
              >
                {t.releasedSecondary}
              </Link>
            </div>
          </div>
        )}

        {/* STATE 3: EXPIRED */}
        {isExpired && (
          <div style={{ textAlign: "center", padding: "clamp(20px,4vw,40px) 0" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "12px" }}>
              {t.expiredKicker}
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(26px,4vw,34px)", lineHeight: 1.2, margin: "0 0 14px" }}>
              {t.expiredTitle}
            </h1>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "rgba(57,41,42,0.72)", margin: "0 auto 28px", maxWidth: "44ch", textWrap: "pretty" }}>
              {t.expiredBody}
            </p>
            <Link
              href="/events"
              style={{ border: "1px solid #7b1f2c", color: "#7b1f2c", padding: "13px 24px", borderRadius: "5px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px", display: "inline-block", textDecoration: "none" }}
            >
              {t.releasedCta}
            </Link>
          </div>
        )}

        <p style={{ fontSize: "12.5px", lineHeight: 1.65, color: "rgba(57,41,42,0.5)", margin: "32px 0 0", textAlign: "center", textWrap: "pretty" }}>
          {t.help} <a href="mailto:hello@themothers.cc" style={{ color: "#7b1f2c", textDecoration: "none" }}>hello@themothers.cc</a>
        </p>

        {/* PROTOTYPE DEMO BAR FOR TESTING */}
        <div style={{ marginTop: "30px", paddingTop: "18px", borderTop: "1px dashed rgba(57,41,42,0.22)", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "11.5px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.45)", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>
            {t.demoKicker}
          </span>
          <button type="button" onClick={() => { setDemoStateOverride("booked"); setReleased(false); }} style={chipStyle(status === "booked")}>
            {t.demoBooked}
          </button>
          <button type="button" onClick={() => { setDemoStateOverride("released"); setReleased(true); }} style={chipStyle(status === "released")}>
            {t.demoReleased}
          </button>
          <button type="button" onClick={() => { setDemoStateOverride("expired"); setReleased(false); }} style={chipStyle(status === "expired")}>
            {t.demoExpired}
          </button>
        </div>

      </main>

      {/* Footer matching Ticket.dc.html */}
      <footer style={{ borderTop: "1px solid rgba(57,41,42,0.16)", padding: "24px clamp(24px, 5vw, 64px)", display: "flex", flexWrap: "wrap", gap: "14px", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.55)" }}>{t.footer}</span>
        <span style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.55)" }}>hello@themothers.cc</span>
      </footer>
    </div>
  );
}
