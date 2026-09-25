"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export function Footer() {
  const { language: lang } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("tm_pre_newsletter_sub");
    if (saved) setSubmitted(true);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg(lang === "en" ? "Please enter a valid email address." : "Por favor introduce un correo válido.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer_the_letter" }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
      localStorage.setItem("tm_pre_newsletter_sub", "true");
      setEmail("");
    } catch {
      setErrorMsg(lang === "en" ? "Something went wrong. Please try again." : "Algo ha fallado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Lora', Georgia, serif", color: "#39292a", backgroundColor: "#fdf8f2" }}>
      {/* ─── 1. THE LETTER (NEWSLETTER) SECTION ─── */}
      <section
        style={{
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
          padding: "clamp(34px, 5vw, 58px) clamp(20px, 5vw, 64px)",
        }}
      >
        <div
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "36px",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          {/* Left copy */}
          <div style={{ flex: "1 1 380px", minWidth: "280px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "12.5px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#7b1f2c",
                marginBottom: "10px",
              }}
            >
              {lang === "en" ? "The letter" : "La carta"}
            </div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 400,
                fontSize: "clamp(26px, 3.2vw, 36px)",
                lineHeight: 1.15,
                margin: "0 0 10px",
                color: "#39292a",
              }}
            >
              {lang === "en"
                ? "One letter a month, and first word when membership opens."
                : "Una carta al mes, y las primeras novedades cuando abra la membresía."}
            </h2>
            <p style={{ fontSize: "15px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.7)", margin: 0, maxWidth: "52ch" }}>
              {lang === "en"
                ? "What is coming up on the calendar, new writing in the Journal, and the January 2027 date before it is announced anywhere else. Nothing else in your inbox."
                : "Novedades del calendario, nuevos artículos del Journal y la fecha de enero 2027 antes de su anuncio oficial. Nada más en tu bandeja de entrada."}
            </p>
          </div>

          {/* Right form / confirmation */}
          <div style={{ flex: "1 1 320px", minWidth: "270px" }}>
            {!submitted ? (
              <form onSubmit={handleSubscribe}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    placeholder={lang === "en" ? "you@email.com" : "tu@correo.com"}
                    style={{
                      flex: "1 1 200px",
                      minWidth: "180px",
                      border: "1px solid rgba(57, 41, 42, 0.28)",
                      borderRadius: "4px",
                      backgroundColor: "#ffffff",
                      padding: "12px 14px",
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: "14.5px",
                      color: "#39292a",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      border: "1px solid #7b1f2c",
                      backgroundColor: "transparent",
                      color: "#7b1f2c",
                      borderRadius: "4px",
                      padding: "12px 22px",
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontWeight: 600,
                      fontSize: "15px",
                      whiteSpace: "nowrap",
                      flex: "none",
                      cursor: loading ? "wait" : "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(123, 31, 44, 0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {loading ? "..." : (lang === "en" ? "Sign up" : "Suscribirme")}
                  </button>
                </div>

                <div
                  style={{
                    fontSize: "12.5px",
                    lineHeight: 1.5,
                    color: errorMsg ? "#993842" : "rgba(57, 41, 42, 0.72)",
                    marginTop: "10px",
                    minHeight: "18px",
                  }}
                >
                  {errorMsg ||
                    (lang === "en"
                      ? "We only use it for the letter. Unsubscribe in one click."
                      : "Solo la usamos para la carta. Puedes darte de baja en un clic.")}
                </div>
              </form>
            ) : (
              <div
                style={{
                  border: "1px solid rgba(86, 139, 5, 0.45)",
                  borderRadius: "6px",
                  padding: "16px 18px",
                  backgroundColor: "rgba(86, 139, 5, 0.07)",
                }}
              >
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "17px", marginBottom: "5px", color: "#3b5e04" }}>
                  {lang === "en" ? "You are on the list." : "Ya estás en la lista."}
                </div>
                <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: 0 }}>
                  {lang === "en"
                    ? "The next letter goes out at the start of the month, and you will hear about membership before it opens."
                    : "La próxima carta sale a primeros de mes y sabrás sobre la apertura de membresía antes de su lanzamiento."}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── 2. SITE FOOTER LINKS ─── */}
      <footer
        style={{
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
          padding: "32px clamp(20px, 5vw, 64px) 30px",
        }}
      >
        <div
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "36px",
            justifyContent: "space-between",
          }}
        >
          {/* Brand Column */}
          <div style={{ flex: "1 1 260px", minWidth: "220px" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", textDecoration: "none" }}>
              <img
                src="/assets/logo-mark-alpha.png"
                alt="The Mothers"
                style={{ height: "48px", width: "auto", display: "block" }}
              />
              <span
                aria-hidden="true"
                style={{
                  width: "1px",
                  height: "22px",
                  backgroundColor: "rgba(57, 41, 42, 0.28)",
                  display: "inline-block",
                  flex: "none",
                }}
              />
              <img
                src="/assets/logo-wordmark-alpha.png"
                alt="The Mothers"
                style={{ height: "13px", width: "auto", display: "block" }}
              />
            </Link>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: 0, maxWidth: "34ch" }}>
              {lang === "en" ? "A way of life for the modern Mother." : "Un estilo de vida para la madre moderna."}
            </p>
          </div>

          {/* Nav Links Column Group */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "44px" }}>
            {/* Explore */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "12px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(57, 41, 42, 0.72)",
                  marginBottom: "2px",
                }}
              >
                {lang === "en" ? "Explore" : "Explorar"}
              </div>
              <Link href="/membership" style={{ fontSize: "14px", color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "Membership" : "Membresía"}
              </Link>
              <Link href="/events" style={{ fontSize: "14px", color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "Events" : "Eventos"}
              </Link>
              <Link href="/circle" style={{ fontSize: "14px", color: "#39292a", textDecoration: "none" }}>
                The Circle
              </Link>
              <Link href="/journal" style={{ fontSize: "14px", color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "Journal" : "Diario"}
              </Link>
              <Link href="/host" style={{ fontSize: "14px", color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "Become a host" : "Sé anfitriona"}
              </Link>
              <Link href="/partners" style={{ fontSize: "14px", color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "For Partners" : "Para Partners"}
              </Link>
              <Link href="/faq" style={{ fontSize: "14px", color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "FAQ" : "Preguntas"}
              </Link>
            </div>

            {/* Legal */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "12px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(57, 41, 42, 0.72)",
                  marginBottom: "2px",
                }}
              >
                {lang === "en" ? "Legal" : "Legal"}
              </div>
              <Link href="/legal" style={{ fontSize: "14px", color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "Terms & Privacy" : "Términos y Privacidad"}
              </Link>
              <Link href="/privacy" style={{ fontSize: "14px", color: "#39292a", textDecoration: "none" }}>
                {lang === "en" ? "Privacy Policy" : "Política de Privacidad"}
              </Link>
            </div>

            {/* Get in touch */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "12px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(57, 41, 42, 0.72)",
                  marginBottom: "2px",
                }}
              >
                {lang === "en" ? "Get in touch" : "Contacto"}
              </div>
              <a href="mailto:hello@themothers.cc" style={{ fontSize: "14px", color: "#39292a", textDecoration: "none" }}>
                hello@themothers.cc
              </a>
              <a
                href="https://www.instagram.com/themothers.cc"
                target="_blank"
                rel="noreferrer"
                aria-label="The Mothers on Instagram"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  border: "1px solid rgba(57, 41, 42, 0.25)",
                  borderRadius: "50%",
                  color: "#39292a",
                  textDecoration: "none",
                  marginTop: "4px",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#7b1f2c";
                  e.currentTarget.style.color = "#7b1f2c";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(57, 41, 42, 0.25)";
                  e.currentTarget.style.color = "#39292a";
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Row */}
        <div
          style={{
            maxWidth: "1160px",
            margin: "26px auto 0",
            paddingTop: "18px",
            borderTop: "1px solid rgba(57, 41, 42, 0.12)",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "space-between",
          }}
        >
          <p style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.72)", margin: 0 }}>
            © {new Date().getFullYear()} The Mothers
          </p>
          <p style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.72)", margin: 0 }}>
            Barcelona
          </p>
        </div>
      </footer>
    </div>
  );
}
