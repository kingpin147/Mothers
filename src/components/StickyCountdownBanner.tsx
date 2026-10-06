"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useSession } from "next-auth/react";

import { getPublicClubSettings, checkEmailOnWaitlist } from "@/app/actions/adminSettings";

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

  const [launchDateStr, setLaunchDateStr] = useState<string>("");
  const [targetDate, setTargetDate] = useState<number>(new Date("2027-01-06T00:00:00+01:00").getTime());
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);
  const [joined, setJoined] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    setMounted(true);
    getPublicClubSettings().then((s) => {
      if (s.membershipLive) setIsLive(true);
      if (s.expectedLaunch) {
        const d = new Date(s.expectedLaunch);
        if (!isNaN(d.getTime())) {
          setTargetDate(d.getTime());
          setLaunchDateStr(d.toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB", { month: "long", year: "numeric" }));
        }
      }
    }).catch(() => {});

    const savedJoined = typeof window !== "undefined" ? localStorage.getItem("tm_pre_joined_list") : null;
    if (savedJoined === "true") setJoined(true);

    const savedDismissed = typeof window !== "undefined" ? sessionStorage.getItem("tm_banner_dismissed") : null;
    if (savedDismissed === "true") setDismissed(true);
  }, [lang]);

  useEffect(() => {
    if (session?.user?.email) {
      checkEmailOnWaitlist(session.user.email).then((res) => {
        if (res.onList) {
          setJoined(true);
        }
      }).catch(() => {});
    }
  }, [session?.user?.email]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, targetDate - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("tm_banner_dismissed", "true");
    }
  };

  if (dismissed || isLive) return null;

  const handleJoinList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg(
        lang === "fr"
          ? "Veuillez entrer un e-mail valide."
          : lang === "es"
          ? "Introduce un correo válido."
          : "Please enter a valid email."
      );
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
      setErrorMsg(
        lang === "fr"
          ? "Une erreur s'est produite. Veuillez réessayer."
          : lang === "es"
          ? "Algo ha fallado. Inténtalo de nuevo."
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const countdownUnits = [
    { value: `${timeLeft.days}`, label: lang === "fr" ? "JOURS" : lang === "es" ? "DÍAS" : "DAYS" },
    { value: pad(timeLeft.hours), label: lang === "fr" ? "HEURES" : lang === "es" ? "HORAS" : "HOURS" },
    { value: pad(timeLeft.minutes), label: "MINS" },
    { value: pad(timeLeft.seconds), label: lang === "fr" ? "SECS" : lang === "es" ? "SEGS" : "SECS" },
  ];

  const shortMonthStr = (() => {
    if (!targetDate) return "JAN 2027";
    const d = new Date(targetDate);
    if (isNaN(d.getTime())) return "JAN 2027";
    return d.toLocaleDateString(lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-GB", { month: "short", year: "numeric" });
  })();

  const mobileLaunchText =
    lang === "fr"
      ? `ADHÉSIONS DÈS ${shortMonthStr.toUpperCase()}`
      : lang === "es"
      ? `MEMBRESÍA A PARTIR DE ${shortMonthStr.toUpperCase()}`
      : `MEMBERSHIP OPENS IN ${shortMonthStr.toUpperCase()}`;

  const mobileTimeText = `${timeLeft.days}d · ${pad(timeLeft.hours)}h · ${pad(timeLeft.minutes)}m`;

  return (
    <>
      {/* Mobile Slim Countdown Strip (Pinned below header, visible always) */}
      <div
        className="countdown-banner-mobile"
        style={{
          display: "none",
          backgroundColor: "#39292a",
          color: "#f8efe2",
          padding: "8px clamp(12px, 3.5vw, 20px)",
          borderBottom: "1px solid rgba(201, 162, 39, 0.2)",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "clamp(10.5px, 2.8vw, 12px)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#c9a227",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {mobileLaunchText}
        </span>
        <span
          suppressHydrationWarning
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 500,
            fontSize: "clamp(12px, 3vw, 13.5px)",
            letterSpacing: "0.05em",
            color: "rgba(248, 239, 226, 0.92)",
            fontFeatureSettings: "'tnum'",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {mounted ? mobileTimeText : "--d · --h · --m"}
        </span>
      </div>

      {/* Desktop Rich Countdown Banner */}
      <div
        id="countdown-banner"
        className="countdown-banner-desktop"
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
          <div style={{ flex: "1 1 280px", minWidth: 0, width: "100%" }}>
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
              {lang === "fr"
                ? `OUVERTURE DES ADHÉSIONS ${launchDateStr ? launchDateStr.toUpperCase() : "PROCHAINEMENT"}`
                : lang === "es"
                ? `MEMBRESÍA ABRE ${launchDateStr ? launchDateStr.toUpperCase() : "PRÓXIMAMENTE"}`
                : `MEMBERSHIP OPENS ${launchDateStr ? launchDateStr.toUpperCase() : "SOON"}`}
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
              {lang === "fr"
                ? "Rencontrez d'autres mères dès aujourd'hui — et devenez membre sans frais d'adhésion à l'ouverture."
                : lang === "es"
                ? "Conoce a otras madres ahora — y únete sin cuota de alta cuando se abra la membresía."
                : "Meet mothers now — and join without a joining fee when membership opens."}
            </p>
          </div>

          {/* Right Side: 4 Countdown Boxes + CTA Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "nowrap", maxWidth: "100%" }}>
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              {countdownUnits.map((u, idx) => (
                <div
                  key={idx}
                  style={{
                    minWidth: "42px",
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
                      fontSize: "20px",
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
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "rgba(248, 239, 226, 0.65)",
                      marginTop: "2px",
                      fontFamily: "'Lora', Georgia, serif",
                    }}
                  >
                    {u.label}
                  </div>
                </div>
              ))}
            </div>

            {joined ? (
              <span
                style={{
                  fontSize: "13px",
                  color: "#c9a227",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  padding: "8px 14px",
                  border: "1px solid rgba(201, 162, 39, 0.4)",
                  borderRadius: "4px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {lang === "fr" ? "✓ Sur la liste" : lang === "es" ? "✓ En la lista" : "✓ On the list"}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (session?.user?.email) {
                    setEmail(session.user.email);
                  }
                  setModalOpen(true);
                }}
                style={{
                  flex: "none",
                  border: "1px solid #c9a227",
                  background: "transparent",
                  color: "#c9a227",
                  borderRadius: "4px",
                  padding: "8px 16px",
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
                {lang === "fr" ? "Rejoindre la liste" : lang === "es" ? "Unirme a la lista" : "Join the list"}
              </button>
            )}
          </div>

          {/* Close "✕" Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={lang === "fr" ? "Fermer l'annonce" : lang === "es" ? "Cerrar anuncio" : "Close announcement"}
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              right: "0px",
              width: "32px",
              height: "32px",
              background: "rgba(248, 239, 226, 0.08)",
              border: "none",
              borderRadius: "50%",
              color: "rgba(248, 239, 226, 0.8)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              touchAction: "manipulation",
              transition: "all 0.15s ease",
              padding: 0,
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
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
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
              {lang === "fr"
                ? `Ouverture ${launchDateStr ? `en ${launchDateStr}` : "prochainement"}`
                : lang === "es"
                ? `Apertura ${launchDateStr ? `en ${launchDateStr}` : "próximamente"}`
                : `Opening ${launchDateStr || "Soon"}`}
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
              {lang === "fr"
                ? "Soyez la première informée de l'ouverture des adhésions."
                : lang === "es"
                ? "Sé la primera en saber cuándo abrimos membresías."
                : "Be first to know when memberships open."}
            </h3>

            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "rgba(57, 41, 42, 0.78)",
                margin: "0 0 20px",
              }}
            >
              {lang === "fr"
                ? "Les mères inscrites reçoivent des invitations avant le lancement. Pas de frais d'inscription si vous rejoignez avant l'ouverture."
                : lang === "es"
                ? "Las madres en esta lista recibirán invitaciones exclusivas de pre-lanzamiento. Sin cuota de alta si te unes antes del lanzamiento."
                : "Mothers on this list receive pre-launch invitations. No joining fee if you join before launch."}
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
                  {lang === "fr" ? "Vous êtes sur la liste." : lang === "es" ? "Ya estás en la lista." : "You're on the list."}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.6,
                    color: "rgba(57, 41, 42, 0.78)",
                    margin: "0 0 18px",
                  }}
                >
                  {lang === "fr"
                    ? "Nous vous écrirons avant l'ouverture des adhésions, et il n'y aura aucun frais d'inscription si vous rejoignez avant le lancement."
                    : lang === "es"
                    ? "Te escribiremos antes de la apertura de la membresía y no pagarás cuota de alta si te unes antes del lanzamiento."
                    : "We'll write before membership opens, and there is no joining fee if you join before launch."}
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
                  <span>
                    {lang === "fr"
                      ? "C'est tout bon ! Nous vous tiendrons au courant dès l'ouverture."
                      : lang === "es"
                      ? "¡Ya estás dentro! Te avisaremos cuando abra."
                      : "You're in! We'll let you know when it's open."}
                  </span>
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
                    {lang === "fr" ? "Fermer" : lang === "es" ? "Cerrar" : "Close"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleJoinList} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <input
                  type="email"
                  required
                  placeholder={lang === "fr" ? "Votre adresse e-mail" : lang === "es" ? "Tu correo electrónico" : "Your email address"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#c9a227";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(201, 162, 39, 0.35)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(57, 41, 42, 0.25)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
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
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
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
                    ? (lang === "fr" ? "Enregistrement..." : lang === "es" ? "Guardando..." : "Saving...")
                    : (lang === "fr" ? "Rejoindre la liste" : lang === "es" ? "Unirme a la lista" : "Join the list")}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
