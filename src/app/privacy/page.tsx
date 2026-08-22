"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";

export default function PrivacyPage() {
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
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px) 100px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-accent)", fontWeight: 600, marginBottom: "8px" }}>
            The Mothers · GDPR & Privacy
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5vw, 48px)", margin: "0 0 12px" }}>
            {lang === "en" ? "Privacy Policy" : "Política de Privacidad"}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
            {lang === "en" ? "Protection of maternal & family data under EU GDPR (RGPD) & Spanish LOPD" : "Protección de datos conforme al RGPD de la UE y la LOPD española"}
          </p>
        </div>

        <div className="card" style={{ backgroundColor: "#fff", padding: "clamp(28px, 5vw, 44px)", display: "flex", flexDirection: "column", gap: "24px", fontSize: "15px", lineHeight: "1.7" }}>
          <section>
            <h2 style={{ fontSize: "20px", color: "var(--color-accent)", marginBottom: "8px" }}>
              1. {lang === "en" ? "Data Controller & Scope" : "Responsable del Tratamiento"}
            </h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {lang === "en"
                ? "The Mothers processes personal data strictly to deliver club experiences, assign stage and neighbourhood groups, and manage billing. Contact: hello@themothers.cc."
                : "The Mothers trata los datos personales exclusivamente para gestionar las actividades del club, grupos por etapa y barrio, y facturación. Contacto: hello@themothers.cc."}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "20px", color: "var(--color-accent)", marginBottom: "8px" }}>
              2. {lang === "en" ? "Maternal & Children Data Privacy" : "Privacidad de Datos Familiares"}
            </h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {lang === "en"
                ? "Children's exact birthdates are never published. Members only ever see first names and stage tags (e.g. '0–12 months'). Surnames and private phone numbers remain confidential."
                : "Las fechas exactas de nacimiento no se hacen públicas. Las socias solo ven nombres de pila y etiquetas de etapa. Los apellidos y números de teléfono son estrictamente confidenciales."}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "20px", color: "var(--color-accent)", marginBottom: "8px" }}>
              3. {lang === "en" ? "Your Rights (GDPR)" : "Tus Derechos (RGPD)"}
            </h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {lang === "en"
                ? "You have the right to access, rectify, export, or delete your personal data at any time by contacting hello@themothers.cc or requesting account deletion."
                : "Tienes derecho a acceder, rectificar, exportar o eliminar tus datos personales en cualquier momento escribiendo a hello@themothers.cc o desde tu perfil."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
