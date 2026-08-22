"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DICTIONARIES, Locale } from "@/lib/i18n";

export default function HomePage() {
  const [lang, setLang] = useState<Locale>("en");
  const [windowOpen] = useState(true);
  const [spotsRemaining] = useState(42);

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  const t = DICTIONARIES[lang];

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh" }}>
      {/* ─── HERO SECTION ─── */}
      <section style={{
        maxWidth: "1240px",
        margin: "0 auto",
        padding: "clamp(56px, 8vw, 104px) clamp(24px, 5vw, 64px) clamp(40px, 6vw, 72px)",
        display: "flex",
        flexWrap: "wrap",
        gap: "56px",
        alignItems: "center"
      }}>
        <div style={{ flex: "1 1 440px", minWidth: "300px" }}>
          <div style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: "18px"
          }}>
            {t.hero.kicker}
          </div>
          <h1 style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 400,
            fontSize: "clamp(44px, 6vw, 74px)",
            lineHeight: 1.04,
            letterSpacing: "-0.01em",
            margin: "0 0 24px"
          }}>
            {t.hero.title}
          </h1>
          <p style={{
            fontSize: "18px",
            lineHeight: 1.65,
            color: "rgba(57, 41, 42, 0.75)",
            maxWidth: "520px",
            margin: "0 0 14px"
          }}>
            {t.hero.subtitle}
          </p>
          <p style={{
            fontSize: "14px",
            color: "rgba(57, 41, 42, 0.62)",
            borderTop: "1px solid rgba(57, 41, 42, 0.16)",
            paddingTop: "16px",
            marginTop: "26px",
            maxWidth: "460px"
          }}>
            {windowOpen ? t.hero.windowNoteOpen : t.hero.windowNoteClosed}
          </p>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "24px", flexWrap: "wrap" }}>
            <Link
              href={windowOpen ? "/membership/apply" : "/waitlist"}
              className="btn btn-primary"
              style={{ padding: "12px 28px", fontSize: "16px" }}
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
                gap: "8px"
              }}
            >
              {t.hero.ctaSecondary} →
            </Link>
          </div>
        </div>

        <div style={{ flex: "1 1 380px", minWidth: "280px" }}>
          <div style={{
            backgroundColor: "var(--color-surface)",
            padding: "10px",
            borderRadius: "8px",
            boxShadow: "0 12px 32px rgba(45, 43, 43, 0.18)"
          }}>
            <div style={{
              border: "1px solid rgba(57, 41, 42, 0.18)",
              borderRadius: "4px",
              overflow: "hidden",
              background: "linear-gradient(135deg, #e4d3c4 0%, #ecdcd0 100%)",
              minHeight: "420px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px",
              textAlign: "center"
            }}>
              <img
                src="/assets/logo-mark-alpha.png"
                alt="The Mothers"
                style={{ height: "96px", width: "auto", opacity: 0.85, marginBottom: "20px" }}
              />
              <p style={{
                fontFamily: "var(--font-heading)",
                fontSize: "20px",
                fontWeight: 600,
                color: "var(--color-accent)",
                maxWidth: "280px"
              }}>
                {lang === "en" ? "A curated, safe and social space for mothers in Barcelona." : "Un espacio cuidado, seguro y social para madres en Barcelona."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WHY SECTION ─── */}
      <section style={{
        maxWidth: "1160px",
        margin: "0 auto",
        padding: "clamp(48px, 6vw, 88px) clamp(24px, 5vw, 64px)",
        borderTop: "1px solid rgba(57, 41, 42, 0.16)"
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "56px" }}>
          <div style={{ flex: "1 1 380px", minWidth: "280px" }}>
            <div style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-accent-2)",
              marginBottom: "16px"
            }}>
              {t.why.kicker}
            </div>
            <h2 style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "clamp(28px, 3.6vw, 40px)",
              lineHeight: 1.15,
              margin: "0 0 20px"
            }}>
              {t.why.heading}
            </h2>
            <p style={{ fontSize: "17px", lineHeight: 1.7, color: "rgba(57, 41, 42, 0.75)" }}>
              {t.why.body}
            </p>
          </div>

          <div style={{ flex: "1 1 420px", minWidth: "280px", display: "flex", flexDirection: "column", gap: "28px" }}>
            {t.why.pillars.map((pillar, idx) => (
              <div key={idx} style={{ display: "flex", gap: "16px" }}>
                <div style={{
                  flex: "none",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "1px solid rgba(123, 31, 44, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-accent)",
                  fontWeight: 600,
                  fontSize: "14px"
                }}>
                  0{idx + 1}
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

      {/* ─── HOW IT WORKS ─── */}
      <section style={{
        maxWidth: "1160px",
        margin: "0 auto",
        padding: "clamp(48px, 6vw, 88px) clamp(24px, 5vw, 64px)",
        borderTop: "1px solid rgba(57, 41, 42, 0.16)"
      }}>
        <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 52px" }}>
          <div style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: "14px"
          }}>
            {t.how.kicker}
          </div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "clamp(28px, 3.6vw, 40px)", margin: 0 }}>
            {t.how.heading}
          </h2>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "40px", justifyContent: "center" }}>
          {t.how.steps.map((step, idx) => (
            <div key={idx} style={{ flex: "1 1 260px", maxWidth: "320px", textAlign: "center", padding: "0 12px" }}>
              <div style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 400,
                fontSize: "44px",
                color: "rgba(123, 31, 44, 0.28)",
                marginBottom: "8px"
              }}>
                {step.n}
              </div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "21px", margin: "0 0 8px" }}>
                {step.title}
              </h3>
              <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.68)", margin: 0 }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── MEMBERSHIP TEASER ─── */}
      <section style={{
        maxWidth: "1160px",
        margin: "0 auto",
        padding: "clamp(48px, 6vw, 88px) clamp(24px, 5vw, 64px)",
        borderTop: "1px solid rgba(57, 41, 42, 0.16)"
      }}>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "48px",
          alignItems: "center",
          justifyContent: "space-between",
          border: "1px solid rgba(57, 41, 42, 0.18)",
          borderRadius: "8px",
          padding: "clamp(32px, 5vw, 56px)",
          backgroundColor: "#fdf9f2"
        }}>
          <div style={{ flex: "1 1 380px", minWidth: "280px" }}>
            <div style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-accent)",
              marginBottom: "12px"
            }}>
              {t.membershipTeaser.kicker}
            </div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "clamp(30px, 4vw, 40px)", margin: "0 0 10px" }}>
              {t.membershipTeaser.heading}
            </h2>
            <p style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "22px", color: "var(--color-accent)", margin: "0 0 2px" }}>
              {t.membershipTeaser.price}
            </p>
            <p style={{ fontSize: "14px", color: "rgba(57, 41, 42, 0.6)", margin: "0 0 10px" }}>
              {t.membershipTeaser.priceSub}
            </p>
            {spotsRemaining <= 50 && (
              <span style={{
                display: "inline-block",
                fontSize: "12.5px",
                letterSpacing: "0.03em",
                color: "#993842",
                border: "1px solid rgba(153, 56, 66, 0.4)",
                borderRadius: "10px",
                padding: "4px 12px",
                margin: "0 0 18px",
                fontWeight: 600
              }}>
                {t.membershipTeaser.spotsLabel(spotsRemaining)}
              </span>
            )}
            <div>
              <Link href="/membership" className="btn btn-outline" style={{ padding: "12px 26px", fontSize: "15px" }}>
                {t.membershipTeaser.cta} →
              </Link>
            </div>
          </div>

          <ul style={{
            flex: "1 1 340px",
            minWidth: "260px",
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "14px"
          }}>
            {t.membershipTeaser.bullets.map((bullet, idx) => (
              <li key={idx} style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "15px", color: "var(--color-text)" }}>
                <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
                {bullet}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── PARTNERS PERKS ─── */}
      <section style={{
        maxWidth: "1160px",
        margin: "0 auto",
        padding: "clamp(48px, 6vw, 88px) clamp(24px, 5vw, 64px)",
        borderTop: "1px solid rgba(57, 41, 42, 0.16)"
      }}>
        <div style={{ maxWidth: "680px", margin: "0 auto 48px", textAlign: "center" }}>
          <div style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-accent-2)",
            marginBottom: "14px"
          }}>
            {t.partners.kicker}
          </div>
          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "clamp(28px, 3.6vw, 40px)", margin: "0 0 16px" }}>
            {t.partners.heading}
          </h2>
          <p style={{ fontSize: "16px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.7)", margin: 0 }}>
            {t.partners.body}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
          {t.partners.umbrellas.map((umbrella, idx) => (
            <div key={idx} style={{
              border: "1px solid rgba(57, 41, 42, 0.16)",
              borderRadius: "6px",
              padding: "24px 20px",
              backgroundColor: "#fff"
            }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "18px", margin: "0 0 8px", color: "var(--color-accent)" }}>
                {umbrella.title}
              </h3>
              <p style={{ fontSize: "14px", lineHeight: 1.55, color: "rgba(57, 41, 42, 0.65)", margin: 0 }}>
                {umbrella.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CLOSING CTA ─── */}
      <section style={{
        backgroundColor: "#39292a",
        color: "#f8efe2",
        padding: "clamp(64px, 9vw, 112px) clamp(24px, 5vw, 64px)",
        textAlign: "center"
      }}>
        <h2 style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 400,
          fontSize: "clamp(32px, 5vw, 54px)",
          color: "#f8efe2",
          margin: "0 0 28px"
        }}>
          {t.closing.heading}
        </h2>
        <Link
          href="/membership/apply"
          className="btn"
          style={{
            border: "1px solid #f8efe2",
            color: "#f8efe2",
            padding: "15px 34px",
            fontSize: "16px"
          }}
        >
          {t.closing.cta}
        </Link>
      </section>
    </div>
  );
}
