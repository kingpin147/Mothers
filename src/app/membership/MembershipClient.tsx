"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";
import { WaitlistForm } from "./WaitlistForm";
import { ApplyModal } from "./ApplyModal";

const FOUNDING_CAP = 50;
const SCARCITY_FROM = 35; // show progress bar when ≥35 spots taken (≤15 remaining)

export default function MembershipClient({
  initialWindowOpen,
  initialSpotsRemaining,
  nextWindowDate = null,
  autoOpenApply = false,
}: {
  initialWindowOpen: boolean;
  initialSpotsRemaining: number;
  nextWindowDate?: string | null;
  autoOpenApply?: boolean;
}) {
  const [lang, setLang] = useState<Locale>("en");
  const [windowOpen] = useState(initialWindowOpen);
  const [spotsRemaining] = useState(initialSpotsRemaining);
  const [applyModalOpen, setApplyModalOpen] = useState(autoOpenApply);
  const famTrackRef = useRef<HTMLDivElement>(null);

  const famScroll = (direction: "left" | "right") => {
    if (famTrackRef.current) {
      famTrackRef.current.scrollBy({ left: direction === "left" ? -280 : 280, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  const isEn = lang === "en";

  // Scarcity helpers
  const spotsTaken = FOUNDING_CAP - spotsRemaining;
  const spotsPct = Math.round((spotsTaken / FOUNDING_CAP) * 100);
  const showSpotsProgress = spotsTaken >= SCARCITY_FROM;
  const spotsFull = spotsRemaining <= 0;

  // Circle tier helpers
  const circleLocked = spotsRemaining > 0;
  const circleOpen = windowOpen && spotsFull;
  const circleCardBorder = spotsFull ? "2px solid #7b1f2c" : "1px solid rgba(57,41,42,0.2)";
  const circleAccent = spotsFull ? "#7b1f2c" : "rgba(57,41,42,0.55)";
  const circlePriceColor = spotsFull ? "#7b1f2c" : "rgba(57,41,42,0.72)";
  const circleCardBg = spotsFull ? "#f8efe2" : "#faf4ea";

  // Dynamic next-window date line
  const nextWindowLine = (() => {
    if (!nextWindowDate) {
      return isEn
        ? "There is no date for the next one yet — leave your name and we will write to you before anyone else hears, whenever it opens."
        : "Todavía no hay fecha para la siguiente — déjanos tu nombre y te escribiremos antes que a nadie cuando se abra.";
    }
    const d = new Date(nextWindowDate).toLocaleDateString(isEn ? "en-GB" : "es-ES", {
      day: "numeric", month: "long", year: "numeric",
    });
    return isEn
      ? `The next Window opens on ${d}. Leave your name and we will write to you the day it does, before anyone else hears.`
      : `La próxima Ventana abre el ${d}. Déjanos tu nombre y te escribiremos ese mismo día, antes que a nadie.`;
  })();

  // Icon helpers
  const CheckIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
  const LockIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh" }}>

      {/* ── HERO HEADER ── */}
      <section style={{ maxWidth: "800px", margin: "0 auto", padding: "clamp(56px,8vw,96px) clamp(24px,5vw,64px) clamp(24px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: "16px" }}>
          {isEn ? "Membership" : "Membresía"}
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "clamp(36px,5vw,56px)", lineHeight: 1.1, margin: "0 0 20px" }}>
          {isEn ? "One membership. Everything you need to build your circle." : "Una sola membresía. Todo lo que necesitas para construir tu círculo."}
        </h1>
        <p style={{ fontSize: "17px", lineHeight: "1.65", color: "rgba(57,41,42,0.72)", margin: 0 }}>
          {isEn ? "Create long-lasting relationships with fellow MoMs." : "Crea relaciones duraderas con otras MoMs."}
        </p>
      </section>

      {/* ── WINDOW CLOSED AMBER BLOCK ── */}
      {!windowOpen && (
        <section style={{ maxWidth: "960px", margin: "0 auto", padding: "clamp(20px,3vw,28px) clamp(24px,5vw,64px) clamp(28px,4vw,40px)" }}>
          <div style={{ border: "1px solid rgba(164,118,31,0.55)", background: "#fff3e4", borderRadius: "8px", padding: "clamp(26px,4vw,38px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "12px" }}>
              <span style={{ color: "#a4761f", display: "flex" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "12.5px", letterSpacing: "0.13em", textTransform: "uppercase", color: "#a4761f" }}>
                {isEn ? "Applications closed" : "Solicitudes cerradas"}
              </div>
            </div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "clamp(24px,3.4vw,32px)", lineHeight: 1.2, margin: "0 0 14px" }}>
              {isEn ? "The Membership Window is closed for now." : "La Ventana de membresía está cerrada por ahora."}
            </h2>
            <p style={{ fontSize: "15.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.75)", margin: "0 0 10px", maxWidth: "60ch" }}>
              {isEn
                ? "We open applications in Windows so every new group can be placed properly, and this one has closed."
                : "Abrimos las solicitudes por Ventanas para poder colocar bien a cada grupo nuevo, y esta ya se ha cerrado."}
            </p>
            <p style={{ fontSize: "15.5px", lineHeight: "1.65", color: "#7b1f2c", margin: "0 0 16px", maxWidth: "60ch" }}>
              {nextWindowLine}
            </p>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.6)", margin: "0 0 22px", maxWidth: "60ch" }}>
              {isEn
                ? "Walks and park socials stay open to everyone in the meantime, and you can still take an Event Pass for one paid event."
                : "Mientras tanto, los paseos y encuentros en el parque siguen abiertos a todas, y puedes conseguir un Event Pass para un evento de pago."}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
              <WaitlistForm lang={lang} />
              <Link href="/events" style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", padding: "13px 24px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "15px", textDecoration: "none", display: "inline-block" }}>
                {isEn ? "See what is on" : "Ver qué hay"}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── OPENING CIRCLE FOUNDING CARD ── */}
      {windowOpen && spotsRemaining > 0 && (
        <section style={{ maxWidth: "960px", margin: "0 auto", padding: "0 clamp(24px,5vw,64px) clamp(28px,4vw,40px)" }}>
          <div style={{ border: "2px solid #7b1f2c", borderRadius: "8px", padding: "clamp(32px,5vw,52px)", background: "#f8efe2", boxShadow: "0 12px 32px rgba(45,43,43,0.08)" }}>

            {/* Price + CTA row */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "32px", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "26px" }}>
              <div>
                {/* Badges */}
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c" }}>
                    OPENING CIRCLE
                  </div>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#568b05", border: "1px solid rgba(86,139,5,0.5)", borderRadius: "12px", padding: "3px 10px", whiteSpace: "nowrap" }}>
                    {isEn ? "Launch offer" : "Oferta de lanzamiento"}
                  </span>
                </div>
                {/* Price */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "30px", color: "rgba(57,41,42,0.42)", textDecoration: "line-through" }}>{isEn ? "€39" : "39€"}</span>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "clamp(44px,6vw,56px)", lineHeight: 1, color: "#7b1f2c" }}>{isEn ? "€29" : "29€"}</span>
                  <span style={{ fontSize: "17px", color: "rgba(57,41,42,0.6)" }}>{isEn ? "/ month" : "/ mes"}</span>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(57,41,42,0.62)", margin: "10px 0 0" }}>{isEn ? "or €79 every 3 months" : "o 79€ cada 3 meses"}</p>
                <p style={{ fontSize: "13px", lineHeight: "1.5", color: "rgba(57,41,42,0.62)", margin: "3px 0 0" }}>
                  {isEn
                    ? "Plus a one-time €19 joining fee, charged with your first payment — €48 in all. No joining fee at all if you have taken an Event Pass in the last 30 days."
                    : "Más una cuota única de inscripción de 19€, que se cobra con tu primer pago — 48€ en total. Sin cuota de inscripción si has tomado un Event Pass en los últimos 30 días."}
                </p>
                {/* Launch note */}
                <p style={{ fontSize: "13px", lineHeight: "1.55", color: "#568b05", margin: "10px 0 0", maxWidth: "38ch" }}>
                  {isEn
                    ? "Enrolling now locks your rate for 12 months — once the 50 spots are gone, Circle price is €39."
                    : "Inscribirte ahora fija tu tarifa durante 12 meses — cuando se agoten las 50 plazas, el precio del Circle es 39€."}
                </p>
              </div>
              {/* CTA */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                <button type="button" onClick={() => setApplyModalOpen(true)} style={{ border: "1px solid #7b1f2c", background: "#7b1f2c", color: "#f8efe2", padding: "14px 30px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "16px", whiteSpace: "nowrap", cursor: "pointer" }}>
                  {isEn ? "Apply as an Opening Circle member" : "Solicitar plaza del Opening Circle"}
                </button>
                <span style={{ fontSize: "12.5px", color: "#568b05" }}>
                  {isEn ? "Offered once, and never again" : "Una sola vez, y nunca más"}
                </span>
              </div>
            </div>

            {/* Body headline */}
            <p style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "22px", lineHeight: "1.4", color: "#39292a", margin: "0 0 24px", maxWidth: "40ch" }}>
              {isEn ? "The full membership, €10 a month less — for our first 50 mothers." : "La membresía completa, 10€ menos al mes — para nuestras primeras 50 madres."}
            </p>

            {/* Perks */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "13px 32px", marginBottom: "28px" }}>
              {(isEn ? [
                "Private member community",
                "Stage groups — by trimester, child's age and neighbourhood",
                "20 experience credits every month, rolling over with no ceiling",
                "Walks and park socials included, no credits needed",
                "Partner perks across five categories",
                "Priority booking and concierge support",
              ] : [
                "Comunidad privada de socias",
                "Grupos por etapa — por trimestre, edad de tu hijo y barrio",
                "20 créditos de experiencia cada mes, acumulables sin techo",
                "Paseos y quedadas en el parque incluidos, sin gastar créditos",
                "Ventajas con partners en cinco categorías",
                "Reserva prioritaria y atención personal",
              ]).map((perk, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "15px", lineHeight: "1.5" }}>
                  <span style={{ flexShrink: 0, color: "#568b05", marginTop: "3px" }}><CheckIcon /></span>
                  <span>{perk}</span>
                </div>
              ))}
            </div>

            {/* Fine print block */}
            <div style={{ borderTop: "1px solid rgba(57,41,42,0.16)", paddingTop: "20px" }}>
              {/* Scarcity progress bar */}
              {showSpotsProgress && (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "16px", marginBottom: "8px" }}>
                    <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "15px", color: "#7b1f2c" }}>
                      {isEn ? "Opening Circle rate, first 50 members" : "Tarifa de Opening Circle, primeras 50 socias"}
                    </div>
                    <span style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.6)", whiteSpace: "nowrap" }}>
                      {isEn
                        ? `${spotsRemaining} of ${FOUNDING_CAP} Opening Circle spots remaining`
                        : `${spotsRemaining} de ${FOUNDING_CAP} plazas del Opening Circle disponibles`}
                    </span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "3px", background: "rgba(57,41,42,0.12)", overflow: "hidden", marginBottom: "16px" }}>
                    <div style={{ height: "100%", background: "#7b1f2c", borderRadius: "3px", width: `${spotsPct}%`, transition: "width 0.4s ease" }} />
                  </div>
                </>
              )}
              {/* Good to know label */}
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.13em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "8px" }}>
                {isEn ? "Good to know" : "Conviene saber"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "7px 32px" }}>
                {(isEn ? [
                  "Once the 50 places are taken, membership opens at €39. Your €29 is held for a full twelve months.",
                  "Applications open one week a month. When the Window is shut, join the waitlist.",
                  "Pause for up to two months a year at no cost — your credits freeze with you.",
                  "Credits roll over with no ceiling and expire six months after they are granted. No cancellation fees, ever.",
                ] : [
                  "Cuando se ocupen las 50 plazas, la membresía se abre a 39€. Tus 29€ se mantienen doce meses completos.",
                  "Las solicitudes se abren una semana al mes. Si la Ventana está cerrada, únete a la lista de espera.",
                  "Puedes pausar hasta dos meses al año sin coste — tus créditos se congelan contigo.",
                  "Los créditos se acumulan sin techo y caducan seis meses después de concederse. Sin penalizaciones por cancelar, nunca.",
                ]).map((line, i) => (
                  <p key={i} style={{ fontSize: "12.5px", lineHeight: "1.5", color: "rgba(57,41,42,0.6)", margin: 0 }}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── THE CIRCLE CARD ── */}
      <section style={{ maxWidth: "960px", margin: "0 auto", padding: "0 clamp(24px,5vw,64px) clamp(28px,4vw,40px)" }}>
        <div style={{ border: circleCardBorder, borderRadius: "8px", padding: "clamp(32px,5vw,52px)", background: circleCardBg, boxShadow: spotsFull ? "0 12px 32px rgba(45,43,43,0.08)" : "none" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "32px", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
            <div>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: circleAccent, marginBottom: "10px" }}>THE CIRCLE</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "52px", color: circlePriceColor }}>{isEn ? "€39" : "39€"}</span>
                <span style={{ fontSize: "16px", color: "rgba(57,41,42,0.55)" }}>{isEn ? "/ month" : "/ mes"}</span>
              </div>
              <p style={{ fontSize: "14px", color: "rgba(57,41,42,0.55)", margin: "4px 0 0" }}>
                {isEn ? "or €99 every 3 months — save around 15%" : "o 99€ cada 3 meses — ahorra alrededor de un 15%"}
              </p>
            </div>
            <div>
              {circleLocked && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", border: "1px solid rgba(57,41,42,0.25)", color: "rgba(57,41,42,0.5)", padding: "13px 24px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "15px", whiteSpace: "nowrap", background: "rgba(57,41,42,0.04)", cursor: "not-allowed" }}>
                  <LockIcon />{isEn ? "Opens after the first Membership Window" : "Disponible tras la primera Ventana de membresía"}
                </span>
              )}
              {circleOpen && (
                <button type="button" onClick={() => setApplyModalOpen(true)} style={{ border: "1px solid #7b1f2c", background: "#7b1f2c", color: "#f8efe2", padding: "13px 28px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "15px", whiteSpace: "nowrap", cursor: "pointer" }}>
                  {isEn ? "Join now" : "Únete ahora"}
                </button>
              )}
            </div>
          </div>
          {circleLocked && (
            <p style={{ fontSize: "14px", lineHeight: "1.55", color: "rgba(57,41,42,0.65)", margin: "0 0 26px", maxWidth: "60ch" }}>
              {isEn ? "The Circle opens to everyone once the first 50 Opening Circle spots are filled." : "The Circle se abre a todas cuando se completen las primeras 50 plazas del Opening Circle."}
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px 24px", marginBottom: "26px" }}>
            {(isEn ? [
              "Private member community",
              "Stage groups — by trimester, child's age, and neighbourhood",
              "Included walks & park socials, no credits needed",
              "20 experience credits every month, rolling over with no ceiling — they expire six months after they land",
              "Partner discounts across five categories",
              "Priority booking on every experience",
              "Priority RSVP & concierge support",
            ] : [
              "Comunidad privada de socias",
              "Grupos por etapa — por trimestre de embarazo, edad del hijo/a y barrio",
              "Paseos y encuentros en el parque incluidos, sin créditos",
              "20 créditos de experiencias cada mes, acumulables sin límite — caducan seis meses después de otorgarse",
              "Descuentos de partners en cinco categorías",
              "Reserva prioritaria en cada experiencia",
              "RSVP prioritario y soporte de conserjería",
            ]).map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "15px", lineHeight: "1.5", color: "rgba(57,41,42,0.8)" }}>
                <span style={{ flexShrink: 0, color: "rgba(86,139,5,0.65)", marginTop: "3px" }}><CheckIcon /></span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "13px", color: "rgba(57,41,42,0.55)", borderTop: "1px solid rgba(57,41,42,0.16)", paddingTop: "16px", margin: 0 }}>
            {isEn ? "Pause for up to two months a year at no cost. No cancellation fees, ever." : "Pausa tu membresía hasta dos meses al año sin coste. Nunca hay cuota de cancelación."}
          </p>
        </div>
      </section>

      {/* ── EVENT PASS BLOCK ── */}
      <section style={{ maxWidth: "960px", margin: "0 auto", padding: "0 clamp(24px,5vw,64px) clamp(56px,7vw,96px)" }}>
        <div style={{ textAlign: "center", marginBottom: "clamp(20px,3vw,28px)" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "clamp(28px,3.6vw,40px)", lineHeight: 1.15, margin: "0 0 10px" }}>
            {isEn ? "Try us before you join." : "Pruébanos antes de unirte."}
          </h2>
          <p style={{ fontSize: "16px", lineHeight: "1.6", color: "rgba(57,41,42,0.7)", margin: "0 auto", maxWidth: "52ch" }}>
            {isEn ? "Come to one event, meet the mothers, see how it feels — no membership, no commitment." : "Ven a un evento, conoce a las madres, siente cómo es — sin membresía y sin compromiso."}
          </p>
        </div>
        <div style={{ border: "1px solid rgba(57,41,42,0.18)", borderRadius: "8px", padding: "clamp(24px,4vw,32px) clamp(28px,4vw,40px)", background: "#f8efe2", display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 320px" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#568b05", marginBottom: "8px" }}>
              {isEn ? "Not ready to join?" : "¿Aún no estás lista?"}
            </div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "20px", margin: "0 0 6px" }}>
              {isEn ? "The Event Pass — €35" : "El Event Pass — 35€"}
            </h3>
            <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.7)", margin: "0 0 10px" }}>
              {isEn ? "Come as a guest, no membership required — the easiest way to feel the community before you decide." : "Ven como invitada, sin necesidad de membresía — la forma más fácil de sentir la comunidad antes de decidir."}
            </p>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", lineHeight: "1.6", color: "rgba(57,41,42,0.6)" }}>
              <li>{isEn ? "Two passes per person, and no joining fee at all if you join within 30 days." : "Dos pases por persona, y sin cuota de inscripción si te unes en 30 días."}</li>
              <li style={{ marginTop: "4px" }}>{isEn ? "Most events are open to a pass — the calendar marks what a pass can book." : "Casi todos los eventos aceptan pase — el calendario indica cuáles."}</li>
            </ul>
          </div>
          <div style={{ textAlign: "center", flex: "0 0 auto" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "34px", color: "#39292a" }}>{isEn ? "€35" : "35€"}</div>
            <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)", marginBottom: "16px" }}>{isEn ? "per event" : "por evento"}</div>
            <Link href="/events" style={{ border: "1px solid #7b1f2c", color: "#7b1f2c", padding: "12px 26px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "15px", whiteSpace: "nowrap", background: "transparent", display: "inline-block", textDecoration: "none" }}>
              {isEn ? "Get an Event Pass" : "Conseguir un Event Pass"}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FIVE WAYS TO CONNECT ── */}
      <section style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(48px,6vw,80px) clamp(24px,5vw,64px)", borderTop: "1px solid rgba(57,41,42,0.16)" }}>
        <div style={{ maxWidth: "640px", margin: "0 auto 44px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#568b05", marginBottom: "14px" }}>
            {isEn ? "What's included" : "Qué incluye"}
          </div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "clamp(28px,3.6vw,40px)", margin: "0 0 14px" }}>
            {isEn ? "Five ways to connect." : "Cinco maneras de conectar."}
          </h2>
          <p style={{ fontSize: "16px", lineHeight: "1.6", color: "rgba(57,41,42,0.7)", margin: 0 }}>
            {isEn ? "Included essentials give you a place to start. Credits unlock everything else — each event shows its own credit price on the calendar." : "Lo esencial incluido te da un punto de partida. Los créditos desbloquean todo lo demás: cada evento muestra su precio en créditos en el calendario."}
          </p>
        </div>
        <div style={{ position: "relative" }}>
          <div ref={famTrackRef} style={{ display: "flex", alignItems: "stretch", gap: "22px", overflowX: "auto", scrollSnapType: "x mandatory", scrollBehavior: "smooth", padding: "2px 2px 14px", scrollbarWidth: "none" }}>
            {([
              { icon: "flame", en: ["Easy connection","Mostly included","Walks, park socials & hosted meetups. Usually included in the plan, occasionally a few credits depending on the partner."], es: ["Conexión fácil","Casi siempre incluido","Paseos, encuentros en el parque y quedadas con anfitriona. Los paseos son gratis; los cafés con anfitriona cuestan 2 créditos."], green: true },
              { icon: "cluster", en: ["Play date","Credits","Yoga, massage, music — your child right beside you."], es: ["Play date","Créditos","Yoga, masaje, música — con tu hijo/a a tu lado."], green: false },
              { icon: "cup", en: ["MoM's date","Credits","Dinners, wellness, culture — a woman first."], es: ["MoM's date","Créditos","Cenas, bienestar, cultura — una mujer primero."], green: false },
              { icon: "edu", en: ["Learn & Grow","Credits","Expert talks, workshops, and masterclasses."], es: ["Aprender y crecer","Créditos","Charlas de expertas, talleres y masterclasses."], green: false },
              { icon: "star", en: ["Signature moments","Credits","Seasonal moments and 1:1 expert sessions."], es: ["Momentos únicos","Créditos","Momentos de temporada y sesiones 1:1 con expertas."], green: false },
            ] as const).map((f, i) => {
              const [title, badge, body] = isEn ? f.en : f.es;
              return (
                <div key={i} style={{ flex: "0 0 clamp(238px,25vw,276px)", scrollSnapAlign: "start", display: "flex", flexDirection: "column", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "6px", padding: "24px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "14px" }}>
                    <span style={{ color: "#7b1f2c" }}>
                      {f.icon === "flame" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M11 20A7 7 0 0 1 4 13c0-4 3-8 9-11 1 5 4 7 4 11a7 7 0 0 1-6 7Z" /><path d="M8 16c5-3 7-7 9-13" /></svg>}
                      {f.icon === "cluster" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><circle cx="12" cy="8" r="3" /><circle cx="12" cy="16" r="3" /><circle cx="8" cy="12" r="3" /><circle cx="16" cy="12" r="3" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /></svg>}
                      {f.icon === "cup" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4ZM6 2v2M10 2v2M14 2v2" /></svg>}
                      {f.icon === "edu" && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22"><path d="M2 9 12 4l10 5-10 5Z" /><path d="M6 11.5V17c0 1.1 2.7 3 6 3s6-1.9 6-3v-5.5" /></svg>}
                      {f.icon === "star" && <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2c.6 3.2 1.6 5.7 3 7.1 1.4 1.4 3.9 2.4 7 3-3.1.6-5.6 1.6-7 3-1.4 1.4-2.4 3.9-3 7.1-.6-3.2-1.6-5.7-3-7.1-1.4-1.4-3.9-2.4-7-3 3.1-.6 5.6-1.6 7-3 1.4-1.4 2.4-3.9 3-7.1Z" /></svg>}
                    </span>
                    <span style={{ fontSize: "11px", letterSpacing: "0.04em", color: f.green ? "#568b05" : "#7b1f2c", border: f.green ? "1px solid rgba(86,139,5,0.4)" : "1px solid rgba(123,31,44,0.35)", borderRadius: "10px", padding: "2px 9px", whiteSpace: "nowrap" }}>{badge}</span>
                  </div>
                  <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "17px", margin: "0 0 6px" }}>{title}</h3>
                  <p style={{ fontSize: "13.5px", lineHeight: "1.55", color: "rgba(57,41,42,0.65)", margin: 0 }}>{body}</p>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "2px" }}>
            {(["left","right"] as const).map((dir) => (
              <button key={dir} type="button" onClick={() => famScroll(dir)} aria-label={dir === "left" ? "Previous" : "Next"} style={{ width: "44px", height: "44px", border: "1px solid rgba(57,41,42,0.24)", borderRadius: "50%", background: "transparent", color: "#7b1f2c", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
                  {dir === "left" ? <><path d="M19 12H5" /><path d="M11 18l-6-6 6-6" /></> : <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>}
                </svg>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── INNER CIRCLE — PHASE 2 (dormant, hidden by default) ── */}
      {(false as boolean) && (
        <section style={{ maxWidth: "960px", margin: "0 auto", padding: "clamp(24px,4vw,40px) clamp(24px,5vw,64px) clamp(56px,7vw,96px)", borderTop: "1px solid rgba(57,41,42,0.16)" }}>
          <div style={{ border: "1px dashed rgba(57,41,42,0.3)", borderRadius: "8px", padding: "clamp(28px,4vw,44px)", opacity: 0.82 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.7)" }}>THE INNER CIRCLE</div>
              <span style={{ fontSize: "12px", letterSpacing: "0.02em", color: "#568b05", border: "1px solid rgba(86,139,5,0.4)", borderRadius: "10px", padding: "3px 11px" }}>
                {isEn ? "Coming in Phase 2" : "Llega en la Fase 2"}
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "flex-end", justifyContent: "space-between" }}>
              <p style={{ fontSize: "15px", lineHeight: "1.65", color: "rgba(57,41,42,0.62)", maxWidth: "560px", margin: 0 }}>
                {isEn
                  ? "A smaller, more concierge tier — smaller groups, retreats, 1:1 expert access, priority everything. We're opening this once our community is proven. Opening Circle members will be the first to know."
                  : "Un nivel más reducido y de estilo conserjería — grupos más pequeños, retiros, acceso 1:1 a expertas y prioridad en todo. Lo abriremos una vez que nuestra comunidad esté probada."}
              </p>
              <span style={{ border: "1px solid rgba(57,41,42,0.25)", color: "rgba(57,41,42,0.45)", padding: "12px 26px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "15px", whiteSpace: "nowrap", cursor: "not-allowed" }}>
                {isEn ? "Not yet open" : "Aún no disponible"}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── WHEN YOU ARE READY ── */}
      <section style={{ maxWidth: "960px", margin: "0 auto", padding: "clamp(36px,5vw,56px) clamp(24px,5vw,64px) clamp(52px,7vw,80px)", borderTop: "1px solid rgba(57,41,42,0.16)", display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "clamp(22px,2.6vw,28px)", lineHeight: 1.3, margin: 0, color: "rgba(57,41,42,0.82)" }}>
          {isEn ? "When you are ready, we are here." : "Cuando estés lista, aquí estamos."}
        </h2>
        <button type="button" onClick={() => setApplyModalOpen(true)} style={{ border: "1px solid rgba(123,31,44,0.5)", color: "#7b1f2c", padding: "12px 26px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14.5px", whiteSpace: "nowrap", background: "transparent", cursor: "pointer" }}>
          {windowOpen ? (isEn ? "Apply" : "Solicitar plaza") : (isEn ? "Join the waitlist" : "Unirme a la lista de espera")}
        </button>
      </section>

      {/* ── APPLY MODAL ── */}
      <ApplyModal isOpen={applyModalOpen} onClose={() => setApplyModalOpen(false)} lang={lang} />
    </div>
  );
}
