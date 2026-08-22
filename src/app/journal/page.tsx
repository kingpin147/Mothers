"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";

interface Article {
  slug: string;
  titleEn: string;
  titleEs: string;
  excerptEn: string;
  excerptEs: string;
  category: string;
  readTime: string;
  date: string;
}

const ARTICLES: Article[] = [
  {
    slug: "postpartum-support-barcelona",
    titleEn: "Finding Your Village: The First 100 Days in Barcelona",
    titleEs: "Encontrar tu Tribu: Los Primeros 100 Días en Barcelona",
    excerptEn: "Practical wisdom, quiet parks, and building meaningful connections when you have a newborn in the city.",
    excerptEs: "Parques tranquilos, consejos prácticos y cómo crear vínculos reales con un recién nacido en la ciudad.",
    category: "Maternal Wellness",
    readTime: "4 min read",
    date: "18 Aug 2026",
  },
  {
    slug: "career-and-motherhood-rebalance",
    titleEn: "Returning to Work Without Losing Your Centre",
    titleEs: "Volver al Trabajo sin Perder tu Centro",
    excerptEn: "Guidance on flexible rhythms, boundaries, and career navigation after welcoming a baby.",
    excerptEs: "Pautas sobre ritmos flexibles, límites y desarrollo profesional tras la maternidad.",
    category: "Life & Work",
    readTime: "6 min read",
    date: "10 Aug 2026",
  },
  {
    slug: "quiet-cafes-and-stroller-walks-bcn",
    titleEn: "The Best Stroller Walks & Peaceful Cafés in Sarrià and Gràcia",
    titleEs: "Los Mejores Paseos en Cochecito y Cafés Tranquilos en Sarrià y Gràcia",
    excerptEn: "Curated corners of the city where you can nurse, push a stroller easily, and enjoy a warm coffee.",
    excerptEs: "Rincones seleccionados de la ciudad para pasear en carrito, dar el pecho y tomarte un café caliente.",
    category: "City Guides",
    readTime: "5 min read",
    date: "01 Aug 2026",
  },
];

export default function JournalPage() {
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
      <div style={{ maxWidth: "920px", margin: "0 auto" }}>
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
            {lang === "en" ? "The Journal" : "El Diario"}
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(34px, 5vw, 52px)", marginBottom: "16px" }}>
            {lang === "en" ? "Reflections, City Notes & Expert Voices" : "Reflexiones, Ciudad y Voces Expertas"}
          </h1>
          <p style={{ fontSize: "17px", color: "var(--color-text-muted)", maxWidth: "600px", margin: "0 auto" }}>
            {lang === "en"
              ? "Honest thoughts on modern motherhood, neighbourhood spots, and navigating family life in Barcelona."
              : "Miradas honestas sobre la maternidad actual, rincones de barrio y vida en familia en Barcelona."}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "28px" }}>
          {ARTICLES.map((art) => (
            <article
              key={art.slug}
              className="card"
              style={{
                backgroundColor: "#fff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "28px",
                border: "1px solid var(--color-divider)"
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--color-accent-2)", fontWeight: 600, marginBottom: "12px" }}>
                  <span>{art.category}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{art.readTime}</span>
                </div>
                <h2 style={{ fontSize: "22px", margin: "0 0 10px", lineHeight: "1.3" }}>
                  <Link href={`/journal/${art.slug}`} style={{ color: "inherit" }}>
                    {lang === "en" ? art.titleEn : art.titleEs}
                  </Link>
                </h2>
                <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--color-text-muted)", marginBottom: "20px" }}>
                  {lang === "en" ? art.excerptEn : art.excerptEs}
                </p>
              </div>

              <div style={{ borderTop: "1px solid var(--color-divider)", paddingTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{art.date}</span>
                <Link href={`/journal/${art.slug}`} style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-accent)" }}>
                  {lang === "en" ? "Read Article →" : "Leer Artículo →"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
