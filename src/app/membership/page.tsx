"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DICTIONARIES, Locale } from "@/lib/i18n";

export default function MembershipPage() {
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

  const t = DICTIONARIES[lang];

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <div style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: "12px"
          }}>
            {lang === "en" ? "Membership Overview" : "Membresía"}
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(36px, 5vw, 56px)", marginBottom: "16px" }}>
            {lang === "en" ? "The Circle & Membership Tiers" : "The Circle y Tarifas"}
          </h1>
          <p style={{ fontSize: "18px", color: "var(--color-text-muted)", maxWidth: "600px", margin: "0 auto" }}>
            {lang === "en"
              ? "A structured membership built around real moments, predictable monthly credits, and trusted community."
              : "Una membresía pensada con créditos mensuales, encuentros cuidados y una comunidad de confianza."}
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px", marginBottom: "64px" }}>
          {/* Card 1: Opening Circle (Founding) */}
          <div className="card" style={{
            padding: "36px 30px",
            border: "2px solid var(--color-accent)",
            backgroundColor: "#fdf9f2",
            position: "relative"
          }}>
            <span style={{
              position: "absolute",
              top: "-12px",
              right: "24px",
              backgroundColor: "var(--color-accent)",
              color: "#fff",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "4px 12px",
              borderRadius: "12px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600
            }}>
              {lang === "en" ? "First 50 Spots" : "Primeras 50 Plazas"}
            </span>

            <h3 style={{ fontSize: "24px", color: "var(--color-accent)", marginBottom: "8px" }}>
              {lang === "en" ? "Opening Circle" : "Opening Circle"}
            </h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "40px", fontWeight: 600, color: "var(--color-accent)" }}>€29</span>
              <span style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>{lang === "en" ? "/ month" : "/ mes"}</span>
            </div>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              {lang === "en"
                ? "Locked for 12 months for founding members. Joining fee €58 (or €23 with recent pass)."
                : "Tarifa fija durante 12 meses. Cuota de alta 58€ (o 23€ con pase reciente)."}
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <li style={{ display: "flex", gap: "10px", fontSize: "14px" }}>
                <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
                {lang === "en" ? "20 monthly credits for events & experiences" : "20 créditos mensuales para eventos y experiencias"}
              </li>
              <li style={{ display: "flex", gap: "10px", fontSize: "14px" }}>
                <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
                {lang === "en" ? "Included walks & park socials" : "Paseos y encuentros en el parque incluidos"}
              </li>
              <li style={{ display: "flex", gap: "10px", fontSize: "14px" }}>
                <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
                {lang === "en" ? "Stage & neighbourhood groups" : "Grupos por etapa y barrio"}
              </li>
              <li style={{ display: "flex", gap: "10px", fontSize: "14px" }}>
                <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
                {lang === "en" ? "Partner perks & discounts across BCN" : "Descuentos en red de partners en BCN"}
              </li>
            </ul>

            <Link href="/membership/apply" className="btn btn-primary" style={{ width: "100%", textAlign: "center" }}>
              {lang === "en" ? "Apply for Opening Circle" : "Solicitar Opening Circle"}
            </Link>
          </div>

          {/* Card 2: Standard Circle */}
          <div className="card" style={{ padding: "36px 30px", backgroundColor: "#fff" }}>
            <h3 style={{ fontSize: "24px", marginBottom: "8px" }}>
              {lang === "en" ? "Standard Circle" : "Circle Estándar"}
            </h3>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "16px" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "40px", fontWeight: 600 }}>€39</span>
              <span style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>{lang === "en" ? "/ month" : "/ mes"}</span>
            </div>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
              {lang === "en"
                ? "Standard membership rate (or €99 billed quarterly). No lock-in, pause anytime."
                : "Tarifa estándar (o 99€/trimestre). Pausa cuando lo necesites."}
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <li style={{ display: "flex", gap: "10px", fontSize: "14px" }}>
                <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
                {lang === "en" ? "20 monthly credits" : "20 créditos mensuales"}
              </li>
              <li style={{ display: "flex", gap: "10px", fontSize: "14px" }}>
                <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
                {lang === "en" ? "Full access to events calendar" : "Acceso completo a eventos"}
              </li>
              <li style={{ display: "flex", gap: "10px", fontSize: "14px" }}>
                <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
                {lang === "en" ? "Pause up to 2 months per year" : "Pausa hasta 2 meses al año"}
              </li>
              <li style={{ display: "flex", gap: "10px", fontSize: "14px" }}>
                <span style={{ color: "var(--color-accent-2)", fontWeight: "bold" }}>✓</span>
                {lang === "en" ? "Exclusive partner offers" : "Ofertas exclusivas de partners"}
              </li>
            </ul>

            <Link href="/membership/apply" className="btn btn-outline" style={{ width: "100%", textAlign: "center" }}>
              {lang === "en" ? "Apply to Join" : "Solicitar Unirte"}
            </Link>
          </div>
        </div>

        {/* Rules & Invariants Highlights */}
        <div style={{
          backgroundColor: "var(--color-surface)",
          padding: "36px 32px",
          borderRadius: "8px",
          border: "1px solid var(--color-divider)"
        }}>
          <h3 style={{ fontSize: "20px", color: "var(--color-accent)", marginBottom: "16px" }}>
            {lang === "en" ? "How Credits Work" : "Cómo Funcionan los Créditos"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
            <div>
              <h4 style={{ fontSize: "16px", marginBottom: "6px" }}>20 {lang === "en" ? "Credits/Month" : "Créditos/Mes"}</h4>
              <p style={{ fontSize: "13.5px", color: "var(--color-text-muted)", margin: 0 }}>
                {lang === "en" ? "Granted with every subscription payment, with a 40-credit rollover cap." : "Otorgados en cada cuota mensual, con un tope de acumulación de 40 créditos."}
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: "16px", marginBottom: "6px" }}>{lang === "en" ? "Fair Returns" : "Devolución Justa"}</h4>
              <p style={{ fontSize: "13.5px", color: "var(--color-text-muted)", margin: 0 }}>
                {lang === "en" ? "Cancel a booking up to 24h prior and credits return directly to your account." : "Cancela hasta 24h antes y recupera todos los créditos utilizados."}
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: "16px", marginBottom: "6px" }}>{lang === "en" ? "Two Pools" : "Dos Grupos"}</h4>
              <p style={{ fontSize: "13.5px", color: "var(--color-text-muted)", margin: 0 }}>
                {lang === "en" ? "Members always get priority seats for every room and walk." : "Las socias siempre tienen prioridad en plazas para cada sala y paseo."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
