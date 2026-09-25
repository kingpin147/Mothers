"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  decided: boolean;
}

const STORAGE_KEY = "tm_cookie_consent_v1";

export function CookieBanner() {
  const { language: lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [prefs, setPrefs] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    decided: false,
  });

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPrefs(parsed);
      } catch {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }

    // Listen for custom event from footer "Cookie settings" link
    const handleOpenSettings = () => {
      setShowSettings(true);
    };

    window.addEventListener("tm_open_cookie_settings", handleOpenSettings);
    return () => window.removeEventListener("tm_open_cookie_settings", handleOpenSettings);
  }, []);

  const saveConsent = (updated: CookiePreferences) => {
    setPrefs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      decided: true,
    });
  };

  const handleRejectAll = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      decided: true,
    });
  };

  const handleSaveCustom = () => {
    saveConsent({
      ...prefs,
      essential: true,
      decided: true,
    });
  };

  if (!mounted) return null;

  return (
    <>
      {/* 1a. Floating Bottom-Left Banner (First Visit) */}
      {showBanner && !showSettings && (
        <div
          role="dialog"
          aria-labelledby="cookie-banner-title"
          className="cookie-banner-container"
          style={{
            position: "fixed",
            left: "20px",
            bottom: "20px",
            width: "calc(100% - 40px)",
            maxWidth: "440px",
            backgroundColor: "#ffffff",
            border: "1px solid rgba(57, 41, 42, 0.2)",
            borderRadius: "8px",
            boxShadow: "0 8px 28px rgba(57, 41, 42, 0.14)",
            padding: "20px 22px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            fontFamily: "'Lora', Georgia, serif",
            color: "#39292a",
          }}
        >
          <div
            id="cookie-banner-title"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "19px",
              color: "#39292a",
            }}
          >
            {lang === "en" ? "Cookie Preferences" : "Preferencias de cookies"}
          </div>

          <p style={{ fontSize: "13.5px", lineHeight: "1.6", color: "rgba(57, 41, 42, 0.8)", margin: 0 }}>
            {lang === "en" ? (
              <>
                We use essential cookies to keep you signed in. With your permission, we'd also like to understand how the site is used and measure our announcements.{" "}
                <Link href="/legal" style={{ color: "#7b1f2c", textDecoration: "none" }}>
                  Privacy
                </Link>
              </>
            ) : (
              <>
                Utilizamos cookies esenciales para mantener tu sesión activa. Con tu permiso, también nos gustaría entender cómo se usa la web y medir nuestras publicaciones.{" "}
                <Link href="/legal" style={{ color: "#7b1f2c", textDecoration: "none" }}>
                  Privacidad
                </Link>
              </>
            )}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px",
              marginTop: "4px",
            }}
          >
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              style={{
                border: "1px solid #7b1f2c",
                backgroundColor: "transparent",
                color: "#7b1f2c",
                borderRadius: "4px",
                padding: "10px 6px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              {lang === "en" ? "Choose" : "Elegir"}
            </button>

            <button
              type="button"
              onClick={handleRejectAll}
              style={{
                border: "1px solid #7b1f2c",
                backgroundColor: "transparent",
                color: "#7b1f2c",
                borderRadius: "4px",
                padding: "10px 6px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              {lang === "en" ? "Reject all" : "Rechazar"}
            </button>

            <button
              type="button"
              onClick={handleAcceptAll}
              style={{
                border: "1px solid #7b1f2c",
                backgroundColor: "#7b1f2c",
                color: "#fdf8f2",
                borderRadius: "4px",
                padding: "10px 6px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              {lang === "en" ? "Accept all" : "Aceptar"}
            </button>
          </div>
        </div>
      )}

      {/* 1b. Choose / Cookie Settings Modal */}
      {showSettings && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-settings-title"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(57, 41, 42, 0.55)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => {
            if (prefs.decided) setShowSettings(false);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              backgroundColor: "#ffffff",
              border: "1px solid rgba(57, 41, 42, 0.2)",
              borderRadius: "8px",
              boxShadow: "0 8px 28px rgba(57, 41, 42, 0.14)",
              padding: "24px 26px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              fontFamily: "'Lora', Georgia, serif",
              color: "#39292a",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <h2
                id="cookie-settings-title"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "22px",
                  margin: 0,
                }}
              >
                {lang === "en" ? "Cookie settings" : "Preferencias de cookies"}
              </h2>
              {prefs.decided && (
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: "20px",
                    cursor: "pointer",
                    color: "#39292a",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Essential */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "12px 0", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "14.5px", marginBottom: "3px" }}>
                  {lang === "en" ? "Essential" : "Esenciales"}
                </div>
                <div style={{ fontSize: "13px", lineHeight: "1.55", color: "rgba(57, 41, 42, 0.76)" }}>
                  {lang === "en"
                    ? "Sign-in, bookings and your cookie choice. Always on."
                    : "Inicio de sesión, reservas y elección de cookies. Siempre activo."}
                </div>
              </div>
              <button
                type="button"
                disabled
                aria-label="Essential Cookies (Locked)"
                style={{
                  flex: "none",
                  width: "42px",
                  height: "24px",
                  borderRadius: "12px",
                  border: "1px solid rgba(86, 139, 5, 0.3)",
                  backgroundColor: "rgba(86, 139, 5, 0.45)",
                  position: "relative",
                  cursor: "not-allowed",
                  padding: 0,
                  marginTop: "2px",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: "20px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                  }}
                />
              </button>
            </div>

            {/* Analytics */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "12px 0", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "14.5px", marginBottom: "3px" }}>
                  {lang === "en" ? "Analytics" : "Analítica"}
                </div>
                <div style={{ fontSize: "13px", lineHeight: "1.55", color: "rgba(57, 41, 42, 0.76)" }}>
                  {lang === "en"
                    ? "Helps us see which pages mothers use, so we can improve them."
                    : "Nos ayuda a ver qué páginas utilizan las madres para mejorarlas."}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, analytics: !p.analytics }))}
                aria-label="Toggle Analytics"
                style={{
                  flex: "none",
                  width: "42px",
                  height: "24px",
                  borderRadius: "12px",
                  border: prefs.analytics ? "1px solid #568b05" : "1px solid rgba(57, 41, 42, 0.24)",
                  backgroundColor: prefs.analytics ? "#568b05" : "rgba(57, 41, 42, 0.14)",
                  position: "relative",
                  cursor: "pointer",
                  padding: 0,
                  marginTop: "2px",
                  transition: "background 0.15s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: prefs.analytics ? "20px" : "2px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    transition: "left 0.15s",
                  }}
                />
              </button>
            </div>

            {/* Marketing */}
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "12px 0", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "14.5px", marginBottom: "3px" }}>
                  {lang === "en" ? "Marketing" : "Marketing"}
                </div>
                <div style={{ fontSize: "13px", lineHeight: "1.55", color: "rgba(57, 41, 42, 0.76)" }}>
                  {lang === "en"
                    ? "Lets us measure our Instagram announcements."
                    : "Nos permite medir nuestros anuncios en Instagram."}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, marketing: !p.marketing }))}
                aria-label="Toggle Marketing"
                style={{
                  flex: "none",
                  width: "42px",
                  height: "24px",
                  borderRadius: "12px",
                  border: prefs.marketing ? "1px solid #568b05" : "1px solid rgba(57, 41, 42, 0.24)",
                  backgroundColor: prefs.marketing ? "#568b05" : "rgba(57, 41, 42, 0.14)",
                  position: "relative",
                  cursor: "pointer",
                  padding: 0,
                  marginTop: "2px",
                  transition: "background 0.15s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: prefs.marketing ? "20px" : "2px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    transition: "left 0.15s",
                  }}
                />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
              <button
                type="button"
                onClick={handleRejectAll}
                style={{
                  border: "1px solid #7b1f2c",
                  backgroundColor: "transparent",
                  color: "#7b1f2c",
                  borderRadius: "4px",
                  padding: "10px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                {lang === "en" ? "Reject all" : "Rechazar todo"}
              </button>

              <button
                type="button"
                onClick={handleSaveCustom}
                style={{
                  border: "1px solid #7b1f2c",
                  backgroundColor: "#7b1f2c",
                  color: "#fdf8f2",
                  borderRadius: "4px",
                  padding: "10px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                {lang === "en" ? "Save my choices" : "Guardar selección"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Utility to trigger cookie settings modal from anywhere (e.g. footer)
export function openCookieSettings() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tm_open_cookie_settings"));
  }
}
