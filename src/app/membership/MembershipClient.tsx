"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

// Countdown target: January 2027
const TARGET_DATE = new Date("2027-01-06T00:00:00+01:00").getTime();

interface MembershipClientProps {
  initialWindowOpen?: boolean;
  initialSpotsRemaining?: number;
  nextWindowDate?: string | null;
  autoOpenApply?: boolean;
  publicSettings?: any;
}

function calculateTimeLeft() {
  const now = new Date().getTime();
  const diff = Math.max(0, TARGET_DATE - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

export default function MembershipClient({
  initialWindowOpen,
  initialSpotsRemaining,
  nextWindowDate,
  autoOpenApply = false,
  publicSettings,
}: MembershipClientProps = {}) {
  const { language: lang } = useLanguage();
  const isEn = lang === "en";

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>(calculateTimeLeft);
  const [waitlisted, setWaitlisted] = useState(false);
  const [modalOpen, setModalOpen] = useState(autoOpenApply);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [subSuccess, setSubSuccess] = useState(false);

  const waysRailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tm_pre_joined_list");
    if (saved) setWaitlisted(true);

    const updateCountdown = () => {
      setTimeLeft(calculateTimeLeft());
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePrevWay = () => {
    if (waysRailRef.current) {
      waysRailRef.current.scrollBy({ left: -298, behavior: "smooth" });
    }
  };

  const handleNextWay = () => {
    if (waysRailRef.current) {
      waysRailRef.current.scrollBy({ left: 298, behavior: "smooth" });
    }
  };

  const handleJoinListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg(isEn ? "Please enter a valid email." : "Introduce un correo válido.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, source: "membership_page_waitlist" }),
      });
      if (!res.ok) throw new Error("Failed");
      setWaitlisted(true);
      setSubSuccess(true);
      localStorage.setItem("tm_pre_joined_list", "true");
      setTimeout(() => {
        setModalOpen(false);
      }, 1500);
    } catch {
      setErrorMsg(isEn ? "Something went wrong. Please try again." : "Algo ha fallado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const countdownItems = [
    { label: isEn ? "DAYS" : "DÍAS", value: String(timeLeft.days).padStart(2, "0") },
    { label: isEn ? "HOURS" : "HORAS", value: String(timeLeft.hours).padStart(2, "0") },
    { label: isEn ? "MINS" : "MINS", value: String(timeLeft.minutes).padStart(2, "0") },
    { label: isEn ? "SECS" : "SEGS", value: String(timeLeft.seconds).padStart(2, "0") },
  ];

  const includedItems = isEn
    ? [
        "A private community of mothers, vetted at the door",
        "Stage groups by trimester, age and neighbourhood",
        "20 credits a month, rolling over",
        "Access to all events",
        "Partner perks",
        "Access to The Mothers Circle forum, including the members' room",
        "Priority booking on everything",
      ]
    : [
        "Una comunidad privada de madres, verificadas al entrar",
        "Grupos por trimestre, edad y barrio",
        "20 créditos al mes, acumulables",
        "Acceso a todos los eventos",
        "Ventajas y descuentos exclusivos con partners",
        "Acceso al foro The Mothers Circle, incluida la sala de socias",
        "Prioridad de reserva en todo",
      ];

  const ways = isEn
    ? [
        {
          tag: "Mostly included",
          tagColor: "#3b5e04",
          tagBorder: "rgba(86,139,5,0.45)",
          tagBg: "rgba(86,139,5,0.08)",
          title: "Easy connection",
          body: "Walks, park socials & hosted meetups. The walks and park socials are usually included in the plan but can cost a few credits depending on the partners involved.",
        },
        {
          tag: "Credits",
          tagColor: "#7b1f2c",
          tagBorder: "rgba(123,31,44,0.35)",
          tagBg: "transparent",
          title: "Play date",
          body: "Yoga, massage, music — your child right beside you.",
        },
        {
          tag: "Credits",
          tagColor: "#7b1f2c",
          tagBorder: "rgba(123,31,44,0.35)",
          tagBg: "transparent",
          title: "Mother's date",
          body: "Dinners, wellness, culture — a woman first.",
        },
        {
          tag: "Credits",
          tagColor: "#7b1f2c",
          tagBorder: "rgba(123,31,44,0.35)",
          tagBg: "transparent",
          title: "Learn & Grow",
          body: "Expert talks, workshops, and masterclasses.",
        },
        {
          tag: "Credits",
          tagColor: "#7b1f2c",
          tagBorder: "rgba(123,31,44,0.35)",
          tagBg: "transparent",
          title: "Signature moments",
          body: "Seasonal moments and 1:1 expert sessions.",
        },
      ]
    : [
        {
          tag: "Mayormente incluido",
          tagColor: "#3b5e04",
          tagBorder: "rgba(86,139,5,0.45)",
          tagBg: "rgba(86,139,5,0.08)",
          title: "Easy connection",
          body: "Paseos, encuentros en el parque y quedadas organizadas. Los paseos suelen estar incluidos en el plan pero pueden costar algún crédito según el colaborador.",
        },
        {
          tag: "Créditos",
          tagColor: "#7b1f2c",
          tagBorder: "rgba(123,31,44,0.35)",
          tagBg: "transparent",
          title: "Play date",
          body: "Yoga, masaje, música — tu peque justo a tu lado.",
        },
        {
          tag: "Créditos",
          tagColor: "#7b1f2c",
          tagBorder: "rgba(123,31,44,0.35)",
          tagBg: "transparent",
          title: "MoM's date",
          body: "Cenas, bienestar, cultura — una mujer en primer lugar.",
        },
        {
          tag: "Créditos",
          tagColor: "#7b1f2c",
          tagBorder: "rgba(123,31,44,0.35)",
          tagBg: "transparent",
          title: "Learn & Grow",
          body: "Charlas de expertas, talleres y clases magistrales.",
        },
        {
          tag: "Créditos",
          tagColor: "#7b1f2c",
          tagBorder: "rgba(123,31,44,0.35)",
          tagBg: "transparent",
          title: "Signature moments",
          body: "Momentos de temporada y sesiones 1:1 con especialistas.",
        },
      ];

  return (
    <div style={{ backgroundColor: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      {/* ─── SECTION 1: HERO & PRICING CARD ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(38px, 5vw, 70px) clamp(20px, 5vw, 64px) clamp(30px, 4vw, 48px)",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(30px, 4vw, 54px)",
          alignItems: "flex-start",
        }}
      >
        {/* Left column */}
        <div style={{ flex: "1 1 420px", minWidth: "290px" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              marginBottom: "14px",
            }}
          >
            {isEn ? "Membership · opening January 2027" : "Membresía · apertura enero 2027"}
          </div>

          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.6vw, 58px)",
              lineHeight: 1.06,
              margin: "0 0 18px",
            }}
          >
            {isEn ? "Your circle of mothers, all year round." : "Tu círculo de madres, todo el año."}
          </h1>

          <p
            style={{
              fontSize: "17.5px",
              lineHeight: 1.6,
              color: "rgba(57, 41, 42, 0.74)",
              margin: "0 0 26px",
              maxWidth: "46ch",
            }}
          >
            {isEn
              ? "Membership opens in January. Until then, come and meet the mothers who will be in it."
              : "La membresía abre en enero. Hasta entonces, ven a conocer a las madres que formarán parte."}
          </p>

          {/* 4 Countdown Boxes */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "26px" }}>
            {countdownItems.map((u, idx) => (
              <div
                key={idx}
                style={{
                  minWidth: "76px",
                  textAlign: "center",
                  background: "#ecdcd0",
                  border: "1px solid rgba(57, 41, 42, 0.18)",
                  borderRadius: "5px",
                  padding: "14px 10px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 400,
                    fontSize: "34px",
                    lineHeight: 1,
                    fontFeatureSettings: "'tnum'",
                    color: "#7b1f2c",
                  }}
                >
                  {u.value}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(57, 41, 42, 0.72)",
                    marginTop: "7px",
                  }}
                >
                  {u.label}
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              style={{
                border: "1px solid #7b1f2c",
                background: "transparent",
                color: "#7b1f2c",
                borderRadius: "4px",
                padding: "13px 26px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "15.5px",
                whiteSpace: "nowrap",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
            >
              {waitlisted
                ? (isEn ? "You're on the list" : "Estás en la lista")
                : (isEn ? "Join the list" : "Únete a la lista")}
            </button>
            <Link
              href="/events"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "15px",
                whiteSpace: "nowrap",
                color: "#7b1f2c",
              }}
            >
              {isEn ? "Or come to an event first" : "O ven a un evento primero"}
            </Link>
          </div>
        </div>

        {/* Right column: Burgundy Card */}
        <div
          style={{
            flex: "1 1 320px",
            minWidth: "270px",
            borderRadius: "8px",
            background: "#7b1f2c",
            color: "#f8efe2",
            padding: "clamp(22px, 3vw, 30px)",
            boxShadow: "0 14px 34px rgba(57, 41, 42, 0.18)",
          }}
        >
          {/* Green Badge */}
          <div
            style={{
              display: "inline-block",
              fontSize: "11.5px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#f8efe2",
              background: "#568b05",
              borderRadius: "12px",
              padding: "5px 14px",
              marginBottom: "18px",
              maxWidth: "100%",
              boxSizing: "border-box",
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            {isEn ? "No joining fee if you join us before launch" : "Sin cuota de alta si te unes antes del lanzamiento"}
          </div>

          {/* Pricing Row */}
          <div style={{ borderTop: "1px solid rgba(248,239,226,0.28)", borderBottom: "1px solid rgba(248,239,226,0.28)", padding: "20px 0 18px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 400,
                  fontSize: "clamp(56px, 7vw, 72px)",
                  lineHeight: 0.9,
                  fontFeatureSettings: "'tnum'",
                  color: "#fffdf9",
                }}
              >
                €39
              </span>
              <span style={{ fontSize: "15px", color: "rgba(248,239,226,0.85)" }}>
                {isEn ? "/ month" : "/ mes"}
              </span>
            </div>
            <div
              style={{
                fontSize: "13.5px",
                color: "rgba(248,239,226,0.85)",
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid rgba(248,239,226,0.18)",
              }}
            >
              {isEn ? "or " : "o "}
              <span style={{ fontFeatureSettings: "'tnum'" }}>€99</span>
              {isEn ? " every three months" : " cada tres meses"}
            </div>
          </div>

          <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(248,239,226,0.82)", margin: "14px 0 20px" }}>
            {isEn
              ? "To join without a joining fee, open your account before January 2027 — it is created the first time you book an event, even a free walk."
              : "Para unirte sin cuota de alta, abre tu cuenta antes de enero de 2027 — se crea la primera vez que reservas un evento, incluso un paseo gratuito."}
          </p>

          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "12.5px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#f3d9a1",
              margin: "4px 0 6px",
            }}
          >
            {isEn ? "What your membership includes" : "Qué incluye tu membresía"}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {includedItems.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: "11px",
                  alignItems: "flex-start",
                  padding: "10px 0",
                  borderTop: "1px solid rgba(248,239,226,0.18)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f3d9a1"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="15"
                  height="15"
                  style={{ flex: "none", marginTop: "3px" }}
                >
                  <path d="m5 12 5 5L20 7"></path>
                </svg>
                <span style={{ fontSize: "14.5px", lineHeight: 1.55, color: "#f8efe2" }}>{item}</span>
              </div>
            ))}
          </div>

          <p
            style={{
              fontSize: "12.5px",
              lineHeight: 1.6,
              color: "rgba(248,239,226,0.7)",
              margin: "16px 0 0",
              borderTop: "1px solid rgba(248,239,226,0.22)",
              paddingTop: "14px",
            }}
          >
            {isEn
              ? "Pause your membership for a total of two months in a year, at no cost. Cancel any time, with no fee."
              : "Pausa tu membresía hasta dos meses al año sin coste. Cancela cuando quieras, sin penalización."}
          </p>
        </div>
      </section>

      {/* ─── SECTION 2: BEFORE JANUARY / START MEETING MOTHERS NOW ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(28px, 4vw, 48px) clamp(20px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(57, 41, 42, 0.2)",
            borderRadius: "8px",
            background: "#ffffff",
            padding: "clamp(24px, 4vw, 40px)",
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(26px, 4vw, 48px)",
            alignItems: "center",
          }}
        >
          <div style={{ flex: "1 1 340px", minWidth: "280px" }}>
            <div
              style={{
                fontSize: "11.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(57, 41, 42, 0.72)",
                marginBottom: "12px",
              }}
            >
              {isEn ? "Before January" : "Antes de enero"}
            </div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: "clamp(26px, 3.4vw, 40px)",
                lineHeight: 1.12,
                margin: "0 0 14px",
              }}
            >
              {isEn ? "Start meeting mothers now." : "Empieza a conocer a madres ahora."}
            </h2>
            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.65,
                color: "rgba(57, 41, 42, 0.72)",
                margin: "0 0 16px",
                maxWidth: "52ch",
              }}
            >
              {isEn
                ? "Your account is created with your first booking: a wallet and the whole calendar. Credits are €2 each, bought in the amount you need, and they keep their six-month life when membership opens."
                : "Tu cuenta se crea con tu primera reserva: un monedero y todo el calendario disponible. Los créditos cuestan 2€ cada uno, se compran según necesites y mantienen sus 6 meses de validez cuando abra la membresía."}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <Link
                href="/events"
                style={{
                  border: "1px solid #7b1f2c",
                  color: "#7b1f2c",
                  padding: "12px 22px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                }}
              >
                {isEn ? "Book your first event" : "Reserva tu primer evento"}
              </Link>
              <Link
                href="/events"
                style={{
                  border: "1px solid rgba(57, 41, 42, 0.24)",
                  color: "#39292a",
                  padding: "12px 22px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                }}
              >
                {isEn ? "See the calendar" : "Ver el calendario"}
              </Link>
            </div>
          </div>

          <div
            style={{
              flex: "1 1 240px",
              minWidth: "230px",
              borderLeft: "1px solid rgba(57, 41, 42, 0.14)",
              paddingLeft: "clamp(18px, 3vw, 32px)",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: "52px",
                lineHeight: 1,
                fontFeatureSettings: "'tnum'",
                color: "#39292a",
              }}
            >
              €2
            </div>
            <div
              style={{
                fontSize: "12.5px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(57, 41, 42, 0.72)",
                margin: "8px 0 18px",
              }}
            >
              {isEn ? "per credit" : "por crédito"}
            </div>
            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "rgba(57, 41, 42, 0.74)",
                margin: 0,
                borderTop: "1px solid rgba(57, 41, 42, 0.12)",
                paddingTop: "12px",
              }}
            >
              {isEn
                ? "Each event shows its own credit price on the calendar."
                : "Cada evento muestra su propio precio en créditos en el calendario."}
            </p>
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: WHAT'S INCLUDED / FIVE WAYS TO CONNECT ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ maxWidth: "640px", marginBottom: "30px" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              marginBottom: "10px",
            }}
          >
            {isEn ? "What's included" : "Qué está incluido"}
          </div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "clamp(26px, 3.4vw, 38px)",
              lineHeight: 1.15,
              margin: "0 0 12px",
            }}
          >
            {isEn ? "Five ways to connect." : "Cinco formas de conectar."}
          </h2>
          <p style={{ fontSize: "16px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.7)", margin: 0 }}>
            {isEn
              ? "Included essentials give you a place to start. Credits unlock everything else — each event shows its own credit price on the calendar."
              : "Los básicos incluidos te ofrecen un punto de partida. Los créditos desbloquean todo lo demás — cada evento muestra su precio en créditos en el calendario."}
          </p>
        </div>

        {/* Carousel Navigation Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", margin: "-8px 0 16px" }}>
          <button
            type="button"
            onClick={handlePrevWay}
            aria-label="Previous"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "1px solid rgba(57, 41, 42, 0.25)",
              background: "#ffffff",
              color: "#39292a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
            >
              <path d="M19 12H5M11 18l-6-6 6-6"></path>
            </svg>
          </button>
          <button
            type="button"
            onClick={handleNextWay}
            aria-label="Next"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "1px solid rgba(57, 41, 42, 0.25)",
              background: "#ffffff",
              color: "#39292a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="16"
              height="16"
            >
              <path d="M5 12h14M13 6l6 6-6 6"></path>
            </svg>
          </button>
        </div>

        {/* Ways Carousel Rail */}
        <div
          ref={waysRailRef}
          style={{
            display: "flex",
            gap: "18px",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            scrollBehavior: "smooth",
            padding: "2px 2px 14px",
            margin: "0 -2px",
            scrollbarWidth: "none",
          }}
          className="hide-scrollbar"
        >
          {ways.map((w, idx) => (
            <div
              key={idx}
              style={{
                flex: "0 0 min(82%, 280px)",
                scrollSnapAlign: "start",
                border: "1px solid rgba(57, 41, 42, 0.18)",
                borderRadius: "8px",
                background: "#ffffff",
                padding: "22px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <span
                style={{
                  alignSelf: "flex-start",
                  fontSize: "10.5px",
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                  color: w.tagColor,
                  border: `1px solid ${w.tagBorder}`,
                  background: w.tagBg,
                  borderRadius: "11px",
                  padding: "4px 11px",
                  whiteSpace: "nowrap",
                }}
              >
                {w.tag}
              </span>
              <h3
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "20px",
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {w.title}
              </h3>
              <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: 0 }}>
                {w.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SECTION 4: THE CIRCLE ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(28px, 4vw, 52px)", alignItems: "center" }}>
          <div style={{ flex: "1 1 360px", minWidth: "280px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#7b1f2c",
                marginBottom: "10px",
              }}
            >
              The Circle
            </div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: "clamp(26px, 3.4vw, 40px)",
                lineHeight: 1.12,
                margin: "0 0 14px",
              }}
            >
              {isEn ? "Between events, the conversation keeps going." : "Entre eventos, la conversación sigue viva."}
            </h2>
            <p
              style={{
                fontSize: "16px",
                lineHeight: 1.65,
                color: "rgba(57, 41, 42, 0.74)",
                margin: "0 0 20px",
                maxWidth: "50ch",
              }}
            >
              {isEn
                ? "Ask for advice at three in the morning, share a win, find the mother down the street. The Circle is open to read today — and from January 2027, members get a private room of their own."
                : "Pide consejo a las tres de la mañana, comparte un logro o encuentra a una madre de tu misma calle. The Circle está abierto para leer hoy — y a partir de enero de 2027, las socias tendrán su propia sala privada."}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <Link
                href="/circle"
                style={{
                  border: "1px solid #7b1f2c",
                  background: "#7b1f2c",
                  color: "#fdf8f2",
                  padding: "12px 22px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                }}
              >
                {isEn ? "Visit The Circle" : "Visitar The Circle"}
              </Link>
            </div>
          </div>

          {/* Community Post Preview Cards */}
          <div style={{ flex: "1 1 360px", minWidth: "280px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                border: "1px solid rgba(57, 41, 42, 0.16)",
                borderRadius: "8px",
                background: "#ffffff",
                padding: "18px 20px",
                display: "flex",
                gap: "13px",
                alignItems: "flex-start",
                minHeight: "128px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  flex: "none",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "rgba(57, 41, 42, 0.07)",
                  border: "1px solid rgba(57, 41, 42, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  color: "rgba(57, 41, 42, 0.6)",
                }}
              >
                ·
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "baseline", marginBottom: "5px" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15.5px" }}>
                    {isEn ? "A mother in Gràcia" : "Una madre en Gràcia"}
                  </span>
                  <span style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.66)" }}>
                    {isEn ? "Postpartum" : "Posparto"}
                  </span>
                </div>
                <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                  {isEn
                    ? "Six months in and I still feel like a stranger to myself. Did this lift for you, and when?"
                    : "Seis meses después y todavía me siento una extraña para mí misma. ¿Se os pasó esta sensación, y cuándo?"}
                </p>
                <div style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.66)", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="#7b1f2c"
                    stroke="#7b1f2c"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="13"
                    height="13"
                    style={{ flex: "none" }}
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                  </svg>
                  <span>34 · 2 {isEn ? "replies" : "respuestas"}</span>
                </div>
              </div>
            </div>

            <div
              style={{
                border: "1px solid rgba(57, 41, 42, 0.16)",
                borderRadius: "8px",
                background: "#ffffff",
                padding: "18px 20px",
                display: "flex",
                gap: "13px",
                alignItems: "flex-start",
                minHeight: "128px",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  flex: "none",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "rgba(123, 31, 44, 0.09)",
                  border: "1px solid rgba(123, 31, 44, 0.28)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  color: "#7b1f2c",
                }}
              >
                N
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "baseline", marginBottom: "5px" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15.5px" }}>
                    Núria B.
                  </span>
                  <span style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.66)" }}>
                    {isEn ? "replied" : "respondió"}
                  </span>
                </div>
                <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                  {isEn
                    ? "Month nine for me, and slowly rather than all at once. You are not alone in this."
                    : "En el noveno mes en mi caso, y poco a poco más que de golpe. No estás sola en esto."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: YOUR CIRCLE IS ALREADY FORMING ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px) clamp(46px, 6vw, 78px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "26px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 360px", minWidth: "280px" }}>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: "clamp(26px, 3.6vw, 42px)",
                lineHeight: 1.1,
                margin: "0 0 12px",
              }}
            >
              {isEn ? "Your circle is already forming." : "Tu círculo ya se está formando."}
            </h2>
            <p style={{ fontSize: "16px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.7)", margin: 0, maxWidth: "52ch" }}>
              {isEn
                ? "The mothers you meet this autumn are the circle you will keep in January. Join the list, or simply come to something before then."
                : "Las madres que conozcas este otoño son el círculo que mantendrás en enero. Únete a la lista o simplemente ven a algo antes."}
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              style={{
                border: "1px solid #7b1f2c",
                background: "transparent",
                color: "#7b1f2c",
                borderRadius: "4px",
                padding: "13px 26px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "15.5px",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {waitlisted
                ? (isEn ? "You're on the list" : "Estás en la lista")
                : (isEn ? "Join the list" : "Únete a la lista")}
            </button>
            <Link
              href="/faq"
              style={{
                border: "1px solid rgba(57, 41, 42, 0.24)",
                color: "#39292a",
                padding: "13px 24px",
                borderRadius: "4px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "15px",
                whiteSpace: "nowrap",
                textDecoration: "none",
              }}
            >
              {isEn ? "Read the questions" : "Preguntas frecuentes"}
            </Link>
          </div>
        </div>
      </section>

      {/* ─── LEAD CAPTURE MODAL ─── */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(57, 41, 42, 0.5)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "460px",
              margin: "auto",
              border: "1px solid rgba(57, 41, 42, 0.16)",
              borderRadius: "8px",
              padding: "clamp(26px, 4vw, 36px)",
              backgroundColor: "#fdf8f2",
              boxShadow: "0 20px 50px rgba(45, 43, 43, 0.2)",
            }}
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
                color: "rgba(57, 41, 42, 0.5)",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            {subSuccess ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "#edf5e8",
                    color: "#568b05",
                    marginBottom: "16px",
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                </div>
                <h3
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "24px",
                    margin: "0 0 8px",
                  }}
                >
                  {isEn ? "You're on the list." : "Estás en la lista."}
                </h3>
                <p style={{ fontSize: "14.5px", color: "rgba(57, 41, 42, 0.75)", margin: 0 }}>
                  {isEn
                    ? "We will write to you before membership opens in January 2027."
                    : "Te escribiremos antes de que abra la membresía en enero de 2027."}
                </p>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "12px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#7b1f2c",
                    marginBottom: "8px",
                  }}
                >
                  {isEn ? "Early Access" : "Acceso preferente"}
                </div>
                <h3
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 400,
                    fontSize: "28px",
                    margin: "0 0 10px",
                    lineHeight: 1.15,
                  }}
                >
                  {isEn ? "Join the pre-membership list" : "Únete a la lista preferente"}
                </h3>
                <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: "0 0 20px" }}>
                  {isEn
                    ? "Hear first when founding memberships open in January 2027 and lock in zero joining fee."
                    : "Sé la primera en enterarte cuando abran las membresías fundadoras en enero de 2027 y ahórrate la cuota de alta."}
                </p>

                <form onSubmit={handleJoinListSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isEn ? "Your name (optional)" : "Tu nombre (opcional)"}
                    style={{
                      border: "1px solid rgba(57, 41, 42, 0.24)",
                      borderRadius: "4px",
                      padding: "11px 14px",
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: "14px",
                      backgroundColor: "#ffffff",
                      color: "#39292a",
                      outline: "none",
                    }}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isEn ? "Your email address" : "Tu dirección de correo"}
                    style={{
                      border: "1px solid rgba(57, 41, 42, 0.24)",
                      borderRadius: "4px",
                      padding: "11px 14px",
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: "14px",
                      backgroundColor: "#ffffff",
                      color: "#39292a",
                      outline: "none",
                    }}
                  />

                  {errorMsg && (
                    <div style={{ fontSize: "13px", color: "#993842", marginTop: "-4px" }}>
                      {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      marginTop: "4px",
                      border: "1px solid #7b1f2c",
                      backgroundColor: "#7b1f2c",
                      color: "#fdf8f2",
                      padding: "12px 20px",
                      borderRadius: "4px",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "16px",
                      cursor: loading ? "wait" : "pointer",
                      transition: "background-color 0.2s ease",
                    }}
                  >
                    {loading ? (isEn ? "Saving..." : "Guardando...") : (isEn ? "Join the list" : "Unirme a la lista")}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
