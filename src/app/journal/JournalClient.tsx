"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";
import { tStr } from "@/lib/i18nEngine";
import { normalizeCategoryId } from "@/lib/journalCategories";

/* ─── Article Data Model ──────────────────────────────────── */

export interface PublicArticle {
  id: string;
  slug?: string;
  cat: string;
  dateEn: string;
  dateEs: string;
  readEn: string;
  readEs: string;
  author: string;
  roleEn: string;
  roleEs: string;
  titleEn: string;
  titleEs: string;
  dekEn: string;
  dekEs: string;
  image?: string;
  imageAlt?: string;
  audience?: string;
}

const STATIC_FALLBACKS: PublicArticle[] = [
  {
    id: "doula",
    slug: "doula",
    cat: "postpartum",
    dateEn: "Aug 4, 2026",
    dateEs: "4 ago 2026",
    readEn: "6 min read",
    readEs: "6 min de lectura",
    author: "Marta Vidal",
    roleEn: "postpartum doula, Eixample",
    roleEs: "doula posparto, Eixample",
    image: "/assets/journal-doula.jpg",
    titleEn: "Finding a postpartum doula in Barcelona",
    titleEs: "Encontrar una doula posparto en Barcelona",
    dekEn: "What a doula actually does in the fourth trimester, what it costs here, and the questions worth asking before you book one.",
    dekEs: "Qué hace realmente una doula en el cuarto trimestre, cuánto cuesta aquí y qué conviene preguntar antes de contratarla.",
  },
  {
    id: "friends",
    slug: "friends",
    cat: "friendship",
    dateEn: "Jul 28, 2026",
    dateEs: "28 jul 2026",
    readEn: "5 min read",
    readEs: "5 min de lectura",
    author: "The Mothers",
    roleEn: "",
    roleEs: "",
    image: "/assets/journal-friends.jpg",
    titleEn: "Making mum friends in a city that isn't yours",
    titleEs: "Hacer amigas madres en una ciudad que no es la tuya",
    dekEn: "Why it is harder than anyone admits, and the three things that actually move a friendly acquaintance into a friend.",
    dekEs: "Por qué cuesta más de lo que nadie admite, y las tres cosas que convierten a una conocida amable en una amiga.",
  },
  {
    id: "sleep",
    slug: "sleep",
    cat: "sleep",
    dateEn: "Jul 19, 2026",
    dateEs: "19 jul 2026",
    readEn: "7 min read",
    readEs: "7 min de lectura",
    author: "Dorm Bé Sleep Consultants",
    roleEn: "partner",
    roleEs: "partner",
    image: "/assets/journal-sleep.jpg",
    titleEn: "The first twelve weeks of sleep, honestly",
    titleEs: "Las primeras doce semanas de sueño, sin cuentos",
    dekEn: "What is developmentally normal, what is not worth fixing yet, and the two things that genuinely help before three months.",
    dekEs: "Qué es normal en el desarrollo, qué no merece la pena arreglar todavía y las dos cosas que de verdad ayudan antes de los tres meses.",
  },
  {
    id: "feeding",
    slug: "feeding",
    cat: "feeding",
    dateEn: "Jul 8, 2026",
    dateEs: "8 jul 2026",
    readEn: "6 min read",
    readEs: "6 min de lectura",
    author: "BabyLatch Consultants",
    roleEn: "partner",
    roleEs: "partner",
    image: "/assets/journal-feeding.jpg",
    titleEn: "Feeding: the questions nobody answers at 3am",
    titleEs: "Lactancia: las preguntas que nadie responde a las 3 de la mañana",
    dekEn: "Pain, supply, mixed feeding and when to actually call someone — the practical answers, without the ideology.",
    dekEs: "Dolor, producción, lactancia mixta y cuándo llamar de verdad a alguien — las respuestas prácticas, sin ideología.",
  },
  {
    id: "yoga",
    slug: "yoga",
    cat: "body",
    dateEn: "Jun 30, 2026",
    dateEs: "30 jun 2026",
    readEn: "4 min read",
    readEs: "4 min de lectura",
    author: "Loto Barcelona Yoga",
    roleEn: "partner",
    roleEs: "partner",
    image: "/assets/journal-yoga.jpg",
    titleEn: "Prenatal yoga in Barcelona: what to ask before you book",
    titleEs: "Yoga prenatal en Barcelona: qué preguntar antes de apuntarte",
    dekEn: "Not all prenatal classes are prenatal classes. Five questions that tell you whether the teacher in front of you is trained for a pregnant body.",
    dekEs: "No todas las clases prenatales lo son. Cinco preguntas que te dicen si quien tienes delante está formada para un cuerpo embarazado.",
  },
  {
    id: "work",
    slug: "work",
    cat: "work",
    dateEn: "Jun 17, 2026",
    dateEs: "17 jun 2026",
    readEn: "6 min read",
    readEs: "6 min de lectura",
    author: "Momentum Careers Barcelona",
    roleEn: "partner",
    roleEs: "partner",
    image: "/assets/journal-work.jpg",
    titleEn: "Going back to work: the conversations to have first",
    titleEs: "Volver al trabajo: las conversaciones previas",
    dekEn: "Before the logistics, three conversations that decide how the return actually goes — with your employer, your partner, and yourself.",
    dekEs: "Antes de la logística, tres conversaciones que deciden cómo va la vuelta — con tu empresa, con tu pareja y contigo misma.",
  },
];

const CAT_ORDER = ["all", "postpartum", "feeding", "sleep", "body", "friendship", "work"];

const CATS_EN: Record<string, string> = {
  all: "Everything",
  postpartum: "Postpartum",
  feeding: "Feeding",
  sleep: "Sleep",
  body: "Body & pregnancy",
  friendship: "Friendship",
  work: "Work",
};

const CATS_FR: Record<string, string> = {
  all: "Tout",
  pregnancy: "Grossesse et naissance",
  postpartum: "Post-partum",
  sleep: "Sommeil",
  feeding: "Allaitement",
  friendship: "Amitié",
  work: "Travail",
};

const CATS_ES: Record<string, string> = {
  all: "Todo",
  postpartum: "Posparto",
  feeding: "Lactancia",
  sleep: "Sueño",
  body: "Cuerpo y embarazo",
  friendship: "Amistad",
  work: "Trabajo",
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

  const allArticles: PublicArticle[] =
    dynamicArticles.length > 0 ? dynamicArticles : STATIC_FALLBACKS;

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
                {lang === "fr" ? (CATS_FR[k] || CATS_EN[k]) : lang === "es" ? CATS_ES[k] : CATS_EN[k]}
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
                        alt={p.imageAlt || (lang === "en" ? p.titleEn : p.titleEs)}
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
                        <span>{lang === "en" ? p.titleEn : p.titleEs}</span>
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
                  {lang === "en"
                    ? CATS_EN[normalizeCategoryId(p.cat)] || p.cat
                    : CATS_ES[normalizeCategoryId(p.cat)] || p.cat}
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
                  {lang === "en" ? p.titleEn : p.titleEs}
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
                  {lang === "en" ? p.dekEn : p.dekEs}
                </p>

                <div
                  style={{
                    fontSize: "12.5px",
                    color: "rgba(57, 41, 42, 0.72)",
                    fontFeatureSettings: "'tnum'",
                    fontFamily: "'Lora', Georgia, serif",
                  }}
                >
                  {lang === "en" ? p.dateEn : p.dateEs} · {lang === "en" ? p.readEn : p.readEs}
                </div>
              </Link>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p style={{ fontSize: "15.5px", color: "rgba(57, 41, 42, 0.72)", margin: 0 }}>
            {lang === "en"
              ? "Nothing here yet — try another category."
              : "Aquí todavía no hay nada — prueba otra categoría."}
          </p>
        )}
      </section>
    </div>
  );
}
