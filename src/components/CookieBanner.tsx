"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  decided: boolean;
}

const STORAGE_KEY = "tm_cookie_consent_v1";

export function CookieBanner() {
  const { language: lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAnalyticsAllowed(!!parsed.analytics);
      } catch {
        setVisible(true);
      }
    } else {
      setVisible(true);
    }

    const handleOpenSettings = () => {
      setExpanded(true);
      setVisible(true);
    };

    window.addEventListener("tm_open_cookie_settings", handleOpenSettings);
    return () => window.removeEventListener("tm_open_cookie_settings", handleOpenSettings);
  }, []);

  const savePreferences = (analytics: boolean) => {
    const prefs: CookiePreferences = {
      essential: true,
      analytics,
      decided: true,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setAnalyticsAllowed(analytics);
    setVisible(false);
    setExpanded(false);
  };

  const handleAcceptAll = () => {
    savePreferences(true);
  };

  const handleEssentialOnly = () => {
    savePreferences(false);
  };

  const handleSaveChoice = () => {
    savePreferences(analyticsAllowed);
  };

  if (!mounted || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookies"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: "clamp(16px, 3vw, 32px)",
        width: "calc(100% - 32px)",
        maxWidth: "520px",
        backgroundColor: "#ffffff",
        border: "1px solid rgba(57, 41, 42, 0.16)",
        borderRadius: "8px",
        boxShadow: "0 10px 32px rgba(57, 41, 42, 0.12)",
        padding: "22px 24px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        fontFamily: "'Lora', Georgia, serif",
        color: "#39292a",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 600,
          fontSize: "20px",
          color: "#39292a",
          lineHeight: 1.2,
        }}
      >
        Cookies
      </div>

      <p
        style={{
          fontSize: "14px",
          lineHeight: "1.6",
          color: "rgba(57, 41, 42, 0.82)",
          margin: 0,
        }}
      >
        {lang === "en" ? (
          <>
            We use essential storage to keep you signed in and remember your wallet. With your permission we also use analytics to see which pages help mothers most.{" "}
            <Link
              href="/privacy"
              style={{
                color: "#7b1f2c",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              Privacy Policy
            </Link>
          </>
        ) : (
          <>
            Usamos almacenamiento esencial para mantener tu sesión activa y recordar tu saldo. Con tu permiso también usamos analítica para ver qué páginas ayudan más a las madres.{" "}
            <Link
              href="/privacy"
              style={{
                color: "#7b1f2c",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              }}
            >
              Política de Privacidad
            </Link>
          </>
        )}
      </p>

      {/* Expanded Inline Choices */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid rgba(57, 41, 42, 0.1)",
            borderBottom: "1px solid rgba(57, 41, 42, 0.1)",
            paddingTop: "10px",
            paddingBottom: "10px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontSize: "13.5px",
          }}
        >
          {/* Row 1: Essential */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: "8px",
              borderBottom: "1px solid rgba(57, 41, 42, 0.08)",
            }}
          >
            <span style={{ color: "#39292a" }}>
              {lang === "en"
                ? "Essential — sign-in, wallet, bookings"
                : "Esenciales — inicio de sesión, saldo, reservas"}
            </span>
            <span style={{ color: "rgba(57, 41, 42, 0.55)", fontSize: "13px" }}>
              {lang === "en" ? "Always on" : "Siempre activo"}
            </span>
          </div>

          {/* Row 2: Analytics */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "2px",
            }}
          >
            <span style={{ color: "#39292a" }}>
              {lang === "en"
                ? "Analytics — anonymous visit statistics"
                : "Analítica — estadísticas anónimas de visita"}
            </span>
            <input
              type="checkbox"
              checked={analyticsAllowed}
              onChange={(e) => setAnalyticsAllowed(e.target.checked)}
              style={{
                width: "17px",
                height: "17px",
                accentColor: "#7b1f2c",
                cursor: "pointer",
                margin: 0,
              }}
              aria-label={lang === "en" ? "Allow analytics cookies" : "Permitir cookies analíticas"}
            />
          </div>
        </div>
      )}

      {/* Action Buttons Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          marginTop: "2px",
        }}
      >
        <button
          type="button"
          onClick={handleAcceptAll}
          style={{
            backgroundColor: "#7b1f2c",
            color: "#ffffff",
            border: "1px solid #7b1f2c",
            borderRadius: "4px",
            padding: "8px 16px",
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "13.5px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "opacity 0.15s ease",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.9")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
        >
          {lang === "en" ? "Accept all" : "Aceptar todo"}
        </button>

        <button
          type="button"
          onClick={handleEssentialOnly}
          style={{
            backgroundColor: "#ffffff",
            color: "#39292a",
            border: "1px solid rgba(57, 41, 42, 0.28)",
            borderRadius: "4px",
            padding: "8px 16px",
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "13.5px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "rgba(57, 41, 42, 0.04)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "#ffffff")
          }
        >
          {lang === "en" ? "Essential only" : "Solo esenciales"}
        </button>

        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            style={{
              background: "none",
              border: "none",
              padding: "4px 8px",
              color: "#7b1f2c",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "13.5px",
              cursor: "pointer",
            }}
          >
            {lang === "en" ? "Choose" : "Elegir"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSaveChoice}
            style={{
              background: "none",
              border: "none",
              padding: "4px 8px",
              color: "#7b1f2c",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "13.5px",
              cursor: "pointer",
            }}
          >
            {lang === "en" ? "Save my choice" : "Guardar mi elección"}
          </button>
        )}
      </div>
    </div>
  );
}

// Utility to trigger cookie settings modal from anywhere (e.g. footer)
export function openCookieSettings() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tm_open_cookie_settings"));
  }
}

