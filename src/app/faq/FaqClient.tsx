"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { FAQ_GROUPS, FAQ_GROUP_NOTES, CANONICAL_FAQS, FaqItemData } from "@/lib/faqData";

interface FaqClientProps {
  dynamicFaqs: FaqItemData[];
  publicSettings?: any;
}

function normalizeFaqGroup(rawGroup?: string): string {
  if (!rawGroup) return "Coming to an event now";
  const g = rawGroup.trim().toLowerCase();
  if (
    g.includes("event") ||
    g.includes("coming") ||
    g.includes("joining") ||
    g.includes("general")
  ) {
    return "Coming to an event now";
  }
  if (g.includes("credit") || g.includes("wallet") || g.includes("topup")) {
    return "Credits and your wallet";
  }
  if (g.includes("member") || g.includes("launch") || g.includes("subscription")) {
    return "Membership after launch";
  }
  if (g.includes("club") || g.includes("host") || g.includes("gazette") || g.includes("forum")) {
    return "The club itself";
  }
  return rawGroup.trim();
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

  const effectiveFaqs =
    dynamicFaqs && dynamicFaqs.length > 0 ? dynamicFaqs : CANONICAL_FAQS;

  // Group dynamic or canonical FAQs by group name with alias normalization
  const resolvedGroupsMap = new Map<string, FaqItemData[]>();

  // Pre-seed canonical group order
  FAQ_GROUPS.forEach((grp) => {
    resolvedGroupsMap.set(grp, []);
  });

  effectiveFaqs.forEach((faq: FaqItemData) => {
    const normalized = normalizeFaqGroup(faq.group);
    if (!resolvedGroupsMap.has(normalized)) {
      resolvedGroupsMap.set(normalized, []);
    }
    resolvedGroupsMap.get(normalized)!.push(faq);
  });

  const groupedFaqs = Array.from(resolvedGroupsMap.entries())
    .map(([groupTitle, items], gIndex) => {
      const note = FAQ_GROUP_NOTES[groupTitle]?.[lang] || "";
      return {
        title: groupTitle,
        note,
        items,
        gIndex,
      };
    })
    .filter((g) => g.items.length > 0);

  const groupDisplayTitles: Record<string, { en: string; es: string; fr: string }> = {
    "Coming to an event now": {
      en: "Coming to an event now",
      es: "Asistir a un encuentro ahora",
      fr: "Venir à un événement maintenant",
    },
    "Credits and your wallet": {
      en: "Credits and your wallet",
      es: "Créditos y tu monedero",
      fr: "Les crédits et votre portefeuille",
    },
    "Membership after launch": {
      en: "Membership after launch",
      es: "Membresía tras el lanzamiento",
      fr: "L'adhésion, à partir du lancement",
    },
    "Membership, from January 2027": {
      en: "Membership, from January 2027",
      es: "Membresía, a partir de enero 2027",
      fr: "L'adhésion, à partir de janvier 2027",
    },
    "The club itself": {
      en: "The club itself",
      es: "El club y funcionamiento",
      fr: "Le club",
    },
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
          {lang === "fr" ? "Questions" : lang === "es" ? "Preguntas" : "Questions"}
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
          {lang === "fr"
            ? "Vous vous demandez, nous répondons."
            : lang === "es"
            ? "Todas tus preguntas, respondidas."
            : "You wonder, we answer."}
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
                const questionText = lang === "fr" ? item.qFr || item.qEn : lang === "es" ? item.qEs : item.qEn;
                const answerText = lang === "fr" ? item.aFr || item.aEn : lang === "es" ? item.aEs : item.aEn;

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
              {lang === "fr" ? "Vous hésitez encore ?" : lang === "es" ? "¿Aún tienes dudas?" : "Still hesitating?"}
            </h2>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: 0 }}>
              {lang === "fr"
                ? "Venez à un événement. Choisissez une rencontre au calendrier, personne ne vous demandera de vous engager."
                : lang === "es"
                ? "Ven a un evento. Elige cualquier encuentro del calendario y nadie te pedirá comprometerte a nada."
                : "Come to an event. Pick any gathering on the calendar, and nobody will ask you to join anything."}
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
              {lang === "fr" ? "Voir le calendrier" : lang === "es" ? "Ver calendario" : "See the calendar"}
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
              {lang === "fr" ? "Écrivez-nous" : lang === "es" ? "Escríbenos" : "Write to us"}
            </a>
          </div>
        </div>

        <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.72)", margin: "22px 0 0" }}>
          {lang === "fr"
            ? "Vous cherchez les mentions légales ? "
            : lang === "es"
            ? "¿Buscas los detalles legales? "
            : "Looking for the legal details? "}
          <Link href="/terms" style={{ color: "#7b1f2c", textDecoration: "none" }}>
            {lang === "fr" ? "Conditions Générales" : lang === "es" ? "Términos y Condiciones" : "Terms & Conditions"}
          </Link>{" "}
          {lang === "fr" ? "et " : lang === "es" ? "y " : "and "}
          <Link href="/privacy" style={{ color: "#7b1f2c", textDecoration: "none" }}>
            {lang === "fr" ? "Politique de Confidentialité" : lang === "es" ? "Política de Privacidad" : "Privacy Policy"}
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
