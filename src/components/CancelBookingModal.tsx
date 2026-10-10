"use client";

import React from "react";
import { useLanguage } from "@/components/LanguageProvider";

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  eventTitle: string;
  eventStartsAt: string | Date;
  cancellationWindowHours: number;
  creditsCharged: number;
  isCancelling: boolean;
}

export function CancelBookingModal({
  isOpen,
  onClose,
  onConfirm,
  eventTitle,
  eventStartsAt,
  cancellationWindowHours,
  creditsCharged,
  isCancelling,
}: CancelBookingModalProps) {
  const { language: lang } = useLanguage();

  if (!isOpen) return null;

  const startsAt = new Date(eventStartsAt);
  const now = new Date();
  const hoursUntilStart = Math.max(0, Math.floor((startsAt.getTime() - now.getTime()) / 3600000));
  const isInsideWindow = now > new Date(startsAt.getTime() - cancellationWindowHours * 3600000);
  const isFree = creditsCharged === 0;

  const showRedWarning = !isFree && isInsideWindow;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        backgroundColor: "rgba(57, 41, 42, 0.45)",
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
          maxWidth: "440px",
          margin: "auto",
          border: showRedWarning ? "1px solid rgba(153, 56, 66, 0.3)" : "1px solid rgba(57,41,42,0.14)",
          borderRadius: "8px",
          padding: "32px 28px",
          backgroundColor: "#FEFDF9",
          boxShadow: "0 20px 50px rgba(45,43,43,0.16)",
          textAlign: "center",
        }}
      >
        {showRedWarning ? (
          <>
            <div style={{ color: "#993842", marginBottom: "12px", fontSize: "11px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>
              {lang === "en" ? "Inside the cancellation window" : "Dentro del plazo de cancelación"}
            </div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 16px", color: "#39292a" }}>
              {lang === "en" ? `Cancel and lose your ${creditsCharged} credits?` : `¿Cancelar y perder tus ${creditsCharged} créditos?`}
            </h3>
            <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.76)", margin: "0 0 16px" }}>
              {lang === "en"
                ? `“${eventTitle}” starts in ${hoursUntilStart} hours. Free cancellation ended ${cancellationWindowHours} hours before the event, so your ${creditsCharged} credits will not be refunded.`
                : `“${eventTitle}” comienza en ${hoursUntilStart} horas. La cancelación gratuita terminó ${cancellationWindowHours} horas antes del evento, por lo que tus ${creditsCharged} créditos no serán reembolsados.`}
            </p>
            <p style={{ fontSize: "13px", lineHeight: "1.5", color: "rgba(57,41,42,0.6)", margin: "0 0 24px" }}>
              {lang === "en"
                ? "If another mother takes your place, your credits come back to you."
                : "Si otra madre ocupa tu lugar, recuperarás tus créditos."}
            </p>
          </>
        ) : (
          <>
            <div style={{ color: "rgba(57,41,42,0.6)", marginBottom: "14px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="32" height="32" style={{ margin: "0 auto", display: "block" }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 10px", color: "#39292a" }}>
              {lang === "en" ? "Release your place?" : "¿Liberar tu plaza?"}
            </h3>
            <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.76)", margin: "0 0 24px" }}>
              {isFree
                ? (lang === "en" ? "Nothing to refund." : "Nada que reembolsar.")
                : (lang === "en"
                  ? `Your ${creditsCharged} credits will go straight back to your wallet.`
                  : `Tus ${creditsCharged} créditos volverán directamente a tu monedero.`)}
            </p>
          </>
        )}

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isCancelling}
            style={{
              border: showRedWarning ? "1px solid #7b1f2c" : "1px solid #39292a",
              backgroundColor: showRedWarning ? "#7b1f2c" : "#39292a",
              color: "#fdfaf5",
              padding: "10px 24px",
              borderRadius: "4px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "14.5px",
              cursor: isCancelling ? "wait" : "pointer",
            }}
          >
            {lang === "en" ? "Keep my place" : "Conservar mi plaza"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCancelling}
            style={{
              border: "1px solid rgba(57,41,42,0.3)",
              backgroundColor: "transparent",
              color: showRedWarning ? "#993842" : "#39292a",
              padding: "10px 24px",
              borderRadius: "4px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "14.5px",
              cursor: isCancelling ? "wait" : "pointer",
            }}
          >
            {isCancelling
              ? (lang === "en" ? "Processing…" : "Procesando…")
              : (showRedWarning
                ? (lang === "en" ? `Cancel and lose ${creditsCharged} credits` : `Cancelar y perder ${creditsCharged} créditos`)
                : (lang === "en" ? "Release my place" : "Liberar mi plaza"))}
          </button>
        </div>
      </div>
    </div>
  );
}
