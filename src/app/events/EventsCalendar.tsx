"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { buyGuestPass } from "@/app/actions/booking";
import { submitFreeWalkRsvp } from "@/app/actions/freeWalkRsvp";

export type Lang = "en" | "es";

export interface PublicEvent {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string | Date;
  endsAt?: string | Date;
  dateStr?: string;
  timeStr?: string;
  venueName?: string | null;
  venueAddress?: string | null;
  neighbourhood?: string | null;
  partnerName?: string | null;
  partnerSlug?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  categoryId?: string | null;
  stage?: string | null;
  status: string;
  creditCost: number;
  isFreeWalk?: boolean | null;
  isOnline?: boolean | null;
  isSignature?: boolean | null;
  audienceType?: string | null;
  languages?: string[] | null;
  capacityMember?: number | null;
  capacityGuest?: number | null;
  capacityTotal?: number | null;
  capacityRemaining?: number | null;
  bookedMember?: number;
  minToConfirm?: number | null;
  guestPriceCents?: number | null;
  showEventPassCta?: boolean | null;
  meetingPointNote?: string | null;
  whatsappGroupUrl?: string | null;
}

interface Props {
  events: PublicEvent[];
  categories: { id: string; name: string; slug: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isGuestPassEligible(ev: PublicEvent): boolean {
  if (ev.creditCost === 0 || ev.isFreeWalk) return false;
  if (ev.isSignature || ev.creditCost > 18) return false;
  if (ev.status === "cancelled" || ev.status === "past") return false;
  if (ev.capacityRemaining !== null && ev.capacityRemaining !== undefined && ev.capacityRemaining <= 0) return false;

  const starts = new Date(ev.startsAt);
  const now = new Date();
  const diffDays = (starts.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  // Guest window: T-14 to T-2
  const inGuestWindow = diffDays >= 2 && diffDays <= 14;

  if (ev.status === "confirmed") {
    return inGuestWindow;
  }
  if (ev.status === "published_pending" || ev.status === "pending") {
    return inGuestWindow && Boolean(ev.showEventPassCta);
  }
  return false;
}

function getCardBg(status: string): string {
  switch (status) {
    case "confirmed":         return "#e8f1e9";
    case "published_pending": return "#fff3e4";
    case "pending":           return "#fff3e4";
    case "cancelled":         return "#fbf1f1";
    case "past":              return "#dde3e6";
    default:                  return "#FEFDF9";
  }
}

function getCardBorder(status: string): string {
  switch (status) {
    case "confirmed":         return "rgba(74, 122, 80, 0.45)";
    case "published_pending": return "rgba(164, 118, 31, 0.4)";
    case "pending":           return "rgba(164, 118, 31, 0.4)";
    case "cancelled":         return "rgba(153, 56, 66, 0.28)";
    case "past":              return "rgba(96, 110, 118, 0.45)";
    default:                  return "rgba(57, 41, 42, 0.16)";
  }
}

function formatDecideByDate(startsAt: string | Date, lang: Lang): string {
  const d = new Date(startsAt);
  d.setDate(d.getDate() - 7);
  if (lang === "en") {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  } else {
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  }
}

function formatEventDate(startsAt: string | Date, lang: Lang): string {
  const d = new Date(startsAt);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const month = d.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { month: "short" });
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year} · ${time}`;
}

const modalInputStyle: React.CSSProperties = {
  minHeight: "48px",
  padding: "12px 16px",
  fontSize: "15px",
  fontFamily: "var(--font-body)",
  color: "#39292a",
  backgroundColor: "#ffffff",
  border: "1px solid rgba(57,41,42,0.22)",
  borderRadius: "5px",
  boxSizing: "border-box",
  width: "100%",
  outline: "none",
};

// ─── FreeWalkRsvpModal ────────────────────────────────────────────────────────

function FreeWalkRsvpModal({
  event: ev,
  lang,
  onClose,
}: {
  event: PublicEvent;
  lang: Lang;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUnlimited = !ev.capacityTotal || ev.isFreeWalk;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await submitFreeWalkRsvp({
        eventId: ev.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        whatsappE164: whatsapp.trim(),
      });
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || (lang === "en" ? "Something went wrong." : "Algo falló."));
      }
    } catch {
      setError(lang === "en" ? "Something went wrong." : "Algo falló.");
    } finally {
      setLoading(false);
    }
  }, [ev.id, firstName, lastName, email, whatsapp, lang]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(57, 41, 42, 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px", overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "relative", width: "100%", maxWidth: "520px", margin: "auto",
          border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px",
          padding: "clamp(28px, 5vw, 40px)", backgroundColor: "#ffffff",
          boxShadow: "0 24px 60px rgba(45,43,43,0.18)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: "18px", right: "18px",
            border: "none", background: "transparent", cursor: "pointer",
            color: "rgba(57,41,42,0.5)", width: "30px", height: "30px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        {success ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ color: "#568b05", marginBottom: "16px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" width="36" height="36" style={{ margin: "0 auto", display: "block" }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "26px", fontWeight: 600, margin: "0 0 12px", color: "#39292a" }}>
              {lang === "en" ? "You're on the list." : "Estás en la lista."}
            </h2>
            <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.72)", margin: "0 0 24px" }}>
              {lang === "en"
                ? "We will send WhatsApp confirmation and the exact starting point the day before the walk."
                : "Te enviaremos la confirmación por WhatsApp y el punto de encuentro exacto el día anterior al paseo."}
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid #7b1f2c", color: "#7b1f2c", background: "transparent",
                padding: "12px 28px", borderRadius: "4px", fontFamily: "var(--font-heading)",
                fontWeight: 600, fontSize: "15px", cursor: "pointer",
              }}
            >
              {lang === "en" ? "Got it" : "Entendido"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#568b05", marginBottom: "10px" }}>
              {lang === "en" ? "FREE WALK — OPEN TO EVERYONE" : "PASEO GRATIS — ABIERTO A TODAS"}
            </div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "26px", lineHeight: 1.2, margin: "0 0 10px", color: "#39292a" }}>
              {ev.title}
            </h2>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.68)", margin: "0 0 20px" }}>
              {isUnlimited
                ? (lang === "en"
                    ? "There is no limit on places for this one — leave your details and you are on the list straight away. We only ask so we know who is coming and where to send the meeting point."
                    : "No hay límite de plazas para este encuentro — deja tus datos y estarás en la lista directamente. Solo los pedimos para saber quién viene y enviarte el punto de encuentro.")
                : (lang === "en"
                    ? "Walks and park socials are free and open to all, but a slot has to be requested so we know who is coming. Members book first; if slots are left, they go to the open list and we confirm three days before."
                    : "Los paseos y encuentros en el parque son gratis y abiertos a todas, pero solicitamos pedir plaza para saber quién viene. Las socias reservan primero; si quedan plazas, pasan a la lista abierta y confirmamos tres días antes.")}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <input
                type="text"
                required
                placeholder={lang === "en" ? "First name" : "Nombre"}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={modalInputStyle}
              />
              <input
                type="text"
                required
                placeholder={lang === "en" ? "Surname" : "Apellido"}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={modalInputStyle}
              />
              <input
                type="email"
                required
                placeholder={lang === "en" ? "you@email.com" : "tu@correo.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ ...modalInputStyle, gridColumn: "1 / -1" }}
              />
              <input
                type="tel"
                required
                placeholder={lang === "en" ? "Phone (WhatsApp)" : "Teléfono (WhatsApp)"}
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                style={{ ...modalInputStyle, gridColumn: "1 / -1" }}
              />
            </div>

            <p style={{ fontSize: "12px", color: "rgba(57,41,42,0.6)", margin: "0 0 16px", lineHeight: 1.5 }}>
              {lang === "en"
                ? "We send the exact starting point by WhatsApp the day before, so please give the number you use there."
                : "Enviamos el punto de inicio exacto por WhatsApp el día anterior, indícanos el número que usas."}
            </p>

            <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "18px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={optIn}
                onChange={(e) => setOptIn(e.target.checked)}
                style={{ width: "16px", height: "16px", marginTop: "2px", accentColor: "#7b1f2c" }}
              />
              <span style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.78)", lineHeight: 1.45 }}>
                {lang === "en"
                  ? "Email me the dates of upcoming free walks and news from The Mothers"
                  : "Enviadme las fechas de los próximos paseos gratuitos y noticias de The Mothers"}
              </span>
            </label>

            {error && (
              <p style={{ fontSize: "13px", color: "#993842", margin: "0 0 12px" }}>{error}</p>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "18px", marginTop: "18px", borderTop: "1px solid rgba(57,41,42,0.14)" }}>
              <button
                type="button"
                onClick={onClose}
                style={{ border: "none", background: "transparent", color: "rgba(57,41,42,0.65)", fontSize: "14.5px", cursor: "pointer", padding: 0 }}
              >
                {lang === "en" ? "Not now" : "Ahora no"}
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  border: "1px solid #7b1f2c", color: "#7b1f2c", background: "transparent",
                  padding: "12px 28px", borderRadius: "4px", fontFamily: "var(--font-heading)",
                  fontWeight: 600, fontSize: "15px", cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading ? (lang === "en" ? "Joining..." : "Uniéndome...") : (lang === "en" ? "Join the open list" : "Unirme a la lista abierta")}
              </button>
            </div>

            <p style={{ fontSize: "11.5px", color: "rgba(57,41,42,0.48)", margin: "14px 0 0", textAlign: "left", lineHeight: 1.45 }}>
              {lang === "en"
                ? "We use your details for this walk and to send you the meeting point, plus the walk dates if you ticked the box. Nothing else."
                : "Usamos tus datos para este paseo y para enviarte el punto de encuentro, más las fechas si marcaste la casilla. Nada más."}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── GuestPassModal (Event Pass Step 1) ───────────────────────────────────────

function GuestPassModal({
  event: ev,
  lang,
  onClose,
}: {
  event: PublicEvent;
  lang: Lang;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [isMom, setIsMom] = useState<"yes" | "no" | null>("yes");
  const [letterAdded, setLetterAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMom === "no") return;
    setError(null);
    setLoading(true);
    try {
      const result = await buyGuestPass({
        eventId: ev.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        setError(result.error || (lang === "en" ? "Something went wrong." : "Algo falló."));
        setLoading(false);
      }
    } catch {
      setError(lang === "en" ? "Something went wrong." : "Algo falló.");
      setLoading(false);
    }
  }, [ev.id, firstName, lastName, email, isMom, lang]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(57, 41, 42, 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px", overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "relative", width: "100%", maxWidth: "520px", margin: "auto",
          border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px",
          padding: "clamp(28px, 5vw, 40px)", backgroundColor: "#ffffff",
          boxShadow: "0 24px 60px rgba(45,43,43,0.18)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: "18px", right: "18px",
            border: "none", background: "transparent", cursor: "pointer",
            color: "rgba(57,41,42,0.5)", width: "30px", height: "30px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "10px" }}>
          {lang === "en" ? "EVENT PASS" : "EVENT PASS"}
        </div>
        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "26px", lineHeight: 1.2, margin: "0 0 10px", color: "#39292a" }}>
          {ev.title}
        </h2>
        <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.68)", margin: "0 0 20px" }}>
          {lang === "en"
            ? "First time joining us? An Event Pass gets you into any event up to 18 credits. Everyone gets two, then it's membership. Signature moments stay with members."
            : "Primera vez con nosotras? Un Event Pass te da acceso a cualquier evento de hasta 18 créditos. Todas tienen dos, luego es membresía. Los momentos únicos son exclusivos de socias."}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
            <input
              type="text"
              required
              placeholder={lang === "en" ? "First name" : "Nombre"}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={modalInputStyle}
            />
            <input
              type="text"
              required
              placeholder={lang === "en" ? "Surname" : "Apellido"}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={modalInputStyle}
            />
            <input
              type="email"
              required
              placeholder={lang === "en" ? "you@email.com" : "tu@correo.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={modalInputStyle}
            />
          </div>

          <div style={{ margin: "16px 0 20px" }}>
            <div style={{ fontSize: "14px", color: "rgba(57,41,42,0.8)", marginBottom: "10px" }}>
              {lang === "en" ? "Are you a mother?" : "¿Eres madre?"}
            </div>
            <div style={{ display: "flex", gap: "24px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14.5px", color: "#39292a" }}>
                <input
                  type="radio"
                  name="mother"
                  checked={isMom === "yes"}
                  onChange={() => setIsMom("yes")}
                  style={{ width: "17px", height: "17px", accentColor: "#7b1f2c", cursor: "pointer" }}
                />
                {lang === "en" ? "Yes" : "Sí"}
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14.5px", color: "#39292a" }}>
                <input
                  type="radio"
                  name="mother"
                  checked={isMom === "no"}
                  onChange={() => setIsMom("no")}
                  style={{ width: "17px", height: "17px", accentColor: "#7b1f2c", cursor: "pointer" }}
                />
                {lang === "en" ? "No, not yet" : "No, todavía no"}
              </label>
            </div>
          </div>

          {isMom === "no" && (
            <div style={{ border: "1px solid rgba(123,31,44,0.3)", borderRadius: "6px", background: "rgba(123,31,44,0.05)", padding: "14px 16px", marginBottom: "18px" }}>
              <p style={{ fontSize: "13.5px", lineHeight: "1.55", color: "#39292a", margin: "0 0 10px" }}>
                {lang === "en"
                  ? "The Mothers exists for women who are already mothers or expecting, and every table is built around that. We can't seat you at this one — but if you are expecting, choose 'Yes' and apply: pregnancy counts."
                  : "The Mothers existe para mujeres que ya son madres o están embarazadas. No podemos reservar este evento — pero si estás esperando un bebé, elige 'Sí': el embarazo cuenta."}
              </p>
              {letterAdded ? (
                <p style={{ fontSize: "13px", color: "#456f04", margin: 0, fontWeight: 500 }}>
                  {lang === "en" ? "You're on the Letter. We'll write when there is something worth reading." : "Estás en la Carta. Te escribiremos cuando haya algo que merezca la pena leer."}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setLetterAdded(true)}
                  style={{ border: "1px solid #7b1f2c", color: "#7b1f2c", background: "transparent", padding: "8px 16px", borderRadius: "4px", fontSize: "13px", cursor: "pointer" }}
                >
                  {lang === "en" ? "Send me the Letter" : "Enviadme la Carta"}
                </button>
              )}
            </div>
          )}

          {error && (
            <p style={{ fontSize: "13px", color: "#993842", margin: "0 0 12px" }}>{error}</p>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingTop: "18px", marginTop: "18px", borderTop: "1px solid rgba(57,41,42,0.14)" }}>
            <button
              type="submit"
              disabled={loading || isMom === "no"}
              style={{
                border: "1px solid #7b1f2c", color: "#7b1f2c", background: "transparent",
                padding: "12px 28px", borderRadius: "4px", fontFamily: "var(--font-heading)",
                fontWeight: 600, fontSize: "15px", cursor: (loading || isMom === "no") ? "not-allowed" : "pointer",
                opacity: isMom === "no" ? 0.4 : 1,
              }}
            >
              {loading ? (lang === "en" ? "Processing..." : "Procesando...") : (lang === "en" ? "Continue" : "Continuar")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CeilingModal ("This one is beyond the Event Pass") ───────────────────────

function CeilingModal({
  event: ev,
  lang,
  onClose,
}: {
  event: PublicEvent | null;
  lang: Lang;
  onClose: () => void;
}) {
  if (!ev) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(57, 41, 42, 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px", overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "relative", width: "100%", maxWidth: "520px", margin: "auto",
          border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px",
          padding: "clamp(32px, 5vw, 44px)", backgroundColor: "#ffffff",
          boxShadow: "0 24px 60px rgba(45,43,43,0.18)", textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: "18px", right: "18px",
            border: "none", background: "transparent", cursor: "pointer",
            color: "rgba(57,41,42,0.5)", width: "30px", height: "30px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        {/* Maroon lock icon */}
        <div style={{ color: "#7b1f2c", marginBottom: "16px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#7b1f2c" strokeWidth="1.6" width="34" height="34" style={{ margin: "0 auto", display: "block" }}>
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>

        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "24px", margin: "0 0 14px", color: "#39292a" }}>
          {lang === "en" ? "This one is beyond the Event Pass." : "Este evento supera el Event Pass."}
        </h2>
        <p style={{ fontSize: "14px", lineHeight: "1.65", color: "rgba(57,41,42,0.72)", margin: "0 0 26px" }}>
          {lang === "en"
            ? `An Event Pass covers experiences up to 18 credits. "${ev.title}" costs ${ev.creditCost} — the richer end of the calendar, and one of the reasons members pay monthly rather than by the event. Members book it with credits; guests are welcome at anything up to 18.`
            : `Un Event Pass cubre experiencias de hasta 18 créditos. "${ev.title}" cuesta ${ev.creditCost} créditos — el extremo más exclusivo del calendario, y una de las razones por las que las socias pagan mensualmente en lugar de por evento. Las socias lo reservan con créditos; las invitadas son bienvenidas en cualquier evento de hasta 18 créditos.`}
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid rgba(57,41,42,0.3)", color: "rgba(57,41,42,0.7)",
              padding: "12px 24px", borderRadius: "4px", fontFamily: "var(--font-body)",
              fontSize: "14px", background: "transparent", cursor: "pointer",
            }}
          >
            {lang === "en" ? "Browse other events" : "Ver otros eventos"}
          </button>
          <Link
            href="/membership"
            style={{
              border: "1px solid #7b1f2c", color: "#7b1f2c", backgroundColor: "transparent",
              padding: "12px 24px", borderRadius: "4px", fontFamily: "var(--font-heading)",
              fontWeight: 600, fontSize: "15px", textDecoration: "none", display: "inline-block",
            }}
          >
            {lang === "en" ? "Explore membership" : "Explorar membresía"}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── EventCard ────────────────────────────────────────────────────────────────

interface EventCardProps {
  ev: PublicEvent;
  lang: Lang;
  onOpenGuestPass: (ev: PublicEvent) => void;
  onOpenFreeRsvp: (ev: PublicEvent) => void;
  onOpenCeiling: (ev: PublicEvent) => void;
}

function EventCard({
  ev,
  lang,
  onOpenGuestPass,
  onOpenFreeRsvp,
  onOpenCeiling,
}: EventCardProps) {
  const eligible = isGuestPassEligible(ev);
  const isCancelled = ev.status === "cancelled";
  const isPast = ev.status === "past";
  const isPending = ev.status === "published_pending" || ev.status === "pending";

  const handleBookClick = () => {
    if (ev.isFreeWalk || ev.creditCost === 0) {
      onOpenFreeRsvp(ev);
    } else if (ev.creditCost > 18 || ev.isSignature) {
      onOpenCeiling(ev);
    } else {
      window.location.href = `/account/login?callbackUrl=${encodeURIComponent(`/events/${ev.id}`)}`;
    }
  };

  return (
    <article
      style={{
        border: `1px solid ${getCardBorder(ev.status)}`,
        borderRadius: "8px",
        padding: "24px 22px",
        backgroundColor: getCardBg(ev.status),
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Top Chips Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
          {isCancelled && (
            <span style={{ fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#993842", border: "1px solid rgba(153,56,66,0.45)", background: "rgba(153,56,66,0.07)", borderRadius: "10px", padding: "3px 10px", whiteSpace: "nowrap" }}>
              {lang === "en" ? "Cancelled" : "Cancelado"}
            </span>
          )}
          <span style={{ fontSize: "11px", letterSpacing: "0.04em", color: "var(--color-accent)", border: "1px solid rgba(123,31,44,0.3)", borderRadius: "10px", padding: "3px 10px", whiteSpace: "nowrap", background: "rgba(255,255,255,0.6)" }}>
            {ev.categoryName || ev.categorySlug || "General"}
          </span>
          {ev.stage && (
            <span style={{ fontSize: "11px", letterSpacing: "0.04em", color: "rgba(57,41,42,0.62)", border: "1px solid rgba(57,41,42,0.22)", background: "rgba(255,255,255,0.6)", borderRadius: "10px", padding: "3px 10px", whiteSpace: "nowrap" }}>
              {ev.stage}
            </span>
          )}
          {ev.isSignature && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", letterSpacing: "0.05em", color: "#fdfaf5", border: "1px solid #7b1f2c", background: "#7b1f2c", borderRadius: "10px", padding: "3px 9px", whiteSpace: "nowrap" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              {lang === "en" ? "Members only" : "Solo socias"}
            </span>
          )}
          {ev.isOnline && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", letterSpacing: "0.04em", color: "rgba(57,41,42,0.6)", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "10px", padding: "3px 9px", whiteSpace: "nowrap" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11"><path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>
              {lang === "en" ? "Online" : "En línea"}
            </span>
          )}
        </div>

        {/* Credit cost */}
        <span style={{ fontSize: "12px", color: "rgba(57,41,42,0.7)", whiteSpace: "nowrap", flexShrink: 0, fontWeight: 500 }}>
          {ev.creditCost === 0 || ev.isFreeWalk
            ? (lang === "en" ? "Included / Free" : "Incluido / Gratis")
            : `${ev.creditCost} ${lang === "en" ? "credits" : "créditos"}`}
        </span>
      </div>

      {/* Title */}
      <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "19px", margin: 0, lineHeight: 1.3, color: "#39292a" }}>
        {ev.title}
      </h3>

      {/* Hosted by line */}
      {ev.partnerName && (
        <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.55)" }}>
          {lang === "en" ? "Hosted by " : "Organizado por "}
          <Link href={ev.partnerSlug ? `/partners#${ev.partnerSlug}` : "/partners"} style={{ color: "rgba(57,41,42,0.55)", textDecoration: "underline" }}>
            {ev.partnerName}
          </Link>
        </div>
      )}

      {/* Meta Info (Clean SVGs matching prototype) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "13.5px", color: "rgba(57,41,42,0.65)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
          {formatEventDate(ev.startsAt, lang)}
        </span>
        {ev.neighbourhood && (
          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" style={{ flexShrink: 0 }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
            {ev.neighbourhood}{ev.venueName ? ` · ${ev.venueName}` : ""}
          </span>
        )}
        <span style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12.5px", color: "rgba(57,41,42,0.5)", fontStyle: "italic" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="14" height="14" style={{ flexShrink: 0 }}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
          {lang === "en" ? "Exact meeting point shared once you book" : "Punto de encuentro exacto compartido tras reservar"}
        </span>
        {ev.languages && ev.languages.length > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" /></svg>
            {ev.languages.join(" · ")}
          </span>
        )}
        {ev.audienceType && (
          <span style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" style={{ flexShrink: 0 }}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>
            {ev.audienceType === "moms_only"
              ? (lang === "en" ? "Moms only" : "Solo madres")
              : (lang === "en" ? "Moms + Child" : "Madres con peques")}
          </span>
        )}
      </div>

      {/* Description */}
      {ev.description && (
        <p style={{ fontSize: "14px", lineHeight: "1.55", color: "rgba(57,41,42,0.68)", margin: 0, flex: 1 }}>
          {ev.description}
        </p>
      )}

      {/* Status Bar / Capacity & Threshold */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid rgba(57,41,42,0.12)" }}>
        {/* Confirmed Indicator */}
        {ev.status === "confirmed" && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#456f04", fontWeight: 500 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="13" height="13" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="9" />
              <path d="M8.5 12.5 11 15l4.5-5" />
            </svg>
            <span>{lang === "en" ? "Confirmed — going ahead" : "Confirmado — se realiza"}</span>
          </div>
        )}

        {isPending && ev.minToConfirm && (
          <div style={{ border: "1px solid rgba(164,118,31,0.35)", background: "#fffaf2", borderRadius: "5px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "7px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#8a6116" }}>
              <span>{lang === "en" ? `${ev.bookedMember || 0} of ${ev.minToConfirm} mothers` : `${ev.bookedMember || 0} de ${ev.minToConfirm} madres`}</span>
              <span>{lang === "en" ? `${Math.max(0, ev.minToConfirm - (ev.bookedMember || 0))} more to confirm` : `Faltan ${Math.max(0, ev.minToConfirm - (ev.bookedMember || 0))} para confirmar`}</span>
            </div>
            <div style={{ height: "4px", borderRadius: "2px", background: "rgba(57,41,42,0.14)", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#a4761f", width: `${Math.min(100, ((ev.bookedMember || 0) / ev.minToConfirm) * 100)}%` }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", color: "#8a6116" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width="12" height="12" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              <span>{lang === "en" ? `Confirms or cancels by ${formatDecideByDate(ev.startsAt, lang)}` : `Se confirma o cancela el ${formatDecideByDate(ev.startsAt, lang)}`}</span>
            </div>
            <span style={{ fontSize: "11.5px", color: "rgba(57,41,42,0.72)", fontStyle: "italic" }}>
              {lang === "en" ? "Credits are only taken if it goes ahead." : "Los créditos solo se cobran si se confirma."}
            </span>
          </div>
        )}

        {/* Capacity / Scarcity notice */}
        {!isCancelled && !isPast && (
          <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.6)" }}>
            {ev.capacityTotal ? (
              <span style={{ color: (ev.capacityRemaining !== null && ev.capacityRemaining !== undefined && ev.capacityRemaining <= 3) ? "#993842" : "rgba(57,41,42,0.6)" }}>
                {lang === "en" ? `Places left: ${ev.capacityRemaining ?? ev.capacityTotal} of ${ev.capacityTotal}` : `Plazas disponibles: ${ev.capacityRemaining ?? ev.capacityTotal} de ${ev.capacityTotal}`}
              </span>
            ) : (
              <span>{lang === "en" ? "Open list — no limit on places" : "Lista abierta — sin límite de plazas"}</span>
            )}
          </div>
        )}

        {/* Action Buttons: Single "Reserve" button on all cards (plus optional "€35 Event Pass" button when eligible) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
          {!isCancelled && !isPast && (
            <>
              {eligible && (
                <button
                  type="button"
                  onClick={() => onOpenGuestPass(ev)}
                  style={{
                    border: "1px solid #7b1f2c",
                    color: "#7b1f2c",
                    background: "transparent",
                    padding: "9px 18px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {lang === "en" ? "€35 Event Pass" : "35€ Event Pass"}
                </button>
              )}

              {/* Exact Reserve CTA */}
              <button
                type="button"
                onClick={handleBookClick}
                style={{
                  border: "1px solid #7b1f2c",
                  backgroundColor: "#7b1f2c",
                  color: "#f8efe2",
                  padding: "10px 22px",
                  borderRadius: "4px",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: "14.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 6px rgba(123,31,44,0.2)",
                }}
              >
                {lang === "en" ? "Reserve" : "Reservar"}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Main EventsCalendar Component ───────────────────────────────────────────

export function EventsCalendar({ events, categories }: Props) {
  const [lang, setLang] = useState<Lang>("en");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeDateFilter, setActiveDateFilter] = useState<string>("all");
  const [activeStatus, setActiveStatus] = useState<string>("all");

  const [guestPassEvent, setGuestPassEvent] = useState<PublicEvent | null>(null);
  const [freeRsvpEvent, setFreeRsvpEvent] = useState<PublicEvent | null>(null);
  const [ceilingEvent, setCeilingEvent] = useState<PublicEvent | null>(null);

  useEffect(() => {
    const sync = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved);
    };
    sync();
    window.addEventListener("tm_lang_change", sync);
    return () => window.removeEventListener("tm_lang_change", sync);
  }, []);

  // Category items matching prototype exactly
  const categoryChips = [
    { id: "all", labelEn: "All events", labelEs: "Todos los eventos" },
    { id: "easy", labelEn: "Easy connection", labelEs: "Conexión fácil" },
    { id: "baby", labelEn: "Play date", labelEs: "Play date" },
    { id: "evenings", labelEn: "MoM's date", labelEs: "MoM's date" },
    { id: "learn", labelEn: "Learn & Grow", labelEs: "Aprender y crecer" },
    { id: "signature", labelEn: "Signature moments", labelEs: "Momentos únicos" },
  ];

  // Calculate current month & next month names dynamically
  const now = new Date();
  const currentMonthNameEn = now.toLocaleString("en-US", { month: "long" });
  const currentMonthNameEs = now.toLocaleString("es-ES", { month: "long" });
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthNameEn = nextMonthDate.toLocaleString("en-US", { month: "long" });
  const nextMonthNameEs = nextMonthDate.toLocaleString("es-ES", { month: "long" });

  const dateChips = [
    { id: "all", labelEn: "All dates", labelEs: "Todas las fechas" },
    { id: "this_month", labelEn: `This month · ${currentMonthNameEn}`, labelEs: `Este mes · ${currentMonthNameEs}` },
    { id: "next_month", labelEn: `Next month · ${nextMonthNameEn}`, labelEs: `Próximo mes · ${nextMonthNameEs}` },
  ];

  const statusChips = [
    { id: "all", labelEn: "All", labelEs: "Todos", dotBg: "transparent", dotBorder: "rgba(57,41,42,0.3)" },
    { id: "confirmed", labelEn: "Confirmed", labelEs: "Confirmados", dotBg: "#456f04", dotBorder: "#456f04" },
    { id: "pending", labelEn: "To be confirmed", labelEs: "Por confirmar", dotBg: "#a4761f", dotBorder: "#a4761f" },
    { id: "cancelled", labelEn: "Cancelled", labelEs: "Cancelados", dotBg: "#993842", dotBorder: "#993842" },
    { id: "past", labelEn: "Past", labelEs: "Pasados", dotBg: "#8c9ba5", dotBorder: "#606e76" },
  ];

  // Filtering
  const filtered = events.filter((ev) => {
    // Category match
    if (activeCategory !== "all") {
      const catSlug = (ev.categorySlug || ev.categoryName || "").toLowerCase();
      if (activeCategory === "easy" && !catSlug.includes("easy") && !catSlug.includes("walk") && !catSlug.includes("fácil")) return false;
      if (activeCategory === "baby" && !catSlug.includes("play") && !catSlug.includes("baby")) return false;
      if (activeCategory === "evenings" && !catSlug.includes("mom") && !catSlug.includes("evening")) return false;
      if (activeCategory === "learn" && !catSlug.includes("learn") && !catSlug.includes("aprender") && !catSlug.includes("grow")) return false;
      if (activeCategory === "signature" && !catSlug.includes("signature") && !ev.isSignature) return false;
    }

    // Date match
    if (activeDateFilter === "this_month") {
      const evDate = new Date(ev.startsAt);
      if (evDate.getMonth() !== now.getMonth() || evDate.getFullYear() !== now.getFullYear()) return false;
    } else if (activeDateFilter === "next_month") {
      const evDate = new Date(ev.startsAt);
      if (evDate.getMonth() !== nextMonthDate.getMonth() || evDate.getFullYear() !== nextMonthDate.getFullYear()) return false;
    }

    // Status match
    if (activeStatus !== "all") {
      if (activeStatus === "confirmed" && ev.status !== "confirmed") return false;
      if (activeStatus === "pending" && ev.status !== "published_pending" && ev.status !== "pending") return false;
      if (activeStatus === "cancelled" && ev.status !== "cancelled") return false;
      if (activeStatus === "past" && ev.status !== "past") return false;
    }

    return true;
  });

  return (
    <div style={{ backgroundColor: "#FEFDF9", minHeight: "100vh", padding: "clamp(48px, 6vw, 88px) clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: "1160px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: "12px" }}>
            {lang === "en" ? "CALENDAR" : "CALENDARIO"}
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(34px, 5vw, 54px)", fontWeight: 400, lineHeight: 1.1, margin: "0 0 16px 0" }}>
            {lang === "en" ? "Upcoming events." : "Próximos eventos."}
          </h1>
          <p style={{ fontSize: "16px", color: "var(--color-text-muted)", maxWidth: "620px", margin: "0 auto 8px", lineHeight: 1.6 }}>
            {lang === "en"
              ? "Walks, workshops, dinners, and seasonal moments — browse what's coming up and reserve your spot."
              : "Paseos, talleres, cenas y momentos de temporada — descubre lo que viene y reserva tu plaza."}
          </p>
          <a
            href="#pass"
            onClick={(e) => {
              e.preventDefault();
              setActiveCategory("all");
              setActiveStatus("all");
            }}
            style={{ fontSize: "13.5px", color: "#7b1f2c", textDecoration: "none", fontWeight: 500 }}
          >
            {lang === "en" ? "New here? Take an Event Pass →" : "¿Nueva aquí? Consigue un Event Pass →"}
          </a>
        </div>

        {/* ─── 3 FILTER ROWS MATCHING EXACT MODEL ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "36px" }}>
          {/* Row 1: Categories */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {categoryChips.map((chip) => {
              const selected = activeCategory === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveCategory(chip.id)}
                  style={{
                    border: selected ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.22)",
                    backgroundColor: selected ? "#7b1f2c" : "transparent",
                    color: selected ? "#f8efe2" : "#39292a",
                    padding: "9px 18px",
                    borderRadius: "20px",
                    fontSize: "13.5px",
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {lang === "en" ? chip.labelEn : chip.labelEs}
                </button>
              );
            })}
          </div>

          {/* Row 2: Dates */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {dateChips.map((chip) => {
              const selected = activeDateFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveDateFilter(chip.id)}
                  style={{
                    border: selected ? "1px solid rgba(57,41,42,0.5)" : "1px solid rgba(57,41,42,0.2)",
                    backgroundColor: selected ? "rgba(57,41,42,0.08)" : "transparent",
                    color: selected ? "#39292a" : "rgba(57,41,42,0.7)",
                    padding: "7px 15px",
                    borderRadius: "20px",
                    fontSize: "12.5px",
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {lang === "en" ? chip.labelEn : chip.labelEs}
                </button>
              );
            })}
          </div>

          {/* Row 3: Status / State with Color Dots */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
            {statusChips.map((chip) => {
              const selected = activeStatus === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveStatus(chip.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    border: selected ? "1px solid rgba(57,41,42,0.5)" : "1px solid rgba(57,41,42,0.2)",
                    backgroundColor: selected ? "rgba(57,41,42,0.08)" : "transparent",
                    color: selected ? "#39292a" : "rgba(57,41,42,0.7)",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "12.5px",
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      width: "11px",
                      height: "11px",
                      borderRadius: "3px",
                      backgroundColor: chip.dotBg,
                      border: `1px solid ${chip.dotBorder}`,
                      flexShrink: 0,
                    }}
                  />
                  {lang === "en" ? chip.labelEn : chip.labelEs}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── EVENTS GRID ─── */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px", color: "var(--color-text-muted)" }}>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: "20px", margin: "0 0 8px" }}>
              {lang === "en" ? "No events match these filters." : "Ningún evento coincide con estos filtros."}
            </p>
            <p style={{ fontSize: "14px", margin: 0 }}>
              {lang === "en" ? "Try clearing some filters to see what is coming up." : "Prueba a quitar algunos filtros para ver los próximos eventos."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
            {filtered.map((ev) => (
              <EventCard
                key={ev.id}
                ev={ev}
                lang={lang}
                onOpenGuestPass={setGuestPassEvent}
                onOpenFreeRsvp={setFreeRsvpEvent}
                onOpenCeiling={(e) => setCeilingEvent(e)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}
      {guestPassEvent && (
        <GuestPassModal
          event={guestPassEvent}
          lang={lang}
          onClose={() => setGuestPassEvent(null)}
        />
      )}

      {freeRsvpEvent && (
        <FreeWalkRsvpModal
          event={freeRsvpEvent}
          lang={lang}
          onClose={() => setFreeRsvpEvent(null)}
        />
      )}

      {ceilingEvent && (
        <CeilingModal
          event={ceilingEvent}
          lang={lang}
          onClose={() => setCeilingEvent(null)}
        />
      )}
    </div>
  );
}
