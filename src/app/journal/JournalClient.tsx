"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";
import { tStr } from "@/lib/i18nEngine";
import { normalizeCategoryId, JOURNAL_CATEGORIES } from "@/lib/journalCategories";

/* ─── Article Data Model ──────────────────────────────────── */

export interface PublicArticle {
  id: string;
  slug?: string;
  cat: string;
  dateEn: string;
  dateEs: string;
  dateFr: string;
  readEn: string;
  readEs: string;
  readFr: string;
  author: string;
  roleEn: string;
  roleEs: string;
  roleFr: string;
  titleEn: string;
  titleEs: string;
  titleFr: string;
  dekEn: string;
  dekEs: string;
  dekFr: string;
  image?: string;
  imageAlt?: string;
  audience?: string;
}

const CAT_ORDER = ["all", ...JOURNAL_CATEGORIES.map(c => c.id)];

const getCatLabel = (k: string, lang: string) => {
  if (k === "all") return lang === "fr" ? "Tout" : lang === "es" ? "Todo" : "Everything";
  const cat = JOURNAL_CATEGORIES.find(c => c.id === k);
  if (!cat) return k;
  return lang === "fr" ? (cat.labelFr || cat.labelEn) : lang === "es" ? cat.labelEs : cat.labelEn;
};

interface JournalClientProps {
  dynamicArticles?: PublicArticle[];
}

export default function JournalClient({ dynamicArticles = [] }: JournalClientProps) {
  const [lang, setLang] = useState<Locale>("en");
  const [selectedCat, setSelectedCat] = useState<string>("all");

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  const allArticles: PublicArticle[] = dynamicArticles;

  // Category filter
  const filtered =
    selectedCat === "all"
      ? allArticles
      : allArticles.filter((a) => normalizeCategoryId(a.cat) === normalizeCategoryId(selectedCat));

  return (
    <div
      style={{
        backgroundColor: "#fdf8f2",
        color: "#39292a",
        fontFamily: "'Lora', Georgia, serif",
        minHeight: "100vh",
      }}
    >
      {/* ─── Hero Section ──────────────────────────────────── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(38px, 5vw, 66px) clamp(20px, 5vw, 64px) clamp(18px, 3vw, 26px)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
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
          {tStr("The Journal", lang)}
        </div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 400,
            fontSize: "clamp(32px, 4.4vw, 52px)",
            lineHeight: 1.1,
            margin: "0 0 16px",
            textWrap: "pretty",
          }}
        >
          {tStr("What mothers are talking about.", lang)}
        </h1>
        <p
          style={{
            fontSize: "16.5px",
            lineHeight: 1.65,
            color: "rgba(57, 41, 42, 0.72)",
            maxWidth: "64ch",
            margin: 0,
          }}
        >
          {tStr("Articles on motherhood and everything around it — from pregnancy and the early weeks to sleep, work, friendship and finding yourself again.", lang)}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "26px" }}>
          {CAT_ORDER.map((k) => {
            const isSelected = selectedCat === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSelectedCat(k)}
                style={{
                  border: isSelected ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.25)",
                  background: isSelected ? "rgba(123, 31, 44, 0.08)" : "transparent",
                  color: isSelected ? "#7b1f2c" : "#39292a",
                  borderRadius: "16px",
                  padding: "8px 16px",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "13.5px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {getCatLabel(k, lang)}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Articles Listing (Claude 3-Column Grid) ────────── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(22px, 3vw, 34px) clamp(20px, 5vw, 64px) clamp(46px, 6vw, 76px)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: "26px",
          }}
        >
          {filtered.map((p, idx) => (
            <div key={p.id || p.slug || idx} style={{ display: "flex", flexDirection: "column" }}>
              <Link
                href={`/journal/${p.slug || p.id}`}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  textDecoration: "none",
                  color: "inherit",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    background: "#ecdcd0",
                    padding: "6px",
                    borderRadius: "5px",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    style={{
                      border: "1px solid rgba(57, 41, 42, 0.16)",
                      borderRadius: "3px",
                      overflow: "hidden",
                      height: "190px",
                      backgroundColor: "#ecdcd0",
                      position: "relative",
                    }}
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.imageAlt || (lang === "fr" ? p.titleFr : lang === "es" ? p.titleEs : p.titleEn)}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "16px",
                          textAlign: "center",
                          color: "rgba(57, 41, 42, 0.6)",
                          fontSize: "13px",
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          width="28"
                          height="28"
                          style={{ marginBottom: "8px", opacity: 0.7 }}
                        >
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                        <span>{lang === "fr" ? p.titleFr : lang === "es" ? p.titleEs : p.titleEn}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "11.5px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#7b1f2c",
                    marginBottom: "8px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontWeight: 600,
                  }}
                >
                  {getCatLabel(normalizeCategoryId(p.cat), lang)}
                </div>

                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontWeight: 600,
                    fontSize: "21px",
                    lineHeight: 1.25,
                    margin: "0 0 8px",
                    color: "#39292a",
                  }}
                >
                  {lang === "fr" ? p.titleFr : lang === "es" ? p.titleEs : p.titleEn}
                </h2>

                <p
                  style={{
                    fontSize: "14.5px",
                    lineHeight: 1.6,
                    color: "rgba(57, 41, 42, 0.74)",
                    margin: "0 0 10px",
                    flex: 1,
                  }}
                >
                  {lang === "fr" ? p.dekFr : lang === "es" ? p.dekEs : p.dekEn}
                </p>

                <div
                  style={{
                    fontSize: "12.5px",
                    color: "rgba(57, 41, 42, 0.72)",
                    fontFeatureSettings: "'tnum'",
                    fontFamily: "'Lora', Georgia, serif",
                  }}
                >
                  {lang === "fr" ? p.dateFr : lang === "es" ? p.dateEs : p.dateEn} · {lang === "fr" ? p.readFr : lang === "es" ? p.readEs : p.readEn}
                </div>
              </Link>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              backgroundColor: "rgba(57, 41, 42, 0.03)",
              borderRadius: "8px",
              border: "1px dashed rgba(57, 41, 42, 0.15)",
              maxWidth: "540px",
              margin: "20px auto",
            }}
          >
            <p style={{ fontSize: "16px", color: "rgba(57, 41, 42, 0.8)", margin: "0 0 6px", fontWeight: 500 }}>
              {allArticles.length === 0
                ? lang === "en"
                  ? "No articles published yet."
                  : "Aún no hay artículos publicados."
                : lang === "en"
                ? "Nothing in this category yet."
                : "Aquí todavía no hay nada en esta categoría."}
            </p>
            <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.6)", margin: 0 }}>
              {allArticles.length === 0
                ? lang === "en"
                  ? "Check back soon for stories, perspectives and notes from The Mothers."
                  : "Vuelve pronto para leer nuevas historias y artículos de The Mothers."
                : lang === "en"
                ? "Try selecting another category or view Everything."
                : "Prueba seleccionando otra categoría o mira Todo."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
