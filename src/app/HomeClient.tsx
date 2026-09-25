"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

interface EventCardItem {
  id: string;
  title: string;
  categoryLabel: string;
  date: string;
  neighbourhood: string;
  price: string;
  image?: string;
}

const SEED_EVENTS: EventCardItem[] = [
  {
    id: "e1",
    title: "Wednesday Morning Walk & Coffee",
    categoryLabel: "Walks",
    date: "Wed 15 Oct · 10:00",
    neighbourhood: "Parc de la Ciutadella",
    price: "Free",
    image: "/assets/home-hero.webp",
  },
  {
    id: "e2",
    title: "Postpartum & Early Months Hosted Circle",
    categoryLabel: "Circles",
    date: "Fri 17 Oct · 11:30",
    neighbourhood: "Gràcia",
    price: "1 credit",
    image: "/assets/home-hero.webp",
  },
  {
    id: "e3",
    title: "Evening Supper & Honest Talk",
    categoryLabel: "Suppers",
    date: "Thu 23 Oct · 20:00",
    neighbourhood: "Eixample Dreta",
    price: "2 credits",
    image: "/assets/home-hero.webp",
  },
  {
    id: "e4",
    title: "Returning to Work & Career Balance Talk",
    categoryLabel: "Talks",
    date: "Tue 28 Oct · 18:30",
    neighbourhood: "Sant Antoni",
    price: "1 credit",
    image: "/assets/home-hero.webp",
  },
];

export default function HomeClient({ initialEvents = [] }: { initialEvents?: any[] }) {
  const { language: lang } = useLanguage();
  const [waitlisted, setWaitlisted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("tm_pre_joined_list");
    if (saved) setWaitlisted(true);
  }, []);

  const handleJoinList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg(lang === "en" ? "Please enter a valid email." : "Introduce un correo válido.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "home_page_waitlist" }),
      });
      if (!res.ok) throw new Error("Failed");
      setWaitlisted(true);
      localStorage.setItem("tm_pre_joined_list", "true");
      setModalOpen(false);
    } catch {
      setErrorMsg(lang === "en" ? "Something went wrong. Please try again." : "Algo ha fallado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const displayEvents: EventCardItem[] =
    initialEvents && initialEvents.length > 0
      ? initialEvents.slice(0, 4).map((ev: any) => ({
          id: ev.id,
          title: ev.title,
          categoryLabel: ev.categoryName || "Gathering",
          date: ev.startsAt ? new Date(ev.startsAt).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Upcoming",
          neighbourhood: ev.neighbourhood || "Barcelona",
          price: ev.creditCost && ev.creditCost > 0 ? `${ev.creditCost} ${ev.creditCost === 1 ? (lang === "en" ? "credit" : "crédito") : (lang === "en" ? "credits" : "créditos")}` : (lang === "en" ? "Free" : "Gratis"),
          image: "/assets/home-hero.webp",
        }))
      : SEED_EVENTS;

  return (
    <div style={{ backgroundColor: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      {/* ─── 1. HERO SECTION ─── */}
      <section
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "clamp(40px, 6vw, 80px) clamp(20px, 5vw, 64px) clamp(32px, 4vw, 56px)",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(32px, 5vw, 56px)",
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 440px", minWidth: "280px" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              marginBottom: "18px",
            }}
          >
            {lang === "en" ? "Barcelona · a circle of mothers" : "Barcelona · un círculo de madres"}
          </div>

          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 400,
              fontSize: "clamp(38px, 5.4vw, 70px)",
              lineHeight: 1.04,
              letterSpacing: "-0.01em",
              margin: "0 0 22px",
              textWrap: "pretty",
            }}
          >
            {lang === "en" ? "Find your people. Build your circle." : "Encuentra a tu gente. Crea tu círculo."}
          </h1>

          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.65,
              color: "rgba(57, 41, 42, 0.75)",
              maxWidth: "52ch",
              margin: "0 0 18px",
            }}
          >
            {lang === "en"
              ? "Motherhood is better with friends who get it. Meet mothers at your stage, in your neighbourhood — and keep seeing them, week after week, until they are yours."
              : "La maternidad se vive mejor con amigas que te entienden. Conoce a madres en tu misma etapa, en tu barrio — y sigue viéndolas, semana tras semana, hasta que formen parte de tu vida."}
          </p>

          <p
            style={{
              fontSize: "14.5px",
              lineHeight: 1.6,
              color: "rgba(57, 41, 42, 0.72)",
              borderTop: "1px solid rgba(57, 41, 42, 0.16)",
              paddingTop: "16px",
              margin: 0,
              maxWidth: "48ch",
            }}
          >
            {lang === "en"
              ? "Walks, play dates, suppers and talks across Barcelona — from pregnancy through the school years."
              : "Caminatas, quedadas, cenas y charlas por toda Barcelona — desde el embarazo hasta la etapa escolar."}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", marginTop: "26px" }}>
            <Link
              href="/events"
              style={{
                border: "1px solid #7b1f2c",
                color: "#7b1f2c",
                backgroundColor: "transparent",
                padding: "13px 24px",
                borderRadius: "4px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "15.5px",
                whiteSpace: "nowrap",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(123, 31, 44, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {lang === "en" ? "See what's on" : "Ver qué eventos hay"}
            </Link>

            <Link
              href="/events"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "15.5px",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                color: "#7b1f2c",
                textDecoration: "none",
              }}
            >
              <span>{lang === "en" ? "Book your first event" : "Reserva tu primer evento"}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Hero Image Frame */}
        <div style={{ flex: "1 1 380px", minWidth: "270px" }}>
          <div
            style={{
              backgroundColor: "#ecdcd0",
              padding: "8px",
              borderRadius: "6px",
              boxShadow: "0 12px 32px rgba(45, 43, 43, 0.16)",
            }}
          >
            <div
              style={{
                border: "1px solid rgba(57, 41, 42, 0.18)",
                borderRadius: "3px",
                overflow: "hidden",
                height: "440px",
                backgroundColor: "#f4ece1",
              }}
            >
              <img
                src="/assets/home-hero.webp"
                alt="Mothers in Barcelona walking and enjoying a picnic together"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. HOW FRIENDSHIPS START (3-STEP GUIDE) ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(40px, 5vw, 70px) clamp(20px, 5vw, 64px) clamp(24px, 3vw, 36px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "620px", margin: "0 auto 36px" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              marginBottom: "10px",
            }}
          >
            {lang === "en" ? "How friendships start" : "Cómo empiezan las amistades"}
          </div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "clamp(27px, 3.6vw, 40px)",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {lang === "en" ? "From stranger to friend, in three steps." : "De desconocida a amiga, en tres pasos."}
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: "28px" }}>
          {/* Step 01 */}
          <div style={{ textAlign: "center", padding: "0 10px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 400,
                fontSize: "38px",
                lineHeight: 1.1,
                color: "rgba(123, 31, 44, 0.28)",
                marginBottom: "6px",
                fontFeatureSettings: "'tnum'",
              }}
            >
              01
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "21px", margin: "0 0 7px" }}>
              {lang === "en" ? "Come once" : "Ven una vez"}
            </h3>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: 0 }}>
              {lang === "en"
                ? "Start with a walk or a hosted coffee. A host makes the introductions, so you never walk in alone."
                : "Empieza con una caminata o un café con anfitriona. Una madre anfitriona hace las presentaciones para que nunca llegues sola."}
            </p>
          </div>

          {/* Step 02 */}
          <div style={{ textAlign: "center", padding: "0 10px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 400,
                fontSize: "38px",
                lineHeight: 1.1,
                color: "rgba(123, 31, 44, 0.28)",
                marginBottom: "6px",
                fontFeatureSettings: "'tnum'",
              }}
            >
              02
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "21px", margin: "0 0 7px" }}>
              {lang === "en" ? "Keep coming back" : "Sigue viniendo"}
            </h3>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: 0 }}>
              {lang === "en"
                ? "Small groups, the same faces. By the third time, you are not talking about the babies any more."
                : "Grupos reducidos, las mismas caras. A la tercera vez, ya no solo habláis de los bebés."}
            </p>
          </div>

          {/* Step 03 */}
          <div style={{ textAlign: "center", padding: "0 10px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 400,
                fontSize: "38px",
                lineHeight: 1.1,
                color: "rgba(123, 31, 44, 0.28)",
                marginBottom: "6px",
                fontFeatureSettings: "'tnum'",
              }}
            >
              03
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "21px", margin: "0 0 7px" }}>
              {lang === "en" ? "Find your circle" : "Encuentra tu círculo"}
            </h3>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: 0 }}>
              {lang === "en"
                ? "The mothers you call on a bad Tuesday. The ones who get it, because they are living it too."
                : "Las madres a las que llamas un martes difícil. Las que te entienden porque están viviendo lo mismo."}
            </p>
          </div>
        </div>
      </section>

      {/* ─── 3. NEXT ON THE CALENDAR ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "baseline", justifyContent: "space-between", marginBottom: "26px" }}>
          <div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#7b1f2c",
                marginBottom: "9px",
              }}
            >
              {lang === "en" ? "Next on the calendar" : "Próximamente en el calendario"}
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "clamp(25px, 3.2vw, 34px)", margin: 0 }}>
              {lang === "en" ? "Where you will meet her." : "Donde la conocerás."}
            </h2>
          </div>

          <Link
            href="/events"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "15px",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "#7b1f2c",
              textDecoration: "none",
            }}
          >
            <span>{lang === "en" ? "The whole calendar" : "Ver todo el calendario"}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))", gap: "20px" }}>
          {displayEvents.map((ev) => (
            <Link
              key={ev.id}
              href={`/events/${ev.id}`}
              style={{
                border: "1px solid rgba(57, 41, 42, 0.18)",
                borderRadius: "8px",
                backgroundColor: "#ffffff",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                color: "#39292a",
                textDecoration: "none",
                transition: "border-color 0.2s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(123, 31, 44, 0.5)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(57, 41, 42, 0.18)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ height: "132px", borderBottom: "1px solid rgba(57, 41, 42, 0.12)", backgroundColor: "#f4ece1", overflow: "hidden" }}>
                <img
                  src={ev.image || "/assets/home-hero.webp"}
                  alt={ev.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: "9px", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      letterSpacing: "0.04em",
                      color: "#7b1f2c",
                      border: "1px solid rgba(123, 31, 44, 0.35)",
                      borderRadius: "10px",
                      padding: "3px 10px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ev.categoryLabel}
                  </span>
                  <span style={{ fontSize: "11.5px", color: "rgba(57, 41, 42, 0.72)", whiteSpace: "nowrap", fontFeatureSettings: "'tnum'" }}>
                    {ev.price}
                  </span>
                </div>

                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", margin: 0, lineHeight: 1.3 }}>
                  {ev.title}
                </h3>

                <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.72)" }}>{ev.date}</div>
                <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.72)" }}>{ev.neighbourhood}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── 4. THE GODMOTHER PROGRAM ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(86, 139, 5, 0.4)",
            borderRadius: "8px",
            backgroundColor: "rgba(86, 139, 5, 0.06)",
            padding: "clamp(24px, 4vw, 40px)",
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(24px, 4vw, 48px)",
            alignItems: "center",
          }}
        >
          <div style={{ flex: "1 1 380px", minWidth: "270px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#3b5e04",
                marginBottom: "12px",
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ flex: "none" }}>
                <path d="m12 2 2.9 6.3 6.6.8-4.9 4.5 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9.1l6.6-.8Z" />
              </svg>
              <span>{lang === "en" ? "The Godmother program" : "El programa Madrinas"}</span>
            </div>

            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.12, margin: "0 0 14px" }}>
              {lang === "en" ? "Bring a mother into the circle." : "Invita a una madre al círculo."}
            </h2>

            <p style={{ fontSize: "16px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.74)", margin: "0 0 20px", maxWidth: "52ch" }}>
              {lang === "en"
                ? "Every account comes with a personal invite code. Share it with the friend who has just moved here, the neighbour with the pram — and once you are a member, you earn 5 credits for every mother who registers with it."
                : "Cada cuenta incluye un código de invitación personal. Compártelo con la amiga que acaba de mudarse o la vecina con el carrito — y cuando seas socia, ganarás 5 créditos por cada madre que se registre con él."}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
              <Link
                href="/account"
                style={{
                  border: "1px solid #568b05",
                  backgroundColor: "#568b05",
                  color: "#ffffff",
                  padding: "12px 22px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                }}
              >
                {lang === "en" ? "Get your invite code" : "Consigue tu código"}
              </Link>

              <Link
                href="/faq"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  whiteSpace: "nowrap",
                  color: "#3b5e04",
                  textDecoration: "none",
                }}
              >
                {lang === "en" ? "How it works" : "Cómo funciona"}
              </Link>
            </div>
          </div>

          <div style={{ flex: "0 1 320px", minWidth: "240px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "13px 0", borderTop: "1px solid rgba(86, 139, 5, 0.3)" }}>
              <span style={{ flex: "none", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#568b05", marginTop: "9px" }} />
              <span style={{ fontSize: "14.5px", lineHeight: 1.55, color: "#39292a" }}>
                {lang === "en" ? "Share your code with a mother you know" : "Comparte tu código con una madre que conozcas"}
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "13px 0", borderTop: "1px solid rgba(86, 139, 5, 0.3)" }}>
              <span style={{ flex: "none", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#568b05", marginTop: "9px" }} />
              <span style={{ fontSize: "14.5px", lineHeight: 1.55, color: "#39292a" }}>
                {lang === "en" ? "She registers and books her first event" : "Ella se registra y reserva su primer evento"}
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "13px 0", borderTop: "1px solid rgba(86, 139, 5, 0.3)" }}>
              <span style={{ flex: "none", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#568b05", marginTop: "9px" }} />
              <span style={{ fontSize: "14.5px", lineHeight: 1.55, color: "#39292a" }}>
                <span style={{ display: "inline-block", fontSize: "10.5px", letterSpacing: "0.09em", textTransform: "uppercase", color: "#fdf8f2", backgroundColor: "#7b1f2c", border: "1px solid #7b1f2c", borderRadius: "10px", padding: "2px 9px", whiteSpace: "nowrap", marginBottom: "6px" }}>
                  {lang === "en" ? "Members only" : "Solo socias"}
                </span>
                <br />
                {lang === "en"
                  ? <>You earn <strong style={{ fontWeight: 600 }}>5 credits</strong> for each mother, once you become a member (January 2027)</>
                  : <>Ganas <strong style={{ fontWeight: 600 }}>5 créditos</strong> por cada madre al hacerte socia (enero 2027)</>}
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "13px 0", borderTop: "1px solid rgba(86, 139, 5, 0.3)", borderBottom: "1px solid rgba(86, 139, 5, 0.3)" }}>
              <span style={{ flex: "none", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#568b05", marginTop: "9px" }} />
              <span style={{ fontSize: "14.5px", lineHeight: 1.55, color: "#39292a" }}>
                {lang === "en"
                  ? <>Earn <strong style={{ fontWeight: 600 }}>2 credits</strong> each time you host an event yourself — <Link href="/host" style={{ color: "#3b5e04", textDecoration: "underline", textUnderlineOffset: "3px" }}>become a host</Link></>
                  : <>Gana <strong style={{ fontWeight: 600 }}>2 créditos</strong> cada vez que organices un evento tú misma — <Link href="/host" style={{ color: "#3b5e04", textDecoration: "underline", textUnderlineOffset: "3px" }}>sé anfitriona</Link></>}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. FROM JANUARY 2027 (MEMBERSHIP PREVIEW) ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px) clamp(46px, 6vw, 76px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(57, 41, 42, 0.2)",
            borderRadius: "8px",
            padding: "clamp(24px, 4vw, 40px)",
            backgroundColor: "#ffffff",
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(28px, 4vw, 48px)",
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: "1 1 340px", minWidth: "270px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#568b05",
                marginBottom: "12px",
              }}
            >
              {lang === "en" ? "From January 2027" : "Desde enero de 2027"}
            </div>

            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "clamp(24px, 3.2vw, 34px)", lineHeight: 1.2, margin: "0 0 16px" }}>
              {lang === "en" ? "Keep your circle, all year round." : "Mantén tu círculo todo el año."}
            </h2>

            <p style={{ fontSize: "16px", lineHeight: 1.7, color: "rgba(57, 41, 42, 0.72)", textAlign: "justify", margin: "0 0 18px" }}>
              {lang === "en"
                ? "Membership is how the friendships you make now keep going: at least four events a month with the same mothers, your stage group, and a private circle to talk in between. Nothing you have already bought disappears."
                : "La membresía es la forma de mantener vivas las amistades que forjes ahora: al menos cuatro eventos al mes con las mismas madres, tu grupo de etapa y un círculo privado para hablar entre encuentro y encuentro. Nada de lo que hayas adquirido desaparece."}
            </p>

            <Link
              href="/membership"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "15px",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                color: "#7b1f2c",
                textDecoration: "none",
              }}
            >
              <span>{lang === "en" ? "What membership will be" : "Cómo será la membresía"}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          <div style={{ flex: "1 1 300px", minWidth: "260px", display: "flex", flexDirection: "column" }}>
            {[
              { fromEn: "Meet mothers at events", toEn: "See them every week", fromEs: "Conoce madres en eventos", toEs: "Vuelve a verlas cada semana" },
              { fromEn: "A walk, a coffee, a supper", toEn: "At least 4 events a month", fromEs: "Un paseo, un café, una cena", toEs: "Al menos 4 eventos al mes" },
              { fromEn: "Conversations at events", toEn: "A private circle in between", fromEs: "Conversaciones en eventos", toEs: "Un círculo privado entre citas" },
              { fromEn: "New faces each time", toEn: "Your stage group, by name", fromEs: "Nuevas caras cada vez", toEs: "Tu grupo por etapa, por su nombre" },
            ].map((row, idx) => (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "baseline", padding: "13px 0", borderTop: "1px solid rgba(57, 41, 42, 0.12)" }}>
                <span style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.72)" }}>
                  {lang === "en" ? row.fromEn : row.fromEs}
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="rgba(57, 41, 42, 0.35)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
                <span style={{ fontSize: "13.5px", color: "#39292a" }}>
                  {lang === "en" ? row.toEn : row.toEs}
                </span>
              </div>
            ))}

            <div style={{ marginTop: "20px" }}>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                style={{
                  border: "1px solid #7b1f2c",
                  backgroundColor: "transparent",
                  color: "#7b1f2c",
                  borderRadius: "4px",
                  padding: "12px 22px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(123, 31, 44, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {waitlisted
                  ? (lang === "en" ? "✓ On the list — we will write first" : "✓ En la lista — te avisaremos antes")
                  : (lang === "en" ? "Tell me when membership opens" : "Avísame cuando abra la membresía")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Join the List Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(57, 41, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              backgroundColor: "#fdf8f2",
              border: "1px solid rgba(57, 41, 42, 0.2)",
              borderRadius: "8px",
              boxShadow: "0 12px 36px rgba(57, 41, 42, 0.24)",
              padding: "28px 32px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#39292a",
                fontSize: "20px",
              }}
            >
              ✕
            </button>

            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "12px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#7b1f2c",
                marginBottom: "6px",
                fontWeight: 600,
              }}
            >
              {lang === "en" ? "Opening January 2027" : "Apertura en enero 2027"}
            </div>

            <h3
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 500,
                fontSize: "28px",
                margin: "0 0 10px",
                color: "#39292a",
                lineHeight: 1.15,
              }}
            >
              {lang === "en" ? "Be first to know when memberships open." : "Sé la primera en saber cuándo abrimos membresías."}
            </h3>

            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "rgba(57, 41, 42, 0.78)",
                margin: "0 0 20px",
              }}
            >
              {lang === "en"
                ? "Mothers on this list receive pre-launch invitations and waive the €19 joining fee."
                : "Las madres en esta lista recibirán invitaciones exclusivas de pre-lanzamiento y se les eximirá de la cuota de alta de 19€."}
            </p>

            <form onSubmit={handleJoinList} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                type="email"
                required
                placeholder={lang === "en" ? "Your email address" : "Tu correo electrónico"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "4px",
                  border: "1px solid rgba(57, 41, 42, 0.25)",
                  backgroundColor: "#ffffff",
                  fontSize: "14.5px",
                  color: "#39292a",
                  fontFamily: "'Lora', Georgia, serif",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {errorMsg && <div style={{ color: "#993842", fontSize: "13px" }}>{errorMsg}</div>}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "12px 20px",
                  backgroundColor: "#7b1f2c",
                  color: "#fdf8f2",
                  border: "1px solid #7b1f2c",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "16px",
                  cursor: loading ? "wait" : "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                {loading
                  ? (lang === "en" ? "Saving..." : "Guardando...")
                  : (lang === "en" ? "Join the list" : "Unirme a la lista")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
