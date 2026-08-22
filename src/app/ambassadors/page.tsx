"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";

export default function AmbassadorsPage() {
  const [lang, setLang] = useState<Locale>("en");

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
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: "880px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-accent-2)",
            marginBottom: "12px"
          }}>
            {lang === "en" ? "Godmothers Program" : "Programa Madrinas"}
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(34px, 5vw, 52px)", marginBottom: "18px" }}>
            {lang === "en"
              ? "For the women who bring their friends."
              : "Para las mujeres que traen a sus amigas."}
          </h1>
          <p style={{ fontSize: "17.5px", lineHeight: "1.65", color: "var(--color-text-muted)", maxWidth: "640px", margin: "0 auto" }}>
            {lang === "en"
              ? "Turn that into a free evening for yourself, and first place in every room — by simply sharing what you already love."
              : "Convierte eso en una tarde libre para ti y prioridad en cada sala — simplemente compartiendo lo que ya te encanta."}
          </p>
        </div>

        {/* Highlight Card */}
        <div className="card" style={{
          backgroundColor: "#f4f7ee",
          border: "1px solid rgba(86, 139, 5, 0.4)",
          padding: "36px 32px",
          marginBottom: "48px"
        }}>
          <h2 style={{ fontSize: "24px", color: "var(--color-accent-2)", marginBottom: "16px" }}>
            {lang === "en" ? "The Godmother Reward" : "La Recompensa de Madrina"}
          </h2>
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "12px" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "48px", fontWeight: 600, color: "var(--color-accent)" }}>
              +20 Credits
            </span>
            <span style={{ fontSize: "16px", color: "var(--color-text-muted)" }}>
              {lang === "en" ? "per qualifying member referred" : "por cada socia referida"}
            </span>
          </div>
          <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--color-text)", margin: "0 0 16px" }}>
            {lang === "en"
              ? "A full month's credit allowance (+20 credits) redeemable against a MoM's Date or signature experience. Bonus referral credits sit outside the 40-credit rollover cap, so your earned balance is never lost."
              : "Una asignación mensual completa (+20 créditos) canjeable en un MoM's Date o experiencia signature. Los créditos extra de Madrina quedan fuera del tope de 40 créditos, por lo que nunca los pierdes."}
          </p>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "24px" }}>
            <Link href="/account" className="btn btn-primary">
              {lang === "en" ? "View My Referral Code" : "Ver Mi Código de Madrina"}
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
          <div className="card" style={{ backgroundColor: "#fff", padding: "24px" }}>
            <h3 style={{ fontSize: "18px", color: "var(--color-accent)", marginBottom: "8px" }}>
              1. {lang === "en" ? "Share Your Link" : "Comparte tu Enlace"}
            </h3>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0 }}>
              {lang === "en"
                ? "Every member has a private referral link in her account dashboard."
                : "Cada socia tiene un enlace privado de recomendación en su panel de cuenta."}
            </p>
          </div>

          <div className="card" style={{ backgroundColor: "#fff", padding: "24px" }}>
            <h3 style={{ fontSize: "18px", color: "var(--color-accent)", marginBottom: "8px" }}>
              2. {lang === "en" ? "Friend Joins" : "Tu Amiga se Une"}
            </h3>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0 }}>
              {lang === "en"
                ? "When she applies and activates her membership during an open Window."
                : "Cuando completa su solicitud y activa su membresía durante una Ventana abierta."}
            </p>
          </div>

          <div className="card" style={{ backgroundColor: "#fff", padding: "24px" }}>
            <h3 style={{ fontSize: "18px", color: "var(--color-accent)", marginBottom: "8px" }}>
              3. {lang === "en" ? "Credits Granted" : "Créditos Otorgados"}
            </h3>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0 }}>
              {lang === "en"
                ? "+20 credits are automatically awarded to your ledger with full tracking."
                : "+20 créditos se asignan a tu saldo de créditos con seguimiento transparente."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
