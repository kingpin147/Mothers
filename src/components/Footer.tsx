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
    <footer style={{
      borderTop: "1px solid rgba(57, 41, 42, 0.16)",
      padding: "clamp(48px, 6vw, 64px) clamp(24px, 5vw, 64px) clamp(24px, 3vw, 36px)",
      backgroundColor: "var(--color-bg)",
      color: "rgba(57, 41, 42, 0.7)",
      fontSize: "13px",
      fontFamily: "var(--font-body)"
    }}>
      <div style={{
        maxWidth: "1240px",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "40px",
        marginBottom: "48px"
      }}>
        <div>
          <img
            src="/assets/logo-mark-alpha.png"
            alt="The Mothers"
            style={{ height: "48px", width: "auto", marginBottom: "16px" }}
          />
          <p style={{ maxWidth: "280px", lineHeight: "1.6" }}>
            {lang === "en"
              ? "A private members club for mothers in Barcelona. Real friendships, curated experiences, and trusted local care."
              : "Un club privado para madres en Barcelona. Amistades reales, experiencias cuidadas y apoyo de confianza."}
          </p>
        </div>

        <div>
          <h5 style={{ textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.1em", color: "var(--color-accent)", marginBottom: "16px" }}>
            {lang === "en" ? "Explore" : "Explorar"}
          </h5>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
            <li><Link href="/membership">{lang === "en" ? "Membership" : "Membresía"}</Link></li>
            <li><Link href="/events">{lang === "en" ? "Events Calendar" : "Calendario de Eventos"}</Link></li>
            <li><Link href="/ambassadors">{lang === "en" ? "Godmothers Program" : "Programa Madrinas"}</Link></li>
            <li><Link href="/journal">{lang === "en" ? "The Journal" : "El Diario"}</Link></li>
            <li><Link href="/partners">{lang === "en" ? "Partner Directory" : "Directorio de Partners"}</Link></li>
          </ul>
        </div>

        <div>
          <h5 style={{ textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.1em", color: "var(--color-accent)", marginBottom: "16px" }}>
            {lang === "en" ? "Information" : "Información"}
          </h5>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/privacy">{lang === "en" ? "Privacy Policy" : "Política de Privacidad"}</Link></li>
            <li><Link href="/terms">{lang === "en" ? "Terms & Conditions" : "Términos y Condiciones"}</Link></li>
            <li><a href="mailto:hello@themothers.cc">hello@themothers.cc</a></li>
          </ul>
        </div>

        <div>
          <h5 style={{ textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.1em", color: "var(--color-accent)", marginBottom: "16px" }}>
            {lang === "en" ? "Barcelona" : "Barcelona"}
          </h5>
          <p style={{ lineHeight: "1.6" }}>
            {lang === "en"
              ? "Sarrià · Sant Gervasi · Eixample · Gràcia · Les Corts · Poblenou"
              : "Sarrià · Sant Gervasi · Eixample · Gràcia · Les Corts · Poblenou"}
          </p>
          <p style={{ marginTop: "12px" }}>
            © {new Date().getFullYear()} The Mothers BCN S.L.
          </p>
        </div>
      </div>

      <div style={{
        maxWidth: "1240px",
        margin: "0 auto",
        borderTop: "1px solid rgba(57, 41, 42, 0.12)",
        paddingTop: "20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <span>themothers.cc</span>
        <span>Barcelona · 2026</span>
      </div>
    </footer>
  );
}
