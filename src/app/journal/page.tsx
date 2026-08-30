"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";

interface Article {
  id: string;
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
  photoHint: string;
}

const ARTICLES: Article[] = [
  {
    id: "doula",
    cat: "postpartum",
    dateEn: "Aug 4, 2026",
    dateEs: "4 ago 2026",
    readEn: "6 min read",
    readEs: "6 min de lectura",
    author: "Marta Vidal",
    roleEn: "postpartum doula, Eixample",
    roleEs: "doula posparto, Eixample",
    photoHint: "Photo — a doula and mother sitting together at a kitchen table, natural light",
    titleEn: "Finding a postpartum doula in Barcelona",
    titleEs: "Encontrar una doula posparto en Barcelona",
    dekEn: "What a doula actually does in the fourth trimester, what it costs here, and the questions worth asking before you book one.",
    dekEs: "Qué hace realmente una doula en el cuarto trimestre, cuánto cuesta aquí y qué conviene preguntar antes de contratarla.",
  },
  {
    id: "friends",
    cat: "friendship",
    dateEn: "Jul 28, 2026",
    dateEs: "28 jul 2026",
    readEn: "5 min read",
    readEs: "5 min de lectura",
    author: "The Mothers",
    roleEn: "",
    roleEs: "",
    photoHint: "Photo — two mothers with strollers talking on a park path, seen from behind",
    titleEn: "Making mum friends in a city that isn't yours",
    titleEs: "Hacer amigas madres en una ciudad que no es la tuya",
    dekEn: "Why it is harder than anyone admits, and the three things that actually move a friendly acquaintance into a friend.",
    dekEs: "Por qué es más difícil de lo que se admite y las tres cosas que realmente convierten a una conocida en una amiga.",
  },
  {
    id: "sleep",
    cat: "sleep",
    dateEn: "Jul 19, 2026",
    dateEs: "19 jul 2026",
    readEn: "7 min read",
    readEs: "7 min de lectura",
    author: "Dorm Bé Sleep Consultants",
    roleEn: "partner",
    roleEs: "partner",
    photoHint: "Photo — a dim bedroom at dawn, cot and a chair, no people",
    titleEn: "The first twelve weeks of sleep, honestly",
    titleEs: "Las primeras doce semanas de sueño, con honestidad",
    dekEn: "What is developmentally normal, what is not worth fixing yet, and the two things that genuinely help before three months.",
    dekEs: "Lo que es normal en el desarrollo, lo que no vale la pena arreglar todavía y las dos cosas que realmente ayudan antes de los tres meses.",
  },
  {
    id: "feeding",
    cat: "feeding",
    dateEn: "Jul 8, 2026",
    dateEs: "8 jul 2026",
    readEn: "6 min read",
    readEs: "6 min de lectura",
    author: "BabyLatch Consultants",
    roleEn: "partner",
    roleEs: "partner",
    photoHint: "Photo — mother feeding a baby in a bright living room, shot from the side",
    titleEn: "Feeding: the questions nobody answers at 3am",
    titleEs: "Lactancia: las preguntas que nadie responde a las 3 de la mañana",
    dekEn: "Pain, supply, mixed feeding and when to actually call someone — the practical answers, without the ideology.",
    dekEs: "Dolor, producción, lactancia mixta y cuándo llamar realmente a alguien: las respuestas prácticas, sin ideología.",
  },
  {
    id: "yoga",
    cat: "body",
    dateEn: "Jun 30, 2026",
    dateEs: "30 jun 2026",
    readEn: "4 min read",
    readEs: "4 min de lectura",
    author: "Loto Barcelona Yoga",
    roleEn: "partner",
    roleEs: "partner",
    photoHint: "Photo — a small prenatal yoga class, mats and bolsters, warm light",
    titleEn: "Prenatal yoga in Barcelona: what to ask before you book",
    titleEs: "Yoga prenatal en Barcelona: qué preguntar antes de reservar",
    dekEn: "Not all prenatal classes are prenatal classes. Five questions that tell you whether the teacher in front of you is trained for a pregnant body.",
    dekEs: "No todas las clases prenatales son lo mismo. Cinco preguntas que te dirán si la profesora está formada para un cuerpo gestante.",
  },
  {
    id: "work",
    cat: "work",
    dateEn: "Jun 17, 2026",
    dateEs: "17 jun 2026",
    readEn: "6 min read",
    readEs: "6 min de lectura",
    author: "Momentum Careers Barcelona",
    roleEn: "partner",
    roleEs: "partner",
    photoHint: "Photo — a desk with a laptop and a coffee, morning light, Barcelona apartment",
    titleEn: "Going back to work: the conversations to have first",
    titleEs: "Volver al trabajo: las conversaciones que debes tener primero",
    dekEn: "Before the logistics, three conversations that decide how the return actually goes — with your employer, your partner, and yourself.",
    dekEs: "Antes de la logística, tres conversaciones que deciden cómo va realmente el regreso: con tu empresa, tu pareja y contigo misma.",
  },
];

const CATEGORIES = [
  { id: "all", labelEn: "All", labelEs: "Todo" },
  { id: "postpartum", labelEn: "Postpartum", labelEs: "Posparto" },
  { id: "friendship", labelEn: "Friendship", labelEs: "Amistad" },
  { id: "sleep", labelEn: "Sleep", labelEs: "Sueño" },
  { id: "feeding", labelEn: "Feeding", labelEs: "Lactancia" },
  { id: "body", labelEn: "Body", labelEs: "Cuerpo" },
  { id: "work", labelEn: "Work", labelEs: "Trabajo" },
];

export default function JournalPage() {
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

  // Filter articles
  const filtered = selectedCat === "all"
    ? ARTICLES
    : ARTICLES.filter((art) => art.cat === selectedCat);

  // Split into Featured and Grid
  const featured = filtered.length > 0 ? filtered[0] : null;
  const gridArticles = filtered.length > 1 ? filtered.slice(1) : [];

  return (
    <div style={{ backgroundColor: "#f8efe2", color: "#39292a", minHeight: "100vh", fontFamily: "'Lora', Georgia, serif" }}>
      {/* Header section */}
      <section style={{ maxWidth: "960px", margin: "0 auto", padding: "clamp(56px, 8vw, 88px) clamp(24px, 5vw, 64px) clamp(24px, 4vw, 36px)" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "16px" }}>
          {lang === "en" ? "The Journal" : "El Diario"}
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(40px, 5.5vw, 66px)", lineHeight: "1.06", letterSpacing: "-0.01em", margin: "0 0 20px", maxWidth: "16em" }}>
          {lang === "en" ? "Useful writing about motherhood in Barcelona." : "Escritos útiles sobre la maternidad en Barcelona."}
        </h1>
        <p style={{ fontSize: "17px", lineHeight: "1.7", color: "rgba(57, 41, 42, 0.72)", maxWidth: "44em", margin: "0" }}>
          {lang === "en"
            ? "Honest thoughts on modern motherhood, neighbourhood spots, and navigating family life in Barcelona."
            : "Miradas honestas sobre la maternidad actual, rincones de barrio y vida en familia en Barcelona."}
        </p>
      </section>

      {/* Category Chips section */}
      <section style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 clamp(24px, 5vw, 64px) clamp(20px, 3vw, 32px)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCat === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                style={{
                  border: "1px solid " + (isActive ? "#7b1f2c" : "rgba(57,41,42,0.18)"),
                  color: isActive ? "#7b1f2c" : "rgba(57,41,42,0.7)",
                  background: isActive ? "rgba(123, 31, 44, 0.08)" : "transparent",
                  padding: "7px 16px",
                  borderRadius: "20px",
                  fontSize: "12.5px",
                  fontFamily: "'Lora', Georgia, serif",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  outline: "none",
                  transition: "all 0.2s ease-in-out",
                }}
              >
                {lang === "en" ? cat.labelEn : cat.labelEs}
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Articles Listing */}
      <section style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(20px, 3vw, 32px) clamp(24px, 5vw, 64px) clamp(48px, 6vw, 72px)" }}>
        {/* Featured Post */}
        {featured ? (
          <article
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "clamp(24px, 4vw, 48px)",
              alignItems: "stretch",
              borderBottom: "1px solid rgba(57, 41, 42, 0.16)",
              paddingBottom: "clamp(32px, 4vw, 48px)",
              marginBottom: "clamp(32px, 4vw, 48px)",
            }}
          >
            {/* Image placeholder / card styling */}
            <div style={{ flex: "1 1 380px", minWidth: "280px", backgroundColor: "rgba(57, 41, 42, 0.04)", border: "1px solid rgba(57, 41, 42, 0.12)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "clamp(240px, 28vw, 340px)", padding: "24px", boxSizing: "border-box", textAlign: "center" }}>
              <span style={{ fontSize: "14px", fontStyle: "italic", color: "rgba(57,41,42,0.5)" }}>{featured.photoHint}</span>
            </div>

            <div style={{ flex: "1 1 380px", minWidth: "280px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#7b1f2c", border: "1px solid rgba(123,31,44,0.35)", borderRadius: "12px", padding: "4px 11px" }}>
                  {lang === "en" ? CATEGORIES.find(c => c.id === featured.cat)?.labelEn : CATEGORIES.find(c => c.id === featured.cat)?.labelEs}
                </span>
                <span style={{ fontSize: "12px", color: "rgba(57,41,42,0.5)" }}>
                  {lang === "en" ? `${featured.dateEn} · ${featured.readEn}` : `${featured.dateEs} · ${featured.readEs}`}
                </span>
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "clamp(28px, 3.4vw, 40px)", lineHeight: "1.12", margin: "0 0 14px" }}>
                <Link href={`/journal/${featured.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {lang === "en" ? featured.titleEn : featured.titleEs}
                </Link>
              </h2>
              <p style={{ fontSize: "16px", lineHeight: "1.7", color: "rgba(57, 41, 42, 0.72)", margin: "0 0 22px", maxWidth: "34em" }}>
                {lang === "en" ? featured.dekEn : featured.dekEs}
              </p>
              <Link
                href={`/journal/${featured.id}`}
                style={{
                  alignSelf: "flex-start",
                  border: "1px solid #7b1f2c",
                  color: "#7b1f2c",
                  background: "transparent",
                  padding: "12px 24px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  textDecoration: "none",
                }}
              >
                {lang === "en" ? "Read Article" : "Leer Artículo"}
              </Link>
            </div>
          </article>
        ) : (
          <p style={{ fontSize: "15px", color: "rgba(57,41,42,0.6)", margin: "0" }}>
            {lang === "en" ? "No articles in this category." : "No hay artículos en esta categoría."}
          </p>
        )}

        {/* Articles Grid */}
        {gridArticles.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "clamp(24px, 3vw, 40px)" }}>
            {gridArticles.map((art) => (
              <article key={art.id} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ width: "100%", height: "200px", backgroundColor: "rgba(57, 41, 42, 0.04)", border: "1px solid rgba(57, 41, 42, 0.12)", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", boxSizing: "border-box", textAlign: "center" }}>
                  <span style={{ fontSize: "13px", fontStyle: "italic", color: "rgba(57,41,42,0.5)" }}>{art.photoHint}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#7b1f2c", fontWeight: 600 }}>
                    {lang === "en" ? CATEGORIES.find(c => c.id === art.cat)?.labelEn : CATEGORIES.find(c => c.id === art.cat)?.labelEs}
                  </span>
                  <span style={{ fontSize: "12px", color: "rgba(57,41,42,0.5)" }}>
                    {lang === "en" ? `${art.dateEn} · ${art.readEn}` : `${art.dateEs} · ${art.readEs}`}
                  </span>
                </div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "23px", lineHeight: "1.2", margin: "0" }}>
                  <Link href={`/journal/${art.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                    {lang === "en" ? art.titleEn : art.titleEs}
                  </Link>
                </h3>
                <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.7)", margin: "0" }}>
                  {lang === "en" ? art.dekEn : art.dekEs}
                </p>
                <Link
                  href={`/journal/${art.id}`}
                  style={{
                    alignSelf: "flex-start",
                    border: "none",
                    background: "transparent",
                    color: "#7b1f2c",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "14.5px",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: 0,
                  }}
                >
                  {lang === "en" ? "Read Article" : "Leer Artículo"}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
