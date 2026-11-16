"use client";

import React, { useState } from "react";

export interface RewardsTabProps {
  lang: "en" | "es" | "fr";
  person: {
    id: string;
    firstName: string;
    lastName: string;
    inviteCode?: string | null;
    badges?: string[] | null;
    profileDone?: boolean;
    createdBeforeLaunch?: boolean;
  };
  stats: {
    firstStepsCompleted: boolean;
    hasProfile: boolean;
    attendedFirstEvent: boolean;
    hasGazettePost: boolean;
    eventsThisMonth: number;
    earnedThisMonth: number;
    godmotherCount: number;
    lastEventTitle?: string | null;
  };
}

export function RewardsTab({ lang, person, stats }: RewardsTabProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteCode = person.inviteCode || `${person.firstName.toUpperCase()}-0001`;
  const inviteLink = `https://themothers.cc/join/${inviteCode}`;

  const t = {
    en: {
      title: "Your rewards",
      earnedThisMonth: `Earned this month: ${stats.earnedThisMonth} of 6 credits`,
      firstStepsTitle: `First steps · ${stats.firstStepsCompleted ? "done" : "+2 credits"}`,
      stepProfile: "Complete your profile",
      stepEvent: "Attend your first event",
      stepGazette: "Post or reply in La Gazette",
      regularTitle: "Regular · +1 credit a month",
      regularProgress: `${Math.min(stats.eventsThisMonth, 3)} of 3 events this month${stats.eventsThisMonth >= 3 ? " — done" : ""}`,
      godmotherTitle: "Godmother · +2 credits each",
      godmotherLine: `When a friend you invite comes to her first event, you get +2 and she gets +2. ${stats.godmotherCount > 0 ? `${stats.godmotherCount} friend${stats.godmotherCount === 1 ? "" : "s"} so far.` : "Share your card to invite her."}`,
      shareCardBtn: "Share your card",
      capNotice: "Rewards are capped at 6 credits a month. Earned credits last 6 months, work at The Mothers' events and are never refunded. Hosting rewards are separate.",
      cardTitle: stats.lastEventTitle ? `I met new mothers at ${stats.lastEventTitle}` : "Find your people in Barcelona",
      cardSub: stats.lastEventTitle
        ? "Small groups, the same faces, a host who makes the introductions. Come to the next one with me."
        : "Walks, play dates, suppers and expert sessions for mothers — come to one with me.",
      copyLinkBtn: copied ? "Link copied!" : "Copy my invite link",
      closeBtn: "Close",
    },
    es: {
      title: "Tus recompensas",
      earnedThisMonth: `Ganados este mes: ${stats.earnedThisMonth} de 6 créditos`,
      firstStepsTitle: `Primeros pasos · ${stats.firstStepsCompleted ? "completado" : "+2 créditos"}`,
      stepProfile: "Completa tu perfil",
      stepEvent: "Asiste a tu primer encuentro",
      stepGazette: "Publica o responde en La Gazette",
      regularTitle: "Asistencia regular · +1 crédito al mes",
      regularProgress: `${Math.min(stats.eventsThisMonth, 3)} de 3 encuentros este mes${stats.eventsThisMonth >= 3 ? " — completado" : ""}`,
      godmotherTitle: "Madrina · +2 créditos por amiga",
      godmotherLine: `Cuando una amiga invitada asista a su primer encuentro, tú recibes +2 y ella +2. ${stats.godmotherCount > 0 ? `${stats.godmotherCount} amiga${stats.godmotherCount === 1 ? "" : "s"} invitada${stats.godmotherCount === 1 ? "" : "s"}.` : "Comparte tu tarjeta para invitarla."}`,
      shareCardBtn: "Compartir tu tarjeta",
      capNotice: "Las recompensas tienen un límite de 6 créditos al mes. Los créditos ganados caducan a los 6 meses, son válidos en encuentros de The Mothers y no son reembolsables. Las compensaciones por ser anfitriona van aparte.",
      cardTitle: stats.lastEventTitle ? `Conocí a otras madres en ${stats.lastEventTitle}` : "Encuentra a tu tribu en Barcelona",
      cardSub: stats.lastEventTitle
        ? "Grupos pequeños, las mismas caras, una anfitriona que hace las presentaciones. Ven conmigo al próximo."
        : "Paseos, cafés, cenas y charlas con expertas para madres — ven a uno conmigo.",
      copyLinkBtn: copied ? "¡Enlace copiado!" : "Copiar mi enlace de invitación",
      closeBtn: "Cerrar",
    },
    fr: {
      title: "Vos récompenses",
      earnedThisMonth: `Gagnés ce mois-ci : ${stats.earnedThisMonth} sur 6 crédits`,
      firstStepsTitle: `Premiers pas · ${stats.firstStepsCompleted ? "terminé" : "+2 crédits"}`,
      stepProfile: "Complétez votre profil",
      stepEvent: "Participez à votre première rencontre",
      stepGazette: "Publiez ou répondez dans La Gazette",
      regularTitle: "Assiduité · +1 crédit par mois",
      regularProgress: `${Math.min(stats.eventsThisMonth, 3)} sur 3 rencontres ce mois-ci${stats.eventsThisMonth >= 3 ? " — terminé" : ""}`,
      godmotherTitle: "Marraine · +2 crédits chacune",
      godmotherLine: `Lorsqu'une amie invitée participe à sa première rencontre, vous recevez +2 et elle +2. ${stats.godmotherCount > 0 ? `${stats.godmotherCount} amie${stats.godmotherCount === 1 ? "" : "s"} parrainée${stats.godmotherCount === 1 ? "" : "s"}.` : "Partagez votre carte pour l'inviter."}`,
      shareCardBtn: "Partager votre carte",
      capNotice: "Les récompenses sont plafonnées à 6 crédits par mois. Les crédits gagnés durent 6 mois, s'appliquent aux rencontres The Mothers et ne sont pas remboursables.",
      cardTitle: stats.lastEventTitle ? `J'ai rencontré d'autres mamans à ${stats.lastEventTitle}` : "Trouvez votre tribu à Barcelone",
      cardSub: stats.lastEventTitle
        ? "Petits groupes, des visages familiers, une hôte qui fait les présentations. Viens avec moi au prochain !"
        : "Balades, cafés, dîners et ateliers bien-être pour mamans — viens avec moi à l'un d'eux.",
      copyLinkBtn: copied ? "Lien copié !" : "Copier mon lien d'invitation",
      closeBtn: "Fermer",
    },
  }[lang];

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {}
  };

  const badgeLabels: Record<string, string> = {
    founding_mother: lang === "es" ? "Madre fundadora" : lang === "fr" ? "Maman fondatrice" : "Founding mother",
    trusted_host: lang === "es" ? "Anfitriona de confianza" : lang === "fr" ? "Hôte de confiance" : "Trusted host",
    community_host: lang === "es" ? "Anfitriona de comunidad" : lang === "fr" ? "Hôte de communauté" : "Community host",
    godmother: lang === "es" ? "Madrina" : lang === "fr" ? "Marraine" : "Godmother",
  };

  const steps = [
    { label: t.stepProfile, done: stats.hasProfile },
    { label: t.stepEvent, done: stats.attendedFirstEvent },
    { label: t.stepGazette, done: stats.hasGazettePost },
  ];

  const regularPct = Math.min(100, Math.round((Math.min(stats.eventsThisMonth, 3) / 3) * 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Header with Monthly Cap counter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "10px" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", color: "#39292a", margin: 0 }}>
          {t.title}
        </h2>
        <span style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.7)", fontWeight: 500 }}>
          {t.earnedThisMonth}
        </span>
      </div>

      {/* Badges Section */}
      {person.badges && person.badges.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {person.badges.map((b) => (
            <span
              key={b}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                border: "1px solid rgba(201, 162, 39, 0.6)",
                backgroundColor: "rgba(201, 162, 39, 0.08)",
                color: "#7a5612",
                borderRadius: "14px",
                padding: "4px 12px",
                fontSize: "12.5px",
                fontWeight: 600,
              }}
            >
              <span>✦</span> {badgeLabels[b] || b}
            </span>
          ))}
        </div>
      )}

      {/* 3 Main Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: "14px" }}>
        {/* Card 1: First Steps */}
        <div style={{ border: "1px solid rgba(57, 41, 42, 0.12)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "18px 20px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", color: "#39292a", marginBottom: "10px" }}>
            {t.firstStepsTitle}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {steps.map((s, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "13.5px", color: s.done ? "rgba(57, 41, 42, 0.6)" : "#39292a" }}>
                <span
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    border: s.done ? "1px solid #568b05" : "1px solid rgba(57, 41, 42, 0.35)",
                    backgroundColor: s.done ? "#568b05" : "transparent",
                    color: "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    flexShrink: 0,
                  }}
                >
                  {s.done ? "✓" : ""}
                </span>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Regular Attendance */}
        <div style={{ border: "1px solid rgba(57, 41, 42, 0.12)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", color: "#39292a" }}>
            {t.regularTitle}
          </div>
          <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.78)" }}>
            {t.regularProgress}
          </div>
          <div style={{ height: "6px", borderRadius: "3px", backgroundColor: "rgba(57, 41, 42, 0.1)", overflow: "hidden", marginTop: "auto" }}>
            <div style={{ height: "100%", width: `${regularPct}%`, backgroundColor: "#568b05", transition: "width 0.3s ease" }} />
          </div>
        </div>

        {/* Card 3: Godmother Referral */}
        <div style={{ border: "1px solid rgba(57, 41, 42, 0.12)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "18px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", color: "#39292a" }}>
            {t.godmotherTitle}
          </div>
          <div style={{ fontSize: "13px", lineHeight: 1.5, color: "rgba(57, 41, 42, 0.78)" }}>
            {t.godmotherLine}
          </div>
          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            style={{
              alignSelf: "flex-start",
              border: "1px solid #7b1f2c",
              backgroundColor: "transparent",
              color: "#7b1f2c",
              borderRadius: "4px",
              padding: "7px 14px",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              marginTop: "auto",
              transition: "background 0.15s ease",
            }}
          >
            {t.shareCardBtn}
          </button>
        </div>
      </div>

      {/* Monthly Cap Disclaimer */}
      <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57, 41, 42, 0.66)", backgroundColor: "#fdfbf8", padding: "12px 16px", borderRadius: "6px", border: "1px solid rgba(57, 41, 42, 0.08)" }}>
        {t.capNotice}
      </div>

      {/* Share Card Modal (§14 / RW-06) */}
      {shareModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShareModalOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            backgroundColor: "rgba(32, 24, 24, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fffdfa",
              borderRadius: "10px",
              maxWidth: "400px",
              width: "100%",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "0 18px 48px rgba(32, 31, 29, 0.25)",
            }}
          >
            {/* Visual Invitation Card Preview */}
            <div
              style={{
                borderRadius: "8px",
                border: "1px solid rgba(123, 31, 44, 0.2)",
                backgroundColor: "#fcf8f2",
                padding: "22px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#7b1f2c", fontWeight: 600 }}>
                The Mothers · Barcelona
              </div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#39292a", margin: "4px 0" }}>
                {t.cardTitle}
              </h3>
              <p style={{ fontSize: "13px", lineHeight: 1.5, color: "rgba(57, 41, 42, 0.75)", margin: 0 }}>
                {t.cardSub}
              </p>
              <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#ffffff", borderRadius: "4px", border: "1px dashed rgba(57, 41, 42, 0.2)", fontFamily: "monospace", fontSize: "13px", fontWeight: 600, color: "#39292a" }}>
                themothers.cc/join/{inviteCode}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                style={{
                  flex: 1,
                  border: "1px solid rgba(57, 41, 42, 0.2)",
                  backgroundColor: "#ffffff",
                  padding: "10px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                {t.closeBtn}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  flex: 2,
                  border: "none",
                  backgroundColor: copied ? "#568b05" : "#7b1f2c",
                  color: "#ffffff",
                  padding: "10px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
              >
                {t.copyLinkBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
