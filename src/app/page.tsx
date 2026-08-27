"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { DICTIONARIES, Locale } from "@/lib/i18n";
import { getPublicMembershipWindow, subscribeToLetter } from "@/app/actions/publicWindow";

export default function HomePage() {
  const [lang, setLang] = useState<Locale>("en");
  const [windowOpen, setWindowOpen] = useState(false);
  const [spotsRemaining, setSpotsRemaining] = useState(0);
  const umbTrackRef = useRef<HTMLDivElement>(null);
  const [letterEmail, setLetterEmail] = useState("");
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterDone, setLetterDone] = useState(false);
  const [letterError, setLetterError] = useState<string | null>(null);

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

  const t = DICTIONARIES[lang];

  const scrollUmb = (dir: number) => {
    if (!umbTrackRef.current) return;
    const card = umbTrackRef.current.firstElementChild as HTMLElement;
    const step = card ? card.getBoundingClientRect().width + 22 : 280;
    umbTrackRef.current.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh" }}>
      {/* ─── HERO SECTION ─── */}
      <section
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "clamp(48px, 7vw, 96px) clamp(24px, 5vw, 64px) clamp(40px, 6vw, 64px)",
          display: "flex",
          flexWrap: "wrap",
          gap: "48px",
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 440px", minWidth: "300px" }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-accent)",
              marginBottom: "16px",
            }}
          >
            {t.hero.kicker}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 400,
              fontSize: "clamp(40px, 5.5vw, 70px)",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              margin: "0 0 20px",
            }}
          >
            {t.hero.title}
          </h1>
          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.65,
              color: "rgba(57, 41, 42, 0.78)",
              maxWidth: "520px",
              margin: "0 0 14px",
            }}
          >
            {t.hero.subtitle}
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(57, 41, 42, 0.62)",
              borderTop: "1px solid rgba(57, 41, 42, 0.16)",
              paddingTop: "14px",
              marginTop: "22px",
              maxWidth: "460px",
            }}
          >
            {windowOpen ? t.hero.windowNoteOpen : t.hero.windowNoteClosed}
          </p>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "24px", flexWrap: "wrap" }}>
            <Link
              href={windowOpen ? "/membership/apply" : "/membership"}
              className="btn btn-primary"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "#f8efe2",
                padding: "13px 28px",
                borderRadius: "4px",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "15px",
                textDecoration: "none",
              }}
            >
              {windowOpen ? t.hero.ctaPrimary : t.hero.ctaWaitlist}
            </Link>
            <Link
              href="/membership"
              style={{
                color: "var(--color-accent)",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "16px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                textDecoration: "none",
              }}
            >
              {t.hero.ctaSecondary} →
            </Link>
          </div>
        </div>

        {/* Hero Visual */}
        <div style={{ flex: "1 1 380px", minWidth: "280px" }}>
          <div
            style={{
              background: "#ecdcd0",
              padding: "8px",
              borderRadius: "6px",
              boxShadow: "0 12px 32px rgba(45,43,43,0.14)",
            }}
          >
            <div
              style={{
                border: "1px solid rgba(57, 41, 42, 0.18)",
                borderRadius: "3px",
                overflow: "hidden",
                height: "440px",
                backgroundColor: "#f4ece1",
              }}
            >
              <img
                src="/assets/home-hero.webp"
                alt="Mothers in Barcelona walking and enjoying coffee together"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHY THE MOTHERS (THREE PILLARS) ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(36px, 5vw, 64px) clamp(24px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "40px" }}>
          <div style={{ flex: "1 1 380px", minWidth: "280px" }}>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-accent-2)",
                marginBottom: "16px",
              }}
            >
              {t.why.kicker}
            </div>
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "clamp(28px, 3.6vw, 40px)",
                lineHeight: 1.15,
                margin: "0 0 20px",
              }}
            >
              {t.why.heading}
            </h2>
            <p style={{ fontSize: "16.5px", lineHeight: 1.7, color: "rgba(57, 41, 42, 0.78)" }}>
              {t.why.body}
            </p>
          </div>

          <div style={{ flex: "1 1 420px", minWidth: "280px", display: "flex", flexDirection: "column", gap: "28px" }}>
            {t.why.pillars.map((pillar, idx) => (
              <div key={idx} style={{ display: "flex", gap: "16px" }}>
                <div
                  style={{
                    flex: "none",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "1px solid rgba(123, 31, 44, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-accent)",
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                    {idx === 0 && (
                      <>
                        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                        <circle cx="10" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </>
                    )}
                    {idx === 1 && (
                      <>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                        <path d="m9 12 2 2 4-4" />
                      </>
                    )}
                    {idx === 2 && (
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                    )}
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "19px", margin: "0 0 4px" }}>
                    {pillar.title}
                  </h3>
                  <p style={{ fontSize: "15px", lineHeight: 1.55, color: "rgba(57, 41, 42, 0.68)", margin: 0 }}>
                    {pillar.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS (THREE STEPS) ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(36px, 5vw, 64px) clamp(24px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 36px" }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-accent)",
              marginBottom: "10px",
            }}
          >
            {t.how.kicker}
          </div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "clamp(28px, 3.6vw, 40px)", margin: 0 }}>
            {t.how.heading}
          </h2>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", justifyContent: "center" }}>
          {t.how.steps.map((step, idx) => (
            <div key={idx} style={{ flex: "1 1 260px", maxWidth: "320px", textAlign: "center", padding: "0 12px" }}>
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 400,
                  fontSize: "38px",
                  lineHeight: 1.1,
                  color: "rgba(123, 31, 44, 0.3)",
                  marginBottom: "6px",
                }}
              >
                {step.n}
              </div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "21px", margin: "0 0 6px" }}>
                {step.title}
              </h3>
              <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.68)", margin: 0 }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── MEMBERSHIP TEASER CARD ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(36px, 5vw, 64px) clamp(24px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "48px",
            alignItems: "center",
            justifyContent: "space-between",
            border: "1px solid rgba(57, 41, 42, 0.18)",
            borderRadius: "8px",
            padding: "clamp(32px, 5vw, 56px)",
            backgroundColor: "#f8efe2",
          }}
        >
          <div style={{ flex: "1 1 380px", minWidth: "280px" }}>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                marginBottom: "12px",
              }}
            >
              {t.membershipTeaser.kicker}
            </div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "clamp(30px, 4vw, 40px)", margin: "0 0 10px" }}>
              {t.membershipTeaser.heading}
            </h2>
            <p style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "22px", color: "var(--color-accent)", margin: "0 0 4px" }}>
              {t.membershipTeaser.price}
            </p>
            <p style={{ fontSize: "14px", color: "rgba(57, 41, 42, 0.6)", margin: "0 0 14px" }}>
              {t.membershipTeaser.priceSub}
            </p>
            <div style={{ marginBottom: "20px" }}>
              <span
                style={{
                  display: "inline-block",
                  fontSize: "12.5px",
                  letterSpacing: "0.03em",
                  color: "#993842",
                  border: "1px solid rgba(153, 56, 66, 0.4)",
                  borderRadius: "10px",
                  padding: "4px 12px",
                  fontWeight: 600,
                }}
              >
                {t.membershipTeaser.spotsLabel(spotsRemaining)}
              </span>
            </div>
            <Link
              href="/membership"
              style={{
                border: "1px solid var(--color-accent)",
                color: "var(--color-accent)",
                padding: "12px 26px",
                borderRadius: "4px",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "15px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                textDecoration: "none",
              }}
            >
              {t.membershipTeaser.cta} →
            </Link>
          </div>

          <ul style={{ flex: "1 1 340px", minWidth: "260px", listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "14px" }}>
            {t.membershipTeaser.bullets.map((b, idx) => (
              <li key={idx} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "15px", lineHeight: 1.5 }}>
                <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── PARTNERS UMBRELLAS ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(36px, 5vw, 64px) clamp(24px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ maxWidth: "680px", margin: "0 auto 32px", textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-accent-2)",
              marginBottom: "14px",
            }}
          >
            {t.partners.kicker}
          </div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "clamp(28px, 3.6vw, 40px)", margin: "0 0 16px" }}>
            {t.partners.heading}
          </h2>
          <p style={{ fontSize: "16px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: 0 }}>
            {t.partners.body}
          </p>
        </div>

        <div style={{ position: "relative" }}>
          <div
            ref={umbTrackRef}
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: "20px",
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              padding: "4px 2px 16px",
              scrollbarWidth: "none",
            }}
          >
            {t.partners.umbrellas.map((umb, idx) => (
              <div
                key={idx}
                style={{
                  flex: "0 0 clamp(240px, 26vw, 280px)",
                  scrollSnapAlign: "start",
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid rgba(57, 41, 42, 0.16)",
                  borderRadius: "6px",
                  padding: "26px 22px",
                  backgroundColor: "#fff",
                }}
              >
                <div style={{ color: "var(--color-accent)", marginBottom: "14px" }}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <circle cx="12" cy="12" r="8" opacity="0.3" />
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "18px", margin: "0 0 6px" }}>
                  {umb.title}
                </h3>
                <p style={{ fontSize: "14px", lineHeight: 1.55, color: "rgba(57, 41, 42, 0.65)", margin: 0 }}>
                  {umb.body}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "12px" }}>
            <button
              type="button"
              onClick={() => scrollUmb(-1)}
              aria-label="Previous"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                border: "1px solid rgba(57, 41, 42, 0.24)",
                background: "transparent",
                color: "var(--color-accent)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollUmb(1)}
              aria-label="Next"
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                border: "1px solid rgba(57, 41, 42, 0.24)",
                background: "transparent",
                color: "var(--color-accent)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              →
            </button>
          </div>
        </div>
      </section>

      {/* ─── SOFT ENTRY: EVENT PASS MODULE ─── */}      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(36px, 5vw, 64px) clamp(24px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(123, 31, 44, 0.28)",
            borderRadius: "8px",
            padding: "clamp(28px, 4vw, 40px)",
            backgroundColor: "#faf3eb",
            display: "flex",
            flexWrap: "wrap",
            gap: "28px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: "1 1 360px" }}>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "12.5px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                marginBottom: "8px",
              }}
            >
              {lang === "en" ? "Not ready to join?" : "¿Aún no estás lista para unirte?"}
            </div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "24px", margin: "0 0 8px" }}>
              {lang === "en" ? "Try us with an Event Pass — €35" : "Pruébanos con un Event Pass — 35€"}
            </h3>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.75)", margin: 0 }}>
              {lang === "en"
                ? "Come as a guest, no membership required. If you decide to join within 30 days, your €35 is credited toward your first membership invoice."
                : "Ven como invitada sin cuota de membresía. Si decides unirte en 30 días, tus 35€ se descuentan de tu primera mensualidad."}
            </p>
          </div>
          <Link
            href="/events"
            style={{
              border: "1px solid var(--color-accent)",
              backgroundColor: "var(--color-accent)",
              color: "#f8efe2",
              padding: "12px 24px",
              borderRadius: "4px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "14.5px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {lang === "en" ? "Browse Open Events" : "Ver Eventos Abiertos"}
          </Link>
        </div>
      </section>

      {/* ─── CLOSING CTA ─── */}
      <section
        style={{
          backgroundColor: "#39292a",
          color: "#f8efe2",
          padding: "clamp(48px, 6vw, 64px) clamp(24px, 5vw, 64px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "clamp(32px, 5vw, 52px)", margin: "0 0 24px", color: "#f8efe2" }}>
            {t.closing.heading}
          </h2>
          <Link
            href={windowOpen ? "/membership/apply" : "/membership"}
            style={{
              border: "1px solid #f8efe2",
              color: "#f8efe2",
              padding: "14px 34px",
              borderRadius: "4px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "16px",
              display: "inline-block",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            {t.closing.cta}
          </Link>
        </div>
      </section>
    </div>
  );
}
