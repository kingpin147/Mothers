"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";

interface PartnerItem {
  id: string;
  name: string;
  umbrella: string;
  specialty: string;
  descriptionEn: string;
  descriptionEs: string;
  offerEn: string;
  offerEs: string;
}

const SAMPLE_PARTNERS: PartnerItem[] = [
  {
    id: "p-1",
    name: "Dorm Bé",
    umbrella: "Expert Care & Support",
    specialty: "Infant Sleep Consultancy",
    descriptionEn: "Gentle, evidence-based sleep support tailored to your family rhythm.",
    descriptionEs: "Acompañamiento respetuoso y basado en evidencia para el sueño de tu bebé.",
    offerEn: "15% off complete consultations & priority WhatsApp access",
    offerEs: "15% de descuento en consultas completas y atención prioritaria",
  },
  {
    id: "p-2",
    name: "Momentum Careers",
    umbrella: "Expert Care & Support",
    specialty: "Maternal Career Coaching",
    descriptionEn: "Specialist coaching for navigating return-to-work, balance and career pivots after baby.",
    descriptionEs: "Coaching especializado para conciliar, volver al trabajo o reinventarte.",
    offerEn: "Complimentary 30-min strategy review + 10% off coaching packs",
    offerEs: "Sesión inicial de 30 min sin coste + 10% en packs de coaching",
  },
  {
    id: "p-3",
    name: "Luz Movement Studio",
    umbrella: "Wellness & Movement",
    specialty: "Prenatal & Postnatal Pelvic Movement",
    descriptionEn: "Physiotherapist-led small group classes focusing on pelvic health and strength.",
    descriptionEs: "Clases en grupos reducidos guiadas por fisioterapeutas especializadas.",
    offerEn: "First class complimentary + 10% on monthly packs",
    offerEs: "Primera clase de prueba sin coste + 10% en bonos mensuales",
  },
];

export default function PartnersPage() {
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
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
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
            {lang === "en" ? "Partner Directory" : "Directorio de Partners"}
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(34px, 5vw, 52px)", marginBottom: "16px" }}>
            {lang === "en" ? "One trusted partner per specialty." : "Un partner de confianza por especialidad."}
          </h1>
          <p style={{ fontSize: "17px", color: "var(--color-text-muted)", maxWidth: "620px", margin: "0 auto" }}>
            {lang === "en"
              ? "We partner exclusively with practitioners and places we know and trust ourselves. Honest recommendations, member-only perks."
              : "Colaboramos exclusivamente con profesionales y espacios que conocemos y recomendamos nosotras mismas."}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {SAMPLE_PARTNERS.map((partner) => (
            <div key={partner.id} className="card" style={{ padding: "28px", backgroundColor: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <span style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-accent)", fontWeight: 600 }}>
                    {partner.specialty}
                  </span>
                  <h3 style={{ fontSize: "22px", margin: "4px 0 0" }}>{partner.name}</h3>
                </div>
                <span style={{
                  fontSize: "12px",
                  color: "var(--color-accent-2)",
                  backgroundColor: "var(--color-status-confirmed)",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontWeight: 600
                }}>
                  {partner.umbrella}
                </span>
              </div>

              <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--color-text-muted)", margin: "0 0 16px" }}>
                {lang === "en" ? partner.descriptionEn : partner.descriptionEs}
              </p>

              <div style={{
                backgroundColor: "#fdf9f2",
                border: "1px solid var(--color-divider)",
                borderRadius: "4px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                <span style={{ color: "var(--color-accent)", fontWeight: "bold" }}>★</span>
                <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--color-text)" }}>
                  {lang === "en" ? partner.offerEn : partner.offerEs}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
