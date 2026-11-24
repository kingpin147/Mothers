"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { useSession } from "next-auth/react";
import { getPublicClubSettings } from "@/app/actions/adminSettings";

export function StickyCountdownBanner() {
  const { language: lang } = useLanguage();
  const { data: session } = useSession();

  const [dismissed, setDismissed] = useState(false);
  const [membershipLive, setMembershipLive] = useState(false);
  const isMember = (session?.user as any)?.membershipStatus === "active";

  useEffect(() => {
    try {
      const closed = sessionStorage.getItem("tmp_banner_closed");
      if (closed === "1") setDismissed(true);
    } catch {}

    getPublicClubSettings().then((s) => {
      if (s.membershipLive) setMembershipLive(true);
    }).catch(() => {});
  }, []);

  const handleClose = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("tmp_banner_closed", "1");
    } catch {}
  };

  if (dismissed) return null;

  // If membership is open and user is not a member, show membership open banner
  if (membershipLive && !isMember) {
    const liveText = session?.user
      ? (lang === "fr" ? "Abonnez-vous depuis votre compte." : lang === "es" ? "Suscríbete desde tu cuenta." : "Subscribe from your account.")
      : (lang === "fr" ? "Créez un compte ou connectez-vous pour vous abonner." : lang === "es" ? "Abre una cuenta o inicia sesión para suscribirte." : "Open an account or sign in to subscribe.");

    return (
      <div
        style={{
          position: "relative",
          background: "#7b1f2c",
          color: "#fdf8f2",
          fontFamily: "'Lora', Georgia, serif",
          padding: "14px clamp(20px, 5vw, 64px)",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px 24px",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <strong
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontSize: "12px",
              color: "#f3d9a4",
            }}
          >
            {lang === "fr" ? "L'adhésion est ouverte" : lang === "es" ? "La membresía está abierta" : "Membership is open"}
          </strong>
          <span style={{ fontSize: "14.5px", color: "rgba(253, 248, 242, 0.92)" }}>{liveText}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/membership"
            style={{
              border: "1px solid #fdf8f2",
              background: "#fdf8f2",
              color: "#7b1f2c",
              padding: "8px 18px",
              borderRadius: "4px",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "15px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            {lang === "fr" ? "Devenir membre" : lang === "es" ? "Hazte socia" : "Become a member"}
          </Link>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close banner"
            style={{
              border: "none",
              background: "transparent",
              color: "rgba(253, 248, 242, 0.7)",
              cursor: "pointer",
              padding: "4px 8px",
              fontSize: "18px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // Default: For Mother Communities Banner (matching SiteHeader.dc.html & Screenshot)
  return (
    <div
      style={{
        position: "relative",
        background: "#39292a",
        color: "#f8efe2",
        fontFamily: "'Lora', Georgia, serif",
        padding: "16px calc(clamp(20px, 5vw, 64px) + 36px) 16px clamp(20px, 5vw, 64px)",
        display: "flex",
        flexWrap: "wrap",
        gap: "16px 24px",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 40,
        borderBottom: "1px solid rgba(201, 162, 39, 0.2)",
      }}
    >
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close banner"
        style={{
          position: "absolute",
          top: "50%",
          right: "clamp(8px, 2vw, 20px)",
          transform: "translateY(-50%)",
          width: "40px",
          height: "40px",
          border: "none",
          background: "transparent",
          color: "rgba(248, 239, 226, 0.72)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          borderRadius: "4px",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" width="18" height="18">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      <div style={{ flex: "1 1 320px", minWidth: "240px" }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "12px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#c9a227",
            marginBottom: "5px",
          }}
        >
          {lang === "fr"
            ? "Nouveau · Pour les communautés de mères"
            : lang === "es"
            ? "Nuevo · Para comunidades de madres"
            : "NEW · FOR MOTHER COMMUNITIES"}
        </div>
        <p style={{ fontSize: "14.5px", lineHeight: 1.55, color: "rgba(248, 239, 226, 0.9)", margin: 0, maxWidth: "60ch" }}>
          {lang === "fr"
            ? "Vous animez un groupe de mamans ? Organisez vos événements sur The Mothers — vos 2 premiers événements gratuits chaque mois sans frais."
            : lang === "es"
            ? "¿Tienes una comunidad o grupo de madres? Organiza tus eventos en The Mothers — tus 2 primeros eventos gratuitos cada mes sin coste."
            : "Run a group of mothers? Organise your events on The Mothers — your first 2 free events each month at no cost."}
        </p>
      </div>

      <Link
        href="/partner-apply"
        style={{
          flex: "none",
          display: "inline-flex",
          alignItems: "center",
          border: "1px solid #c9a227",
          color: "#f8efe2",
          borderRadius: "4px",
          padding: "10px 18px",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 600,
          fontSize: "15px",
          whiteSpace: "nowrap",
          textDecoration: "none",
          transition: "background 0.2s ease, color 0.2s ease",
        }}
      >
        {lang === "fr" ? "Proposer votre communauté" : lang === "es" ? "Trae tu comunidad" : "Bring your community"}
      </Link>
    </div>
  );
}
