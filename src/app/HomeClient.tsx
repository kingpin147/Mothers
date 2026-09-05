"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { DICTIONARIES, Locale } from "@/lib/i18n";
import { getPublicMembershipWindow } from "@/app/actions/publicWindow";

export default function HomeClient({
  initialWindowOpen = true,
  initialSpotsRemaining = 50,
}: {
  initialWindowOpen?: boolean;
  initialSpotsRemaining?: number;
}) {
  const [lang, setLang] = useState<Locale>("en");
  const [windowOpen, setWindowOpen] = useState(initialWindowOpen);
  const [spotsRemaining, setSpotsRemaining] = useState(initialSpotsRemaining);
  const umbTrackRef = useRef<HTMLDivElement>(null);

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

  // The label appears ONLY when spots are limited (<= 10 remaining)
  const showSpotsUrgency = windowOpen && spotsRemaining <= 10 && spotsRemaining > 0;

  const scrollUmb = (dir: number) => {
    if (!umbTrackRef.current) return;
    const card = umbTrackRef.current.firstElementChild as HTMLElement;
    const step = card ? card.getBoundingClientRect().width + 22 : 280;
    umbTrackRef.current.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div style={{ backgroundColor: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", minHeight: "100vh" }}>
      {/* ─── HERO SECTION ─── */}
      <section
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "clamp(56px, 8vw, 104px) clamp(24px, 5vw, 64px) clamp(40px, 6vw, 72px)",
          display: "flex",
          flexWrap: "wrap",
          gap: "56px",
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 440px", minWidth: "300px" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              marginBottom: "18px",
            }}
          >
            {t.hero.kicker}
          </div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              fontSize: "clamp(44px, 6vw, 74px)",
              lineHeight: 1.04,
              letterSpacing: "-0.01em",
              margin: "0 0 24px",
            }}
          >
            {t.hero.title}
          </h1>
          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.65,
              color: "rgba(57, 41, 42, 0.75)",
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
              paddingTop: "16px",
              margin: "26px 0 0",
              maxWidth: "460px",
            }}
          >
            {windowOpen ? t.hero.windowNoteOpen : t.hero.windowNoteClosed}
          </p>
          <Link
            href="/membership"
            style={{
              marginTop: "18px",
              color: "#7b1f2c",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "16px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              whiteSpace: "nowrap",
              textDecoration: "none",
            }}
          >
            {t.hero.ctaSecondary}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
          </Link>
        </div>

        {/* Hero Visual */}
        <div style={{ flex: "1 1 380px", minWidth: "280px" }}>
          <div
            style={{
              background: "#ecdcd0",
              padding: "8px",
              borderRadius: "6px",
              boxShadow: "0 12px 32px rgba(45, 43, 43, 0.18)",
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
          padding: "clamp(30px, 4vw, 52px) clamp(24px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "40px" }}>
          <div style={{ flex: "1 1 380px", minWidth: "280px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#568b05",
                marginBottom: "16px",
              }}
            >
              {t.why.kicker}
            </div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "clamp(28px, 3.6vw, 40px)",
                lineHeight: 1.15,
                margin: "0 0 20px",
              }}
            >
              {t.why.heading}
            </h2>
            <p style={{ fontSize: "17px", lineHeight: 1.7, color: "rgba(57, 41, 42, 0.75)", textAlign: "justify" }}>
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
                    color: "#7b1f2c",
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
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px", margin: "0 0 4px" }}>
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
          padding: "clamp(30px, 4vw, 52px) clamp(24px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 28px" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              marginBottom: "10px",
            }}
          >
            {t.how.kicker}
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "clamp(28px, 3.6vw, 40px)", margin: 0 }}>
            {t.how.heading}
          </h2>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", justifyContent: "center" }}>
          {t.how.steps.map((step, idx) => (
            <div key={idx} style={{ flex: "1 1 260px", maxWidth: "320px", textAlign: "center", padding: "0 12px" }}>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 400,
                  fontSize: "38px",
                  lineHeight: 1.1,
                  color: "rgba(123, 31, 44, 0.28)",
                  marginBottom: "6px",
                }}
              >
                {step.n}
              </div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "21px", margin: "0 0 6px" }}>
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
          padding: "clamp(30px, 4vw, 52px) clamp(24px, 5vw, 64px)",
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
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#7b1f2c",
                marginBottom: "12px",
              }}
            >
              {t.membershipTeaser.kicker}
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "clamp(30px, 4vw, 40px)", margin: "0 0 10px" }}>
              {t.membershipTeaser.heading}
            </h2>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", color: "#7b1f2c", margin: "0 0 2px" }}>
              {t.membershipTeaser.price}
            </p>
            <p style={{ fontSize: "14px", color: "rgba(57, 41, 42, 0.6)", margin: "0 0 10px" }}>
              {t.membershipTeaser.priceSub}
            </p>
            {showSpotsUrgency && (
              <div style={{ marginBottom: "18px" }}>
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
            )}
            <div>
              <Link
                href="/membership"
                style={{
                  border: "1px solid #7b1f2c",
                  color: "#7b1f2c",
                  padding: "12px 26px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                }}
              >
                {t.membershipTeaser.cta}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
              </Link>
            </div>
          </div>

          <ul style={{ flex: "1 1 340px", minWidth: "260px", listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "13px" }}>
            {t.membershipTeaser.bullets.map((b, idx) => (
              <li key={idx} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "15px", lineHeight: 1.5, color: "#39292a" }}>
                <span style={{ flex: "none", color: "#568b05", marginTop: "3px" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
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
          padding: "clamp(30px, 4vw, 52px) clamp(24px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ maxWidth: "680px", margin: "0 auto 28px", textAlign: "center" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#568b05",
              marginBottom: "14px",
            }}
          >
            {t.partners.kicker}
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "clamp(28px, 3.6vw, 40px)", margin: "0 0 16px" }}>
            {t.partners.heading}
          </h2>
          <p style={{ fontSize: "16px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.7)", margin: 0 }}>
            {t.partners.body}
          </p>
        </div>

        <div style={{ position: "relative" }}>
          <div
            ref={umbTrackRef}
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: "22px",
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              padding: "2px 2px 14px",
              scrollbarWidth: "none",
            }}
          >
            {t.partners.umbrellas.map((u, idx) => (
              <div
                key={idx}
                style={{
                  flex: "0 0 clamp(238px, 25vw, 276px)",
                  scrollSnapAlign: "start",
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid rgba(57, 41, 42, 0.16)",
                  borderRadius: "6px",
                  padding: "26px 22px",
                }}
              >
                <div style={{ color: "#7b1f2c", marginBottom: "14px" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                    {idx === 0 && <path d="M11 20A7 7 0 0 1 4 13c0-4 3-8 9-11 1 5 4 7 4 11a7 7 0 0 1-6 7ZM8 16c5-3 7-7 9-13" />}
                    {idx === 1 && <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />}
                    {idx === 2 && <path d="M12 2c.6 3.2 1.6 5.7 3 7.1 1.4 1.4 3.9 2.4 7 3-3.1.6-5.6 1.6-7 3-1.4 1.4-2.4 3.9-3 7.1-.6-3.2-1.6-5.7-3-7.1-1.4-1.4-3.9-2.4-7-3 3.1-.6 5.6-1.6 7-3 1.4-1.4 2.4-3.9 3-7.1Z" fill="currentColor" stroke="none" />}
                    {idx === 3 && <path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4ZM6 2v2M10 2v2M14 2v2" />}
                    {idx === 4 && <path d="M6 8h12l1 12H5ZM9 8V6a3 3 0 0 1 6 0v2" />}
                  </svg>
                </div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", margin: "0 0 6px" }}>
                  {u.title}
                </h3>
                <p style={{ fontSize: "14px", lineHeight: 1.55, color: "rgba(57, 41, 42, 0.65)", margin: 0 }}>
                  {u.body}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "2px" }}>
            <button
              type="button"
              onClick={() => scrollUmb(-1)}
              aria-label="Previous category"
              style={{
                width: "44px",
                height: "44px",
                border: "1px solid rgba(57, 41, 42, 0.24)",
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
              onClick={() => scrollUmb(1)}
              aria-label="Next category"
              style={{
                width: "44px",
                height: "44px",
                border: "1px solid rgba(57, 41, 42, 0.24)",
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
                <path d="M5 12h14M13 6l6 6-6 6"></path>
              </svg>
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: "13px", color: "rgba(57, 41, 42, 0.5)", marginTop: "20px" }}>
          {t.partners.note}
        </p>
      </section>

      {/* ─── GODMOTHER PROGRAMME MODULE ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(24px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(86, 139, 5, 0.45)",
            borderRadius: "8px",
            backgroundColor: "#f4f7ee",
            padding: "clamp(28px, 4vw, 44px)",
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(28px, 4vw, 52px)",
          }}
        >
          <div style={{ flex: "1 1 320px", minWidth: "280px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "14px" }}>
              <span style={{ color: "#568b05", display: "inline-flex" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                </svg>
              </span>
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "13px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#456f04",
                }}
              >
                {t.godmother.kicker}
              </span>
            </div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "clamp(26px, 3.4vw, 38px)",
                lineHeight: 1.15,
                margin: "0 0 14px",
                maxWidth: "22em",
              }}
            >
              {t.godmother.heading}
            </h2>
            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.7,
                color: "rgba(57, 41, 42, 0.75)",
                margin: "0 0 20px",
                maxWidth: "46ch",
              }}
            >
              {t.godmother.body}
            </p>
            <Link
              href="/account"
              style={{
                display: "inline-block",
                border: "1px solid #568b05",
                color: "#456f04",
                padding: "12px 24px",
                borderRadius: "4px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "15px",
                textDecoration: "none",
                backgroundColor: "transparent",
              }}
            >
              {t.godmother.cta}
            </Link>
            <p style={{ fontSize: "12.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: "10px 0 0" }}>
              {t.godmother.ctaNote}
            </p>
          </div>

          <div style={{ flex: "1 1 300px", minWidth: "260px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {t.godmother.steps.map((g, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start",
                  borderTop: "1px solid rgba(86, 139, 5, 0.28)",
                  paddingTop: "14px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 400,
                    fontSize: "26px",
                    lineHeight: 1,
                    color: "rgba(86, 139, 5, 0.5)",
                    fontVariantNumeric: "tabular-nums",
                    flex: "none",
                  }}
                >
                  {g.n}
                </span>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px", marginBottom: "4px" }}>
                    {g.title}
                  </div>
                  <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: 0 }}>
                    {g.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CLOSING CTA ─── */}
      <section
        style={{
          backgroundColor: "#39292a",
          color: "#f8efe2",
          padding: "clamp(38px, 5vw, 58px) clamp(24px, 5vw, 64px)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(32px, 5vw, 54px)", margin: "0 0 20px", color: "#f8efe2" }}>
          {t.closing.heading}
        </h2>
        <Link
          href="/membership"
          style={{
            border: "1px solid #f8efe2",
            color: "#f8efe2",
            padding: "15px 34px",
            borderRadius: "4px",
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
            fontSize: "16px",
            display: "inline-block",
            whiteSpace: "nowrap",
            textDecoration: "none",
          }}
        >
          {t.closing.cta}
        </Link>
      </section>
    </div>
  );
}
