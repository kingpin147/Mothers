"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";

interface FaqEntry {
  group?: string;
  qEn: string;
  aEn: string;
  qEs: string;
  aEs: string;
}

interface FaqClientProps {
  dynamicFaqs: FaqEntry[];
  publicSettings?: any;
}

const CATEGORY_LABELS: Record<string, { en: string; es: string }> = {
  "Joining": { en: "Joining", es: "Unirse" },
  "Credits": { en: "Credits", es: "Créditos" },
  "Events": { en: "Events", es: "Eventos" },
  "Guests & the Event Pass": { en: "Guests & the Event Pass", es: "Invitadas y Event Pass" },
  "Membership & money": { en: "Membership & money", es: "Membresía y precios" },
  "General": { en: "General", es: "General" }
};

const DEFAULT_CATEGORY_ORDER = [
  "Joining",
  "Credits",
  "Events",
  "Guests & the Event Pass",
  "Membership & money",
];

export default function FaqClient({ dynamicFaqs = [], publicSettings = {} }: FaqClientProps) {
  const [lang, setLang] = useState<Locale>("en");
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({ "Joining-0": true });

  const processText = (text: string) => {
    let t = text;
    t = t.replace(/\{\{monthlyGrant\}\}/g, String(publicSettings?.monthlyGrantCredits ?? 20));
    t = t.replace(/\{\{referralBonus\}\}/g, String(publicSettings?.referralBonusCredits ?? 5));
    t = t.replace(/\{\{threeMonthBonus\}\}/g, String(publicSettings?.godmotherThreeMonthBonus ?? 15));
    
    const rolloverCap = publicSettings?.rolloverCapCredits ?? 0;
    const rolloverCapText = rolloverCap === 0 ? "no ceiling" : `a ceiling of ${rolloverCap}`;
    const rolloverCapTextEs = rolloverCap === 0 ? "sin límite" : `con un límite de ${rolloverCap}`;
    t = t.replace(/\{\{rolloverCapText\}\}/g, rolloverCapText);
    t = t.replace(/\{\{rolloverCapTextEs\}\}/g, rolloverCapTextEs);
    return t;
  };

  const allFaqs = dynamicFaqs.map((f) => ({
    group: f.group || "Joining",
    qEn: f.qEn,
    aEn: processText(f.aEn),
    qEs: f.qEs,
    aEs: processText(f.aEs)
  }));

  // Group FAQs by category maintaining consistent order
  const categoriesPresent = Array.from(new Set(allFaqs.map((f) => f.group)));
  const sortedCategories = [
    ...DEFAULT_CATEGORY_ORDER.filter((cat) => categoriesPresent.includes(cat)),
    ...categoriesPresent.filter((cat) => !DEFAULT_CATEGORY_ORDER.includes(cat))
  ];

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  const toggleAccordion = (key: string) => {
    setOpenMap((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: "12px"
          }}>
            {lang === "en" ? "FAQ" : "Preguntas frecuentes"}
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(34px, 5vw, 52px)", lineHeight: 1.1, marginBottom: "16px" }}>
            {lang === "en" ? "You wonder, we answer." : "Todas tus preguntas, respondidas."}
          </h1>
          <p style={{ fontSize: "19px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.78)", maxWidth: "560px", margin: "0 auto" }}>
            {lang === "en"
              ? "Everything you're wondering before you apply."
              : "Todo lo que quieres saber antes de solicitar tu lugar."}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "36px" }}>
          {sortedCategories.map((catName) => {
            const groupItems = allFaqs.filter((f) => f.group === catName);
            if (groupItems.length === 0) return null;
            const catLabel = CATEGORY_LABELS[catName]?.[lang] || catName;

            return (
              <div key={catName} style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: "14px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--color-accent)",
                    paddingBottom: "10px",
                    borderBottom: "2px solid rgba(123, 31, 44, 0.2)",
                    marginBottom: "4px"
                  }}
                >
                  {catLabel}
                </div>

                {groupItems.map((faq, idx) => {
                  const itemKey = `${catName}-${idx}`;
                  const isOpen = !!openMap[itemKey];

                  return (
                    <div
                      key={itemKey}
                      style={{
                        borderBottom: "1px solid rgba(57, 41, 42, 0.16)",
                        padding: "4px 0"
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleAccordion(itemKey)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "16px",
                          background: "transparent",
                          border: "none",
                          textAlign: "left",
                          padding: "16px 2px",
                          cursor: "pointer",
                          fontFamily: "var(--font-heading)",
                          fontWeight: 600,
                          fontSize: "17.5px",
                          color: "var(--color-text)",
                          minHeight: "44px"
                        }}
                      >
                        <span>{lang === "en" ? faq.qEn : faq.qEs}</span>
                        <span style={{
                          flex: "none",
                          color: "var(--color-accent)",
                          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                          display: "flex",
                          alignItems: "center"
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </span>
                      </button>

                      {isOpen && (
                        <p style={{
                          fontSize: "15px",
                          lineHeight: "1.65",
                          color: "rgba(57, 41, 42, 0.75)",
                          margin: "0 0 18px 0",
                          paddingRight: "28px"
                        }}>
                          {lang === "en" ? faq.aEn : faq.aEs}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: "center", fontSize: "14px", color: "rgba(57, 41, 42, 0.6)", marginTop: "36px" }}>
          {lang === "en" ? "Looking for the legal details?" : "¿Buscas la información legal?"}{" "}
          <Link href="/terms" style={{ color: "var(--color-accent)", fontWeight: 500 }}>
            {lang === "en" ? "Terms & Conditions" : "Términos y Condiciones"}
          </Link>
          {" · "}
          <Link href="/privacy" style={{ color: "var(--color-accent)", fontWeight: 500 }}>
            {lang === "en" ? "Privacy Policy" : "Política de Privacidad"}
          </Link>
        </p>

        {/* Closing CTA */}
        <div style={{
          backgroundColor: "#39292a",
          color: "#f8efe2",
          borderRadius: "8px",
          padding: "clamp(36px, 5vw, 48px) 24px",
          textAlign: "center",
          marginTop: "48px"
        }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(24px, 4vw, 36px)", margin: "0 0 12px 0", color: "#f8efe2" }}>
            {lang === "en" ? "Still hesitating?" : "¿Todavía dudas?"}
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(248, 239, 226, 0.75)", margin: "0 auto 24px auto", maxWidth: "480px" }}>
            {lang === "en"
              ? "Try one Open Event: experience the community, no membership needed."
              : "Prueba un Evento Abierto: vive la comunidad, sin necesidad de membresía."}
          </p>
          <Link
            href="/events"
            style={{
              display: "inline-block",
              border: "1px solid #f8efe2",
              color: "#f8efe2",
              padding: "12px 28px",
              borderRadius: "4px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "14.5px",
              textDecoration: "none"
            }}
          >
            {lang === "en" ? "Explore events" : "Explorar eventos"}
          </Link>
        </div>
      </div>
    </div>
  );
}
