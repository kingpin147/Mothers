"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useSession } from "next-auth/react";

// Countdown target: 6 Jan 2027 00:00 Europe/Madrid
const TARGET_DATE = new Date("2027-01-06T00:00:00+01:00").getTime();

function calculateTimeLeft() {
  const now = new Date().getTime();
  const diff = Math.max(0, TARGET_DATE - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

export function StickyCountdownBanner() {
  const { language: lang } = useLanguage();
  const { data: session } = useSession();

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>(calculateTimeLeft);
  const [mounted, setMounted] = useState(false);
  const [joined, setJoined] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedJoined = localStorage.getItem("tm_pre_joined_list");
    if (savedJoined) setJoined(true);

    const savedDismissed = localStorage.getItem("tm_banner_dismissed");
    if (savedDismissed === "true") setDismissed(true);

    const updateCountdown = () => {
      setTimeLeft(calculateTimeLeft());
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissed(true);
    localStorage.setItem("tm_banner_dismissed", "true");
  };

  if (dismissed) return null;

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
        body: JSON.stringify({ email, source: "countdown_banner" }),
      });
      if (!res.ok) {
        throw new Error("Failed to join list");
      }
      setJoined(true);
      localStorage.setItem("tm_pre_joined_list", "true");
      setModalOpen(false);
    } catch {
      setErrorMsg(lang === "en" ? "Something went wrong. Please try again." : "Algo ha fallado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const countdownUnits = [
    { value: `${timeLeft.days}`, label: lang === "en" ? "DAYS" : "DÍAS" },
    { value: pad(timeLeft.hours), label: lang === "en" ? "HOURS" : "HORAS" },
    { value: pad(timeLeft.minutes), label: lang === "en" ? "MINS" : "MINS" },
    { value: pad(timeLeft.seconds), label: lang === "en" ? "SECS" : "SEGS" },
  ];

  return (
    <>
      <div
        id="countdown-banner"
        style={{
          position: "relative",
          backgroundColor: "#39292a",
          color: "#f8efe2",
          fontFamily: "'Lora', Georgia, serif",
          padding: "14px clamp(20px, 5vw, 64px)",
          borderBottom: "1px solid rgba(201, 162, 39, 0.25)",
        }}
      >
        <div
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            width: "100%",
            display: "flex",
            flexWrap: "wrap",
            gap: "14px 20px",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            paddingRight: "40px", // ensure clearance for absolute close button
          }}
        >
          {/* Headline and descriptive subtitle */}
          <div style={{ flex: "1 1 280px", minWidth: "220px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "11.5px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#c9a227",
                marginBottom: "4px",
              }}
            >
              {lang === "en" ? "MEMBERSHIP OPENS JANUARY 2027" : "MEMBRESÍA ABRE EN ENERO DE 2027"}
            </div>
            <p
              style={{
                fontSize: "13.5px",
                lineHeight: 1.45,
                color: "rgba(248, 239, 226, 0.88)",
                margin: 0,
                maxWidth: "52ch",
              }}
            >
              {lang === "en"
                ? "Meet mothers now — and join without a joining fee when membership opens."
                : "Conoce a otras madres ahora — y únete sin cuota de alta cuando se abra la membresía."}
            </p>
          </div>

          {/* Right Side: 4 Countdown Boxes + CTA Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "nowrap" }}>
              {countdownUnits.map((u, idx) => (
                <div
                  key={idx}
                  style={{
                    minWidth: "48px",
                    textAlign: "center",
                    border: "1px solid rgba(201, 162, 39, 0.45)",
                    borderRadius: "4px",
                    padding: "6px 4px",
                    backgroundColor: "rgba(0, 0, 0, 0.14)",
                  }}
                >
                  <div
                    suppressHydrationWarning
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontWeight: 400,
                      fontSize: "21px",
                      lineHeight: 1,
                      fontFeatureSettings: "'tnum'",
                      color: "#f8efe2",
                    }}
                  >
                    {mounted ? u.value : "--"}
                  </div>
                  <div
                    style={{
                      fontSize: "8.5px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(248, 239, 226, 0.65)",
                      marginTop: "3px",
                      fontFamily: "'Lora', Georgia, serif",
                    }}
                  >
                    {u.label}
                  </div>
                </div>
              ))}
            </div>

            {joined || session?.user ? (
              <span
                style={{
                  fontSize: "13px",
                  color: "#c9a227",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  padding: "8px 14px",
                  border: "1px solid rgba(201, 162, 39, 0.3)",
                  borderRadius: "4px",
                  whiteSpace: "nowrap",
                }}
              >
                {lang === "en" ? "✓ On the list" : "✓ En la lista"}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                style={{
                  flex: "none",
                  border: "1px solid #c9a227",
                  background: "transparent",
                  color: "#c9a227",
                  borderRadius: "4px",
                  padding: "9px 18px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "14px",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#c9a227";
                  e.currentTarget.style.color = "#39292a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#c9a227";
                }}
              >
                {lang === "en" ? "Join the list" : "Unirme a la lista"}
              </button>
            )}
          </div>

          {/* Close "✕" Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={lang === "en" ? "Close announcement" : "Cerrar anuncio"}
            style={{
              position: "absolute",
              top: "0px",
              right: "0px",
              width: "32px",
              height: "32px",
              background: "rgba(248, 239, 226, 0.08)",
              border: "none",
              borderRadius: "50%",
              color: "rgba(248, 239, 226, 0.8)",
              fontSize: "15px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              touchAction: "manipulation",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(248, 239, 226, 0.2)";
              e.currentTarget.style.color = "#f8efe2";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(248, 239, 226, 0.08)";
              e.currentTarget.style.color = "rgba(248, 239, 226, 0.8)";
            }}
          >
            ✕
          </button>
        </div>
      </div>

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

            {joined ? (
              <div style={{ padding: "8px 0" }}>
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
                  {lang === "en" ? "You're on the list." : "Ya estás en la lista."}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: "rgba(57, 41, 42, 0.78)",
                    margin: "0 0 18px",
                  }}
                >
                  {lang === "en"
                    ? "We'll write before membership opens in January 2027, and your €19 joining fee will be permanently waived."
                    : "Te escribiremos antes de que abra la membresía en enero de 2027 y tu cuota de alta de 19€ quedará exonerada."}
                </p>
                <div
                  style={{
                    backgroundColor: "rgba(86, 139, 5, 0.12)",
                    border: "1px solid rgba(86, 139, 5, 0.35)",
                    borderRadius: "6px",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    color: "#3b5e04",
                    fontSize: "14px",
                  }}
                >
                  <span>{lang === "en" ? "You're in! We'll let you know when it's open." : "¡Ya estás dentro! Te avisaremos cuando abra."}</span>
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#3b5e04",
                      fontWeight: 600,
                      textDecoration: "underline",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: "14px",
                      fontFamily: "inherit",
                    }}
                  >
                    {lang === "en" ? "Close" : "Cerrar"}
                  </button>
                </div>
              </div>
            ) : (
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

                {errorMsg && (
                  <div style={{ color: "#993842", fontSize: "13px" }}>{errorMsg}</div>
                )}

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
                    transition: "background 0.2s",
                  }}
                >
                  {loading
                    ? (lang === "en" ? "Saving..." : "Guardando...")
                    : (lang === "en" ? "Join the list" : "Unirme a la lista")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
