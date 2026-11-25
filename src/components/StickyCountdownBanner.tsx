"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export function StickyCountdownBanner() {
  const { language: lang } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const closed = sessionStorage.getItem("tmp_banner_closed");
      if (closed === "1") setDismissed(true);
    } catch {}
  }, []);

  const handleClose = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissed(true);
    try {
      sessionStorage.setItem("tmp_banner_closed", "1");
    } catch {}
  };

  if (dismissed) return null;

  // Exact dark brown banner matching client reference (Image 2)
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
          background: "transparent",
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
