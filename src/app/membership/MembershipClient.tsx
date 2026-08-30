"use client";

import React, { useState, useEffect, useRef } from "react";
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

  const famTrackRef = useRef<HTMLDivElement>(null);
  const famScroll = (direction: "left" | "right") => {
    if (famTrackRef.current) {
      const scrollAmount = 320;
      famTrackRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
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

        {/* ─── SINGLE MEMBERSHIP TIER (FOUNDING RATE) ─── */}
        <div
          style={{
            border: "2px solid var(--color-accent)",
            borderRadius: "8px",
            padding: "clamp(32px, 5vw, 48px)",
            backgroundColor: "#ffffff",
            boxShadow: "0 24px 60px rgba(45,43,43,0.06)",
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
                  color: "var(--color-accent)",
                  marginBottom: "8px",
                }}
              >
                {lang === "en" ? "MEMBERSHIP — OPENING CIRCLE RATE" : "MEMBRESÍA — TARIFA OPENING CIRCLE"}
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
                  ? "Plus a one-time joining fee of €48 — or €13 if you have taken an Event Pass in the last 30 days."
                  : "Más una cuota única de inscripción de 48€ — o 13€ si has comprado un Event Pass en los últimos 30 días."}
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
                {lang === "en" ? "Apply Now" : "Solicitar plaza"}
              </button>
            ) : (
              <div style={{ flex: "1 1 300px", maxWidth: "400px" }}>
                <p style={{ fontSize: "13px", color: "#993842", fontWeight: 600, marginBottom: "8px" }}>
                  {lang === "en" ? "Applications are currently closed. The window opens for one week a month." : "Las solicitudes están cerradas. La ventana abre una semana al mes."}
                </p>
                <WaitlistForm lang={lang} />
              </div>
            )}
          </div>

          <p style={{ fontFamily: "var(--font-heading)", fontSize: "20px", color: "#39292a", margin: "0 0 20px" }}>
            {lang === "en"
              ? "The full membership, €10 a month less — for our first 50 mothers."
              : "La membresía completa, 10€ menos al mes — para nuestras primeras 50 madres."}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px 24px", marginBottom: "20px" }}>
            {[
              lang === "en" ? "Private member community" : "Comunidad privada de socias",
              lang === "en" ? "Stage groups — by trimester, child's age, and neighbourhood" : "Grupos por etapa — por trimestre, edad del hijo/a y barrio",
              lang === "en" ? "Included walks & park socials, no credits needed" : "Paseos y encuentros en el parque incluidos, sin créditos",
              lang === "en" ? "20 experience credits every month, rolling over with no ceiling" : "20 créditos de experiencias cada mes, acumulables sin límite",
              lang === "en" ? "Partner discounts across 5 categories" : "Descuentos de partners en 5 categorías",
              lang === "en" ? "Priority booking and concierge support" : "Reserva prioritaria y soporte de conserjería",
            ].map((item, idx) => (
              <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "14px", color: "rgba(57,41,42,0.8)" }}>
                <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid rgba(57,41,42,0.14)", paddingTop: "16px", marginBottom: "16px" }}>
            <p style={{ fontSize: "12.5px", lineHeight: "1.55", color: "rgba(57,41,42,0.6)", margin: 0 }}>
              {lang === "en"
                ? `Only ${spotsRemaining} spots remaining at the founding rate. Once the 50 spots are taken, membership becomes €39. Your €29 rate is held for 12 months.`
                : `Solo quedan ${spotsRemaining} plazas a tarifa fundadora. Cuando se ocupen las 50 plazas, la membresía será de 39€. Tu tarifa de 29€ se mantiene 12 meses.`}
            </p>
          </div>
          <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.65)", display: "flex", flexDirection: "column", gap: "6px" }}>
            <p style={{ margin: 0 }}>
              {lang === "en"
                ? "Pause for up to two months a year at no cost (credits are frozen). No cancellation fees, ever."
                : "Pausa tu membresía hasta dos meses al año sin coste (créditos congelados). Nunca hay cuota de cancelación."}
            </p>
            <p style={{ margin: 0 }}>
              {lang === "en"
                ? "All credits roll over and expire six months after they are granted."
                : "Todos los créditos son acumulables y caducan a los seis meses de ser concedidos."}
            </p>
            <p style={{ margin: 0 }}>
              {lang === "en"
                ? "Applications open for one week each month. When the window is shut, join the waitlist."
                : "Las solicitudes abren una semana cada mes. Cuando la ventana está cerrada, únete a la lista de espera."}
            </p>
          </div>
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
              <li>{lang === "en" ? "Two passes per person, and your €35 comes off the joining fee if you join within 30 days." : "Dos pases por persona, y tus 35€ se descuentan de la cuota de inscripción si te unes en 30 días."}</li>
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

      {/* ─── FIVE WAYS TO CONNECT (CAROUSEL MODULE) ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ maxWidth: "640px", margin: "0 auto 44px", textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#568b05",
              marginBottom: "14px",
            }}
          >
            {lang === "en" ? "WHAT'S INCLUDED" : "QUÉ INCLUYE"}
          </div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "clamp(28px, 3.6vw, 40px)", margin: "0 0 14px" }}>
            {lang === "en" ? "Five ways to connect." : "Cinco maneras de conectar."}
          </h2>
          <p style={{ fontSize: "16px", lineHeight: "1.6", color: "rgba(57, 41, 42, 0.7)", margin: "0" }}>
            {lang === "en"
              ? "Included essentials give you a place to start. Credits unlock everything else — each event shows its own credit price on the calendar."
              : "Lo esencial incluido te da un punto de partida. Los créditos desbloquean todo lo demás: cada evento muestra su precio en créditos en el calendario."}
          </p>
        </div>

        <div style={{ position: "relative" }}>
          {/* Scrollable Track */}
          <div
            ref={famTrackRef}
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: "22px",
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              padding: "2px 2px 14px",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                    <path d="M11 20A7 7 0 0 1 4 13c0-4 3-8 9-11 1 5 4 7 4 11a7 7 0 0 1-6 7Z" />
                    <path d="M8 16c5-3 7-7 9-13" />
                  </svg>
                ),
                titleEn: "Easy connection",
                titleEs: "Conexión fácil",
                badgeEn: "Mostly included",
                badgeEs: "Casi siempre incluido",
                bodyEn: "Walks, park socials & hosted meetups. The walks and park socials are usually included in the plan but can cost few credit depending on the partners involved.",
                bodyEs: "Paseos, encuentros en el parque y quedadas con anfitriona. Los paseos y encuentros en el parque son gratis; los cafés y brunchs con anfitriona cuestan 2 créditos, y alguien se encarga de presentar a todas.",
                isGreenBadge: true,
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                    <circle cx="12" cy="8" r="3" />
                    <circle cx="12" cy="16" r="3" />
                    <circle cx="8" cy="12" r="3" />
                    <circle cx="16" cy="12" r="3" />
                    <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
                  </svg>
                ),
                titleEn: "Play date",
                titleEs: "Play date",
                badgeEn: "Credits",
                badgeEs: "Créditos",
                bodyEn: "Yoga, massage, music — your child right beside you.",
                bodyEs: "Yoga, masaje, música — con tu hijo/a a tu lado.",
                isGreenBadge: false,
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                    <path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4ZM6 2v2M10 2v2M14 2v2" />
                  </svg>
                ),
                titleEn: "MoM's date",
                titleEs: "MoM's date",
                badgeEn: "Credits",
                badgeEs: "Créditos",
                bodyEn: "Dinners, wellness, culture — a woman first.",
                bodyEs: "Cenas, bienestar, cultura — una mujer primero.",
                isGreenBadge: false,
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                    <path d="M2 9 12 4l10 5-10 5Z" />
                    <path d="M6 11.5V17c0 1.1 2.7 3 6 3s6-1.9 6-3v-5.5" />
                  </svg>
                ),
                titleEn: "Learn & Grow",
                titleEs: "Aprender y crecer",
                badgeEn: "Credits",
                badgeEs: "Créditos",
                bodyEn: "Expert talks, workshops, and masterclasses.",
                bodyEs: "Charlas de expertas, talleres y masterclasses.",
                isGreenBadge: false,
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M12 2c.6 3.2 1.6 5.7 3 7.1 1.4 1.4 3.9 2.4 7 3-3.1.6-5.6 1.6-7 3-1.4 1.4-2.4 3.9-3 7.1-.6-3.2-1.6-5.7-3-7.1-1.4-1.4-3.9-2.4-7-3 3.1-.6 5.6-1.6 7-3 1.4-1.4 2.4-3.9 3-7.1Z" />
                  </svg>
                ),
                titleEn: "Signature moments",
                titleEs: "Momentos únicos",
                badgeEn: "Credits",
                badgeEs: "Créditos",
                bodyEn: "Seasonal moments and 1:1 expert sessions.",
                bodyEs: "Momentos de temporada y sesiones 1:1 con expertas.",
                isGreenBadge: false,
              },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  flex: "0 0 clamp(238px, 25vw, 276px)",
                  scrollSnapAlign: "start",
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid rgba(57,41,42,0.16)",
                  borderRadius: "6px",
                  padding: "24px 20px",
                  backgroundColor: "#fffdfa",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between", marginBottom: "14px" }}>
                  <span style={{ color: "#7b1f2c" }}>{f.icon}</span>
                  <span
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.04em",
                      color: f.isGreenBadge ? "#568b05" : "#7b1f2c",
                      border: f.isGreenBadge ? "1px solid rgba(86,139,5,0.4)" : "1px solid rgba(123,31,44,0.35)",
                      borderRadius: "10px",
                      padding: "2px 9px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lang === "en" ? f.badgeEn : f.badgeEs}
                  </span>
                </div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "17px", margin: "0 0 6px" }}>
                  {lang === "en" ? f.titleEn : f.titleEs}
                </h3>
                <p style={{ fontSize: "13.5px", lineHeight: "1.55", color: "rgba(57,41,42,0.65)", margin: "0" }}>
                  {lang === "en" ? f.bodyEn : f.bodyEs}
                </p>
              </div>
            ))}
          </div>

          {/* Carousel Buttons */}
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "2px" }}>
            <button
              type="button"
              onClick={() => famScroll("left")}
              aria-label="Previous"
              style={{
                width: "44px",
                height: "44px",
                border: "1px solid rgba(57,41,42,0.24)",
                borderRadius: "50%",
                background: "transparent",
                color: "#7b1f2c",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => famScroll("right")}
              aria-label="Next"
              style={{
                width: "44px",
                height: "44px",
                border: "1px solid rgba(57,41,42,0.24)",
                borderRadius: "50%",
                background: "transparent",
                color: "#7b1f2c",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ─── WHEN YOU ARE READY (BOTTOM CTA MODULE) ─── */}
      <section
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "clamp(36px, 5vw, 56px) clamp(24px, 5vw, 64px) clamp(52px, 7vw, 80px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 400,
            fontSize: "clamp(22px, 2.6vw, 28px)",
            lineHeight: 1.3,
            margin: 0,
            color: "rgba(57, 41, 42, 0.82)",
          }}
        >
          {lang === "en" ? "When you are ready, we are here." : "Cuando estés lista, aquí estamos."}
        </h2>
        <button
          type="button"
          onClick={() => setApplyModalOpen(true)}
          style={{
            border: "1px solid rgba(123, 31, 44, 0.5)",
            color: "#7b1f2c",
            padding: "12px 26px",
            borderRadius: "4px",
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "14.5px",
            whiteSpace: "nowrap",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          {lang === "en" ? "Apply" : "Solicitar plaza"}
        </button>
      </section>

      {/* ─── EXACT PROTOTYPE APPLY MODAL ─── */}
      <ApplyModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}
