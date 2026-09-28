"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";
import { updateProfileDetails } from "@/app/actions/memberAccount";

export function FirstVisitProfileModal() {
  const { data: session } = useSession();
  const { language: lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState("");
  const [neighbourhood, setNeighbourhood] = useState("");
  const [childrenAges, setChildrenAges] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only show if user is logged in and hasn't dismissed it this session
    if (session?.user) {
      const user = session.user as any;
      const dismissed = sessionStorage.getItem("tm_profile_prompt_dismissed");
      if (!dismissed && user.profileDone === false) {
        setIsOpen(true);
      }
    }
  }, [session]);

  const handleDismiss = () => {
    sessionStorage.setItem("tm_profile_prompt_dismissed", "true");
    setIsOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateProfileDetails({
        stage,
        neighbourhood,
        childrenAges,
        profileDone: true,
      });
      if (res.success) {
        setIsOpen(false);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isEn = lang === "en";

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(57, 41, 42, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 10001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#fdf8f2",
          border: "1px solid rgba(57, 41, 42, 0.2)",
          borderRadius: "8px",
          boxShadow: "0 12px 36px rgba(57, 41, 42, 0.2)",
          padding: "28px 30px",
          fontFamily: "'Lora', Georgia, serif",
          color: "#39292a",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#7b1f2c",
            }}
          >
            {isEn ? "Welcome to The Mothers" : "Bienvenida a The Mothers"}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: "none",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              color: "rgba(57, 41, 42, 0.6)",
            }}
          >
            ✕
          </button>
        </div>

        <h2
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 400,
            fontSize: "26px",
            lineHeight: 1.15,
            margin: "0 0 10px",
          }}
        >
          {isEn ? "Tell us a little about your motherhood stage." : "Cuéntanos un poco sobre tu etapa de maternidad."}
        </h2>
        <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: "0 0 20px" }}>
          {isEn
            ? "We use this only to curate events and gatherings tailored to your neighborhood and family stage."
            : "Solo usamos esto para proponerte eventos y encuentros adaptados a tu barrio y momento familiar."}
        </p>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Stage */}
          <div>
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
              {isEn ? "Stage of motherhood" : "Etapa de maternidad"}
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid rgba(57, 41, 42, 0.24)",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "14px",
                color: "#39292a",
              }}
            >
              <option value="">{isEn ? "Select your stage..." : "Selecciona tu etapa..."}</option>
              <option value="expecting">{isEn ? "Expecting (Pregnant)" : "Embarazada"}</option>
              <option value="newborn">{isEn ? "Newborn (0 - 6 months)" : "Bebé recién nacido (0 - 6 meses)"}</option>
              <option value="baby">{isEn ? "Baby (6 - 12 months)" : "Bebé (6 - 12 meses)"}</option>
              <option value="toddler">{isEn ? "Toddler (1 - 3 years)" : "Deambulador (1 - 3 años)"}</option>
              <option value="child">{isEn ? "Child (3+ years)" : "Infantil (3+ años)"}</option>
              <option value="multiple">{isEn ? "Multiple children" : "Varios hijos"}</option>
            </select>
          </div>

          {/* Neighbourhood */}
          <div>
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
              {isEn ? "Your Barcelona neighbourhood" : "Tu barrio en Barcelona"}
            </label>
            <select
              value={neighbourhood}
              onChange={(e) => setNeighbourhood(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid rgba(57, 41, 42, 0.24)",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "14px",
                color: "#39292a",
              }}
            >
              <option value="">{isEn ? "Select neighbourhood..." : "Selecciona barrio..."}</option>
              <option value="Eixample">Eixample</option>
              <option value="Gràcia">Gràcia</option>
              <option value="Poblenou">Poblenou</option>
              <option value="Sarrià-Sant Gervasi">Sarrià - Sant Gervasi</option>
              <option value="Ciutat Vella">Ciutat Vella (Born, Gòtic, Raval)</option>
              <option value="Les Corts">Les Corts</option>
              <option value="Sants-Montjuïc">Sants - Montjuïc</option>
              <option value="Sant Martí">Sant Martí</option>
              <option value="Horta-Guinardó">Horta - Guinardó</option>
              <option value="Outside BCN">{isEn ? "Outside Barcelona / Surrounding" : "Fuera de Barcelona / Alrededores"}</option>
            </select>
          </div>

          {/* Children Ages */}
          <div>
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
              {isEn ? "Children's ages (optional)" : "Edades de los hijos (opcional)"}
            </label>
            <input
              type="text"
              value={childrenAges}
              onChange={(e) => setChildrenAges(e.target.value)}
              placeholder={isEn ? "e.g. 6 months, 3 years" : "ej. 6 meses, 3 años"}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid rgba(57, 41, 42, 0.24)",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "14px",
                color: "#39292a",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                flex: 1,
                border: "1px solid rgba(57, 41, 42, 0.24)",
                backgroundColor: "transparent",
                color: "#39292a",
                borderRadius: "4px",
                padding: "11px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "14.5px",
                cursor: "pointer",
              }}
            >
              {isEn ? "Later" : "Más tarde"}
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                border: "1px solid #7b1f2c",
                backgroundColor: "#7b1f2c",
                color: "#fdf8f2",
                borderRadius: "4px",
                padding: "11px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "14.5px",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "..." : (isEn ? "Save details" : "Guardar datos")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
