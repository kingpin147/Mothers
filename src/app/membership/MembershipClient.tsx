"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { useSession } from "next-auth/react";

function calculateTimeLeft(targetMs: number) {
  const now = new Date().getTime();
  const diff = Math.max(0, targetMs - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

interface MembershipClientProps {
  initialWindowOpen?: boolean;
  initialSpotsRemaining?: number;
  nextWindowDate?: string | null;
  autoOpenApply?: boolean;
  publicSettings?: any;
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

  const [targetDateMs, setTargetDateMs] = useState<number>(() => {
    if (publicSettings?.expectedLaunch) {
      return new Date(publicSettings.expectedLaunch).getTime();
    }
    return new Date("2027-01-06T00:00:00+01:00").getTime();
  });

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>(() => calculateTimeLeft(targetDateMs));
  const [mounted, setMounted] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  const [modalOpen, setModalOpen] = useState(autoOpenApply);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [subSuccess, setSubSuccess] = useState(false);
  const [inlineJoinOpen, setInlineJoinOpen] = useState(false);
  const { data: session } = useSession();

  const waysRailRef = useRef<HTMLDivElement>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("tm_pre_joined_list");
    if (saved) setWaitlisted(true);

    import("@/app/actions/adminSettings").then(({ getPublicClubSettings }) => {
      getPublicClubSettings().then((s) => {
        if (s.membershipLive) setIsLive(true);
        if (s.expectedLaunch) {
          const ms = new Date(s.expectedLaunch).getTime();
          if (!isNaN(ms)) {
            setTargetDateMs(ms);
          }
        }
      }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      setTimeLeft(calculateTimeLeft(targetDateMs));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [targetDateMs]);

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

  const col1Items = isEn
    ? [
        "A private community of mothers, vetted at the door",
        "20 credits a month, rolling over",
        "Partner perks",
        "Priority booking on everything",
      ]
    : [
        "Una comunidad privada de madres, seleccionada con cuidado",
        "20 créditos al mes, acumulables",
        "Ventajas con partners",
        "Prioridad de reserva en todo",
      ];

  const col2Items = isEn
    ? [
        "Stage groups by trimester, age and neighbourhood",
        "Access to all events",
        "Access to La Gazette forum, including the members' room",
      ]
    : [
        "Grupos por trimestre, edad y barrio",
        "Acceso a todos los eventos",
        "Acceso al foro La Gazette, incluida la sala de socias",
      ];

  const ways = isEn
    ? [
        {
          tag: "Mostly included",
          tagColor: "#3b5e04",
          tagBorder: "rgba(86,139,5,0.45)",
          tagBg: "rgba(86,139,5,0.08)",
          title: "Easy connection",
          body: "Walks, park socials & hosted meetups.",
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
          body: "Paseos, encuentros en el parque y quedadas con anfitriona.",
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
          title: "Mother's date",
          body: "Cenas, bienestar, cultura — una mujer en primer lugar.",
        },
        {
          tag: "Créditos",
          tagColor: "#7b1f2c",
          tagBorder: "rgba(123,31,44,0.35)",
          tagBg: "transparent",
          title: "Learn & Grow",
          body: "Charlas con expertas, talleres y masterclasses.",
        },
        {
          tag: "Créditos",
          tagColor: "#7b1f2c",
          tagBorder: "rgba(123,31,44,0.35)",
          tagBg: "transparent",
          title: "Signature moments",
          body: "Encuentros de temporada y sesiones individuales con especialistas.",
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
            {isLive
              ? (isEn ? "Membership · Now open" : "Membresía · Abierta")
              : (isEn ? "Membership · Opening January 2027" : "Membresía · Apertura enero 2027")}
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
                  suppressHydrationWarning
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 400,
                    fontSize: "34px",
                    lineHeight: 1,
                    fontFeatureSettings: "'tnum'",
                    color: "#7b1f2c",
                  }}
                >
                  {mounted ? u.value : "--"}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-start" }}>
            {!inlineJoinOpen ? (
              waitlisted ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    border: "1px solid #568b05",
                    background: "rgba(86,139,5,0.08)",
                    color: "#3b5e04",
                    borderRadius: "4px",
                    padding: "11px 18px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "15.5px",
                  }}
                >
                  <span>{isEn ? "✓ You're on the list" : "✓ Estás en la lista"}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setWaitlisted(false);
                      localStorage.removeItem("tm_pre_joined_list");
                      setInlineJoinOpen(true);
                    }}
                    title={isEn ? "Close / join again" : "Cerrar / unirte de nuevo"}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#3b5e04",
                      cursor: "pointer",
                      padding: "2px 4px",
                      fontSize: "14px",
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    if (session?.user?.email) {
                      setLoading(true);
                      try {
                        await fetch("/api/leads", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: session.user.email, source: "membership_hero_signed_in" }),
                        });
                        setWaitlisted(true);
                        localStorage.setItem("tm_pre_joined_list", "true");
                      } catch {}
                      setLoading(false);
                    } else {
                      setInlineJoinOpen(true);
                    }
                  }}
                  style={{
                    border: "1px solid #7b1f2c",
                    background: "transparent",
                    color: "#7b1f2c",
                    borderRadius: "4px",
                    padding: "11px 22px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "15.5px",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    transition: "background 0.2s ease",
                  }}
                >
                  {isEn ? "Join the list" : "Únete a la lista"}
                </button>
              )
            ) : (
              <form
                onSubmit={async (e) => {
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
                      body: JSON.stringify({ email, source: "membership_page_hero_inline" }),
                    });
                    if (!res.ok) throw new Error("Failed");
                    setWaitlisted(true);
                    localStorage.setItem("tm_pre_joined_list", "true");
                    setInlineJoinOpen(false);
                  } catch {
                    setErrorMsg(isEn ? "Something went wrong." : "Algo ha fallado.");
                  } finally {
                    setLoading(false);
                  }
                }}
                style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", maxWidth: "100%" }}
              >
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setInlineJoinOpen(false);
                      setEmail("");
                      setErrorMsg("");
                    }
                  }}
                  placeholder={isEn ? "you@email.com" : "tu@correo.com"}
                  style={{
                    padding: "9px 14px",
                    border: "1px solid rgba(57, 41, 42, 0.28)",
                    borderRadius: "4px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "14px",
                    outline: "none",
                    width: "220px",
                    maxWidth: "240px",
                    backgroundColor: "#ffffff",
                    color: "#39292a",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    border: "1px solid #7b1f2c",
                    background: "#7b1f2c",
                    color: "#f8efe2",
                    padding: "9px 18px",
                    borderRadius: "4px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "15px",
                    cursor: loading ? "wait" : "pointer",
                  }}
                >
                  {loading ? "..." : (isEn ? "Join" : "Unirme")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInlineJoinOpen(false);
                    setEmail("");
                    setErrorMsg("");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(57, 41, 42, 0.65)",
                    textDecoration: "underline",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  {isEn ? "Cancel" : "Cancelar"}
                </button>
                {errorMsg && (
                  <div style={{ width: "100%", fontSize: "12px", color: "#993842", marginTop: "2px" }}>
                    {errorMsg}
                  </div>
                )}
              </form>
            )}

            <Link
              href="/events"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "15px",
                whiteSpace: "nowrap",
                color: "#7b1f2c",
                textDecoration: "none",
              }}
            >
              {isEn ? "Or come to an event first" : "O ven a un evento primero"}
            </Link>
          </div>
        </div>

        {/* Right column: Burgundy Card */}
        <div
          style={{
            flex: "1 1 380px",
            minWidth: "290px",
            borderRadius: "8px",
            background: "#7b1f2c",
            color: "#f8efe2",
            padding: "clamp(22px, 3vw, 32px)",
            boxShadow: "0 14px 34px rgba(57, 41, 42, 0.18)",
          }}
        >
          {/* Green Badge */}
          <div
            style={{
              display: "inline-block",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#ffffff",
              background: "#568b05",
              borderRadius: "12px",
              padding: "5px 14px",
              marginBottom: "18px",
              maxWidth: "100%",
              boxSizing: "border-box",
              lineHeight: 1.4,
              fontWeight: 600,
            }}
          >
            {isEn ? "NO JOINING FEE IF YOU JOIN US BEFORE LAUNCH" : "SIN CUOTA DE ALTA SI TE UNES ANTES DEL LANZAMIENTO"}
          </div>

          {/* Pricing Row */}
          <div style={{ borderTop: "1px solid rgba(248,239,226,0.28)", borderBottom: "1px solid rgba(248,239,226,0.28)", padding: "18px 0 16px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 400,
                  fontSize: "clamp(48px, 6vw, 64px)",
                  lineHeight: 0.9,
                  fontFeatureSettings: "'tnum'",
                  color: "#fffdf9",
                }}
              >
                €39
              </span>
              <span style={{ fontSize: "14px", color: "rgba(248,239,226,0.85)" }}>
                {isEn ? "/ month · or €99 every three months" : "/ mes · o 99€ cada tres meses"}
              </span>
            </div>
          </div>

          <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(248,239,226,0.82)", margin: "0 0 18px" }}>
            {isEn
              ? "Open your account before January 2027 — free, or with your first booking — and you won't pay a joining fee."
              : "Abre tu cuenta antes de enero de 2027 — gratis, o con tu primera reserva — y no pagarás cuota de alta."}
          </p>

          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#f3d9a1",
              marginBottom: "12px",
            }}
          >
            {isEn ? "WHAT YOUR MEMBERSHIP INCLUDES" : "QUÉ INCLUYE TU MEMBRESÍA"}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
              gap: "8px 16px",
              marginBottom: "16px",
            }}
          >
            {/* Column 1 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {col1Items.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#f3d9a1" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ flex: "none", marginTop: "3px" }}>
                    <path d="m5 12 5 5L20 7"></path>
                  </svg>
                  <span style={{ fontSize: "13px", lineHeight: 1.45, color: "#f8efe2" }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Column 2 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {col2Items.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#f3d9a1" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" style={{ flex: "none", marginTop: "3px" }}>
                    <path d="m5 12 5 5L20 7"></path>
                  </svg>
                  <span style={{ fontSize: "13px", lineHeight: 1.45, color: "#f8efe2" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p
            style={{
              fontSize: "12.5px",
              lineHeight: 1.55,
              color: "rgba(248,239,226,0.72)",
              margin: 0,
              borderTop: "1px solid rgba(248,239,226,0.22)",
              paddingTop: "12px",
            }}
          >
            {isEn
              ? "Pause your membership for a total of two months in a year, at no cost. Cancel any time, with no fee."
              : "Pausa tu membresía durante dos meses al año, sin coste. Cancela en cualquier momento sin penalización."}
          </p>
        </div>
      </section>

      {/* ─── SECTION 2: START MEETING MOTHERS NOW ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(24px, 3vw, 36px) clamp(20px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(57, 41, 42, 0.2)",
            borderRadius: "8px",
            background: "#ffffff",
            padding: "clamp(20px, 3vw, 30px)",
            display: "flex",
            flexDirection: "column",
            gap: "clamp(18px, 2.4vw, 24px)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 24px", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "11.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.72)", marginBottom: "8px" }}>
                {isEn ? "Before January" : "Antes de enero"}
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(26px, 3.2vw, 36px)", lineHeight: 1.12, margin: 0 }}>
                {isEn ? "Start meeting mothers now." : "Empieza a conocer madres ahora."}
              </h2>
            </div>
            <div>
              <Link
                href="/events"
                style={{
                  border: "1px solid #7b1f2c",
                  color: "#7b1f2c",
                  padding: "11px 20px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                  display: "inline-block",
                  transition: "all 0.15s ease",
                }}
              >
                {isEn ? "Book your first event" : "Reserva tu primer evento"}
              </Link>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "16px 24px", borderTop: "1px solid rgba(57, 41, 42, 0.1)", paddingTop: "clamp(16px, 2vw, 20px)" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <span style={{ flex: "none", width: "38px", height: "38px", borderRadius: "50%", border: "1px solid rgba(123, 31, 44, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7b1f2c" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                  <path d="M16 2v4M8 2v4M3 10h18"></path>
                  <path d="m9 16 2 2 4-4"></path>
                </svg>
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px", lineHeight: 1.25, color: "#39292a" }}>
                  {isEn ? "Book an event" : "Reserva un evento"}
                </div>
                <div style={{ fontSize: "13px", lineHeight: 1.45, color: "rgba(57, 41, 42, 0.72)" }}>
                  {isEn ? "Your account is created with it" : "Tu cuenta se crea con la reserva"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <span style={{ flex: "none", width: "38px", height: "38px", borderRadius: "50%", border: "1px solid rgba(123, 31, 44, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7b1f2c" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path>
                  <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path>
                </svg>
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px", lineHeight: 1.25, color: "#39292a" }}>
                  {isEn ? "Add the credits you need" : "Añade los créditos necesarios"}
                </div>
                <div style={{ fontSize: "13px", lineHeight: 1.45, color: "rgba(57, 41, 42, 0.72)" }}>
                  {isEn ? "Each event shows its credit price" : "Cada evento indica su precio"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <span style={{ flex: "none", width: "38px", height: "38px", borderRadius: "50%", border: "1px solid rgba(123, 31, 44, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7b1f2c" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                  <path d="M12 7v5l4 2"></path>
                </svg>
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px", lineHeight: 1.25, color: "#39292a" }}>
                  {isEn ? "Keep them into membership" : "Manténlos en tu membresía"}
                </div>
                <div style={{ fontSize: "13px", lineHeight: 1.45, color: "rgba(57, 41, 42, 0.72)" }}>
                  {isEn ? "Credits last six months" : "Validez de seis meses"}
                </div>
              </div>
            </div>
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
              {isEn ? "La Gazette - Forum" : "La Gazette — Foro"}
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
              {isLive
                ? (isEn
                  ? "Ask for advice at 3:00 AM, share a win, find the mother down the street. Members enjoy their own private rooms and discussions."
                  : "Pide consejo a las 3:00 AM, comparte un logro o encuentra a una madre de tu misma calle. Las socias disfrutan de sus propias salas y debates privados.")
                : (isEn
                  ? "Ask for advice at 3:00 AM, share a win, find the mother down the street. La Gazette is open to read today — and from January 2027, members get a private room of their own."
                  : "Pide consejo a las 3:00 AM, comparte un logro o encuentra a una madre de tu misma calle. La Gazette está abierta para leer hoy — y a partir de enero de 2027, las socias tendrán su propia sala privada.")}
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
                {isEn ? "Visit La Gazette" : "Visitar La Gazette"}
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
                    ? "We will write to you before membership opens."
                    : "Te escribiremos antes de que abra la membresía."}
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
                  {isLive
                    ? (isEn ? "Stay in touch" : "Mantente al día")
                    : (isEn ? "Early Access" : "Acceso preferente")}
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
                    ? "Hear first when memberships open. No joining fee if you join before launch."
                    : "Sé la primera en enterarte cuando abran las membresías. Sin cuota de alta si te unes antes del lanzamiento."}
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
