"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";
import { WaitlistForm } from "./WaitlistForm";
import { ApplyModal } from "./ApplyModal";

export default function MembershipClient({
  initialWindowOpen,
  initialSpotsRemaining,
  autoOpenApply = false,
}: {
  initialWindowOpen: boolean;
  initialSpotsRemaining: number;
  autoOpenApply?: boolean;
}) {
  const [lang, setLang] = useState<Locale>("en");
  const [windowOpen, setWindowOpen] = useState(initialWindowOpen);
  const [spotsRemaining, setSpotsRemaining] = useState(initialSpotsRemaining);
  const [applyModalOpen, setApplyModalOpen] = useState(autoOpenApply);

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "clamp(48px, 6vw, 88px) clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-accent)",
              marginBottom: "14px",
            }}
          >
            {lang === "en" ? "Membership" : "Membresía"}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(34px, 5vw, 54px)",
              lineHeight: 1.1,
              marginBottom: "16px",
            }}
          >
            {lang === "en"
              ? "One membership. Everything you need to build your circle."
              : "Una sola membresía. Todo lo que necesitas para construir tu círculo."}
          </h1>
          <p style={{ fontSize: "17px", color: "var(--color-text-muted)", maxWidth: "580px", margin: "0 auto" }}>
            {lang === "en"
              ? "Create long-lasting relationships with fellow MoMs in Barcelona."
              : "Crea relaciones duraderas con otras MoMs en Barcelona."}
          </p>
        </div>

        {/* ─── TIER 1: OPENING CIRCLE CARD ─── */}
        <div
          style={{
            border: "2px solid var(--color-accent)",
            borderRadius: "8px",
            padding: "clamp(32px, 5vw, 48px)",
            backgroundColor: "#f8efe2",
            boxShadow: "0 12px 32px rgba(45,43,43,0.08)",
            marginBottom: "32px",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "28px", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: "13px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--color-accent)",
                  }}
                >
                  {lang === "en" ? "Opening Circle" : "Opening Circle"}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: "11px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--color-accent-2)",
                    border: "1px solid rgba(86,139,5,0.5)",
                    borderRadius: "12px",
                    padding: "3px 10px",
                  }}
                >
                  {lang === "en" ? "Launch Offer" : "Oferta de Lanzamiento"}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "28px", color: "rgba(57,41,42,0.42)", textDecoration: "line-through" }}>
                  {lang === "en" ? "€39" : "39€"}
                </span>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "52px", fontWeight: 500, color: "var(--color-accent)" }}>
                  {lang === "en" ? "€29" : "29€"}
                </span>
                <span style={{ fontSize: "16px", color: "rgba(57,41,42,0.6)" }}>
                  {lang === "en" ? "/ month" : "/ mes"}
                </span>
              </div>
              <p style={{ fontSize: "14px", color: "rgba(57,41,42,0.6)", margin: "4px 0 0" }}>
                {lang === "en" ? "or €79 every 3 months" : "o 79€ cada 3 meses"}
              </p>
              <p style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)", margin: "4px 0 0" }}>
                {lang === "en"
                  ? "Plus a one-time €19 joining fee (€48 first payment, or €13 with recent Event Pass)."
                  : "Más una cuota única de inscripción de 19€ (48€ primer pago, o 13€ con Event Pass reciente)."}
              </p>
            </div>

            {windowOpen ? (
              <button
                type="button"
                onClick={() => setApplyModalOpen(true)}
                style={{
                  backgroundColor: "var(--color-accent)",
                  color: "#f8efe2",
                  padding: "13px 28px",
                  borderRadius: "4px",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: "15px",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {lang === "en" ? "Apply as Opening Circle" : "Solicitar plaza Opening Circle"}
              </button>
            ) : (
              <div style={{ flex: "1 1 300px", maxWidth: "400px" }}>
                <WaitlistForm lang={lang} />
              </div>
            )}
          </div>

          <p style={{ fontFamily: "var(--font-heading)", fontSize: "20px", color: "#39292a", margin: "0 0 20px" }}>
            {lang === "en"
              ? "The full membership, €10 a month less — for our first 50 mothers."
              : "La membresía completa, 10€ menos al mes — para nuestras primeras 50 madres."}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px 24px", marginBottom: "20px" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "14.5px" }}>
              <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
              <span>{lang === "en" ? "Everything in The Circle, nothing held back" : "Todo lo incluido en The Circle, sin recortes"}</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "14.5px" }}>
              <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
              <span>{lang === "en" ? "€29 instead of €39, held for a full year" : "29€ en lugar de 39€, fijo durante un año"}</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "14.5px" }}>
              <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
              <span>{lang === "en" ? "In the room from our very first event" : "En la sala desde nuestro primer evento"}</span>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(57,41,42,0.14)", paddingTop: "16px" }}>
            <p style={{ fontSize: "12.5px", lineHeight: "1.55", color: "rgba(57,41,42,0.6)", margin: 0 }}>
              {lang === "en"
                ? `Only ${spotsRemaining} spots remaining. Once the 50 spots are taken, membership opens at €39. Your rate is held for 12 months — pause up to 2 months and you keep it; cancelling releases it.`
                : `Solo quedan ${spotsRemaining} plazas. Cuando se ocupen las 50 plazas, la membresía se abre a 39€. Tu tarifa se mantiene 12 meses — si la pausas hasta 2 meses la conservas; si cancelas se pierde.`}
            </p>
          </div>
        </div>

        {/* ─── TIER 2: THE CIRCLE (LOCKED UNTIL 50 FILL) ─── */}
        <div
          style={{
            border: "1px solid rgba(57, 41, 42, 0.18)",
            borderRadius: "8px",
            padding: "clamp(32px, 5vw, 48px)",
            backgroundColor: "#f8efe2",
            marginBottom: "32px",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "28px", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: "13px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(57,41,42,0.6)",
                  marginBottom: "8px",
                }}
              >
                {lang === "en" ? "The Circle" : "The Circle"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: "52px", fontWeight: 500, color: "#39292a" }}>
                  {lang === "en" ? "€39" : "39€"}
                </span>
                <span style={{ fontSize: "16px", color: "rgba(57,41,42,0.6)" }}>
                  {lang === "en" ? "/ month" : "/ mes"}
                </span>
              </div>
              <p style={{ fontSize: "14px", color: "rgba(57,41,42,0.6)", margin: "4px 0 0" }}>
                {lang === "en" ? "or €99 every 3 months — save around 15%" : "o 99€ cada 3 meses — ahorra alrededor de un 15%"}
              </p>
              <p style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)", margin: "4px 0 0" }}>
                {lang === "en"
                  ? "Standard joining fee €19 (€58 first invoice, or €23 with recent pass)."
                  : "Cuota de inscripción estándar 19€ (58€ primer pago, o 23€ con pase reciente)."}
              </p>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                border: "1px solid rgba(57,41,42,0.25)",
                color: "rgba(57,41,42,0.5)",
                padding: "13px 24px",
                borderRadius: "4px",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "15px",
                whiteSpace: "nowrap",
                backgroundColor: "rgba(57,41,42,0.04)",
                cursor: "not-allowed",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                <rect x="4" y="11" width="16" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              {lang === "en" ? "Opens after the first Membership Window" : "Disponible tras la primera Ventana de membresía"}
            </span>
          </div>

          <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.7)", margin: "0 0 20px" }}>
            {lang === "en"
              ? "The Circle opens to everyone once the first 50 Opening Circle spots are filled."
              : "The Circle se abre a todas cuando se completen las primeras 50 plazas del Opening Circle."}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px 24px", marginBottom: "20px" }}>
            {[
              lang === "en" ? "Private member community" : "Comunidad privada de socias",
              lang === "en" ? "Stage groups — by trimester, child's age, and neighbourhood" : "Grupos por etapa — por trimestre, edad del hijo/a y barrio",
              lang === "en" ? "Included walks & park socials, no credits needed" : "Paseos y encuentros en el parque incluidos, sin créditos",
              lang === "en" ? "20 experience credits every month, rolling over with no ceiling (6-month expiry)" : "20 créditos de experiencias cada mes, acumulables sin límite (caducidad 6 meses)",
              lang === "en" ? "Partner discounts across 5 categories" : "Descuentos de partners en 5 categorías",
              lang === "en" ? "Priority booking on every experience" : "Reserva prioritaria en cada experiencia",
              lang === "en" ? "Priority RSVP & concierge support" : "RSVP prioritario y soporte de conserjería",
            ].map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "14px", color: "rgba(57,41,42,0.8)" }}>
                <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: "13px", color: "rgba(57,41,42,0.55)", borderTop: "1px solid rgba(57,41,42,0.14)", paddingTop: "14px", margin: 0 }}>
            {lang === "en"
              ? "Pause for up to two months a year at no cost. No cancellation fees, ever."
              : "Pausa tu membresía hasta dos meses al año sin coste. Nunca hay cuota de cancelación."}
          </p>
        </div>

        {/* ─── EVENT PASS BLOCK ("Try us before you join") ─── */}
        <div style={{ textAlign: "center", margin: "48px 0 24px" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "clamp(26px, 3.6vw, 36px)", lineHeight: 1.15, margin: "0 0 10px" }}>
            {lang === "en" ? "Try us before you join." : "Pruébanos antes de unirte."}
          </h2>
          <p style={{ fontSize: "15.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", margin: "0 auto", maxWidth: "52ch" }}>
            {lang === "en"
              ? "Come to one event, meet the mothers, see how it feels — no membership, no commitment."
              : "Ven a un evento, conoce a las madres, siente cómo es — sin membresía y sin compromiso."}
          </p>
        </div>

        <div
          style={{
            border: "1px solid rgba(57,41,42,0.18)",
            borderRadius: "8px",
            padding: "clamp(24px, 4vw, 32px) clamp(28px, 4vw, 40px)",
            backgroundColor: "#f8efe2",
            display: "flex",
            flexWrap: "wrap",
            gap: "24px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: "1 1 320px" }}>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-accent-2)",
                marginBottom: "8px",
              }}
            >
              {lang === "en" ? "NOT READY TO JOIN?" : "¿AÚN NO ESTÁS LISTA?"}
            </div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "20px", margin: "0 0 6px" }}>
              {lang === "en" ? "The Event Pass — €35" : "El Event Pass — 35€"}
            </h3>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", margin: "0 0 10px" }}>
              {lang === "en"
                ? "Come as a guest, no membership required — the easiest way to feel the community before you decide."
                : "Ven a un evento como invitada, sin necesidad de membresía — la forma más fácil de sentir la comunidad antes de decidir."}
            </p>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.6)" }}>
              <li>{lang === "en" ? "Two passes per person, and your €35 comes off your first payment if you join within 30 days." : "Dos pases por persona, y tus 35€ se descuentan de tu primer pago si te unes en 30 días."}</li>
              <li style={{ marginTop: "4px" }}>{lang === "en" ? "Most events are open to a pass — the calendar marks what a pass can book." : "Casi todos los eventos aceptan pase — el calendario indica cuáles."}</li>
            </ul>
          </div>

          <div style={{ textAlign: "center", flex: "0 0 auto" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "34px", color: "#39292a" }}>
              {lang === "en" ? "€35" : "35€"}
            </div>
            <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)", marginBottom: "16px" }}>
              {lang === "en" ? "per event" : "por evento"}
            </div>
            <Link
              href="/events"
              style={{
                border: "1px solid var(--color-accent)",
                color: "var(--color-accent)",
                padding: "12px 26px",
                borderRadius: "4px",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "15px",
                whiteSpace: "nowrap",
                background: "transparent",
                display: "inline-block",
                textDecoration: "none",
              }}
            >
              {lang === "en" ? "Get an Event Pass" : "Conseguir Event Pass"}
            </Link>
          </div>
        </div>
      </div>

      {/* ─── EXACT PROTOTYPE APPLY MODAL ─── */}
      <ApplyModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
