"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Locale } from "@/lib/i18n";
import { getPublicJournalArticle, incrementJournalPostViews } from "@/app/actions/adminCms";
import { getCategoryLabel } from "@/lib/journalCategories";
import { BackArrow } from "@/components/Icons";

interface ArticleData {
  id: string;
  slug: string;
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
  heroImageUrl?: string;
  heroImageAlt?: string;
  titleEn: string;
  titleEs: string;
  titleFr: string;
  dekEn: string;
  dekEs: string;
  dekFr: string;
  quoteEn?: string;
  quoteEs?: string;
  quoteFr?: string;
  bodyEn: string[];
  bodyEs: string[];
  bodyFr: string[];
  bodyAfterEn: string[];
  bodyAfterEs: string[];
  bodyAfterFr: string[];
  bylineEn: string;
  bylineEs: string;
  bylineFr: string;
  reviewedNoteEn: string;
  reviewedNoteEs: string;
  reviewedNoteFr: string;
  audience: string;
}

export default function JournalSlugPage() {
  const params = useParams();
  const rawSlug = Array.isArray(params.slug) ? params.slug.join("/") : params.slug || "";
  const cleanSlug = rawSlug.toLowerCase().replace(/^\/journal\//, "").replace(/\/$/, "");

  const [lang, setLang] = useState<Locale>("en");
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("site_language") || localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "fr" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  useEffect(() => {
    async function loadArticle() {
      setLoading(true);

      // Track view asynchronously
      if (cleanSlug) {
        incrementJournalPostViews(cleanSlug);
      }

      // Check DB
      const res = await getPublicJournalArticle(cleanSlug);
      if (res && res.post) {
        const p = res.post;
        const paragraphsEn = (p.body || "").split("\n\n").map((s: string) => s.trim()).filter(Boolean);
        const paragraphsEs = (p.bodyEs || p.body || "").split("\n\n").map((s: string) => s.trim()).filter(Boolean);
        const paragraphsFr = (p.bodyFr || p.body || "").split("\n\n").map((s: string) => s.trim()).filter(Boolean);

        // Split body before/after quote if quote exists
        const halfEn = Math.ceil(paragraphsEn.length / 2);
        const halfEs = Math.ceil(paragraphsEs.length / 2);
        const halfFr = Math.ceil(paragraphsFr.length / 2);

        const wordCountEn = (p.body || "").split(/\s+/).filter(Boolean).length;
        const readTime = Math.max(1, Math.round(wordCountEn / 200));

        const pubDate = p.publishedAt ? new Date(p.publishedAt) : new Date(p.createdAt);

        setArticle({
          id: p.id,
          slug: p.slug,
          cat: p.category,
          dateEn: pubDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          dateEs: pubDate.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }),
          dateFr: pubDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
          readEn: `${readTime} min read`,
          readEs: `${readTime} min de lectura`,
          readFr: `${readTime} min de lecture`,
          author: p.author || "The Mothers",
          roleEn: p.authorRoleEn || "",
          roleEs: p.authorRoleEs || "",
          roleFr: p.authorRoleFr || "",
          heroImageUrl: p.heroImageUrl || undefined,
          heroImageAlt: p.heroImageAlt || p.title,
          titleEn: p.title,
          titleEs: p.titleEs || p.title,
          titleFr: p.titleFr || p.title,
          dekEn: p.excerpt,
          dekEs: p.excerptEs || p.excerpt,
          dekFr: p.excerptFr || p.excerpt,
          quoteEn: p.quoteEn || "",
          quoteEs: p.quoteEs || "",
          quoteFr: p.quoteFr || "",
          bodyEn: p.quoteEn ? paragraphsEn.slice(0, halfEn) : paragraphsEn,
          bodyAfterEn: p.quoteEn ? paragraphsEn.slice(halfEn) : [],
          bodyEs: p.quoteEs ? paragraphsEs.slice(0, halfEs) : paragraphsEs,
          bodyAfterEs: p.quoteEs ? paragraphsEs.slice(halfEs) : [],
          bodyFr: p.quoteFr ? paragraphsFr.slice(0, halfFr) : paragraphsFr,
          bodyAfterFr: p.quoteFr ? paragraphsFr.slice(halfFr) : [],
          bylineEn: p.bylineEn || `Written by ${p.author}`,
          bylineEs: p.bylineEs || `Escrito por ${p.author}`,
          bylineFr: p.bylineFr || `Écrit par ${p.author}`,
          reviewedNoteEn: p.reviewedNoteEn || "General information, not medical or legal advice.",
          reviewedNoteEs: p.reviewedNoteEs || "Información general, no consejo médico ni legal.",
          reviewedNoteFr: p.reviewedNoteFr || "Informations générales, pas un avis médical ou juridique.",
          audience: p.audience || "public",
        });

        if (res.related) {
          setRelated(res.related);
        }
      } else {
        setArticle(null);
      }
      setLoading(false);
    }

    if (cleanSlug) {
      loadArticle();
    }
  }, [cleanSlug]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fdf8f2",
          fontFamily: "'Lora', Georgia, serif",
          color: "#39292a",
        }}
      >
        {lang === "fr" ? "Chargement de l'article..." : lang === "es" ? "Cargando artículo..." : "Loading article..."}
      </div>
    );
  }

  if (!article) {
    return (
      <div
        style={{
          backgroundColor: "#fdf8f2",
          minHeight: "70vh",
          padding: "80px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontFamily: "'Lora', Georgia, serif",
          color: "#39292a",
        }}
      >
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "36px", marginBottom: "16px" }}>
            {lang === "fr" ? "Article non trouvé" : lang === "es" ? "Artículo no encontrado" : "Article not found"}
          </h1>
          <p style={{ color: "rgba(57,41,42,0.7)", marginBottom: "28px" }}>
            {lang === "fr"
              ? "L'article que vous recherchez n'existe pas ou a été retiré."
              : lang === "es"
              ? "El artículo que buscas no existe o ha sido retirado."
              : "The article you are looking for does not exist or has been removed."}
          </p>
          <Link
            href="/journal"
            style={{
              border: "1px solid #7b1f2c",
              backgroundColor: "#7b1f2c",
              color: "#f8efe2",
              padding: "10px 20px",
              borderRadius: "4px",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <BackArrow /> {lang === "fr" ? "Retour au Journal" : lang === "es" ? "Volver al Diario" : "Return to Journal"}
          </Link>
        </div>
      </div>
    );
  }

  const title = lang === "fr" ? article.titleFr : lang === "es" ? article.titleEs : article.titleEn;
  const dek = lang === "fr" ? article.dekFr : lang === "es" ? article.dekEs : article.dekEn;
  const quote = lang === "fr" ? article.quoteFr : lang === "es" ? article.quoteEs : article.quoteEn;
  const bodyParas = lang === "fr" ? article.bodyFr : lang === "es" ? article.bodyEs : article.bodyEn;
  const bodyAfterParas = lang === "fr" ? article.bodyAfterFr : lang === "es" ? article.bodyAfterEs : article.bodyAfterEn;
  const byline = lang === "fr" ? article.bylineFr : lang === "es" ? article.bylineEs : article.bylineEn;
  const reviewedNote = lang === "fr" ? article.reviewedNoteFr : lang === "es" ? article.reviewedNoteEs : article.reviewedNoteEn;
  const readTime = lang === "fr" ? article.readFr : lang === "es" ? article.readEs : article.readEn;
  const dateStr = lang === "fr" ? article.dateFr : lang === "es" ? article.dateEs : article.dateEn;

  return (
    <div
      style={{
        backgroundColor: "#fdf8f2",
        color: "#39292a",
        fontFamily: "'Lora', Georgia, serif",
        minHeight: "100vh",
      }}
    >
      <article
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "clamp(36px, 5vw, 64px) clamp(24px, 5vw, 64px) clamp(48px, 6vw, 72px)",
        }}
      >
        {/* Back Link */}
        <Link
          href="/journal"
          style={{
            color: "rgba(57, 41, 42, 0.6)",
            fontSize: "13.5px",
            paddingBottom: "26px",
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            textDecoration: "none",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="14"
            height="14"
          >
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          {lang === "fr" ? "Retour au Journal" : lang === "es" ? "Volver al Diario" : "Back to the Journal"}
        </Link>

        {/* Category & Meta */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              border: "1px solid rgba(123, 31, 44, 0.35)",
              borderRadius: "12px",
              padding: "4px 11px",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
            }}
          >
            {getCategoryLabel(article.cat, lang)}
          </span>
          <span style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.5)" }}>
            {readTime} · {dateStr}
          </span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 400,
            fontSize: "clamp(34px, 4.6vw, 54px)",
            lineHeight: 1.08,
            letterSpacing: "-0.01em",
            margin: "0 0 18px",
            textWrap: "pretty",
          }}
        >
          {title}
        </h1>

        {/* Standfirst / Dek */}
        <p
          style={{
            fontSize: "19px",
            lineHeight: 1.65,
            color: "rgba(57, 41, 42, 0.72)",
            margin: "0 0 30px",
            fontStyle: "italic",
            textWrap: "pretty",
          }}
        >
          {dek}
        </p>

        {/* Hero Cover Image */}
        {article.heroImageUrl && (
          <div
            style={{
              width: "100%",
              height: "clamp(240px, 32vw, 400px)",
              borderRadius: "6px",
              overflow: "hidden",
              marginBottom: "34px",
              backgroundColor: "rgba(57, 41, 42, 0.08)",
            }}
          >
            <img
              src={article.heroImageUrl}
              alt={article.heroImageAlt || title}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        )}

        {/* Main Body Paragraphs */}
        {bodyParas.map((para, i) => (
          <p
            key={i}
            style={{
              fontSize: "17px",
              lineHeight: 1.8,
              color: "#39292a",
              margin: "0 0 22px",
              textWrap: "pretty",
            }}
          >
            {para}
          </p>
        ))}

        {/* Pull Quote */}
        {quote && (
          <blockquote
            style={{
              borderLeft: "2px solid #7b1f2c",
              margin: "34px 0",
              padding: "4px 0 4px 24px",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 500,
              fontSize: "26px",
              lineHeight: 1.35,
              color: "#7b1f2c",
              textWrap: "pretty",
            }}
          >
            {quote}
          </blockquote>
        )}

        {/* Secondary Body Paragraphs */}
        {bodyAfterParas.map((para, i) => (
          <p
            key={`after-${i}`}
            style={{
              fontSize: "17px",
              lineHeight: 1.8,
              color: "#39292a",
              margin: "0 0 22px",
              textWrap: "pretty",
            }}
          >
            {para}
          </p>
        ))}

        {/* Byline & Reviewed Footnote */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "14px",
            alignItems: "baseline",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(57, 41, 42, 0.16)",
            marginTop: "34px",
            paddingTop: "20px",
          }}
        >
          <div style={{ fontSize: "14px", color: "rgba(57, 41, 42, 0.7)" }}>{byline}</div>
          <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.5)" }}>{reviewedNote}</div>
        </div>

        {/* Membership CTA Box */}
        <div
          style={{
            border: "1px solid rgba(57, 41, 42, 0.2)",
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            padding: "clamp(22px, 3vw, 32px)",
            marginTop: "36px",
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "12.5px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              marginBottom: "10px",
            }}
          >
            The Mothers
          </div>
          <h3
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              fontSize: "26px",
              lineHeight: 1.2,
              margin: "0 0 10px",
            }}
          >
            {lang === "en"
              ? "The writing is free. The room is the point."
              : "La lectura es libre. El encuentro es lo importante."}
          </h3>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.65,
              color: "rgba(57, 41, 42, 0.7)",
              margin: "0 0 16px",
              maxWidth: "56ch",
            }}
          >
            {lang === "en"
              ? "Walks, play dates, suppers and expert sessions across Barcelona — open to every mother until membership opens."
              : "Paseos, play dates, cenas y sesiones con expertas por toda Barcelona — abiertos a todas las madres hasta la apertura de la membresía."}
          </p>
          <Link
            href="/events"
            style={{
              display: "inline-block",
              border: "1px solid #7b1f2c",
              backgroundColor: "transparent",
              color: "#7b1f2c",
              padding: "12px 22px",
              borderRadius: "4px",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "15px",
              textDecoration: "none",
            }}
          >
            {lang === "en" ? "See the calendar" : "Ver el calendario"}
          </Link>
        </div>

        {/* More from Journal */}
        {related && related.length > 0 && (
          <div style={{ marginTop: "48px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "12.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(57, 41, 42, 0.5)",
                marginBottom: "18px",
              }}
            >
              {lang === "en" ? "More from the Journal" : "Más del Diario"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "24px",
              }}
            >
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/journal/${r.slug}`}
                  style={{
                    textAlign: "left",
                    border: "1px solid rgba(57, 41, 42, 0.18)",
                    backgroundColor: "transparent",
                    borderRadius: "6px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#7b1f2c",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                    }}
                  >
                    {getCategoryLabel(r.category, lang)}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "19px",
                      lineHeight: 1.25,
                      color: "#39292a",
                    }}
                  >
                    {lang === "en" ? r.title : r.titleEs || r.title}
                  </span>
                  <span style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.6)" }}>
                    {lang === "en" ? r.excerpt : r.excerptEs || r.excerpt}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
