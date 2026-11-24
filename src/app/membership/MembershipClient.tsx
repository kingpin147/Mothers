"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageProvider";
import { useSession } from "next-auth/react";
import { getPublicClubSettings } from "@/app/actions/adminSettings";

interface MembershipClientProps {
  initialWindowOpen?: boolean;
  initialSpotsRemaining?: number;
  nextWindowDate?: string | null;
  autoOpenApply?: boolean;
  publicSettings?: any;
}

export default function MembershipClient({
  publicSettings,
}: MembershipClientProps = {}) {
  const router = useRouter();
  const { language: lang } = useLanguage();
  const { data: session } = useSession();
  const waysRailRef = useRef<HTMLDivElement>(null);

  const [membershipLive, setMembershipLive] = useState<boolean>(true); // Membership is open now
  const [waitlisted, setWaitlisted] = useState<boolean>(false);

  useEffect(() => {
    getPublicClubSettings().then((s) => {
      // If setting explicitly exists in database, respect it, otherwise default to true (open)
      if (typeof s?.membershipLive === "boolean") {
        setMembershipLive(s.membershipLive);
      }
    }).catch(() => {});
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

  const handleJoinPlan = (plan: "annual" | "monthly" | "free") => {
    if (plan === "free") {
      if (session?.user) {
        router.push("/account");
      } else {
        router.push("/account/login?mode=register");
      }
      return;
    }

    if (session?.user) {
      router.push(`/account?tab=membership&plan=${plan}`);
    } else {
      router.push(`/account/login?mode=register&next=${encodeURIComponent(`/account?tab=membership&plan=${plan}`)}`);
    }
  };

  // Translations
  const t = {
    kicker: lang === "fr" ? "Adhésion · ouverte maintenant" : lang === "es" ? "Membresía · abierta ahora" : "Membership · open now",
    title: lang === "fr" ? "Choisissez votre formule." : lang === "es" ? "Elige cómo unirte." : "Choose how you join.",
    intro: lang === "fr"
      ? "Chaque événement reste ouvert à chaque mère. L'adhésion ajoute des avantages, des événements réservés aux membres et des échanges illimités dans Le Forum — dès 6,99 € par mois."
      : lang === "es"
      ? "Cada evento permanece abierto a todas las madres. La membresía añade ventajas, eventos exclusivos y publicaciones ilimitadas en El Foro — desde 6,99 € al mes."
      : "Every event stays open to every mother. Membership adds perks, members-only events and unlimited posting in The Forum — from €6.99 a month.",
    noFeeNote: lang === "fr"
      ? "Sans frais d'inscription. Résiliable à tout moment depuis votre compte. Les membres mensuelles peuvent mettre leur abonnement en pause jusqu'à 2 mois par an. Les événements sont toujours payés séparément, avec des crédits (2 € l'unité) — le même tarif pour toutes."
      : lang === "es"
      ? "Sin cuota de alta. Cancela en cualquier momento desde tu cuenta. Las socias mensuales pueden pausar hasta 2 meses al año. Los eventos se pagan siempre aparte con créditos (2 € cada uno) — el mismo precio para todas."
      : "No joining fee. Cancel any time, from your account. Monthly members can pause for up to two months a year. Events are always paid separately, with credits (€2 each) — the same price for everyone.",
    fiveWaysKicker: lang === "fr" ? "Ce qui est inclus" : lang === "es" ? "Qué incluye" : "What's included",
    fiveWaysTitle: lang === "fr" ? "Cinq façons de se retrouver." : lang === "es" ? "Cinco formas de conectar." : "Five ways to connect.",
    fiveWaysIntro: lang === "fr"
      ? "Les essentiels inclus vous donnent un point de départ. Les crédits débloquent le reste — chaque événement indique son tarif en crédits dans le calendrier."
      : lang === "es"
      ? "Los esenciales incluidos te dan un punto de partida. Los créditos desbloquean el resto — cada evento muestra su precio en créditos en el calendario."
      : "Included essentials give you a place to start. Credits unlock everything else — each event shows its own credit price on the calendar.",
    forumKicker: lang === "fr" ? "Le Forum" : lang === "es" ? "El Foro" : "The Forum",
    forumTitle: lang === "fr" ? "Entre deux rencontres, la conversation continue." : lang === "es" ? "Entre evento y evento, la conversación continúa." : "Between events, the conversation keeps going.",
    forumDesc: lang === "fr"
      ? "Demander un conseil à 3h du matin, partager une victoire, trouver une mère dans votre rue. Le Forum est ouvert à la lecture dès aujourd'hui."
      : lang === "es"
      ? "Pide consejo a las 3:00 de la madrugada, comparte un logro, encuentra a una madre de tu misma calle. El Foro está abierto para leer hoy."
      : "Ask for advice at 3:00 AM, share a win, find the mother down the street. The Forum is open to read today.",
    visitForum: lang === "fr" ? "Accéder au Forum" : lang === "es" ? "Visitar El Foro" : "Visit The Forum",
  };

  const ways = [
    {
      tag: lang === "fr" ? "Généralement inclus" : lang === "es" ? "Mayormente incluido" : "Mostly included",
      tagColor: "#3b5e04",
      tagBorder: "rgba(86,139,5,0.45)",
      tagBg: "rgba(86,139,5,0.08)",
      title: "Easy connection",
      body: lang === "fr" ? "Promenades, rencontres au parc & rendez-vous avec hôtesse." : lang === "es" ? "Paseos, encuentros en el parque y quedadas con anfitriona." : "Walks, park socials & hosted meetups.",
    },
    {
      tag: lang === "fr" ? "Crédits" : lang === "es" ? "Créditos" : "Credits",
      tagColor: "#7b1f2c",
      tagBorder: "rgba(123,31,44,0.35)",
      tagBg: "transparent",
      title: "Play date",
      body: lang === "fr" ? "Yoga, massage, musique — votre enfant juste à vos côtés." : lang === "es" ? "Yoga, masaje, música — tu peque justo a tu lado." : "Yoga, massage, music — your child right beside you.",
    },
    {
      tag: lang === "fr" ? "Crédits" : lang === "es" ? "Créditos" : "Credits",
      tagColor: "#7b1f2c",
      tagBorder: "rgba(123,31,44,0.35)",
      tagBg: "transparent",
      title: "Mother's date",
      body: lang === "fr" ? "Dîners, bien-être, culture — une femme avant tout." : lang === "es" ? "Cenas, bienestar, cultura — una mujer en primer lugar." : "Dinners, wellness, culture — a woman first.",
    },
    {
      tag: lang === "fr" ? "Crédits" : lang === "es" ? "Créditos" : "Credits",
      tagColor: "#7b1f2c",
      tagBorder: "rgba(123,31,44,0.35)",
      tagBg: "transparent",
      title: "Learn & Grow",
      body: lang === "fr" ? "Rencontres d'expertes, ateliers et masterclasses." : lang === "es" ? "Charlas con expertas, talleres y masterclasses." : "Expert talks, workshops, and masterclasses.",
    },
    {
      tag: lang === "fr" ? "Crédits" : lang === "es" ? "Créditos" : "Credits",
      tagColor: "#7b1f2c",
      tagBorder: "rgba(123,31,44,0.35)",
      tagBg: "transparent",
      title: "Signature moments",
      body: lang === "fr" ? "Moments de saison et séances individuelles avec expertes." : lang === "es" ? "Momentos especiales y sesiones 1:1 con expertas." : "Seasonal moments and 1:1 expert sessions.",
    },
  ];

  return (
    <div style={{ backgroundColor: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      {/* ─── SECTION 1: MEMBERSHIP PLANS (3 CARDS) ─── */}
      <section style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(38px, 5vw, 70px) clamp(20px, 5vw, 64px) clamp(30px, 4vw, 48px)" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto clamp(26px, 3.4vw, 40px)", textAlign: "center" }}>
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
            {t.kicker}
          </div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.6vw, 56px)",
              lineHeight: 1.06,
              margin: "0 0 14px",
              textWrap: "pretty",
            }}
          >
            {t.title}
          </h1>
          <p
            style={{
              fontSize: "17px",
              lineHeight: 1.6,
              color: "rgba(57,41,42,0.74)",
              margin: "0 auto",
              maxWidth: "52ch",
              textWrap: "pretty",
            }}
          >
            {t.intro}
          </p>
        </div>

        {/* 3 Plans Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
            gap: "20px",
            alignItems: "stretch",
          }}
        >
          {/* Plan 1: Annual (Burgundy, Best value) */}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              border: "1px solid #7b1f2c",
              borderRadius: "8px",
              background: "#7b1f2c",
              color: "#f8efe2",
              padding: "clamp(24px, 2.8vw, 34px)",
              boxShadow: "0 14px 34px rgba(57, 41, 42, 0.18)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-12px",
                left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                fontSize: "11px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#f8efe2",
                background: "#568b05",
                borderRadius: "12px",
                padding: "5px 14px",
                fontWeight: 600,
              }}
            >
              {lang === "fr" ? "Meilleure valeur" : lang === "es" ? "Mejor opción" : "Best value"}
            </div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "26px",
                lineHeight: 1.15,
                margin: "4px 0 14px",
                textAlign: "center",
              }}
            >
              {lang === "fr" ? "Annuel" : lang === "es" ? "Anual" : "Annual"}
            </h2>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "6px" }}>
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 400,
                  fontSize: "clamp(46px, 5vw, 56px)",
                  lineHeight: 0.95,
                  fontFeatureSettings: "'tnum'",
                }}
              >
                €69
              </span>
              <span style={{ fontSize: "14.5px", opacity: 0.85 }}>
                {lang === "fr" ? "/ an" : lang === "es" ? "/ año" : "/ year"}
              </span>
            </div>
            <div style={{ textAlign: "center", fontSize: "13px", opacity: 0.8, margin: "6px 0 0", minHeight: "19px" }}>
              {lang === "fr" ? "5,75 € par mois · économisez 14,88 €" : lang === "es" ? "5,75 € al mes · ahorra 14,88 €" : "€5.75 a month · save €14.88"}
            </div>
            <div style={{ borderTop: "1px solid rgba(248,239,226,0.25)", margin: "18px 0 14px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
              {[
                { text: lang === "fr" ? "10 crédits événements inclus (valeur 20 €)" : lang === "es" ? "10 créditos de eventos incluidos (valor 20 €)" : "10 event credits included (worth €20)", bold: true },
                { text: lang === "fr" ? "Avantages mensuels partenaires" : lang === "es" ? "Ventajas mensuales con partners" : "Monthly partner perks" },
                { text: lang === "fr" ? "Un ou deux événements réservés aux membres par mois" : lang === "es" ? "Uno o dos eventos exclusivos de socias al mes" : "One or two members-only events a month" },
                { text: lang === "fr" ? "Publications illimitées dans Le Forum" : lang === "es" ? "Publicaciones ilimitadas en El Foro" : "Unlimited posting in The Forum" },
                { text: lang === "fr" ? "Cadeau de bienvenue" : lang === "es" ? "Regalo de bienvenida" : "Welcome gift" },
                { text: lang === "fr" ? "La lettre mensuelle" : lang === "es" ? "La carta mensual" : "The monthly letter" },
              ].map((it, idx) => (
                <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#f3d9a1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ flex: "none", marginTop: "3px" }}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="m8 12 3 3 5-6" />
                  </svg>
                  <span style={{ fontSize: "14.5px", lineHeight: 1.5, fontWeight: it.bold ? 600 : 400 }}>{it.text}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleJoinPlan("annual")}
              style={{
                marginTop: "22px",
                width: "100%",
                border: "1px solid #f8efe2",
                background: "#f8efe2",
                color: "#7b1f2c",
                borderRadius: "4px",
                padding: "13px 16px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "16.5px",
                cursor: "pointer",
                transition: "opacity 0.15s ease",
              }}
            >
              {lang === "fr" ? "Devenir membre" : lang === "es" ? "Hazte socia" : "Become a member"}
            </button>
            <div style={{ textAlign: "center", fontSize: "12.5px", opacity: 0.75, marginTop: "10px", minHeight: "18px" }}>
              {lang === "fr" ? "Les crédits sont valables six mois" : lang === "es" ? "Los créditos caducan a los seis meses" : "Credits last six months"}
            </div>
          </div>

          {/* Plan 2: Monthly */}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              border: "1px solid rgba(57,41,42,0.18)",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#39292a",
              padding: "clamp(24px, 2.8vw, 34px)",
              boxShadow: "none",
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "26px",
                lineHeight: 1.15,
                margin: "4px 0 14px",
                textAlign: "center",
              }}
            >
              {lang === "fr" ? "Mensuel" : lang === "es" ? "Mensual" : "Monthly"}
            </h2>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "6px" }}>
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 400,
                  fontSize: "clamp(46px, 5vw, 56px)",
                  lineHeight: 0.95,
                  fontFeatureSettings: "'tnum'",
                }}
              >
                €6.99
              </span>
              <span style={{ fontSize: "14.5px", opacity: 0.8 }}>
                {lang === "fr" ? "/ mois" : lang === "es" ? "/ mes" : "/ month"}
              </span>
            </div>
            <div style={{ textAlign: "center", fontSize: "13px", opacity: 0.75, margin: "6px 0 0", minHeight: "19px" }}>
              {lang === "fr" ? "Sans engagement · Annulable à tout moment" : lang === "es" ? "Cancela en cualquier momento" : "Cancel any time"}
            </div>
            <div style={{ borderTop: "1px solid rgba(57,41,42,0.14)", margin: "18px 0 14px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
              {[
                { text: lang === "fr" ? "Avantages mensuels partenaires" : lang === "es" ? "Ventajas mensuales con partners" : "Monthly partner perks" },
                { text: lang === "fr" ? "Un ou deux événements réservés aux membres par mois" : lang === "es" ? "Uno o dos eventos exclusivos de socias al mes" : "One or two members-only events a month" },
                { text: lang === "fr" ? "Publications illimitées dans Le Forum" : lang === "es" ? "Publicaciones ilimitadas en El Foro" : "Unlimited posting in The Forum" },
                { text: lang === "fr" ? "Cadeau de bienvenue" : lang === "es" ? "Regalo de bienvenida" : "Welcome gift" },
                { text: lang === "fr" ? "La lettre mensuelle" : lang === "es" ? "La carta mensual" : "The monthly letter" },
                { text: lang === "fr" ? "Possibilité de pause jusqu'à 2 mois par an" : lang === "es" ? "Pausa hasta dos meses al año" : "Pause up to two months a year" },
              ].map((it, idx) => (
                <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#7b1f2c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ flex: "none", marginTop: "3px" }}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="m8 12 3 3 5-6" />
                  </svg>
                  <span style={{ fontSize: "14.5px", lineHeight: 1.5 }}>{it.text}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleJoinPlan("monthly")}
              style={{
                marginTop: "22px",
                width: "100%",
                border: "1px solid #7b1f2c",
                background: "transparent",
                color: "#7b1f2c",
                borderRadius: "4px",
                padding: "13px 16px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "16.5px",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              {lang === "fr" ? "Devenir membre" : lang === "es" ? "Hazte socia" : "Become a member"}
            </button>
            <div style={{ textAlign: "center", fontSize: "12.5px", opacity: 0.72, margin: "10px 0 0", minHeight: "18px" }} />
          </div>

          {/* Plan 3: Free account */}
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              border: "1px solid rgba(57,41,42,0.18)",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#39292a",
              padding: "clamp(24px, 2.8vw, 34px)",
              boxShadow: "none",
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "26px",
                lineHeight: 1.15,
                margin: "4px 0 14px",
                textAlign: "center",
              }}
            >
              {lang === "fr" ? "Compte gratuit" : lang === "es" ? "Cuenta gratuita" : "Free account"}
            </h2>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "6px" }}>
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 400,
                  fontSize: "clamp(46px, 5vw, 56px)",
                  lineHeight: 0.95,
                  fontFeatureSettings: "'tnum'",
                }}
              >
                {lang === "fr" ? "Gratuit" : lang === "es" ? "Gratis" : "Free"}
              </span>
            </div>
            <div style={{ textAlign: "center", fontSize: "13px", opacity: 0.75, margin: "6px 0 0", minHeight: "19px" }}>
              {lang === "fr" ? "Événements uniquement" : lang === "es" ? "Solo eventos" : "Events only"}
            </div>
            <div style={{ borderTop: "1px solid rgba(57,41,42,0.14)", margin: "18px 0 14px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
              {[
                { text: lang === "fr" ? "Réserver n'importe quel événement avec des crédits" : lang === "es" ? "Reserva cualquier evento con créditos" : "Book any event with credits" },
                { text: lang === "fr" ? "Lire Le Forum et publier jusqu'à 3 messages" : lang === "es" ? "Lee El Foro y publica hasta 3 veces" : "Read The Forum and post 3 times" },
                { text: lang === "fr" ? "Messages privés avec d'autres mères" : lang === "es" ? "Mensajes privados con otras madres" : "Private messages with other mothers" },
                { text: lang === "fr" ? "La lettre mensuelle" : lang === "es" ? "La carta mensual" : "The monthly letter" },
              ].map((it, idx) => (
                <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#7b1f2c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" style={{ flex: "none", marginTop: "3px" }}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="m8 12 3 3 5-6" />
                  </svg>
                  <span style={{ fontSize: "14.5px", lineHeight: 1.5 }}>{it.text}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleJoinPlan("free")}
              style={{
                marginTop: "22px",
                width: "100%",
                border: "1px solid rgba(57,41,42,0.35)",
                background: "transparent",
                color: "#39292a",
                borderRadius: "4px",
                padding: "13px 16px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "16.5px",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              {session?.user
                ? (lang === "fr" ? "Aller à mon compte" : lang === "es" ? "Ir a mi cuenta" : "Go to my account")
                : (lang === "fr" ? "Ouvrir un compte gratuit" : lang === "es" ? "Abrir cuenta gratuita" : "Open a free account")}
            </button>
            <div style={{ textAlign: "center", fontSize: "12.5px", opacity: 0.72, margin: "10px 0 0", minHeight: "18px" }} />
          </div>
        </div>

        {/* Guarantee and pricing note */}
        <p
          style={{
            textAlign: "center",
            fontSize: "13.5px",
            lineHeight: 1.6,
            color: "rgba(57,41,42,0.66)",
            margin: "24px auto 0",
            maxWidth: "72ch",
          }}
        >
          {t.noFeeNote}
        </p>
      </section>

      {/* ─── SECTION 2: FIVE WAYS TO CONNECT RAIL ─── */}
      <section style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(24px, 3vw, 36px) clamp(20px, 5vw, 64px)", borderTop: "1px solid rgba(57,41,42,0.16)" }}>
        <div style={{ maxWidth: "700px", margin: "0 0 20px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "10px" }}>
            {t.fiveWaysKicker}
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "clamp(26px, 3.4vw, 38px)", lineHeight: 1.15, margin: "0 0 12px" }}>
            {t.fiveWaysTitle}
          </h2>
          <p style={{ fontSize: "16px", lineHeight: 1.65, color: "rgba(57,41,42,0.7)", margin: 0 }}>
            {t.fiveWaysIntro}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", margin: "-8px 0 16px" }}>
          <button
            type="button"
            onClick={handlePrevWay}
            aria-label="Previous"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "1px solid rgba(57,41,42,0.25)",
              background: "#ffffff",
              color: "#39292a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M19 12H5M11 18l-6-6 6-6" />
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
              border: "1px solid rgba(57,41,42,0.25)",
              background: "#ffffff",
              color: "#39292a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        {/* Ways Rail */}
        <div
          ref={waysRailRef}
          id="ways-rail"
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
        >
          {ways.map((w, idx) => (
            <div
              key={idx}
              style={{
                flex: "0 0 min(82%, 280px)",
                scrollSnapAlign: "start",
                border: "1px solid rgba(57,41,42,0.18)",
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
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "20px", margin: 0, lineHeight: 1.25 }}>
                {w.title}
              </h3>
              <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.74)", margin: 0 }}>
                {w.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SECTION 3: THE FORUM HIGHLIGHT ─── */}
      <section style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px)", borderTop: "1px solid rgba(57,41,42,0.16)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "clamp(28px, 4vw, 52px)", alignItems: "center" }}>
          <div style={{ flex: "1 1 360px", minWidth: "280px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "10px" }}>
              {t.forumKicker}
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.12, margin: "0 0 14px" }}>
              {t.forumTitle}
            </h2>
            <p style={{ fontSize: "16px", lineHeight: 1.65, color: "rgba(57,41,42,0.74)", margin: "0 0 20px", maxWidth: "50ch" }}>
              {t.forumDesc}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <Link
                href="/forum"
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
                {t.visitForum}
              </Link>
            </div>
          </div>

          <div style={{ flex: "1 1 360px", minWidth: "280px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#ffffff", padding: "18px 20px", display: "flex", gap: "13px", alignItems: "flex-start", minHeight: "128px", boxSizing: "border-box" }}>
              <div style={{ flex: "none", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(57,41,42,0.07)", border: "1px solid rgba(57,41,42,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px", color: "rgba(57,41,42,0.6)" }}>
                ·
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "baseline", marginBottom: "5px" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15.5px" }}>
                    {lang === "fr" ? "Une mère à Gràcia" : lang === "es" ? "Una madre en Gràcia" : "A mother in Gràcia"}
                  </span>
                  <span style={{ fontSize: "12px", color: "rgba(57,41,42,0.66)" }}>Postpartum</span>
                </div>
                <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                  {lang === "fr"
                    ? "Six mois après et je me sens toujours comme une étrangère pour moi-même. Cela s'est-il estompé pour vous, et quand ?"
                    : lang === "es"
                    ? "Seis meses después y todavía me siento una extraña para mí misma. ¿Se os pasó esta sensación, y cuándo?"
                    : "Six months in and I still feel like a stranger to myself. Did this lift for you, and when?"}
                </p>
                <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.66)", margin: "8px 0 0", display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg viewBox="0 0 24 24" fill="#7b1f2c" stroke="#7b1f2c" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" style={{ flex: "none" }}>
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                  34 · 2 {lang === "fr" ? "réponses" : lang === "es" ? "respuestas" : "replies"}
                </div>
              </div>
            </div>

            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#ffffff", padding: "18px 20px", display: "flex", gap: "13px", alignItems: "flex-start", minHeight: "128px", boxSizing: "border-box" }}>
              <div style={{ flex: "none", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(123,31,44,0.09)", border: "1px solid rgba(123,31,44,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px", color: "#7b1f2c" }}>
                N
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "baseline", marginBottom: "5px" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15.5px" }}>Núria B.</span>
                  <span style={{ fontSize: "12px", color: "rgba(57,41,42,0.66)" }}>{lang === "fr" ? "a répondu" : lang === "es" ? "respondió" : "replied"}</span>
                </div>
                <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                  {lang === "fr"
                    ? "Au bout de neuf mois pour moi, et très progressivement plutôt que d'un coup. Tu n'es pas seule là-dedans."
                    : lang === "es"
                    ? "En el noveno mes en mi caso, y poco a poco más que de golpe. No estás sola en esto."
                    : "Month nine for me, and slowly rather than all at once. You are not alone in this."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
