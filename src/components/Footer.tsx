"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export function Footer() {
  const [lang, setLang] = useState<"en" | "es">("en");

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  return (
    <footer
      style={{
        borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        padding: "56px clamp(24px, 5vw, 64px) 32px",
        backgroundColor: "var(--color-bg)",
        color: "#39292a",
        fontFamily: "var(--font-body)",
        fontSize: "14px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          gap: "44px",
          justifyContent: "space-between",
          marginBottom: "48px",
        }}
      >
        {/* Brand Column */}
        <div style={{ maxWidth: "300px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "14px", textDecoration: "none" }}>
            <img
              src="/assets/motherLogo.png"
              alt="The Mothers"
              style={{ height: "72px", width: "auto", display: "block" }}
            />
            <span
              aria-hidden="true"
              style={{
                width: "1px",
                height: "30px",
                background: "rgba(57, 41, 42, 0.28)",
                display: "inline-block",
                flex: "none",
              }}
            />
            <img
              src="/assets/logo-wordmark-alpha.svg"
              alt="The Mothers"
              style={{ height: "16px", width: "auto", display: "block" }}
            />
          </Link>
          <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57, 41, 42, 0.65)", margin: 0 }}>
            {lang === "en"
              ? "A private membership club for mothers, from pregnancy through the school years."
              : "Un club privado de membresía para madres, desde el embarazo hasta la etapa escolar."}
          </p>
        </div>

        {/* Links Columns */}
        <div style={{ display: "flex", gap: "56px", flexWrap: "wrap" }}>
          {/* Explore */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "14px",
                color: "rgba(57, 41, 42, 0.5)",
              }}
            >
              {lang === "en" ? "Explore" : "Explorar"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link href="/membership" style={{ color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "Membership" : "Membresía"}
              </Link>
              <Link href="/events" style={{ color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "Events" : "Eventos"}
              </Link>
              <Link href="/journal" style={{ color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "Journal" : "Diario"}
              </Link>
              <Link href="/partners" style={{ color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "Partners" : "Partners"}
              </Link>
              <Link href="/faq" style={{ color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "FAQ" : "Preguntas"}
              </Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "14px",
                color: "rgba(57, 41, 42, 0.5)",
              }}
            >
              {lang === "en" ? "Legal" : "Legal"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link href="/terms" style={{ color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "Terms & Conditions" : "Términos y Condiciones"}
              </Link>
              <Link href="/privacy" style={{ color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "Privacy Policy" : "Política de Privacidad"}
              </Link>
            </div>
          </div>

          {/* Contact & Social */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "14px",
                color: "rgba(57, 41, 42, 0.5)",
              }}
            >
              {lang === "en" ? "Get in touch" : "Contacto"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <a href="mailto:hello@themothers.cc" style={{ color: "#39292a", textDecoration: "none", fontWeight: 500 }}>
                hello@themothers.cc
              </a>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", color: "#39292a" }}>
                <a
                  href="https://www.instagram.com/themothers.cc"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  style={{ color: "#39292a", display: "flex" }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subfooter */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          borderTop: "1px solid rgba(57, 41, 42, 0.12)",
          paddingTop: "18px",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          justifyContent: "space-between",
          fontSize: "12px",
          color: "rgba(57, 41, 42, 0.55)",
        }}
      >
        <span>© {new Date().getFullYear()} The Mothers</span>
        <span>Barcelona</span>
      </div>
    </footer>
  );
}
