"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";
import { getPublicMembershipWindow } from "@/app/actions/publicWindow";

export default function MembershipPage() {
  const [lang, setLang] = useState<Locale>("en");
  const [windowOpen, setWindowOpen] = useState(false);
  const [spotsRemaining, setSpotsRemaining] = useState(0);

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
    getPublicMembershipWindow().then((state) => {
      setWindowOpen(state.open);
      setSpotsRemaining(state.spotsRemaining);
    });
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

            <Link
              href="/membership/apply"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "#f8efe2",
                padding: "13px 28px",
                borderRadius: "4px",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "15px",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {lang === "en" ? "Apply as Opening Circle" : "Solicitar plaza Opening Circle"}
            </Link>
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
            border: "1px solid rgba(57, 41, 42, 0.2)",
            borderRadius: "8px",
            padding: "clamp(32px, 5vw, 48px)",
            backgroundColor: "#fff",
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
                {lang === "en" ? "or €99 every 3 months" : "o 99€ cada 3 meses"}
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
                color: "rgba(57,41,42,0.55)",
                padding: "12px 20px",
                borderRadius: "4px",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "14px",
                backgroundColor: "rgba(57,41,42,0.04)",
              }}
            >
              🔒 {lang === "en" ? "Opens after Opening Window" : "Disponible tras la Opening Window"}
            </span>
          </div>

          <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.7)", margin: "0 0 20px" }}>
            {lang === "en"
              ? "The Circle opens to everyone once the first 50 Opening Circle spots are filled."
              : "The Circle se abre a todas cuando se completen las primeras 50 plazas del Opening Circle."}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px 24px", marginBottom: "20px" }}>
            {[
              lang === "en" ? "Private member community & stage groups" : "Comunidad privada y grupos por etapa",
              lang === "en" ? "Included walks & park socials, no credits needed" : "Paseos y encuentros en el parque incluidos",
              lang === "en" ? "20 experience credits every month (6-month FIFO expiry)" : "20 créditos mensuales para experiencias (caducidad 6 meses)",
              lang === "en" ? "Partner discounts across 5 categories" : "Descuentos en partners de 5 categorías",
              lang === "en" ? "Priority booking on every experience" : "Reserva prioritaria en cada experiencia",
              lang === "en" ? "Option to buy extra credits anytime at €1/credit" : "Compra de créditos extra a 1€/crédito",
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

        {/* ─── TIER 3: INNER CIRCLE (PHASE 2 TEASER) ─── */}
        <div
          style={{
            border: "1px dashed rgba(57,41,42,0.3)",
            borderRadius: "8px",
            padding: "clamp(24px, 4vw, 36px)",
            backgroundColor: "rgba(248, 239, 226, 0.5)",
            marginBottom: "48px",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(57,41,42,0.7)",
              }}
            >
              {lang === "en" ? "The Inner Circle" : "The Inner Circle"}
            </span>
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "11px",
                color: "var(--color-accent-2)",
                border: "1px solid rgba(86,139,5,0.4)",
                borderRadius: "10px",
                padding: "2px 10px",
              }}
            >
              {lang === "en" ? "Coming in Phase 2" : "Próximamente en Fase 2"}
            </span>
          </div>
          <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.65)", margin: 0 }}>
            {lang === "en"
              ? "A smaller, concierge tier with retreats, 1:1 expert access, and priority everything. Opening Circle members will be the first invited."
              : "Un nivel exclusivo con retiros, acceso 1:1 con especialistas y máxima prioridad. Las socias del Opening Circle serán las primeras invitadas."}
          </p>
        </div>

        {/* ─── EVENT PASS BLOCK ─── */}
        <div
          style={{
            border: "1px solid rgba(57,41,42,0.18)",
            borderRadius: "8px",
            padding: "clamp(28px, 4vw, 36px)",
            backgroundColor: "#fff",
            display: "flex",
            flexWrap: "wrap",
            gap: "24px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: "1 1 340px" }}>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "12px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-accent-2)",
                marginBottom: "6px",
              }}
            >
              {lang === "en" ? "Try Us Before You Join" : "Pruébanos Antes de Unirte"}
            </div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 8px" }}>
              {lang === "en" ? "The Event Pass — €35" : "The Event Pass — 35€"}
            </h3>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.72)", margin: 0 }}>
              {lang === "en"
                ? "Two passes per person, ever. Covers any confirmed event up to 18 credits. Join within 30 days and your €35 is credited toward your first membership invoice."
                : "Dos pases por persona en total. Válido para cualquier evento confirmado de hasta 18 créditos. Si te unes en 30 días, tus 35€ se descuentan de tu primer pago."}
            </p>
          </div>

          <Link
            href="/events"
            style={{
              border: "1px solid var(--color-accent)",
              color: "var(--color-accent)",
              padding: "12px 24px",
              borderRadius: "4px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "14.5px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {lang === "en" ? "Get an Event Pass" : "Conseguir Event Pass"}
          </Link>
        </div>
      </div>
    </div>
  );
}
