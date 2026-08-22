"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Locale } from "@/lib/i18n";

export default function JournalSinglePage() {
  const params = useParams();
  const slug = params?.slug as string;
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
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ marginBottom: "28px" }}>
          <Link href="/journal" style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
            ← {lang === "en" ? "Back to Journal" : "Volver al Diario"}
          </Link>
        </div>

        <article className="card" style={{ backgroundColor: "#fff", padding: "clamp(32px, 5vw, 56px)", border: "1px solid var(--color-divider)" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-accent-2)", fontWeight: 600, marginBottom: "12px" }}>
            Maternal Wellness · 4 min read
          </div>

          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(28px, 4.5vw, 44px)", margin: "0 0 16px", lineHeight: "1.2" }}>
            {lang === "en" ? "Finding Your Village: The First 100 Days in Barcelona" : "Encontrar tu Tribu: Los Primeros 100 Días en Barcelona"}
          </h1>

          <div style={{ fontSize: "13px", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-divider)", paddingBottom: "20px", marginBottom: "32px" }}>
            By The Mothers Editorial · 18 Aug 2026
          </div>

          <div style={{ fontSize: "16.5px", lineHeight: "1.8", color: "var(--color-text)", display: "flex", flexDirection: "column", gap: "20px" }}>
            <p>
              {lang === "en"
                ? "The first three months of welcoming a baby are uniquely tender. In a vibrant city like Barcelona, the world continues to move at full speed outside your balcony while inside, hours stretch around feedings and quiet naps."
                : "Los primeros tres meses tras la llegada de un bebé son especialmente tiernos. En una ciudad vibrante como Barcelona, el ritmo exterior sigue imparable mientras dentro las horas se miden en tomas y momentos de calma."}
            </p>
            <p>
              {lang === "en"
                ? "Having even one other mother to meet in the park on a sunny morning changes everything. That is why The Mothers was built — to make finding your neighbourhood circle effortless, warm, and natural."
                : "Contar con otra madre con quien encontrarse en el parque en una mañana soleada lo cambia todo. Por eso nació The Mothers — para que encontrar tu círculo en el barrio sea sencillo, cálido y natural."}
            </p>
          </div>

          <div style={{ marginTop: "48px", paddingTop: "28px", borderTop: "1px solid var(--color-divider)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h4 style={{ fontSize: "16px", margin: "0 0 4px" }}>
                {lang === "en" ? "Want to join our next walk?" : "¿Quieres unirte al próximo paseo?"}
              </h4>
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>
                {lang === "en" ? "Applications are open for our founding circle." : "Plazas abiertas para el círculo fundador."}
              </p>
            </div>
            <Link href="/membership/apply" className="btn btn-primary" style={{ fontSize: "13px" }}>
              {lang === "en" ? "Apply to Join →" : "Solicitar Unirte →"}
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
