"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { FAQ_GROUPS, FAQ_GROUP_NOTES, FaqItemData } from "@/lib/faqData";

interface FaqClientProps {
  dynamicFaqs: FaqItemData[];
  publicSettings?: any;
}

export default function FaqClient({ dynamicFaqs = [] }: FaqClientProps) {
  const { language: lang } = useLanguage();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({ "0-0": true });

  const isEn = lang === "en";

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Group dynamic or canonical FAQs by group name
  const groupedFaqs = FAQ_GROUPS.map((groupTitle, gIndex) => {
    const items = dynamicFaqs.filter((f) => f.group === groupTitle);
    const note = FAQ_GROUP_NOTES[groupTitle]?.[lang] || "";
    return {
      title: groupTitle,
      note,
      items,
      gIndex,
    };
  }).filter((g) => g.items.length > 0);

  const groupDisplayTitles: Record<string, { en: string; es: string }> = {
    "Coming to an event now": { en: "Coming to an event now", es: "Asistir a un encuentro ahora" },
    "Credits and your wallet": { en: "Credits and your wallet", es: "Créditos y tu monedero" },
    "Membership after launch": { en: "Membership after launch", es: "Membresía tras el lanzamiento" },
    "The club itself": { en: "The club itself", es: "El club y funcionamiento" },
  };

  return (
    <div style={{ backgroundColor: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", minHeight: "100vh" }}>
      {/* ─── Header Section ─── */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "clamp(38px, 5vw, 66px) clamp(20px, 5vw, 64px) clamp(20px, 3vw, 30px)" }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#7b1f2c",
            marginBottom: "12px",
          }}
        >
          {isEn ? "Questions" : "Preguntas"}
        </div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 400,
            fontSize: "clamp(32px, 4.4vw, 52px)",
            lineHeight: 1.1,
            margin: 0,
            color: "#39292a",
          }}
        >
          {isEn ? "You wonder, we answer." : "Todas tus preguntas, respondidas."}
        </h1>
      </section>

      {/* ─── FAQ Groups Accordion ─── */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "clamp(18px, 3vw, 26px) clamp(20px, 5vw, 64px) clamp(46px, 6vw, 76px)" }}>
        {groupedFaqs.map((g) => {
          const displayTitle = groupDisplayTitles[g.title]?.[lang] || g.title;
          return (
            <div key={g.title} style={{ marginBottom: "38px" }}>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "clamp(21px, 2.6vw, 26px)",
                  margin: "0 0 4px",
                  color: "#39292a",
                }}
              >
                {displayTitle}
              </h2>
              {g.note && (
                <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: "0 0 10px" }}>
                  {g.note}
                </p>
              )}

              {g.items.map((item, iIndex) => {
                const key = `${g.gIndex}-${iIndex}`;
                const isOpen = !!openItems[key];
                const questionText = isEn ? item.qEn : item.qEs;
                const answerText = isEn ? item.aEn : item.aEs;

                return (
                  <div key={key} style={{ borderTop: "1px solid rgba(57, 41, 42, 0.14)" }}>
                    <button
                      type="button"
                      onClick={() => toggleItem(key)}
                      style={{
                        width: "100%",
                        display: "flex",
                        gap: "16px",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        background: "transparent",
                        border: "none",
                        padding: "16px 0",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontWeight: 600,
                        fontSize: "17.5px",
                        color: "#39292a",
                      }}
                    >
                      <span>{questionText}</span>
                      <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: "18px", color: "#7b1f2c", flex: "none" }}>
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: "0 0 18px" }}>
                        <p
                          style={{
                            fontSize: "15px",
                            lineHeight: 1.7,
                            color: "rgba(57, 41, 42, 0.74)",
                            margin: 0,
                            maxWidth: "72ch",
                            textAlign: "justify",
                          }}
                        >
                          {answerText}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Bottom CTA Block */}
        <div
          style={{
            border: "1px solid rgba(57, 41, 42, 0.2)",
            borderRadius: "8px",
            backgroundColor: "#ffffff",
            padding: "clamp(22px, 3vw, 32px)",
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "20px",
          }}
        >
          <div style={{ flex: "1 1 320px", minWidth: "260px" }}>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "22px",
                margin: "0 0 7px",
                color: "#39292a",
              }}
            >
              {isEn ? "Still hesitating?" : "¿Aún tienes dudas?"}
            </h2>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: 0 }}>
              {isEn
                ? "Come to a walk. It is free, it lasts an hour, and nobody will ask you to join anything."
                : "Ven a un paseo. Es gratuito, dura una hora y nadie te pedirá comprometerte a nada."}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link
              href="/events"
              style={{
                border: "1px solid #7b1f2c",
                color: "#7b1f2c",
                backgroundColor: "transparent",
                padding: "12px 22px",
                borderRadius: "4px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "15px",
                whiteSpace: "nowrap",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              {isEn ? "See the calendar" : "Ver calendario"}
            </Link>
            <a
              href="mailto:hello@themothers.cc"
              style={{
                border: "1px solid rgba(57, 41, 42, 0.24)",
                color: "#39292a",
                backgroundColor: "transparent",
                padding: "12px 22px",
                borderRadius: "4px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "15px",
                whiteSpace: "nowrap",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              {isEn ? "Write to us" : "Escríbenos"}
            </a>
          </div>
        </div>

        <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.72)", margin: "22px 0 0" }}>
          {isEn ? "Looking for the legal details? " : "¿Buscas los detalles legales? "}
          <Link href="/legal" style={{ color: "#7b1f2c", textDecoration: "none" }}>
            {isEn ? "Terms & Conditions" : "Términos y Condiciones"}
          </Link>{" "}
          {isEn ? "and " : "y "}
          <Link href="/legal#privacy" style={{ color: "#7b1f2c", textDecoration: "none" }}>
            {isEn ? "Privacy Policy" : "Política de Privacidad"}
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
