"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { buyGuestPass, buyExtraCredits, bookEvent } from "@/app/actions/booking";
import { submitFreeWalkRsvp } from "@/app/actions/freeWalkRsvp";
import { useLanguage } from "@/components/LanguageProvider";

export type Lang = "en" | "es";

export const getLanguageLabel = (code: string, currentLang: "en" | "es") => {
  const mapping: Record<string, { en: string; es: string }> = {
    en: { en: "English", es: "Inglés" },
    es: { en: "Spanish", es: "Español" },
    fr: { en: "French", es: "Francés" },
    ca: { en: "Catalan", es: "Catalán" },
  };
  return mapping[code.toLowerCase()] ? mapping[code.toLowerCase()][currentLang] : code;
};

export interface PublicEvent {
  id: string;
  slug?: string | null;
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
  placesTaken?: number;
  bookedMember?: number;
  isFull?: boolean;
  minToConfirm?: number | null;
  guestPriceCents?: number | null;
  showEventPassCta?: boolean | null;
  meetingPointNote?: string | null;
  whatsappGroupUrl?: string | null;
  guestOpenAt?: string | Date | null;
  guestCloseAt?: string | Date | null;
  childcare?: string | null;
  cancelReason?: string | null;
  userStatus?: {
    isBooked?: boolean;
    isRefunded?: boolean;
    bookedAt?: string | Date;
    refundedAt?: string | Date | null;
    creditsCharged?: number;
    isWaitlisted?: boolean;
    waitlistPosition?: number;
    waitlistCreatedAt?: string | Date;
  } | null;
}

interface Props {
  events: PublicEvent[];
  categories: { id: string; name: string; slug: string }[];
  creditBalance?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Normalise raw DB stage value → canonical display label
function getStageLabel(raw: string | null | undefined, lang: Lang): string {
  if (!raw) return "";
  const s = raw.toLowerCase();
  if (s.includes("pregnant") || s.includes("embaraz")) return lang === "en" ? "Pregnant" : "Embarazada";
  if (s.includes("postpartum") || s.includes("posparto") || s.includes("0") || s.includes("babies") || s.includes("baby") || s.includes("0–12") || s.includes("0-12")) return lang === "en" ? "Babies" : "Bebés";
  if (s.includes("toddler") || s.includes("peque") || s.includes("1–3") || s.includes("1-3") || s.includes("primera infancia")) return lang === "en" ? "Toddlers" : "Peques";
  if (s.includes("big") || s.includes("grande") || s.includes("10+") || s.includes("6–10") || s.includes("6-10") || s.includes("6+")) return lang === "en" ? "Big kids" : "Niños grandes";
  if (s.includes("children") || s.includes("child") || s.includes("primary") || s.includes("escolar") || s.includes("3–") || s.includes("3-") || s.includes("4–") || s.includes("4-") || s.includes("niño")) return lang === "en" ? "Children" : "Niños";
  if (s.includes("mom") || s.includes("madre") || s.includes("kid") || s.includes("peque") || s.includes("adult") || s.includes("welcome") || s.includes("bienvenido")) return "";
  return raw; // fallback: show as-is
}

const EVENT_I18N: Record<string, { esTitle: string; esDesc: string }> = {
  "summer supper in the courtyard": {
    esTitle: "Momento especial — Cena de verano en el patio",
    esDesc: "Una mesa larga bajo la higuera, un solo menú, sin móviles. Nuestra primera cena del verano.",
  },
  "morning walk — ciutadella park": {
    esTitle: "Paseo matutino — Parque de la Ciutadella",
    esDesc: "Un paseo tranquilo con carrito por el parque, seguido de un café cerca.",
  },
  "park social — turó park lawn": {
    esTitle: "Encuentro en el parque — Césped del Turó Park",
    esDesc: "Mantas en la hierba, algo para compartir y ningún horario — ven diez minutos o quédate hasta que se vaya la luz.",
  },
  "play date — postnatal yoga": {
    esTitle: "Play date — Yoga posparto",
    esDesc: "Yoga posparto suave con tu bebé a tu lado, guiado por una instructora certificada.",
  },
  "dinner at can culleretes": {
    esTitle: "MoM's date — Cena en Can Culleretes",
    esDesc: "Una cena relajada solo para madres — sin obligación de hablar de peques.",
  },
  "vermut on bonavista": {
    esTitle: "MoM's date — Vermut en Bonavista",
    esDesc: "Una tarde temprana con vermut y aceitunas. Mesa pequeña, sin agenda, en casa a las diez.",
  },
  "sleep q&a with an expert": {
    esTitle: "Aprender y crecer — Preguntas sobre el sueño con una experta",
    esDesc: "Una consultora de sueño infantil responde tus preguntas más difíciles sobre las noches.",
  },
  "autumn rooftop brunch": {
    esTitle: "Momento único — Brunch de otoño en la azotea",
    esDesc: "Un brunch de temporada en una azotea con música en vivo, para socias y sus peques.",
  },
  "park güell area": {
    esTitle: "Paseo con carrito — Zona del Park Güell",
    esDesc: "Un paseo tranquilo cerca del parque, con parada para merendar a mitad de camino.",
  },
  "baby massage class": {
    esTitle: "Play date — Clase de masaje infantil",
    esDesc: "Aprende técnicas sencillas de masaje para calmar a tu bebé y fortalecer el vínculo.",
  },
  "returning to work panel": {
    esTitle: "Aprender y crecer — Panel sobre la vuelta al trabajo",
    esDesc: "Un panel de madres trabajadoras comparte consejos honestos sobre la vuelta al trabajo.",
  },
  "hosted coffee — gràcia": {
    esTitle: "Café con anfitriona — Gràcia",
    esDesc: "Una mesa reservada, una anfitriona que presenta a todas y un café esperándote. Ocho madres, sin tener que romper el hielo tú sola.",
  },
  "hosted brunch — eixample": {
    esTitle: "Brunch con anfitriona — Eixample",
    esDesc: "El mismo formato fácil en versión brunch: mesa reservada para nosotras, una anfitriona en el centro y una bebida incluida.",
  },
  "asking for what you need at home": {
    esTitle: "Aprender y crecer — Pedir lo que necesitas en casa",
    esDesc: "Dos horas sobre la conversación que nadie ensaya: nombrar lo que necesitas de tu pareja o de tu familia, y pedirlo con claridad.",
  },
  "tasting menu, private room": {
    esTitle: "MoM's date — Menú degustación en sala privada",
    esDesc: "Seis pases en una sola mesa larga, una sala para nosotras y una noche que acaba cuando lo decidimos.",
  },
  "one-to-one with a perinatal osteopath": {
    esTitle: "Signature moment — Sesión 1:1 con osteópata perinatal",
    esDesc: "Una hora privada completa con una osteópata perinatal, en una sala tranquila, para el cuerpo que sostuvo y sigue sosteniendo.",
  },
  "newborn feeding circle": {
    esTitle: "Play date — Círculo de lactancia",
    esDesc: "Un pequeño círculo de apoyo para dudas de lactancia en los primeros meses, con una consultora certificada.",
  },
};

function getEventDisplayTitle(ev: PublicEvent, lang: Lang): string {
  if (lang === "es") {
    const raw = (ev.title || "").toLowerCase();
    for (const [key, val] of Object.entries(EVENT_I18N)) {
      if (raw.includes(key) || (ev.slug && ev.slug.toLowerCase().includes(key.replace(/[^a-z0-9]+/g, "-")))) {
        return val.esTitle;
      }
    }
  }
  return ev.title;
}

function getEventDisplayDesc(ev: PublicEvent, lang: Lang): string | null | undefined {
  if (lang === "es") {
    const raw = (ev.title || "").toLowerCase();
    for (const [key, val] of Object.entries(EVENT_I18N)) {
      if (raw.includes(key) || (ev.slug && ev.slug.toLowerCase().includes(key.replace(/[^a-z0-9]+/g, "-")))) {
        return val.esDesc;
      }
    }
  }
  return ev.description;
}

function isGuestPassEligible(ev: PublicEvent, isMember: boolean): boolean {
  if (isMember) return false;
  if (ev.creditCost === 0 || ev.isFreeWalk) return false;
  if (ev.isSignature || ev.creditCost > 18) return false;
  if (ev.status === "cancelled" || ev.status === "completed") return false;

  // If explicitly activated by admin in the backend:
  if (ev.showEventPassCta) return true;

  if (ev.status !== "confirmed") return false;

  const starts = new Date(ev.startsAt);
  const now = new Date();

  if (ev.guestOpenAt && now < new Date(ev.guestOpenAt)) return false;
  if (ev.guestCloseAt && now > new Date(ev.guestCloseAt)) return false;

  if (!ev.guestOpenAt && !ev.guestCloseAt) {
    const diffDays = (starts.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 2 && diffDays <= 14;
  }

  return true;
}

function getCategoryInfo(ev: PublicEvent, lang: Lang): { key: string; label: string } {
  if (ev.isSignature) {
    return {
      key: "signature",
      label: lang === "en" ? "Signature moments" : "Momentos únicos",
    };
  }

  const raw = `${ev.categorySlug || ""} ${ev.categoryName || ""} ${ev.title || ""}`.toLowerCase();

  if (raw.includes("walk") || raw.includes("social") || raw.includes("easy") || raw.includes("conexi") || ev.isFreeWalk || ev.creditCost === 0) {
    return {
      key: "easy",
      label: lang === "en" ? "Easy connection" : "Conexión fácil",
    };
  }
  if (raw.includes("play") || raw.includes("baby") || raw.includes("bebé") || raw.includes("infan")) {
    return {
      key: "baby",
      label: lang === "en" ? "Play date" : "Play date",
    };
  }
  if (raw.includes("evening") || raw.includes("dinner") || raw.includes("date") || raw.includes("vermut") || raw.includes("cena") || raw.includes("cocktail") || raw.includes("wine") || raw.includes("picnic") || raw.includes("mom")) {
    return {
      key: "evenings",
      label: lang === "en" ? "MoM's date" : "MoM's date",
    };
  }
  if (raw.includes("learn") || raw.includes("grow") || raw.includes("work") || raw.includes("tall") || raw.includes("apren") || raw.includes("class") || raw.includes("tennis") || raw.includes("fit") || raw.includes("yoga")) {
    return {
      key: "learn",
      label: lang === "en" ? "Learn & Grow" : "Aprender y crecer",
    };
  }

  return {
    key: "easy",
    label: lang === "en" ? "Easy connection" : "Conexión fácil",
  };
}

function getCardBg(ev: PublicEvent, isPast?: boolean): string {
  if (isPast || ev.status === "cancelled") return "#f1eeea";
  if (ev.userStatus?.isBooked) return "#eef4e9";
  if (ev.status === "confirmed") return "#eef4e9";
  if (ev.status === "published_pending" || ev.status === "pending") return "#fbf3e4";
  if (ev.isSignature) return "#f1eaea";
  return "#f3f0ea";
}

function getCardBorder(ev: PublicEvent, isPast?: boolean): string {
  if (isPast || ev.status === "cancelled") return "rgba(57, 41, 42, 0.18)";
  if (ev.userStatus?.isBooked) return "rgba(86, 139, 5, 0.34)";
  if (ev.status === "confirmed") return "rgba(86, 139, 5, 0.34)";
  if (ev.status === "published_pending" || ev.status === "pending") return "rgba(164, 118, 31, 0.45)";
  if (ev.isSignature) return "rgba(123, 31, 44, 0.32)";
  return "rgba(57, 41, 42, 0.2)";
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
              {getEventDisplayTitle(ev, lang)}
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
                placeholder={lang === "en" ? "Last name" : "Apellido"}
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
          {getEventDisplayTitle(ev, lang)}
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
              placeholder={lang === "en" ? "Last name" : "Apellido"}
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
          {ev.isSignature
            ? (lang === "en" ? "This one is for members." : "Este evento es solo para socias.")
            : (lang === "en" ? "This one is beyond the Event Pass." : "Este evento supera el Event Pass.")}
        </h2>
        <p style={{ fontSize: "14px", lineHeight: "1.65", color: "rgba(57,41,42,0.72)", margin: "0 0 26px" }}>
          {ev.isSignature
            ? (lang === "en"
                ? `Signature moments — like "${ev.title}" — are the handful of experiences each year kept for members alone: everything else on the calendar opens to guests on an Event Pass.`
                : `Los "Momentos únicos" — como "${ev.title}" — son las experiencias reservadas exclusivamente para socias: todo lo demás en el calendario se abre a invitadas con un Event Pass.`)
            : (lang === "en"
                ? `An Event Pass covers experiences up to 18 credits. "${ev.title}" costs ${ev.creditCost} — the richer end of the calendar, and one of the reasons members pay monthly rather than by the event. Members book it with credits; guests are welcome at anything up to 18.`
                : `Un Event Pass cubre experiencias de hasta 18 créditos. "${ev.title}" cuesta ${ev.creditCost} créditos — el extremo más exclusivo del calendario, y una de las razones por las que las socias pagan mensualmente en lugar de por evento. Las socias lo reservan con créditos; las invitadas son bienvenidas en cualquier evento de hasta 18 créditos.`)}
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

// ─── TopUpModal ───────────────────────────────────────────────────────────────

function TopUpModal({
  event: ev,
  lang,
  creditBalance,
  onClose,
}: {
  event: PublicEvent | null;
  lang: Lang;
  creditBalance: number;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ev) return null;

  const shortfall = ev.creditCost - creditBalance;
  if (shortfall <= 0) return null;

  const handleTopUp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await buyExtraCredits(shortfall, ev.id);
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        setError(res.error || (lang === "en" ? "Payment failed" : "Pago fallido"));
        setLoading(false);
      }
    } catch {
      setError(lang === "en" ? "Payment failed" : "Pago fallido");
      setLoading(false);
    }
  };

  const eventTitle = getEventDisplayTitle(ev, lang);
  const isGathering = ev.status === "published_pending" || ev.status === "pending";

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
          boxShadow: "0 24px 60px rgba(45,43,43,0.18)", textAlign: "left",
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
          {lang === "en" ? "Add Credits & Book" : "Añadir Créditos y Reservar"}
        </div>
        <p style={{ fontSize: "15px", lineHeight: "1.6", color: "rgba(57,41,42,0.8)", margin: "0 0 22px" }}>
          {lang === "en"
            ? <>This one costs {ev.creditCost} credits and you have {creditBalance}. Add {shortfall} credits for &euro;{shortfall} and we&rsquo;ll book you in straight away.</>
            : <>Este evento cuesta {ev.creditCost} créditos y tienes {creditBalance}. Añade {shortfall} créditos por {shortfall}€ y reservamos directamente.</>}
        </p>

        <div
          style={{
            border: "1px solid rgba(57,41,42,0.14)", borderRadius: "6px",
            padding: "18px 20px", marginBottom: "20px",
            backgroundColor: "#faf7f1",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0" }}>
            <span style={{ fontSize: "14px", color: "rgba(57,41,42,0.7)" }}>
              {lang === "en" ? "This experience" : "Esta experiencia"}
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "15px", color: "#39292a", fontFeatureSettings: "'tnum'" }}>
              {ev.creditCost} {lang === "en" ? "credits" : "créditos"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderTop: "1px solid rgba(57,41,42,0.1)" }}>
            <span style={{ fontSize: "14px", color: "rgba(57,41,42,0.7)" }}>
              {lang === "en" ? "Your balance" : "Tu saldo"}
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "15px", color: "#39292a", fontFeatureSettings: "'tnum'" }}>
              {creditBalance} {lang === "en" ? (creditBalance === 1 ? "credit" : "credits") : (creditBalance === 1 ? "crédito" : "créditos")}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderTop: "1px solid rgba(57,41,42,0.1)" }}>
            <span style={{ fontSize: "14px", color: "rgba(57,41,42,0.7)" }}>
              {lang === "en" ? `Add ${shortfall} ${shortfall === 1 ? "credit" : "credits"} — €1 each` : `Añadir ${shortfall} ${shortfall === 1 ? "crédito" : "créditos"} — 1€ cada uno`}
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "15px", color: "#7b1f2c", fontWeight: 600, fontFeatureSettings: "'tnum'" }}>
              &euro;{shortfall}
            </span>
          </div>
        </div>

        {error && (
          <div style={{ color: "#993842", fontSize: "14px", marginBottom: "16px", background: "#fbf1f1", padding: "10px 14px", borderRadius: "4px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", marginTop: "4px", borderTop: "1px solid rgba(57,41,42,0.12)" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none", background: "transparent", color: "rgba(57,41,42,0.65)",
              fontSize: "14.5px", cursor: "pointer", padding: "10px 4px",
              fontFamily: "var(--font-body)",
            }}
          >
            {lang === "en" ? "Not now" : "Ahora no"}
          </button>
          <button
            type="button"
            onClick={handleTopUp}
            disabled={loading}
            style={{
              border: "1px solid #7b1f2c", color: "#7b1f2c", backgroundColor: "transparent",
              padding: "11px 28px", borderRadius: "4px", fontFamily: "var(--font-heading)",
              fontWeight: 600, fontSize: "15px", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1, whiteSpace: "nowrap",
            }}
          >
            {loading
              ? (lang === "en" ? "Processing..." : "Procesando...")
              : (lang === "en" ? "Book" : "Reservar")}
          </button>
        </div>

        <p style={{ fontSize: "12.5px", lineHeight: "1.55", color: "rgba(57,41,42,0.58)", margin: "18px 0 0" }}>
          {lang === "en"
            ? <>Top-up credits join your balance under the same rules: 6-month expiry, oldest credits used first. {isGathering ? "Balance below cost. On a gathering event the wording changes to &ldquo;held against your place&rdquo;." : ""}</>
            : <>Los créditos recargados se añaden a tu saldo con las mismas reglas: caducidad a 6 meses, se usan primero los más antiguos. {isGathering ? "Saldo por debajo del coste. En un evento de confirmación pendiente, el saldo se reserva para tu plaza." : ""}</>}
        </p>
      </div>
    </div>
  );
}

// ─── BookingSuccessModal ───────────────────────────────────────────────────────

function BookingSuccessModal({
  event: ev,
  lang,
  remainingCredits,
  onClose,
}: {
  event: PublicEvent;
  lang: Lang;
  remainingCredits: number;
  onClose: () => void;
}) {
  const displayTitle = getEventDisplayTitle(ev, lang);
  const formattedDate = formatEventDate(ev.startsAt, lang);
  const venueDisplay = ev.venueAddress || ev.venueName || (lang === "en" ? "Exact meeting point shared once you book" : "Punto de encuentro exacto compartido tras reservar");

  const isGathering =
    (ev.status === "pending" || ev.status === "published_pending") &&
    (ev.minToConfirm ?? 0) > 0;
  const moreNeeded = Math.max(0, (ev.minToConfirm ?? 0) - (ev.bookedMember ?? 0));
  const decideBy = isGathering ? formatDecideByDate(ev.startsAt, lang) : "";

  if (isGathering) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          backgroundColor: "rgba(57, 41, 42, 0.45)",
          backdropFilter: "blur(3px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "480px",
            margin: "auto",
            border: "1px solid rgba(57,41,42,0.14)",
            borderRadius: "8px",
            padding: "clamp(28px, 5vw, 36px)",
            backgroundColor: "#FEFDF9",
            boxShadow: "0 20px 50px rgba(45,43,43,0.16)",
            textAlign: "center",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "rgba(57,41,42,0.5)",
              width: "30px",
              height: "30px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "#fbf3e4",
              color: "#7b1f2c",
              marginBottom: "16px",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
              <path d="m9 16 2 2 4-4" />
            </svg>
          </div>

          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "23px",
              margin: "0 0 12px",
              color: "#39292a",
            }}
          >
            {lang === "en" ? "Your place is reserved." : "Tu plaza está reservada."}
          </h2>

          <p
            style={{
              fontSize: "14.5px",
              lineHeight: "1.6",
              color: "rgba(57,41,42,0.74)",
              margin: "0 0 8px",
              textAlign: "left",
            }}
          >
            {lang === "en" ? (
              <>
                We&rsquo;re still gathering mothers for &ldquo;{displayTitle}&rdquo; on {formattedDate}. Your place is held, not booked — credits are only taken if it goes ahead.
              </>
            ) : (
              <>
                Seguimos reuniendo madres para &ldquo;{displayTitle}&rdquo; el {formattedDate}. Tu plaza está retenida, no confirmada — los créditos solo se cobran si el encuentro sale adelante.
              </>
            )}
          </p>

          <div
            style={{
              background: "#fffaf2",
              border: "1px solid rgba(164,118,31,0.35)",
              borderRadius: "6px",
              padding: "16px 18px",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            {moreNeeded > 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13.5px", color: "#8a6116" }}>
                  {lang === "en" ? `We need ${moreNeeded} more mother${moreNeeded === 1 ? "" : "s"} to confirm.` : `Faltan ${moreNeeded} madre${moreNeeded === 1 ? "" : "s"} más para confirmar.`}
                </span>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", color: "#8a6116", fontFeatureSettings: "'tnum'" }}>
                  {ev.bookedMember ?? 0}/{ev.minToConfirm}
                </span>
              </div>
            ) : (
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13.5px", color: "#8a6116" }}>
                {lang === "en" ? "We have enough mothers — waiting for final confirmation." : "Ya tenemos suficientes madres — esperando confirmación final."}
              </div>
            )}
            <p style={{ fontSize: "12.5px", lineHeight: "1.55", color: "rgba(57,41,42,0.68)", margin: 0 }}>
              {lang === "en"
                ? `Final decision by ${decideBy}. If it doesn't go ahead, the ${ev.creditCost} credit${ev.creditCost === 1 ? "" : "s"} return straight to your balance — no action needed.`
                : `Decisión final el ${decideBy}. Si no se realiza, los ${ev.creditCost} crédito${ev.creditCost === 1 ? "" : "s"} vuelven directamente a tu saldo — sin hacer nada.`}
            </p>
          </div>

          <p
            style={{
              fontSize: "12.5px",
              lineHeight: "1.6",
              color: "rgba(57,41,42,0.6)",
              margin: "0 0 24px",
              textAlign: "left",
            }}
          >
            {lang === "en"
              ? "Change of plans before it confirms? Cancel from your account and your place is released — credit never leaves your balance. Once confirmed, the normal 24h cancellation rule applies."
              : "¿Cambio de planes antes de que se confirme? Cancela desde tu cuenta y liberas tu plaza — el crédito nunca llega a cobrarse. Una vez confirmado, se aplica la regla normal de 24h."}
          </p>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #7b1f2c",
              backgroundColor: "#7b1f2c",
              color: "#fdfaf5",
              padding: "9px 30px",
              borderRadius: "4px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "14.5px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {lang === "en" ? "Got it" : "Entendido"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(57, 41, 42, 0.45)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "480px",
          margin: "auto",
          border: "1px solid rgba(57,41,42,0.14)",
          borderRadius: "8px",
          padding: "clamp(28px, 5vw, 36px)",
          backgroundColor: "#FEFDF9",
          boxShadow: "0 20px 50px rgba(45,43,43,0.16)",
          textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "rgba(57,41,42,0.5)",
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            background: "#edf5e8",
            color: "#456f04",
            marginBottom: "16px",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "23px",
            margin: "0 0 12px",
            color: "#39292a",
          }}
        >
          {lang === "en" ? "Your place is booked." : "Tu plaza está confirmada."}
        </h2>

        <p
          style={{
            fontSize: "14.5px",
            lineHeight: "1.6",
            color: "rgba(57,41,42,0.74)",
            margin: "0 0 20px",
          }}
        >
          {lang === "en" ? (
            <>
              Your place at &ldquo;{displayTitle}&rdquo; on {formattedDate} is booked{ev.creditCost > 0 ? `, using ${ev.creditCost} credit${ev.creditCost === 1 ? "" : "s"}` : ""}. {ev.creditCost > 0 ? `You have ${remainingCredits} credit${remainingCredits === 1 ? "" : "s"} left this month.` : "No credits used."}
            </>
          ) : (
            <>
              Tu plaza en &ldquo;{displayTitle}&rdquo; el {formattedDate} está confirmada{ev.creditCost > 0 ? `, usando ${ev.creditCost} crédito${ev.creditCost === 1 ? "" : "s"}` : ""}. {ev.creditCost > 0 ? `Te quedan ${remainingCredits} crédito${remainingCredits === 1 ? "" : "s"} este mes.` : "Sin coste en créditos."}
            </>
          )}
        </p>

        <div
          style={{
            background: "#f4f7ee",
            border: "1px solid rgba(86,139,5,0.28)",
            borderRadius: "6px",
            padding: "16px 18px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13.5px", fontWeight: 500, color: "#3e6308" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ flexShrink: 0, marginTop: "2px" }}>
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>{venueDisplay}</span>
          </div>
          <p style={{ fontSize: "12.5px", lineHeight: "1.55", color: "rgba(57,41,42,0.68)", margin: 0 }}>
            {lang === "en"
              ? "You'll receive a WhatsApp reminder 24 hours before with exact timing and a one-tap map link to the meeting point."
              : "Recibirás un recordatorio por WhatsApp 24 horas antes con el horario exacto y un enlace de mapa directo al punto de encuentro."}
          </p>
          <p style={{ fontSize: "12.5px", lineHeight: "1.55", color: "rgba(57,41,42,0.68)", margin: 0 }}>
            {lang === "en"
              ? "Change of plans? Cancel from your account more than 24 hours ahead and the credit comes straight back. Inside 24 hours they return only if someone on the waitlist takes your place."
              : "¿Cambio de planes? Cancela desde tu cuenta con más de 24 horas de antelación y recuperas el crédito al momento. Dentro de las 24 horas solo se devuelve si alguien de la lista de espera ocupa tu lugar."}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            border: "1px solid #7b1f2c",
            backgroundColor: "transparent",
            color: "#7b1f2c",
            padding: "9px 30px",
            borderRadius: "4px",
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "14.5px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          {lang === "en" ? "Got it" : "Entendido"}
        </button>
      </div>
    </div>
  );
}

interface EventCardProps {
  ev: PublicEvent;
  lang: Lang;
  onOpenGuestPass: (ev: PublicEvent) => void;
  onOpenFreeRsvp: (ev: PublicEvent) => void;
  onOpenCeiling: (ev: PublicEvent) => void;
  onOpenTopUp: (ev: PublicEvent) => void;
  onMemberBook: (ev: PublicEvent) => void;
  isBooking?: boolean;
  isMember: boolean;
  creditBalance?: number;
}

function EventCard({
  ev,
  lang,
  onOpenGuestPass,
  onOpenFreeRsvp,
  onOpenCeiling,
  onOpenTopUp,
  onMemberBook,
  isBooking = false,
  isMember,
  creditBalance = 0,
}: EventCardProps) {
  const eligible = isGuestPassEligible(ev, isMember);
  const isCancelled = ev.status === "cancelled";
  // isPast: event date has passed (regardless of status label)
  const isPast = ev.status === "past" || ev.status === "completed" ||
    (ev.endsAt ? new Date(ev.endsAt) < new Date() : new Date(ev.startsAt) < new Date());
  const isPending = ev.status === "published_pending" || ev.status === "pending";
  // Use server-computed isFull value
  const isFull = ev.isFull || false;

  const handleBookClick = () => {
    if (ev.isFreeWalk || ev.creditCost === 0) {
      onOpenFreeRsvp(ev);
    } else if (isMember) {
      if (creditBalance < ev.creditCost) {
        onOpenTopUp(ev);
      } else {
        onMemberBook(ev);
      }
    } else if (ev.creditCost > 18 || ev.isSignature) {
      onOpenCeiling(ev);
    } else {
      // Signed-out visitor viewing regular paid event (≤18 credits) → login with callback
      window.location.href = `/account/login?callbackUrl=${encodeURIComponent(`/events/${ev.id}`)}`;
    }
  };

  const catInfo = getCategoryInfo(ev, lang);

  return (
    <article
      style={{
        border: `1px solid ${getCardBorder(ev, isPast)}`,
        borderRadius: "8px",
        padding: "24px 22px",
        backgroundColor: getCardBg(ev, isPast),
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Top Chips Stack */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start", width: "100%" }}>
        {/* Row 1: Category & Credit Cost */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", gap: "8px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
            {isCancelled && (
              <span style={{ fontSize: "11px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#993842", border: "1px solid rgba(153,56,66,0.45)", background: "rgba(153,56,66,0.07)", borderRadius: "10px", padding: "3px 10px", whiteSpace: "nowrap" }}>
                {lang === "en" ? "Cancelled" : "Cancelado"}
              </span>
            )}
            <span style={{ fontSize: "11px", letterSpacing: "0.04em", color: "#7b1f2c", border: "1px solid rgba(123,31,44,0.3)", borderRadius: "10px", padding: "3px 10px", whiteSpace: "nowrap", background: "rgba(255,255,255,0.6)" }}>
              {catInfo.label}
            </span>
          </div>
          {/* Credit cost */}
          <span style={{ fontSize: "11.5px", color: "rgba(57,41,42,0.7)", whiteSpace: "nowrap", flexShrink: 0, fontWeight: 500, paddingTop: "3px" }}>
            {ev.creditCost === 0 || ev.isFreeWalk
              ? (lang === "en" ? "Included" : "Incluido")
              : `${ev.creditCost} ${lang === "en" ? "credits" : "créditos"}`}
          </span>
        </div>

        {/* Row 2: Stage & Online */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
          {(() => {
            const stageLabel = ev.stage && ev.stage !== "All Stages" ? getStageLabel(ev.stage, lang) : "";
            const displayStage = stageLabel || (lang === "en" ? "Open to every stage" : "Abierto a todas las etapas");
            return (
              <span style={{ fontSize: "11px", letterSpacing: "0.04em", color: "rgba(57,41,42,0.62)", border: "1px solid rgba(57,41,42,0.22)", background: "rgba(255,255,255,0.6)", borderRadius: "10px", padding: "3px 10px", whiteSpace: "nowrap" }}>
                {displayStage}
              </span>
            );
          })()}
          {ev.audienceType && (
            <span style={{ fontSize: "11px", letterSpacing: "0.04em", color: "rgba(57,41,42,0.62)", border: "1px solid rgba(57,41,42,0.22)", background: "rgba(255,255,255,0.6)", borderRadius: "10px", padding: "3px 10px", whiteSpace: "nowrap" }}>
              {ev.audienceType === "moms_only" || ev.audienceType === "mothers_only" ? (lang === "en" ? "Mothers only" : "Solo madres") : (lang === "en" ? "Kids welcome" : "Peques bienvenidos")}
            </span>
          )}
          {ev.isOnline && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", letterSpacing: "0.04em", color: "rgba(57,41,42,0.6)", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "10px", padding: "3px 9px", whiteSpace: "nowrap", background: "rgba(255,255,255,0.6)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11"><path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>
              {lang === "en" ? "Online" : "En línea"}
            </span>
          )}
        </div>

        {/* Row 3: Members Only */}
        {ev.isSignature && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", letterSpacing: "0.05em", color: "#fdfaf5", border: "1px solid #7b1f2c", background: "#7b1f2c", borderRadius: "10px", padding: "3px 9px", whiteSpace: "nowrap" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              {lang === "en" ? "Members only" : "Solo socias"}
            </span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "19px", margin: 0, lineHeight: 1.3, color: "#39292a" }}>
        {getEventDisplayTitle(ev, lang)}
      </h3>

      {/* Hosted by line */}
      {ev.partnerName && (
        <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.55)" }}>
          {lang === "en" ? "Hosted by " : "Organizado por "}
          {ev.partnerSlug ? (
            <Link href={`/partners#${ev.partnerSlug}`} style={{ color: "rgba(57,41,42,0.55)", textDecoration: "underline" }}>
              {ev.partnerName}
            </Link>
          ) : (
            <span style={{ color: "rgba(57,41,42,0.65)" }}>{ev.partnerName}</span>
          )}
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
            {ev.languages.map(l => getLanguageLabel(l, lang)).join(" · ")}
          </span>
        )}

      </div>

      {/* Description */}
      {getEventDisplayDesc(ev, lang) && (
        <p style={{ fontSize: "14px", lineHeight: "1.55", color: "rgba(57,41,42,0.68)", margin: 0, flex: 1 }}>
          {getEventDisplayDesc(ev, lang)}
        </p>
      )}

      {/* Status Bar / Capacity & Threshold */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid rgba(57,41,42,0.12)" }}>
        {/* Confirmed Indicator */}
        {ev.status === "confirmed" && !isPast && !isCancelled && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13.5px", color: "#456f04", fontWeight: 500 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" width="13" height="13" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="9" />
              <path d="M8.5 12.5 11 15l4.5-5" />
            </svg>
            <span>{lang === "en" ? "Confirmed — going ahead" : "Confirmado — se realiza"}</span>
          </div>
        )}

        {/* Pending with minToConfirm (Still gathering) */}
        {isPending && !isPast && !isCancelled && ev.minToConfirm ? (
          <div style={{ border: "1px solid rgba(164,118,31,0.35)", background: "#fffaf2", borderRadius: "5px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "7px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "12.5px", color: "#8a6116" }}>
                {lang === "en" ? "Minimum mothers to confirm" : "Mínimo de madres para confirmar"}
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", color: "#8a6116", fontFeatureSettings: "'tnum'" }}>
                {ev.minToConfirm}
              </span>
            </div>
            <div style={{ height: "4px", borderRadius: "2px", background: "rgba(57,41,42,0.14)", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#a4761f", width: `${Math.min(100, ((ev.bookedMember || 0) / ev.minToConfirm) * 100)}%` }} />
            </div>
            
            {ev.capacityTotal && ev.capacityTotal > 0 ? (
              <div style={{ borderTop: "1px solid rgba(164,118,31,0.25)", paddingTop: "7px", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "12.5px", color: "#39292a" }}>
                    {lang === "en" ? "Room for" : "Espacio para"}
                  </span>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", color: "#39292a", fontFeatureSettings: "'tnum'" }}>
                    {ev.capacityTotal}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px" }}>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "12.5px", color: "#39292a" }}>
                    {lang === "en" ? "Still free" : "Aún libres"}
                  </span>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", color: "#39292a", fontFeatureSettings: "'tnum'" }}>
                    {ev.capacityRemaining ?? ev.capacityTotal}
                  </span>
                </div>
              </div>
            ) : null}

            <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.68)", marginTop: "2px" }}>
              {lang === "en"
                ? `Confirms or cancels by ${formatDecideByDate(ev.startsAt, lang)}. Credits are only taken if it goes ahead.`
                : `Se confirma o cancela el ${formatDecideByDate(ev.startsAt, lang)}. Los créditos solo se cobran si se confirma.`}
            </div>
          </div>
        ) : null}

        {/* Free Unlimited: Open list — no limit on places (only show for truly uncapped events) */}
        {!ev.capacityTotal && !isCancelled && !isPast && !ev.userStatus?.isBooked && !isFull && (
          <div style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)", marginBottom: "4px" }}>
            {lang === "en" ? "Open list — no limit on places" : "Lista abierta — sin límite de plazas"}
          </div>
        )}

        {/* Scarcity indicator: show when spaces are running low (3 or fewer) but not full */}
        {!isFull && ev.capacityRemaining && ev.capacityRemaining > 0 && ev.capacityRemaining <= 3 && !isCancelled && !isPast && !ev.userStatus?.isBooked && (
          <div style={{ fontSize: "13.5px", color: "#8a6116", fontWeight: 500, marginBottom: "4px" }}>
            {lang === "en" ? `${ev.capacityRemaining} ${ev.capacityRemaining === 1 ? 'place' : 'places'} left` : `${ev.capacityRemaining} ${ev.capacityRemaining === 1 ? 'plaza' : 'plazas'} libre${ev.capacityRemaining === 1 ? '' : 's'}`}
          </div>
        )}

        {/* Full state label */}
        {isFull && !isPast && !isCancelled && (
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", color: "#39292a" }}>
            {lang === "en" ? "Full" : "Completo"}
          </div>
        )}

        {/* Capped events: 2-line Room for / Still free (when NOT inside minToConfirm block, not cancelled, not past, not already booked) */}
        {!(isPending && !isPast && !isCancelled && ev.minToConfirm) && !isCancelled && !isPast && !ev.userStatus?.isBooked && (ev.capacityTotal ?? 0) > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "12.5px", color: "#39292a" }}>
                {lang === "en" ? "Room for" : "Espacio para"}
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", color: "#39292a", fontFeatureSettings: "'tnum'" }}>
                {ev.capacityTotal}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "12.5px", color: "#39292a" }}>
                {lang === "en" ? "Still free" : "Aún libres"}
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", color: "#39292a", fontFeatureSettings: "'tnum'" }}>
                {isFull ? 0 : (ev.capacityRemaining ?? ev.capacityTotal)}
              </span>
            </div>
            {/* Note: Guest places closed if inside T-2 */}
            {(() => {
              const now = new Date();
              const starts = new Date(ev.startsAt);
              const diffDays = (starts.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
              const isGuestClosed = !isMember && !ev.isSignature && (ev.creditCost <= 18) && (diffDays < 2 || (ev.guestCloseAt && now > new Date(ev.guestCloseAt)));
              if (isGuestClosed && !isFull) {
                return (
                  <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.68)", marginTop: "2px" }}>
                    {lang === "en" ? "Guest places have closed." : "Las plazas de invitada se han cerrado."}
                  </div>
                );
              }
              return null;
            })()}
            {/* Member credit balance note if logged in */}
            {isMember && !isFull && (
              <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.68)", marginTop: "2px" }}>
                {lang === "en" ? `You have ${creditBalance} credits.` : `Tienes ${creditBalance} créditos.`}
              </div>
            )}
            {/* Member full waitlist note */}
            {isMember && isFull && (
              <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.68)", marginTop: "2px" }}>
                {lang === "en" ? "No credits are taken to wait." : "No se cobran créditos por esperar."}
              </div>
            )}
          </div>
        )}

        {/* Signature signed out note */}
        {ev.isSignature && !isMember && !isCancelled && !isPast && (
          <div style={{ fontSize: "13.5px", lineHeight: "1.55", color: "#39292a" }}>
            {lang === "en" ? "This one is for members. " : "Este evento es para socias. "}
            <Link href="/membership" style={{ color: "#7b1f2c", textDecoration: "underline" }}>
              {lang === "en" ? "See the membership →" : "Ver la membresía →"}
            </Link>
          </div>
        )}

        {/* Member Booked State */}
        {ev.userStatus?.isBooked && !isCancelled && !isPast && (
          <div style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)" }}>
            {lang === "en"
              ? `Booked${ev.userStatus.bookedAt ? ` on ${new Date(ev.userStatus.bookedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""} · cancel free up to 24h before`
              : `Reservada${ev.userStatus.bookedAt ? ` el ${new Date(ev.userStatus.bookedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}` : ""} · cancelación gratuita hasta 24h antes`}
          </div>
        )}

        {isCancelled && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ fontSize: "13.5px", color: "#39292a", fontWeight: 500 }}>
              {lang === "en" ? "Cancelled" : "Cancelado"}
              {ev.cancelReason && ` — ${ev.cancelReason}`}
            </div>
            {ev.userStatus?.isRefunded && ev.userStatus.refundedAt && ev.userStatus.creditsCharged ? (
              <div style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)" }}>
                {lang === "en"
                  ? `Your ${ev.userStatus.creditsCharged} credits were returned in full on ${new Date(ev.userStatus.refundedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                  : `Tus ${ev.userStatus.creditsCharged} créditos fueron devueltos en su totalidad el ${new Date(ev.userStatus.refundedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`}
              </div>
            ) : null}
          </div>
        )}
        {isPast && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.72)", display: "flex", alignItems: "center", gap: "6px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
              <span>{lang === "en" ? "This one has already happened." : "Este evento ya ha tenido lugar."}</span>
            </div>
            {isFull && (
              <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)" }}>
                {lang === "en" ? "Oops! This event is full." : "¡Vaya! Este evento está completo."}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap", marginTop: isPast ? "8px" : "0" }}>
          {isPast ? (
            <button
              disabled
              style={{
                border: "1px solid rgba(57,41,42,0.2)",
                backgroundColor: "transparent",
                color: "rgba(57,41,42,0.4)",
                padding: "9px 18px",
                borderRadius: "4px",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "not-allowed",
                whiteSpace: "nowrap",
              }}
            >
              {lang === "en" ? "Passed" : "Pasado"}
            </button>
          ) : !isCancelled ? (
            <>
              {ev.userStatus?.isBooked ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", width: "100%", gap: "10px", flexWrap: "wrap" }}>
                  <Link
                    href={`/events/${ev.id}`}
                    style={{
                      border: "1px solid #7b1f2c",
                      backgroundColor: "transparent",
                      color: "#7b1f2c",
                      padding: "10px 20px",
                      borderRadius: "4px",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 600,
                      fontSize: "14.5px",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lang === "en" ? "See your ticket" : "Ver tu entrada"}
                  </Link>
                </div>
              ) : ev.userStatus?.isWaitlisted ? (
                <Link
                  href={`/events/${ev.id}`}
                  style={{
                    border: "1px solid rgba(57,41,42,0.3)",
                    backgroundColor: "transparent",
                    color: "rgba(57,41,42,0.7)",
                    padding: "10px 22px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: "14.5px",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {lang === "en" ? "Leave waitlist" : "Salir de lista"}
                </Link>
              ) : isFull ? (
                isMember ? (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `/events/${ev.id}`;
                    }}
                    style={{
                      border: "1px solid #7b1f2c",
                      backgroundColor: "transparent",
                      color: "#7b1f2c",
                      padding: "10px 22px",
                      borderRadius: "4px",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 600,
                      fontSize: "14.5px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lang === "en" ? "Join the waitlist" : "Unirme a la lista"}
                  </button>
                ) : (
                  <div style={{ fontSize: "13.5px", lineHeight: "1.55", color: "#39292a" }}>
                    {lang === "en" ? "The waitlist is for members. " : "La lista de espera es para socias. "}
                    <Link
                      href="/membership"
                      style={{
                        color: "#7b1f2c",
                        textDecoration: "underline",
                      }}
                    >
                      {lang === "en" ? "See the membership →" : "Ver la membresía →"}
                    </Link>
                  </div>
                )
              ) : ev.isSignature && !isMember ? (
                null
              ) : (
                <>
                  {eligible && (
                    <button
                      type="button"
                      onClick={() => onOpenGuestPass(ev)}
                      style={{
                        border: "1px solid #7b1f2c",
                        backgroundColor: "transparent",
                        color: "#7b1f2c",
                        padding: "10px 18px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                        fontSize: "14.5px",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {lang === "en" ? "€35 Event Pass" : "Event Pass 35€"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleBookClick}
                    disabled={isBooking}
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
                    }}
                  >
                    {isBooking
                      ? (lang === "en" ? "Booking..." : "Reservando...")
                      : ev.isFreeWalk || ev.creditCost === 0
                      ? (lang === "en" ? "Join the list" : "Unirme a la lista")
                      : (lang === "en" ? "Book" : "Reservar")}
                  </button>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

// ─── Main EventsCalendar Component ───────────────────────────────────────────

export function EventsCalendar({ events, categories, creditBalance = 0 }: Props) {
  const { data: session } = useSession();
  const isMember = !!session?.user;

  const { language: lang } = useLanguage();
  const [eventsList, setEventsList] = useState<PublicEvent[]>(events);
  const [currentCreditBalance, setCurrentCreditBalance] = useState<number>(creditBalance);
  const [bookingLoadingId, setBookingLoadingId] = useState<string | null>(null);
  const [bookingSuccessEvent, setBookingSuccessEvent] = useState<PublicEvent | null>(null);

  useEffect(() => {
    setEventsList(events);
  }, [events]);

  useEffect(() => {
    setCurrentCreditBalance(creditBalance);
  }, [creditBalance]);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeDateFilter, setActiveDateFilter] = useState<string>("all");
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [activeStage, setActiveStage] = useState<string>("all");
  const [activeAudience, setActiveAudience] = useState<string>("all");

  const [guestPassEvent, setGuestPassEvent] = useState<PublicEvent | null>(null);
  const [freeRsvpEvent, setFreeRsvpEvent] = useState<PublicEvent | null>(null);
  const [ceilingEvent, setCeilingEvent] = useState<PublicEvent | null>(null);
  const [topUpEvent, setTopUpEvent] = useState<PublicEvent | null>(null);

  const handleMemberBook = async (ev: PublicEvent) => {
    setBookingLoadingId(ev.id);
    try {
      const res = await bookEvent(ev.id);
      if (res.success) {
        const newCredits = Math.max(0, currentCreditBalance - (ev.creditCost || 0));
        setCurrentCreditBalance(newCredits);
        setEventsList((prev) =>
          prev.map((e) =>
            e.id === ev.id
              ? {
                  ...e,
                  status: e.status === "published_pending" || e.status === "pending" ? "confirmed" : e.status,
                  userStatus: {
                    ...e.userStatus,
                    isBooked: true,
                    bookedAt: new Date(),
                    creditsCharged: e.creditCost,
                  },
                }
              : e
          )
        );
        setBookingSuccessEvent(ev);
      } else {
        if (res.error === "INSUFFICIENT_CREDITS") {
          setTopUpEvent(ev);
        } else {
          alert(res.error || (lang === "en" ? "Could not complete booking." : "No se pudo completar la reserva."));
        }
      }
    } catch (err: any) {
      console.error("Booking error:", err);
      alert(err?.message || (lang === "en" ? "Booking failed." : "Error al reservar."));
    } finally {
      setBookingLoadingId(null);
    }
  };

  // Category items matching prototype exactly
  const categoryChips = [
    { id: "all", labelEn: "All events", labelEs: "Todos los eventos" },
    { id: "easy", labelEn: "Easy connection", labelEs: "Conexión fácil" },
    { id: "baby", labelEn: "Play date", labelEs: "Play date" },
    { id: "evenings", labelEn: "MoM's date", labelEs: "MoM's date" },
    { id: "learn", labelEn: "Learn & Grow", labelEs: "Aprender y crecer" },
    { id: "signature", labelEn: "Signature moments", labelEs: "Momentos únicos" },
  ];

  const stageChips = [
    { id: "all", labelEn: "All stages", labelEs: "Todas las etapas" },
    { id: "pregnant", labelEn: "Pregnant", labelEs: "Embarazada" },
    { id: "babies", labelEn: "Babies", labelEs: "Bebés" },
    { id: "toddlers", labelEn: "Toddlers", labelEs: "Peques" },
    { id: "children", labelEn: "Children", labelEs: "Niños" },
    { id: "big_kids", labelEn: "Big kids", labelEs: "Niños grandes" },
  ];

  const audienceChips = [
    { id: "all", labelEn: "All groups", labelEs: "Todos los grupos" },
    { id: "kids", labelEn: "Kids welcome", labelEs: "Con peques" },
    { id: "moms", labelEn: "Mothers only", labelEs: "Solo madres" },
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
    { id: "all", labelEn: "All states", labelEs: "Todos los estados", dotBg: "transparent", dotBorder: "rgba(57,41,42,0.3)" },
    { id: "confirmed", labelEn: "Confirmed", labelEs: "Confirmados", dotBg: "#e8f1e9", dotBorder: "rgba(74,122,80,0.45)" },
    { id: "pending", labelEn: "To be confirmed", labelEs: "Por confirmar", dotBg: "#fff3e4", dotBorder: "rgba(164,118,31,0.4)" },
    { id: "cancelled", labelEn: "Cancelled", labelEs: "Cancelados", dotBg: "#fbf1f1", dotBorder: "rgba(153,56,66,0.28)" },
    { id: "past", labelEn: "Past", labelEs: "Pasados", dotBg: "#dde3e6", dotBorder: "rgba(96,110,118,0.45)" },
  ];

  const hasActiveFilters = activeCategory !== "all" || activeDateFilter !== "all" || activeStatus !== "all" || activeStage !== "all" || activeAudience !== "all";

  const clearAllFilters = () => {
    setActiveCategory("all");
    setActiveDateFilter("all");
    setActiveStatus("all");
    setActiveStage("all");
    setActiveAudience("all");
  };

  // Filtering
  const filtered = eventsList.filter((ev) => {
    // 1. Category match
    if (activeCategory !== "all") {
      const catInfo = getCategoryInfo(ev, "en");
      if (activeCategory !== catInfo.key) return false;
    }

    // 2. Stage match
    if (activeStage !== "all") {
      const rawStage = (ev.stage || "").toLowerCase();
      if (activeStage === "big_kids" || activeStage === "big kids") {
        if (!rawStage.includes("big") && !rawStage.includes("grande") && !rawStage.includes("10+") && !rawStage.includes("6–10") && !rawStage.includes("6-10") && !rawStage.includes("6+")) return false;
      } else if (activeStage === "babies") {
        if (!rawStage.includes("bab") && !rawStage.includes("0–12") && !rawStage.includes("0-12") && !rawStage.includes("postpartum") && !rawStage.includes("posparto")) return false;
      } else if (activeStage === "toddlers") {
        if (!rawStage.includes("toddler") && !rawStage.includes("peque") && !rawStage.includes("1–3") && !rawStage.includes("1-3")) return false;
      } else if (activeStage === "children") {
        if (!rawStage.includes("child") && !rawStage.includes("niño") && !rawStage.includes("3–6") && !rawStage.includes("3-6") && !rawStage.includes("3y+")) return false;
      } else if (activeStage === "pregnant") {
        if (!rawStage.includes("pregnant") && !rawStage.includes("embaraz")) return false;
      } else {
        if (!rawStage.includes(activeStage)) return false;
      }
    }

    // 3. Audience / Kids match
    if (activeAudience === "kids") {
      const isMomsOnly = ev.audienceType === "mothers_only" || ev.audienceType === "moms_only" || ev.categorySlug === "evenings" || (ev.title && ev.title.toLowerCase().includes("date"));
      if (isMomsOnly) return false;
    } else if (activeAudience === "moms") {
      const isKids = ev.audienceType === "kids_welcome" || ev.categorySlug === "baby" || ev.isFreeWalk;
      if (isKids && ev.audienceType !== "mothers_only" && ev.audienceType !== "moms_only") return false;
    }

    // 4. Date match
    if (activeDateFilter === "this_month") {
      const evDate = new Date(ev.startsAt);
      if (evDate.getMonth() !== now.getMonth() || evDate.getFullYear() !== now.getFullYear()) return false;
    } else if (activeDateFilter === "next_month") {
      const evDate = new Date(ev.startsAt);
      if (evDate.getMonth() !== nextMonthDate.getMonth() || evDate.getFullYear() !== nextMonthDate.getFullYear()) return false;
    }

    // 5. Status match
    const isCancelled = ev.status === "cancelled";
    const isPastEvent = ev.status === "past" || ev.status === "completed" ||
      (ev.endsAt ? new Date(ev.endsAt) < now : new Date(ev.startsAt) < now);
    
    let isPending = (ev.status === "published_pending" || ev.status === "pending");
    if (isPending && ev.minToConfirm) {
      const booked = ev.bookedMember || 0;
      if (booked >= ev.minToConfirm) {
        isPending = false;
      }
    }
    const isConfirmed = (ev.status === "confirmed" || (!isPending && (ev.status === "published_pending" || ev.status === "pending"))) && !isCancelled;

    if (activeStatus === "cancelled") {
      if (!isCancelled) return false;
    } else if (activeStatus === "past") {
      if (!isPastEvent) return false;
    } else if (activeStatus === "confirmed") {
      if (!isConfirmed || isPastEvent || isCancelled) return false;
    } else if (activeStatus === "pending") {
      if (!isPending || isPastEvent || isCancelled) return false;
    } else if (activeStatus === "all") {
      // Default "all" view: exclude past events unless explicitly selected
      if (isPastEvent) return false;
    }

    return true;
  });

  // Sort: Active and upcoming events first (ascending by date), cancelled and past events below
  const sortedEvents = [...filtered].sort((a, b) => {
    const isPastA = a.status === "past" || a.status === "completed" ||
      (a.endsAt ? new Date(a.endsAt) < now : new Date(a.startsAt) < now);
    const isCancelledA = a.status === "cancelled";
    const isInactiveA = isPastA || isCancelledA;

    const isPastB = b.status === "past" || b.status === "completed" ||
      (b.endsAt ? new Date(b.endsAt) < now : new Date(b.startsAt) < now);
    const isCancelledB = b.status === "cancelled";
    const isInactiveB = isPastB || isCancelledB;

    // Active & upcoming events come before inactive (past/cancelled) events
    if (!isInactiveA && isInactiveB) return -1;
    if (isInactiveA && !isInactiveB) return 1;

    // Both active & upcoming: sort ascending (soonest first)
    if (!isInactiveA && !isInactiveB) {
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    }

    // Both inactive (past/cancelled): sort descending (most recent first)
    return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
  });

  return (
    <div style={{ backgroundColor: "#FEFDF9", minHeight: "100vh", padding: "clamp(48px, 6vw, 88px) clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: "1160px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: "12px" }}>
            {lang === "en" ? "CALENDAR" : "CALENDARIO"}
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(34px, 5vw, 54px)", fontWeight: 400, lineHeight: 1.1, margin: "0 0 16px 0" }}>
            {lang === "en" ? "Upcoming events." : "Próximos eventos."}
          </h1>
          <p style={{ fontSize: "19px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.78)", margin: "0 auto", maxWidth: "680px" }}>
            {lang === "en"
              ? "Walks, workshops, dinners, and seasonal moments \u2014 browse what's coming up and book your place."
              : "Paseos, talleres, cenas y momentos de temporada \u2014 mira lo que se viene y reserva tu lugar."}
          </p>
        </div>

        {/* ─── 3 FILTER ROWS MATCHING EXACT MODEL ─── */}
        <div style={{ marginBottom: "36px" }}>
          {/* Categories & Dates Group */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
            {/* Row 1: Categories */}
            <div style={{ display: "flex", flexWrap: "nowrap", overflowX: "auto", gap: "10px", paddingBottom: "4px", scrollbarWidth: "none" }} className="hide-scrollbar">
              {categoryChips.map((chip) => {
                const selected = activeCategory === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setActiveCategory(chip.id)}
                    style={{
                      border: selected ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.22)",
                      backgroundColor: "transparent",
                      color: selected ? "#7b1f2c" : "#39292a",
                      fontWeight: selected ? 600 : 400,
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
            <div style={{ display: "flex", flexWrap: "nowrap", overflowX: "auto", gap: "8px", paddingBottom: "4px", scrollbarWidth: "none" }} className="hide-scrollbar">
              {dateChips.map((chip) => {
                const selected = activeDateFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setActiveDateFilter(chip.id)}
                    style={{
                      border: selected ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.2)",
                      backgroundColor: "transparent",
                      color: selected ? "#7b1f2c" : "rgba(57,41,42,0.7)",
                      fontWeight: selected ? 600 : 400,
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

            {/* Row 3: Stages */}
            <div style={{ display: "flex", flexWrap: "nowrap", overflowX: "auto", gap: "8px", paddingBottom: "4px", scrollbarWidth: "none" }} className="hide-scrollbar">
              {stageChips.map((chip) => {
                const selected = activeStage === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setActiveStage(chip.id)}
                    style={{
                      border: selected ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.18)",
                      backgroundColor: "transparent",
                      color: selected ? "#7b1f2c" : "rgba(57,41,42,0.65)",
                      fontWeight: selected ? 600 : 400,
                      padding: "6px 13px",
                      borderRadius: "20px",
                      fontSize: "12px",
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

            {/* Row 4: Audience / Kids */}
            <div style={{ display: "flex", flexWrap: "nowrap", overflowX: "auto", gap: "8px", paddingBottom: "4px", scrollbarWidth: "none" }} className="hide-scrollbar">
              {audienceChips.map((chip) => {
                const selected = activeAudience === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setActiveAudience(chip.id)}
                    style={{
                      border: selected ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.18)",
                      backgroundColor: "transparent",
                      color: selected ? "#7b1f2c" : "rgba(57,41,42,0.65)",
                      fontWeight: selected ? 600 : 400,
                      padding: "6px 13px",
                      borderRadius: "20px",
                      fontSize: "12px",
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
          </div>

          {/* Row 5: Status / State with Authentic Swatches */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", justifyContent: "space-between", paddingBottom: "4px" }}>
            <div style={{ display: "flex", flexWrap: "nowrap", overflowX: "auto", gap: "8px", alignItems: "center", scrollbarWidth: "none" }} className="hide-scrollbar">
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
                      border: selected ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.18)",
                      backgroundColor: "transparent",
                      color: selected ? "#7b1f2c" : "rgba(57,41,42,0.72)",
                      fontWeight: selected ? 600 : 400,
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
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: selected ? chip.dotBorder : "transparent",
                        border: selected ? "2px solid #7b1f2c" : `1px solid ${chip.dotBorder}`,
                        flexShrink: 0,
                      }}
                    />
                    {lang === "en" ? chip.labelEn : chip.labelEs}
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#7b1f2c",
                  fontSize: "13px",
                  cursor: "pointer",
                  textDecoration: "underline",
                  padding: "4px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                {lang === "en" ? "Clear all filters" : "Borrar todos los filtros"}
              </button>
            )}
          </div>
        </div>

        {/* ─── EVENTS GRID ─── */}
        {sortedEvents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px", color: "var(--color-text-muted)" }}>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: "20px", margin: "0 0 8px" }}>
              {lang === "en" ? "No events match these filters." : "Ningún evento coincide con estos filtros."}
            </p>
            <p style={{ fontSize: "14px", margin: "0 0 16px" }}>
              {lang === "en" ? "Try clearing some filters to see what is coming up." : "Prueba a quitar algunos filtros para ver los próximos eventos."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                style={{
                  border: "1px solid #7b1f2c",
                  color: "#7b1f2c",
                  background: "transparent",
                  padding: "8px 18px",
                  borderRadius: "4px",
                  fontSize: "13.5px",
                  cursor: "pointer",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                }}
              >
                {lang === "en" ? "Show all events" : "Ver todos los eventos"}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px" }}>
            {sortedEvents.map((ev) => (
              <EventCard
                key={ev.id}
                ev={ev}
                lang={lang}
                onOpenGuestPass={setGuestPassEvent}
                onOpenFreeRsvp={setFreeRsvpEvent}
                onOpenCeiling={(e) => setCeilingEvent(e)}
                onOpenTopUp={(e) => setTopUpEvent(e)}
                onMemberBook={handleMemberBook}
                isBooking={bookingLoadingId === ev.id}
                isMember={isMember}
                creditBalance={currentCreditBalance}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}
      {bookingSuccessEvent && (
        <BookingSuccessModal
          event={bookingSuccessEvent}
          lang={lang}
          remainingCredits={currentCreditBalance}
          onClose={() => setBookingSuccessEvent(null)}
        />
      )}

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
      
      {topUpEvent && (
        <TopUpModal
          event={topUpEvent}
          lang={lang}
          creditBalance={currentCreditBalance}
          onClose={() => setTopUpEvent(null)}
        />
      )}
    </div>
  );
}
