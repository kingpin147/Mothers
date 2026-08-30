"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Locale } from "@/lib/i18n";

/* ─── Article data ─────────────────────────────────────────── */

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
  image: string;
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
    image: "/assets/journal-doula.jpg",
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
    image: "/assets/journal-friends.jpg",
    titleEn: "Making mum friends in a city that isn't yours",
    titleEs: "Hacer amigas madres en una ciudad que no es la tuya",
    dekEn: "Why it is harder than anyone admits, and the three things that actually move a friendly acquaintance into a friend.",
    dekEs: "Por qué cuesta más de lo que nadie admite, y las tres cosas que convierten a una conocida amable en una amiga.",
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
    image: "/assets/journal-sleep.jpg",
    titleEn: "The first twelve weeks of sleep, honestly",
    titleEs: "Las primeras doce semanas de sueño, sin cuentos",
    dekEn: "What is developmentally normal, what is not worth fixing yet, and the two things that genuinely help before three months.",
    dekEs: "Qué es normal en el desarrollo, qué no merece la pena arreglar todavía y las dos cosas que de verdad ayudan antes de los tres meses.",
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
    image: "/assets/journal-feeding.jpg",
    titleEn: "Feeding: the questions nobody answers at 3am",
    titleEs: "Lactancia: las preguntas que nadie responde a las 3 de la mañana",
    dekEn: "Pain, supply, mixed feeding and when to actually call someone — the practical answers, without the ideology.",
    dekEs: "Dolor, producción, lactancia mixta y cuándo llamar de verdad a alguien — las respuestas prácticas, sin ideología.",
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
    image: "/assets/journal-yoga.jpg",
    titleEn: "Prenatal yoga in Barcelona: what to ask before you book",
    titleEs: "Yoga prenatal en Barcelona: qué preguntar antes de apuntarte",
    dekEn: "Not all prenatal classes are prenatal classes. Five questions that tell you whether the teacher in front of you is trained for a pregnant body.",
    dekEs: "No todas las clases prenatales lo son. Cinco preguntas que te dicen si quien tienes delante está formada para un cuerpo embarazado.",
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
    image: "/assets/journal-work.jpg",
    titleEn: "Going back to work: the conversations to have first",
    titleEs: "Volver al trabajo: las conversaciones previas",
    dekEn: "Before the logistics, three conversations that decide how the return actually goes — with your employer, your partner, and yourself.",
    dekEs: "Antes de la logística, tres conversaciones que deciden cómo va la vuelta — con tu empresa, con tu pareja y contigo misma.",
  },
];

/* ─── Categories matching Journal.dc.html exactly ────────── */

const CATEGORIES = [
  { id: "all", labelEn: "Everything", labelEs: "Todo" },
  { id: "postpartum", labelEn: "Postpartum", labelEs: "Posparto" },
  { id: "feeding", labelEn: "Feeding", labelEs: "Lactancia" },
  { id: "sleep", labelEn: "Sleep", labelEs: "Sueño" },
  { id: "body", labelEn: "Body & pregnancy", labelEs: "Cuerpo y embarazo" },
  { id: "friendship", labelEn: "Friendship", labelEs: "Amistad" },
  { id: "work", labelEn: "Work", labelEs: "Trabajo" },
];

/* ─── Component ──────────────────────────────────────────── */

export default function JournalPage() {
  const [lang, setLang] = useState<Locale>("en");
  const [selectedCat, setSelectedCat] = useState<string>("all");

  // Newsletter state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupError, setSignupError] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  const handleSignup = () => {
    const email = signupEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSignupError(true);
      return;
    }
    try {
      const list = JSON.parse(localStorage.getItem("tm_newsletter") || "[]");
      list.push({ email: email.toLowerCase(), source: "journal", at: Date.now() });
      localStorage.setItem("tm_newsletter", JSON.stringify(list));
    } catch (e) { /* ignore */ }
    setSignupError(false);
    setSignupDone(true);
    setSignupEmail("");
  };

  // Filter articles
  const filtered =
    selectedCat === "all" ? ARTICLES : ARTICLES.filter((a) => a.cat === selectedCat);

  // Featured = first, grid = rest
  const featured = filtered.length > 0 ? filtered[0] : null;
  const gridArticles = filtered.length > 1 ? filtered.slice(1) : [];

  const getCatLabel = (catId: string) => {
    const cat = CATEGORIES.find((c) => c.id === catId);
    return cat ? (lang === "en" ? cat.labelEn : cat.labelEs) : catId;
  };

  return (
    <div
      style={{
        backgroundColor: "#f8efe2",
        color: "#39292a",
        fontFamily: "'Lora', Georgia, serif",
        minHeight: "100vh",
      }}
    >
      {/* ─── Hero ──────────────────────────────────────── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(48px, 7vw, 88px) clamp(24px, 5vw, 64px) clamp(28px, 4vw, 44px)",
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#7b1f2c",
            marginBottom: "18px",
          }}
        >
          {lang === "en" ? "The Journal" : "El Diario"}
        </div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 400,
            fontSize: "clamp(40px, 5.5vw, 66px)",
            lineHeight: 1.06,
            letterSpacing: "-0.01em",
            margin: "0 0 20px",
            maxWidth: "16em",
          }}
        >
          {lang === "en"
            ? "Useful writing about motherhood in Barcelona."
            : "Textos útiles sobre la maternidad en Barcelona."}
        </h1>
        <p
          style={{
            fontSize: "17px",
            lineHeight: 1.7,
            color: "rgba(57, 41, 42, 0.72)",
            maxWidth: "44em",
            margin: 0,
          }}
        >
          {lang === "en"
            ? "Free to read, no membership needed. A small library of practical answers from the midwives, doulas, consultants and mothers we actually work with — written for the questions people ask at three in the morning."
            : "De lectura libre, sin membresía. Una pequeña biblioteca de respuestas prácticas de las matronas, doulas, asesoras y madres con las que trabajamos — escritas para las preguntas que aparecen a las tres de la mañana."}
        </p>
      </section>

      {/* ─── Category Chips ────────────────────────────── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "0 clamp(24px, 5vw, 64px) clamp(20px, 3vw, 32px)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCat === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                style={{
                  border: `1px solid ${isActive ? "#7b1f2c" : "rgba(57,41,42,0.25)"}`,
                  color: isActive ? "#7b1f2c" : "#39292a",
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

      {/* ─── Articles ──────────────────────────────────── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(20px, 3vw, 32px) clamp(24px, 5vw, 64px) clamp(48px, 6vw, 72px)",
        }}
      >
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
            {/* Image */}
            <div
              style={{
                flex: "1 1 380px",
                minWidth: "280px",
                position: "relative",
                borderRadius: "6px",
                overflow: "hidden",
                minHeight: "clamp(240px, 28vw, 340px)",
              }}
            >
              <Image
                src={featured.image}
                alt={lang === "en" ? featured.titleEn : featured.titleEs}
                fill
                style={{ objectFit: "cover" }}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            {/* Text */}
            <div
              style={{
                flex: "1 1 380px",
                minWidth: "280px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  alignItems: "center",
                  marginBottom: "14px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#7b1f2c",
                    border: "1px solid rgba(123,31,44,0.35)",
                    borderRadius: "12px",
                    padding: "4px 11px",
                  }}
                >
                  {getCatLabel(featured.cat)}
                </span>
                <span style={{ fontSize: "12px", color: "rgba(57,41,42,0.5)" }}>
                  {lang === "en" ? featured.readEn : featured.readEs}
                </span>
              </div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 500,
                  fontSize: "clamp(28px, 3.4vw, 40px)",
                  lineHeight: 1.12,
                  margin: "0 0 14px",
                }}
              >
                <Link
                  href={`/journal/${featured.id}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {lang === "en" ? featured.titleEn : featured.titleEs}
                </Link>
              </h2>
              <p
                style={{
                  fontSize: "16px",
                  lineHeight: 1.7,
                  color: "rgba(57, 41, 42, 0.72)",
                  margin: "0 0 22px",
                  maxWidth: "34em",
                }}
              >
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
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.background = "rgba(123,31,44,0.1)")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.background = "transparent")
                }
              >
                {lang === "en" ? "Read" : "Leer"}
              </Link>
            </div>
          </article>
        ) : (
          <p style={{ fontSize: "15px", color: "rgba(57,41,42,0.6)", margin: 0 }}>
            {lang === "en"
              ? "Nothing here yet — try another category."
              : "Aquí todavía no hay nada — prueba otra categoría."}
          </p>
        )}

        {/* Grid */}
        {gridArticles.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "clamp(24px, 3vw, 40px)",
            }}
          >
            {gridArticles.map((art) => (
              <article
                key={art.id}
                style={{ display: "flex", flexDirection: "column", gap: "14px" }}
              >
                {/* Image */}
                <div
                  style={{
                    width: "100%",
                    height: "200px",
                    position: "relative",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src={art.image}
                    alt={lang === "en" ? art.titleEn : art.titleEs}
                    fill
                    style={{ objectFit: "cover" }}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>

                {/* Category & read time */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#7b1f2c",
                      fontWeight: 600,
                    }}
                  >
                    {getCatLabel(art.cat)}
                  </span>
                  <span style={{ fontSize: "12px", color: "rgba(57,41,42,0.5)" }}>
                    {lang === "en" ? art.readEn : art.readEs}
                  </span>
                </div>

                {/* Title */}
                <h3
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "23px",
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  <Link
                    href={`/journal/${art.id}`}
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {lang === "en" ? art.titleEn : art.titleEs}
                  </Link>
                </h3>

                {/* Dek */}
                <p
                  style={{
                    fontSize: "14.5px",
                    lineHeight: 1.65,
                    color: "rgba(57,41,42,0.7)",
                    margin: 0,
                  }}
                >
                  {lang === "en" ? art.dekEn : art.dekEs}
                </p>

                {/* Read CTA */}
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
                    transition: "color 0.15s ease",
                  }}
                >
                  {lang === "en" ? "Read" : "Leer"}
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
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ─── Newsletter "One letter a month" ───────────── */}
      <section
        style={{
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
          background: "#f8efe2",
        }}
      >
        <div
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            padding: "clamp(40px, 5vw, 64px) clamp(24px, 5vw, 64px)",
            display: "flex",
            flexWrap: "wrap",
            gap: "32px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Left copy */}
          <div style={{ flex: "1 1 380px", minWidth: "280px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "12.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#7b1f2c",
                marginBottom: "10px",
              }}
            >
              {lang === "en" ? "The letter" : "La carta"}
            </div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "clamp(26px, 3vw, 34px)",
                lineHeight: 1.15,
                margin: "0 0 10px",
              }}
            >
              {lang === "en" ? "One letter a month." : "Una carta al mes."}
            </h2>
            <p
              style={{
                fontSize: "15px",
                lineHeight: 1.65,
                color: "rgba(57, 41, 42, 0.7)",
                margin: 0,
                maxWidth: "34em",
              }}
            >
              {lang === "en"
                ? "New writing, what is coming up in the calendar, and when the next Window opens. No membership required, and nothing else in your inbox."
                : "Textos nuevos, lo que viene en el calendario y cuándo se abre la próxima Ventana. Sin membresía, y nada más en tu bandeja."}
            </p>
          </div>

          {/* Right form */}
          <div style={{ flex: "1 1 320px", minWidth: "280px" }}>
            {!signupDone ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value);
                      setSignupError(false);
                    }}
                    placeholder={lang === "en" ? "you@email.com" : "tu@email.com"}
                    style={{
                      flex: "1 1 200px",
                      minHeight: "48px",
                      padding: "12px 16px",
                      fontSize: "15px",
                      fontFamily: "'Lora', Georgia, serif",
                      color: "#39292a",
                      background: "#f8efe2",
                      border: "1px solid rgba(57,41,42,0.25)",
                      borderRadius: "5px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                    onFocus={(e) =>
                      (e.target.style.borderColor = "#7b1f2c")
                    }
                    onBlur={(e) =>
                      (e.target.style.borderColor = "rgba(57,41,42,0.25)")
                    }
                  />
                  <button
                    type="button"
                    onClick={handleSignup}
                    style={{
                      border: "1px solid #7b1f2c",
                      background: "#7b1f2c",
                      color: "#f8efe2",
                      padding: "13px 24px",
                      borderRadius: "5px",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "15px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) =>
                      ((e.target as HTMLElement).style.background = "#5e1621")
                    }
                    onMouseLeave={(e) =>
                      ((e.target as HTMLElement).style.background = "#7b1f2c")
                    }
                  >
                    {lang === "en" ? "Sign up" : "Apuntarme"}
                  </button>
                </div>
                {signupError && (
                  <p style={{ fontSize: "13px", color: "#993842", margin: "10px 0 0" }}>
                    {lang === "en"
                      ? "Please enter a valid email address."
                      : "Introduce un email válido."}
                  </p>
                )}
                <p
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.6,
                    color: "rgba(57,41,42,0.5)",
                    margin: "12px 0 0",
                  }}
                >
                  {lang === "en"
                    ? "We only use it for the letter. Unsubscribe in one click."
                    : "Solo lo usamos para la carta. Puedes darte de baja en un clic."}
                </p>
              </>
            ) : (
              <div
                style={{
                  border: "1px solid rgba(86,139,5,0.4)",
                  background: "rgba(86,139,5,0.08)",
                  borderRadius: "5px",
                  padding: "16px 18px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{ color: "#568b05", flex: "none", marginTop: "1px" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="17"
                    height="17"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <span
                  style={{
                    fontSize: "14.5px",
                    lineHeight: 1.6,
                    color: "rgba(57,41,42,0.78)",
                  }}
                >
                  {lang === "en"
                    ? "You're on the list — the next letter comes at the start of the month."
                    : "Ya estás en la lista — la próxima carta sale a principios de mes."}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
