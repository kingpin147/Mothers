"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { buyExtraCredits, bookEvent, joinEventWaitlist, checkBookingEmailStatus, BookingEmailCheckResult } from "@/app/actions/booking";
import { useLanguage } from "@/components/LanguageProvider";
import { ForwardArrow } from "@/components/Icons";
import CountryPhoneInput from "@/components/CountryPhoneInput";

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
  targetStages?: string[] | null;
  imageId?: string | null;
  imageUrl?: string | null;
  status: string;
  creditCost: number;
  memberCredits?: number | null;
  nonMemberCredits?: number | null;
  cancellationWindowHours?: number | null;
  isFreeWalk?: boolean | null;
  isOnline?: boolean | null;
  isSignature?: boolean | null;
  audienceType?: string | null;
  languages?: string[] | null;
  capacityMember?: number | null;
  capacityTotal?: number | null;
  capacityRemaining?: number | null;
  placesTaken?: number;
  bookedMember?: number;
  bookedGuest?: number;
  isFull?: boolean;
  isGuestFull?: boolean;
  minToConfirm?: number | null;
  guestPriceCents?: number | null;
  meetingPointNote?: string | null;
  whatsappGroupUrl?: string | null;
  guestOpenAt?: string | Date | null;
  guestCloseAt?: string | Date | null;
  decisionAt?: string | Date | null;
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
  const s = raw.toLowerCase().trim();
  if (s.includes("pregnant") || s.includes("embaraz") || s.includes("expecting")) return lang === "en" ? "Pregnant" : "Embarazo";
  if (s.includes("postpartum") || s.includes("posparto") || s.includes("babies") || s.includes("baby") || s.includes("0–12") || s.includes("0-12") || s === "0") return lang === "en" ? "Babies" : "Bebés";
  if (s.includes("toddler") || s.includes("peque") || s.includes("1–3") || s.includes("1-3") || s.includes("primera infancia")) return lang === "en" ? "Toddlers" : "Peques";
  if (s.includes("big") || s.includes("grande") || s.includes("10+") || s.includes("6–10") || s.includes("6-10") || s.includes("6+") || s.includes("children610")) return lang === "en" ? "Big kids" : "Niños mayores";
  if (s.includes("children") || s.includes("child") || s.includes("primary") || s.includes("escolar") || s.includes("3–") || s.includes("3-") || s.includes("4–") || s.includes("4-") || s.includes("niño") || s.includes("children36")) return lang === "en" ? "Children" : "Niños";
  if (s.includes("all") || s.includes("todo") || s.includes("toda") || s.includes("open") || s.includes("abierto")) return lang === "en" ? "Open to every stage" : "Abierto a todas las etapas";
  if (s.includes("mom") || s.includes("madre") || s.includes("adult") || s.includes("welcome") || s.includes("bienvenido")) return "";
  return raw; // fallback: show as-is
}

function getEventStageDisplay(ev: PublicEvent, lang: Lang): { isAllStages: boolean; stages: string[]; displayLabel: string } {
  const totalCanonicalStages = 5; // Pregnant, Babies, Toddlers, Children, Big kids

  if (ev.targetStages && Array.isArray(ev.targetStages) && ev.targetStages.length > 0) {
    if (ev.targetStages.length >= totalCanonicalStages) {
      return {
        isAllStages: true,
        stages: [],
        displayLabel: lang === "en" ? "Open to every stage" : "Abierto a todas las etapas",
      };
    }
    const mapped = ev.targetStages.map((s) => getStageLabel(s, lang)).filter(Boolean);
    if (mapped.length > 0) {
      return {
        isAllStages: false,
        stages: mapped,
        displayLabel: mapped.join(" · "),
      };
    }
  }

  if (ev.stage && ev.stage !== "All Stages") {
    const label = getStageLabel(ev.stage, lang);
    if (label && label !== (lang === "en" ? "Open to every stage" : "Abierto a todas las etapas")) {
      return {
        isAllStages: false,
        stages: [label],
        displayLabel: label,
      };
    }
  }

  return {
    isAllStages: true,
    stages: [],
    displayLabel: lang === "en" ? "Open to every stage" : "Abierto a todas las etapas",
  };
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

export function getEventDisplayTitle(ev: PublicEvent, lang: Lang): string {
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

export function getEventDisplayDesc(ev: PublicEvent, lang: Lang): string | null | undefined {
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


export function getCategoryInfo(ev: any, lang: Lang): { key: string; label: string } {
  if (ev.isSignature) {
    return {
      key: "signature",
      label: "Signature moments",
    };
  }

  const raw = `${ev.categorySlug || ""} ${ev.categoryName || ""} ${ev.title || ""}`.toLowerCase();

  if (raw.includes("walk") || raw.includes("social") || raw.includes("easy") || raw.includes("conexi")) {
    return {
      key: "easy",
      label: "Easy connection",
    };
  }
  if (raw.includes("play") || raw.includes("baby") || raw.includes("bebé") || raw.includes("infan")) {
    return {
      key: "baby",
      label: "Play date",
    };
  }
  if (raw.includes("evening") || raw.includes("dinner") || raw.includes("date") || raw.includes("vermut") || raw.includes("cena") || raw.includes("cocktail") || raw.includes("wine") || raw.includes("picnic") || raw.includes("mom")) {
    return {
      key: "evenings",
      label: "MoM's date",
    };
  }
  if (raw.includes("learn") || raw.includes("grow") || raw.includes("work") || raw.includes("tall") || raw.includes("apren") || raw.includes("class") || raw.includes("tennis") || raw.includes("fit") || raw.includes("yoga")) {
    return {
      key: "learn",
      label: "Learn & Grow",
    };
  }

  return {
    key: "easy",
    label: "Easy connection",
  };
}

export function getCardBg(ev: any, isPast?: boolean): string {
  if (isPast || ev.status === "cancelled") return "#f1eeea";
  if (ev.status === "published_pending" || ev.status === "pending") return "#fbf3e4";
  if (ev.userStatus?.isBooked) return "#eef4e9";
  if (ev.status === "confirmed") return "#eef4e9";
  if (ev.isSignature) return "#f1eaea";
  if (ev.isFreeWalk || !ev.capacityTotal || ev.creditCost === 0) return "#eef4e9";
  return "#fffdfa";
}

export function getCardBorder(ev: any, isPast?: boolean): string {
  if (isPast || ev.status === "cancelled") return "rgba(57, 41, 42, 0.18)";
  if (ev.status === "published_pending" || ev.status === "pending") return "rgba(164, 118, 31, 0.45)";
  if (ev.userStatus?.isBooked) return "rgba(86, 139, 5, 0.34)";
  if (ev.status === "confirmed") return "rgba(86, 139, 5, 0.34)";
  if (ev.isSignature) return "rgba(123, 31, 44, 0.32)";
  if (ev.isFreeWalk || !ev.capacityTotal || ev.creditCost === 0) return "rgba(86, 139, 5, 0.34)";
  return "rgba(57, 41, 42, 0.16)";
}

export function formatDecideByDate(startsAt: string | Date, lang: Lang, decisionAt?: string | Date | null): string {
  const start = new Date(startsAt);
  const now = new Date();
  
  let targetDate: Date;

  if (decisionAt) {
    const d = new Date(decisionAt);
    if (!isNaN(d.getTime())) {
      targetDate = d;
    } else {
      targetDate = new Date(start.getTime() - 7 * 86400000);
    }
  } else {
    // Default is 7 days before event start
    targetDate = new Date(start.getTime() - 7 * 86400000);
  }

  // GUARANTEE: Never display a confirmation date in the past or before event creation
  // If targetDate is already past (e.g. standard T-7 on a short-notice event):
  if (targetDate.getTime() <= now.getTime()) {
    const daysUntilStart = (start.getTime() - now.getTime()) / 86400000;
    if (daysUntilStart > 2) {
      targetDate = new Date(start.getTime() - 2 * 86400000); // 2 days before event
    } else if (daysUntilStart > 0.5) {
      targetDate = new Date(start.getTime() - 24 * 3600000); // 24h before event
    } else {
      targetDate = new Date(Math.max(now.getTime() + 3600000, start.getTime() - 2 * 3600000)); // 2h before event
    }
  }

  if (lang === "en") {
    return targetDate.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  } else {
    return targetDate.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  }
}

export function formatEventDate(startsAt: string | Date, lang: Lang): string {
  const d = new Date(startsAt);
  const weekday = d.toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { weekday: "short" });
  const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const day = d.getDate();
  const month = d.toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { month: "short" });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${capWeekday} ${day} ${month} ${year} · ${time}`;
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

// ─── SignedOutMemberModal (State 13: Signed out — pressed the member button) ──

export function SignedOutMemberModal({
  event: ev,
  lang,
  onClose,
  returnUrl,
}: {
  event: PublicEvent | null;
  lang: Lang;
  onClose: () => void;
  returnUrl?: string;
}) {
  if (!ev) return null;

  const formattedDate = formatEventDate(ev.startsAt, lang);
  const targetCallback = returnUrl || (typeof window !== "undefined"
    ? (window.location.pathname.startsWith("/events/") ? `${window.location.pathname}?action=book` : `/events?book_event=${ev.id}`)
    : `/events?book_event=${ev.id}`);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(57, 41, 42, 0.45)",
        backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px", overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "relative", width: "100%", maxWidth: "480px", margin: "auto",
          border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px",
          padding: "clamp(28px, 5vw, 36px)", backgroundColor: "#FEFDF9",
          boxShadow: "0 20px 50px rgba(45,43,43,0.16)", textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: "16px", right: "16px",
            border: "none", background: "transparent", cursor: "pointer",
            color: "rgba(57,41,42,0.5)", width: "30px", height: "30px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        {/* Arrow into bracket icon */}
        <div style={{ color: "#7b1f2c", marginBottom: "16px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#7b1f2c" strokeWidth="1.8" width="34" height="34" style={{ margin: "0 auto", display: "block" }}>
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </div>

        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 12px", color: "#39292a" }}>
          {lang === "en" ? "Sign in to book your place." : "Inicia sesión para reservar tu plaza."}
        </h2>
        <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.76)", margin: "0 0 24px" }}>
          {lang === "en"
            ? `We will bring you straight back to “${getEventDisplayTitle(ev, lang)}” on ${formattedDate} — nothing is lost, and no place is taken until you confirm it yourself.`
            : `Te traeremos de vuelta directamente a “${getEventDisplayTitle(ev, lang)}” el ${formattedDate} — no se pierde nada, y no se reserva ninguna plaza hasta que tú la confirmes.`}
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              window.location.href = `/account/login?callbackUrl=${encodeURIComponent(targetCallback)}`;
            }}
            style={{
              border: "1px solid #7b1f2c", backgroundColor: "#7b1f2c", color: "#fdfaf5",
              padding: "10px 24px", borderRadius: "4px", fontFamily: "var(--font-heading)",
              fontWeight: 600, fontSize: "14.5px", cursor: "pointer",
            }}
          >
            {lang === "en" ? "Sign in" : "Iniciar sesión"}
          </button>
          <Link
            href={`/account/login?create=1&callbackUrl=${encodeURIComponent(targetCallback)}`}
            style={{ fontSize: "14px", color: "#7b1f2c", textDecoration: "underline", marginLeft: "8px" }}
          >
            {lang === "en" ? "New here? Open a free account" : "¿Nueva aquí? Abre una cuenta gratuita"}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── WaitlistModal (State 04: Full — joins the waitlist) ──────────────────────

export function WaitlistModal({
  event: ev,
  position,
  lang,
  onClose,
}: {
  event: PublicEvent;
  position: number;
  lang: Lang;
  onClose: () => void;
}) {
  const displayTitle = getEventDisplayTitle(ev, lang);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(57, 41, 42, 0.45)",
        backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px", overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "relative", width: "100%", maxWidth: "480px", margin: "auto",
          border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px",
          padding: "clamp(28px, 5vw, 36px)", backgroundColor: "#FEFDF9",
          boxShadow: "0 20px 50px rgba(45,43,43,0.16)", textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: "16px", right: "16px",
            border: "none", background: "transparent", cursor: "pointer",
            color: "rgba(57,41,42,0.5)", width: "30px", height: "30px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "44px", height: "44px", borderRadius: "50%",
            background: "#edf5e8", color: "#568b05", marginBottom: "16px",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 12px", color: "#39292a" }}>
          {lang === "en" ? "You're on the waitlist." : "Estás en la lista de espera."}
        </h2>

        <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.76)", margin: "0 0 24px" }}>
          {lang === "en"
            ? `We'll hold place ${position} for you on “${displayTitle}”. If someone cancels, we email you; you have 12 hours to take it — inside 24 hours, the first to take it gets it. No credits are spent until you take it.`
            : `Guardamos el puesto ${position} para ti en “${displayTitle}”. Si alguien cancela, te enviamos un correo; tienes 12 horas para aceptarla — dentro de las 24 horas, la primera en reservar se la queda. No se gastan créditos hasta que la aceptes.`}
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            border: "1px solid #7b1f2c", backgroundColor: "transparent", color: "#7b1f2c",
            padding: "10px 28px", borderRadius: "4px", fontFamily: "var(--font-heading)",
            fontWeight: 600, fontSize: "14.5px", cursor: "pointer",
          }}
        >
          {lang === "en" ? "Got it" : "Entendido"}
        </button>
      </div>
    </div>
  );
}

// ─── TopUpModal (State 03: Short on credits — top up) ─────────────────────────

export function TopUpModal({
  event: ev,
  lang,
  creditBalance,
  isMember = false,
  onClose,
}: {
  event: PublicEvent | null;
  lang: Lang;
  creditBalance: number;
  isMember?: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ev) return null;

  const viewerCost = isMember ? (ev.memberCredits ?? ev.creditCost) : (ev.nonMemberCredits ?? ev.creditCost);
  const shortfall = viewerCost - creditBalance;
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

  const isGathering = ev.status === "published_pending" || ev.status === "pending";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(57, 41, 42, 0.45)",
        backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px", overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "relative", width: "100%", maxWidth: "480px", margin: "auto",
          border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px",
          padding: "clamp(28px, 5vw, 36px)", backgroundColor: "#FEFDF9",
          boxShadow: "0 20px 50px rgba(45,43,43,0.16)", textAlign: "left",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: "16px", right: "16px",
            border: "none", background: "transparent", cursor: "pointer",
            color: "rgba(57,41,42,0.5)", width: "30px", height: "30px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "8px" }}>
          {lang === "en" ? "ADD CREDITS & BOOK" : "AÑADIR CRÉDITOS Y RESERVAR"}
        </div>
        <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.8)", margin: "0 0 18px" }}>
          {lang === "en"
            ? <>This one costs {viewerCost} credits and you have {creditBalance}. Add {shortfall} credits for &euro;{shortfall * 2} and we&rsquo;ll book you in straight away.</>
            : <>Este encuentro cuesta {viewerCost} créditos y tienes {creditBalance}. Añade {shortfall} créditos por {shortfall * 2}€ y te reservaremos directamente.</>}
        </p>

        <div
          style={{
            border: "1px solid rgba(57,41,42,0.14)", borderRadius: "6px",
            padding: "14px 18px", marginBottom: "18px",
            backgroundColor: "#faf7f1",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0" }}>
            <span style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)" }}>
              {lang === "en" ? "This experience" : "Esta experiencia"}
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "14.5px", color: "#39292a" }}>
              {viewerCost} {lang === "en" ? "credits" : "créditos"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0", borderTop: "1px solid rgba(57,41,42,0.1)" }}>
            <span style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)" }}>
              {lang === "en" ? "Your balance" : "Tu saldo"}
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "14.5px", color: "#39292a" }}>
              {creditBalance} {lang === "en" ? (creditBalance === 1 ? "credit" : "credits") : (creditBalance === 1 ? "crédito" : "créditos")}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0", borderTop: "1px solid rgba(57,41,42,0.1)" }}>
            <span style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)" }}>
              {lang === "en" ? `Add ${shortfall} ${shortfall === 1 ? "credit" : "credits"} — €2 each` : `Añadir ${shortfall} ${shortfall === 1 ? "crédito" : "créditos"} — 2€ cada uno`}
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "14.5px", color: "#7b1f2c", fontWeight: 600 }}>
              &euro;{shortfall * 2}
            </span>
          </div>
        </div>

        {error && (
          <div style={{ color: "#993842", fontSize: "13.5px", marginBottom: "14px", background: "#fbf1f1", padding: "10px 14px", borderRadius: "6px", lineHeight: 1.5 }}>
            {error === "MEMBER_ACCOUNT_REQUIRED" || error.includes("MEMBER_ACCOUNT_REQUIRED") ? (
              <div>
                <span>
                  {lang === "en"
                    ? "An active membership is required to purchase credits and reserve member-only events."
                    : "Se requiere una membresía activa para comprar créditos y reservar encuentros de socias."}
                </span>
                <div style={{ marginTop: "8px" }}>
                  <Link
                    href="/membership"
                    style={{
                      color: "#7b1f2c",
                      fontWeight: 600,
                      textDecoration: "underline",
                      fontSize: "13.5px",
                    }}
                  >
                    {lang === "en" ? "Explore Membership →" : "Ver membresía →"}
                  </Link>
                </div>
              </div>
            ) : (
              error
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "14px", marginTop: "4px", borderTop: "1px solid rgba(57,41,42,0.12)" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none", background: "transparent", color: "rgba(57,41,42,0.65)",
              fontSize: "14.5px", cursor: "pointer", padding: "8px 0",
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
              padding: "10px 24px", borderRadius: "4px", fontFamily: "var(--font-heading)",
              fontWeight: 600, fontSize: "14.5px", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading
              ? (lang === "en" ? "Processing..." : "Procesando...")
              : (lang === "en" ? "Book" : "Reservar")}
          </button>
        </div>

        <p style={{ fontSize: "12px", lineHeight: "1.5", color: "rgba(57,41,42,0.58)", margin: "14px 0 0" }}>
          {lang === "en"
            ? <>Top-up credits join your balance under the same rules: 6-month expiry, oldest credits used first.{isGathering ? " Balance below cost. On a to-be-confirmed event the wording changes to “held against your place”." : ""}</>
            : <>Los créditos recargados se añaden a tu saldo con las mismas reglas: caducidad a 6 meses, se usan primero los más antiguos.{isGathering ? " Saldo por debajo del coste. En un evento pendiente de confirmación, los créditos se retienen para tu plaza." : ""}</>}
        </p>
      </div>
    </div>
  );
}

// ─── BookingSuccessModal (States 01, 02, 05) ───────────────────────────────────

export function BookingSuccessModal({
  event: ev,
  lang,
  remainingCredits,
  isMember = false,
  onClose,
}: {
  event: PublicEvent;
  lang: Lang;
  remainingCredits: number;
  isMember?: boolean;
  onClose: () => void;
}) {
  const displayTitle = getEventDisplayTitle(ev, lang);
  const formattedDate = formatEventDate(ev.startsAt, lang);
  const viewerCost = isMember ? (ev.memberCredits ?? ev.creditCost) : (ev.nonMemberCredits ?? ev.creditCost);
  const isFreeWalk = viewerCost === 0 || (ev.isFreeWalk && isMember);

  const isGathering =
    (ev.status === "pending" || ev.status === "published_pending") &&
    (ev.minToConfirm ?? 0) > 0;
  const moreNeeded = Math.max(0, (ev.minToConfirm ?? 0) - (ev.bookedMember ?? 0));

  // ── State 02: Reserved, to be confirmed ─────────────────────────────
  if (isGathering) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          backgroundColor: "rgba(57, 41, 42, 0.45)",
          backdropFilter: "blur(3px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px", overflowY: "auto",
        }}
      >
        <div
          style={{
            position: "relative", width: "100%", maxWidth: "480px", margin: "auto",
            border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px",
            padding: "clamp(28px, 5vw, 36px)", backgroundColor: "#FEFDF9",
            boxShadow: "0 20px 50px rgba(45,43,43,0.16)", textAlign: "center",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute", top: "16px", right: "16px",
              border: "none", background: "transparent", cursor: "pointer",
              color: "rgba(57,41,42,0.5)", width: "30px", height: "30px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>

          <div
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "44px", height: "44px", borderRadius: "50%",
              background: "#fbf3e4", color: "#7b1f2c", marginBottom: "16px",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
              <path d="M19 21H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2Z" />
              <path d="M16 3v4M8 3v4M3 11h18" />
              <path d="m9 16 2 2 4-4" />
            </svg>
          </div>

          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 12px", color: "#39292a" }}>
            {lang === "en" ? "Your place is reserved." : "Tu plaza está reservada."}
          </h2>

          <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.76)", margin: "0 0 24px" }}>
            {lang === "en" ? (
              <>
                A few more mothers and this one is confirmed. Your credits are spent, so the place is truly yours — and if it does not run, they come back to you automatically.
              </>
            ) : (
              <>
                Unas madres más y este encuentro estará confirmado. Tus créditos están reservados, por lo que la plaza es verdaderamente tuya — y si no se lleva a cabo, vuelven a ti automáticamente.
              </>
            )}
          </p>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #7b1f2c", backgroundColor: "transparent", color: "#7b1f2c",
              padding: "10px 28px", borderRadius: "4px", fontFamily: "var(--font-heading)",
              fontWeight: 600, fontSize: "14.5px", cursor: "pointer",
            }}
          >
            {lang === "en" ? "Got it" : "Entendido"}
          </button>
        </div>
      </div>
    );
  }

  // ── State 05: Free Walk (Unlimited event) ───────────────────────────
  if (isFreeWalk) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          backgroundColor: "rgba(57, 41, 42, 0.45)",
          backdropFilter: "blur(3px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px", overflowY: "auto",
        }}
      >
        <div
          style={{
            position: "relative", width: "100%", maxWidth: "480px", margin: "auto",
            border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px",
            padding: "clamp(28px, 5vw, 36px)", backgroundColor: "#FEFDF9",
            boxShadow: "0 20px 50px rgba(45,43,43,0.16)", textAlign: "center",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute", top: "16px", right: "16px",
              border: "none", background: "transparent", cursor: "pointer",
              color: "rgba(57,41,42,0.5)", width: "30px", height: "30px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>

          <div
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: "44px", height: "44px", borderRadius: "50%",
              background: "#edf5e8", color: "#568b05", marginBottom: "16px",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>

          <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 12px", color: "#39292a" }}>
            {lang === "en" ? "Your place is booked." : "Tu plaza está reservada."}
          </h2>

          <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.76)", margin: "0 0 16px" }}>
            {lang === "en" ? (
              <>
                Your place at “{displayTitle}” on {formattedDate} is booked. The exact meeting point details will be sent before the event.
              </>
            ) : (
              <>
                Tu plaza en “{displayTitle}” el {formattedDate} está reservada. Los detalles exactos del punto de encuentro se enviarán antes del evento.
              </>
            )}
          </p>

          <div
            style={{
              border: "1px solid rgba(86,139,5,0.35)", background: "rgba(86,139,5,0.07)",
              borderRadius: "6px", padding: "12px 16px", margin: "0 0 20px", textAlign: "left",
            }}
          >
            <div style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#568b05", fontWeight: 600, marginBottom: "6px" }}>
              {lang === "en" ? "What happens next" : "Qué ocurre después"}
            </div>
            <div style={{ fontSize: "13px", lineHeight: "1.6", color: "rgba(57,41,42,0.78)" }}>
              {lang === "en" ? (
                <>
                  · Your place is held — there is no limit on places for this one, so nothing to wait on.<br />
                  · The day before — we send you the exact meeting point by email.
                </>
              ) : (
                <>
                  · Tu plaza está reservada — no hay límite de plazas para este encuentro, no hay que esperar.<br />
                  · El día anterior — te enviamos el punto de encuentro exacto por email.
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #7b1f2c", backgroundColor: "transparent", color: "#7b1f2c",
              padding: "10px 28px", borderRadius: "4px", fontFamily: "var(--font-heading)",
              fontWeight: 600, fontSize: "14.5px", cursor: "pointer",
            }}
          >
            {lang === "en" ? "Got it" : "Entendido"}
          </button>
        </div>
      </div>
    );
  }

  // ── State 01: Confirmed with Credits (Capped event, credits spent) ──
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(57, 41, 42, 0.45)",
        backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px", overflowY: "auto",
      }}
    >
      <div
        style={{
          position: "relative", width: "100%", maxWidth: "480px", margin: "auto",
          border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px",
          padding: "clamp(28px, 5vw, 36px)", backgroundColor: "#FEFDF9",
          boxShadow: "0 20px 50px rgba(45,43,43,0.16)", textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: "16px", right: "16px",
            border: "none", background: "transparent", cursor: "pointer",
            color: "rgba(57,41,42,0.5)", width: "30px", height: "30px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "44px", height: "44px", borderRadius: "50%",
            background: "#edf5e8", color: "#568b05", marginBottom: "16px",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 12px", color: "#39292a" }}>
          {lang === "en" ? "Your place is booked." : "Tu plaza está reservada."}
        </h2>

        <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.76)", margin: "0 0 16px" }}>
          {lang === "en" ? (
            <>
              Your place at “{displayTitle}” on {formattedDate} is booked, using {viewerCost} credit{viewerCost === 1 ? "" : "s"}. You have {remainingCredits} credit{remainingCredits === 1 ? "" : "s"} left this month.
            </>
          ) : (
            <>
              Tu plaza en “{displayTitle}” el {formattedDate} está reservada, usando {viewerCost} crédito{viewerCost === 1 ? "" : "s"}. Te quedan {remainingCredits} crédito{remainingCredits === 1 ? "" : "s"} este mes.
            </>
          )}
        </p>

        <div
          style={{
            border: "1px solid rgba(86,139,5,0.35)", background: "rgba(86,139,5,0.07)",
            borderRadius: "6px", padding: "12px 16px", margin: "0 0 14px", textAlign: "left",
          }}
        >
          <div style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#568b05", fontWeight: 600, marginBottom: "6px" }}>
            {lang === "en" ? "What happens next" : "Qué ocurre después"}
          </div>
          <div style={{ fontSize: "13px", lineHeight: "1.6", color: "rgba(57,41,42,0.78)" }}>
            {lang === "en" ? (
              <>
                · Three days before — an email confirming whether you have a place.<br />
                · The day before — we send you the exact meeting point by email.
              </>
            ) : (
              <>
                · Tres días antes — un email confirmando si tienes plaza.<br />
                · El día anterior — te enviamos el punto de encuentro exacto por email.
              </>
            )}
          </div>
        </div>

        <p style={{ fontSize: "12.5px", lineHeight: "1.55", color: "rgba(57,41,42,0.58)", margin: "0 0 20px", fontStyle: "italic" }}>
          {lang === "en"
            ? "Change of plans? Cancel more than 24 hours ahead and the credits come straight back."
            : "¿Cambio de planes? Cancela con más de 24 horas de antelación y los créditos se devuelven al momento."}
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            border: "1px solid #7b1f2c", backgroundColor: "transparent", color: "#7b1f2c",
            padding: "10px 28px", borderRadius: "4px", fontFamily: "var(--font-heading)",
            fontWeight: 600, fontSize: "14.5px", cursor: "pointer",
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
  onOpenSignedOut: (ev: PublicEvent) => void;
  onOpenTopUp: (ev: PublicEvent) => void;
  onMemberBook: (ev: PublicEvent) => void;
  onMemberWaitlist: (ev: PublicEvent) => void;
  isBooking?: boolean;
  isMember: boolean;
  creditBalance?: number;
}

export function EventCardImage({
  imageUrl,
  imageId,
  title,
  lang,
}: {
  imageUrl?: string | null;
  imageId?: string | null;
  title: string;
  lang: Lang;
}) {
  const [error, setError] = useState(false);
  const resolvedUrl =
    imageUrl ||
    (imageId &&
    (imageId.startsWith("http") ||
      imageId.startsWith("/") ||
      imageId.startsWith("data:"))
      ? imageId
      : null);

  if (!resolvedUrl || error) {
    return (
      <div
        className="event-photo-fallback"
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          textAlign: "center",
          color: "rgba(57, 41, 42, 0.55)",
          fontSize: "13px",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "3px",
          backgroundColor: "transparent",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" width="28" height="28" style={{ opacity: 0.7, marginBottom: "2px" }}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span style={{ fontSize: "13px", fontWeight: 500 }}>{lang === "en" ? "Event photo" : "Foto del evento"}</span>
        <span style={{ fontSize: "11px", color: "rgba(57,41,42,0.4)" }}>{lang === "en" ? "or browse files" : "o explorar fotos"}</span>
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={title}
      style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s ease" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1.03)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
      onError={() => setError(true)}
    />
  );
}

function EventCard({
  ev,
  lang,
  onOpenSignedOut,
  onOpenTopUp,
  onMemberBook,
  onMemberWaitlist,
  isBooking = false,
  isMember,
  creditBalance = 0,
}: EventCardProps) {
  const isCancelled = ev.status === "cancelled";
  const isPast = ev.status === "past" || ev.status === "completed" ||
    (ev.endsAt ? new Date(ev.endsAt) < new Date() : new Date(ev.startsAt) < new Date());
  const isPending = ev.status === "published_pending" || ev.status === "pending";
  const isFull = ev.isFull || false;
  const isOpenList = !ev.capacityTotal || ev.capacityTotal === 0;

  const catInfo = getCategoryInfo(ev, lang);
  const viewerCost = isMember ? (ev.memberCredits ?? ev.creditCost) : (ev.nonMemberCredits ?? ev.creditCost);
  const isViewerFree = viewerCost === 0 || (ev.isFreeWalk && isMember);

  const handleBookClick = () => {
    if (!isMember) {
      onOpenSignedOut(ev);
      return;
    }

    if (isFull) {
      onMemberWaitlist(ev);
    } else if (viewerCost > 0 && creditBalance < viewerCost) {
      onOpenTopUp(ev);
    } else {
      onMemberBook(ev);
    }
  };

  const photoBorderColor = isPast || isCancelled
    ? "rgba(57,41,42,0.22)"
    : isPending
    ? "rgba(164,118,31,0.4)"
    : "rgba(86,139,5,0.4)";

  return (
    <article
      style={{
        border: `1px solid ${getCardBorder(ev, isPast)}`,
        borderRadius: "8px",
        padding: "20px 20px 22px",
        backgroundColor: getCardBg(ev, isPast),
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxSizing: "border-box",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
      }}
    >
      {/* Photo Container with Top Category Badge */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "170px",
          borderRadius: "6px",
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.25)",
          border: `1px dashed ${photoBorderColor}`,
        }}
      >
        <Link
          href={`/events/${ev.slug || ev.id}`}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          <EventCardImage
            imageUrl={ev.imageUrl}
            imageId={ev.imageId}
            title={getEventDisplayTitle(ev, lang)}
            lang={lang}
          />
        </Link>

        {/* Floating Category Pill on top-left of image */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            pointerEvents: "none",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span
            style={{
              fontSize: "11.5px",
              letterSpacing: "0.03em",
              color: "#7b1f2c",
              border: "1px solid rgba(123,31,44,0.3)",
              borderRadius: "12px",
              padding: "3px 11px",
              whiteSpace: "nowrap",
              background: "rgba(255, 255, 255, 0.94)",
              backdropFilter: "blur(4px)",
              boxShadow: "0 2px 5px rgba(0,0,0,0.06)",
              fontWeight: 500,
            }}
          >
            {catInfo.label}
          </span>
          {ev.userStatus?.isBooked && !isCancelled && (
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "0.04em",
                color: isPending ? "#7a5612" : "#456f04",
                background: isPending ? "rgba(164,118,31,0.12)" : "rgba(86,139,5,0.12)",
                border: isPending ? "1px solid rgba(164,118,31,0.45)" : "1px solid rgba(86,139,5,0.45)",
                borderRadius: "10px",
                padding: "3px 9px",
                whiteSpace: "nowrap",
                fontWeight: 600,
                backdropFilter: "blur(4px)",
              }}
            >
              {isPending
                ? (lang === "en" ? "Place held" : "Plaza retenida")
                : (lang === "en" ? "Booked" : "Reservada")}
            </span>
          )}
          {isCancelled && (
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#993842",
                border: "1px solid rgba(153,56,66,0.45)",
                background: "rgba(255,255,255,0.94)",
                borderRadius: "10px",
                padding: "3px 9px",
                whiteSpace: "nowrap",
                fontWeight: 600,
              }}
            >
              {lang === "en" ? "Cancelled" : "Cancelado"}
            </span>
          )}
          {ev.isSignature && !isCancelled && (
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "0.04em",
                color: "#fdfaf5",
                border: "1px solid #7b1f2c",
                background: "#7b1f2c",
                borderRadius: "10px",
                padding: "3px 9px",
                whiteSpace: "nowrap",
                fontWeight: 500,
              }}
            >
              {lang === "en" ? "Members only" : "Solo socias"}
            </span>
          )}
        </div>
      </div>

      {/* Subheader: Stage & Audience on left, Price/Credits on right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          marginTop: "14px",
          paddingTop: "12px",
          borderTop: "1px dotted rgba(57, 41, 42, 0.22)",
        }}
      >
        <div
          style={{
            fontSize: "12.5px",
            color: "rgba(57, 41, 42, 0.68)",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <span>
            {(() => {
              const stageInfo = getEventStageDisplay(ev, lang);
              const audienceLabel = ev.audienceType
                ? (ev.audienceType === "moms_only" || ev.audienceType === "mothers_only"
                    ? (lang === "en" ? "Mothers only" : "Solo madres")
                    : (lang === "en" ? "Kids welcome" : "Peques bienvenidos"))
                : null;
              const parts: string[] = [];
              if (stageInfo.isAllStages) {
                parts.push(stageInfo.displayLabel);
              } else if (stageInfo.stages.length > 0) {
                parts.push(stageInfo.stages.join(" · "));
              }
              if (audienceLabel) parts.push(audienceLabel);
              if (ev.isOnline) parts.push(lang === "en" ? "Online" : "En línea");
              return parts.join(" · ");
            })()}
          </span>
        </div>

        {/* Price / Credits ("Free" / "Gratis" when 0 credit) */}
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "15px",
            color: isViewerFree || viewerCost === 0 ? "#456f04" : "#39292a",
            whiteSpace: "nowrap",
            flexShrink: 0,
            fontFeatureSettings: "'tnum'",
          }}
        >
          {isViewerFree || viewerCost === 0
            ? (lang === "en" ? "Free" : "Gratis")
            : `${viewerCost} ${lang === "en" ? (viewerCost === 1 ? "credit" : "credits") : (viewerCost === 1 ? "crédito" : "créditos")}`}
        </div>
      </div>

      {/* Event Title */}
      <h3
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 600,
          fontSize: "21px",
          margin: "6px 0 0",
          lineHeight: 1.25,
          color: "#39292a",
        }}
      >
        <Link
          href={`/events/${ev.slug || ev.id}`}
          style={{ color: "inherit", textDecoration: "none" }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.textDecoration = "underline")}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.textDecoration = "none")}
        >
          {getEventDisplayTitle(ev, lang)}
        </Link>
      </h3>

      {/* Date & Location snippet */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px", color: "rgba(57,41,42,0.72)", marginTop: "8px" }}>
        <div>{formatEventDate(ev.startsAt, lang)}</div>
        <div>
          {[
            ev.neighbourhood,
            ev.venueName,
            ev.partnerName || "The Mothers",
          ].filter(Boolean).join(" · ")}
        </div>
        {(() => {
          const langs = ev.languages && ev.languages.length > 0 ? ev.languages : ["es", "en"];
          return (
            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12.5px", color: "rgba(57,41,42,0.72)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10Z" />
              </svg>
              <span>{langs.map((l) => getLanguageLabel(l, lang)).join(", ")}</span>
            </div>
          );
        })()}
      </div>

      {/* Status & More Details Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(57,41,42,0.12)" }}>
        {isCancelled ? (
          <div style={{ fontSize: "13px", color: "#993842", fontWeight: 600 }}>
            {lang === "en" ? "Cancelled" : "Cancelado"}{ev.cancelReason ? ` — ${ev.cancelReason}` : ""}
          </div>
        ) : isPast ? (
          <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.65)" }}>
            {lang === "en" ? "This one has already happened." : "Este evento ya ha tenido lugar."}
          </div>
        ) : isPending && ev.minToConfirm ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: "13px", color: "#8a6116", fontWeight: 600 }}>
              <span>{lang === "en" ? "Minimum mothers to confirm" : "Mínimo de madres para confirmar"}</span>
              <span style={{ fontFeatureSettings: "'tnum'" }}>{ev.bookedMember || 0} of {ev.minToConfirm}</span>
            </div>
            <div style={{ height: "3px", borderRadius: "2px", background: "rgba(164,118,31,0.2)", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#a4761f", width: `${Math.min(100, (((ev.bookedMember || 0) / ev.minToConfirm) * 100))}%` }} />
            </div>
            <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.68)" }}>
              {lang === "en"
                ? `The team confirms by ${formatDecideByDate(ev.startsAt, lang, ev.decisionAt)}.`
                : `El equipo confirma antes del ${formatDecideByDate(ev.startsAt, lang, ev.decisionAt)}.`}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13.5px", color: "#456f04", fontWeight: 600 }}>
              <span>{lang === "en" ? "Confirmed — going ahead" : "Confirmado — se realiza"}</span>
            </div>
            <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.68)" }}>
              {isOpenList
                ? (lang === "en" ? "No limit on places" : "Sin límite de plazas")
                : (lang === "en" ? "Meeting point shared once you book" : "Punto de encuentro compartido tras reservar")}
            </div>
          </div>
        )}

        {/* More details link that opens the event page */}
        <Link
          href={`/events/${ev.slug || ev.id}`}
          style={{
            color: "#7b1f2c",
            fontSize: "12.5px",
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            width: "fit-content",
            marginTop: "2px",
          }}
        >
          <span style={{ textDecoration: "underline", textUnderlineOffset: "2px" }}>
            {lang === "en" ? "More details" : "Más detalles"}
          </span>
          <span style={{ fontSize: "11px", textDecoration: "none", display: "inline-block" }}>→</span>
        </Link>
      </div>

      {/* ─── Compact Footer (1b): Places on left, Button on right ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginTop: "auto",
          paddingTop: "14px",
          borderTop: "1px solid rgba(57, 41, 42, 0.12)",
        }}
      >
        {/* Left: Capacity / Places left */}
        <div
          style={{
            fontSize: "13px",
            color: isFull || (!isOpenList && (ev.capacityRemaining ?? ev.capacityTotal ?? 10) <= 3) ? "#993842" : "rgba(57, 41, 42, 0.75)",
            fontWeight: isFull || (!isOpenList && (ev.capacityRemaining ?? ev.capacityTotal ?? 10) <= 3) ? 600 : 400,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {isPast ? (
            lang === "en" ? "Past event" : "Evento pasado"
          ) : isCancelled ? (
            lang === "en" ? "Cancelled" : "Cancelado"
          ) : ev.userStatus?.isBooked ? (
            /* No need for precision about "place booked" here as the CTA is already "booked" */
            isOpenList
              ? (lang === "en" ? "Open list — no limit on places" : "Lista abierta — sin límite de plazas")
              : (lang === "en"
                  ? `Places left: ${ev.capacityRemaining ?? ev.capacityTotal} of ${ev.capacityTotal}`
                  : `Plazas libres: ${ev.capacityRemaining ?? ev.capacityTotal} de ${ev.capacityTotal}`)
          ) : isOpenList ? (
            lang === "en" ? "Open list — no limit on places" : "Lista abierta — sin límite de plazas"
          ) : isFull ? (
            lang === "en" ? `Places left: 0 of ${ev.capacityTotal ?? 0}` : `Plazas libres: 0 de ${ev.capacityTotal ?? 0}`
          ) : (
            lang === "en"
              ? `Places left: ${ev.capacityRemaining ?? ev.capacityTotal} of ${ev.capacityTotal}`
              : `Plazas libres: ${ev.capacityRemaining ?? ev.capacityTotal} de ${ev.capacityTotal}`
          )}
        </div>

        {/* Right: CTA Button */}
        <div style={{ flexShrink: 0 }}>
          {isPast ? (
            <button
              disabled
              style={{
                border: "1px solid rgba(57,41,42,0.2)",
                backgroundColor: "transparent",
                color: "rgba(57,41,42,0.4)",
                padding: "8px 18px",
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
          ) : isCancelled ? null : ev.userStatus?.isBooked ? (
            <span
              style={{
                border: "1px solid rgba(86,139,5,0.45)",
                backgroundColor: "rgba(86,139,5,0.08)",
                color: "#456f04",
                padding: "8px 18px",
                borderRadius: "4px",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "14px",
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
            >
              {lang === "en" ? "Booked" : "Reservada"}
            </span>
          ) : ev.userStatus?.isWaitlisted ? (
            <Link
              href={`/events/${ev.id}`}
              style={{
                border: "1px solid rgba(57,41,42,0.3)",
                backgroundColor: "transparent",
                color: "rgba(57,41,42,0.7)",
                padding: "8px 16px",
                borderRadius: "4px",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "13.5px",
                textDecoration: "none",
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
            >
              {lang === "en" ? "Waitlisted" : "En espera"}
            </Link>
          ) : isFull ? (
            isMember ? (
              <button
                type="button"
                onClick={handleBookClick}
                disabled={isBooking}
                style={{
                  border: "1px solid #7b1f2c",
                  backgroundColor: "transparent",
                  color: "#7b1f2c",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {isBooking ? (lang === "en" ? "Joining..." : "Uniéndome...") : (lang === "en" ? "Waitlist" : "Lista")}
              </button>
            ) : null
          ) : (
            <button
              type="button"
              onClick={handleBookClick}
              disabled={isBooking}
              style={{
                border: "1px solid #7b1f2c",
                backgroundColor: "#7b1f2c",
                color: "#f8efe2",
                padding: "8px 22px",
                borderRadius: "4px",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#621823")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#7b1f2c")}
            >
              {isBooking
                ? (lang === "en" ? "Booking..." : "Reservando...")
                : (lang === "en" ? "Book" : "Reservar")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Main EventsCalendar Component ───────────────────────────────────────────

export function EventsCalendar({ events, categories, creditBalance = 0 }: Props) {
  const { data: session } = useSession();
  const isMember = (session?.user as any)?.role === "member" && !!(session?.user as any)?.memberId;

  const { language: lang } = useLanguage();
  const [eventsList, setEventsList] = useState<PublicEvent[]>(events);
  const [currentCreditBalance, setCurrentCreditBalance] = useState<number>(creditBalance);
  const [bookingLoadingId, setBookingLoadingId] = useState<string | null>(null);
  
  const [bookingSuccessEvent, setBookingSuccessEvent] = useState<PublicEvent | null>(null);
  const [waitlistSuccess, setWaitlistSuccess] = useState<{ event: PublicEvent; position: number } | null>(null);
  const [signedOutEvent, setSignedOutEvent] = useState<PublicEvent | null>(null);
  const [topUpEvent, setTopUpEvent] = useState<PublicEvent | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    import("@/app/actions/adminSettings").then(({ getPublicClubSettings }) => {
      getPublicClubSettings().then((s) => {
        if (s.membershipLive) setIsLive(true);
      }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    setEventsList(events);
  }, [events]);

  useEffect(() => {
    setCurrentCreditBalance(creditBalance);
  }, [creditBalance]);

  // Intent preservation for returning signed-in members (§3 State 13)
  useEffect(() => {
    if (typeof window !== "undefined" && session?.user && eventsList.length > 0) {
      const query = new URLSearchParams(window.location.search);
      const bookEventId = query.get("book_event");
      if (bookEventId) {
        const targetEv = eventsList.find((e) => e.id === bookEventId);
        if (targetEv && !targetEv.userStatus?.isBooked) {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
          handleMemberBook(targetEv);
        }
      }
    }
  }, [session, eventsList]);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeDateFilter, setActiveDateFilter] = useState<string>("all");
  const [activeStatus, setActiveStatus] = useState<string>("all");
  const [activeStage, setActiveStage] = useState<string>("all");
  const [activeAudience, setActiveAudience] = useState<string>("all");
  const [freeOnly, setFreeOnly] = useState<boolean>(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".pill-dropdown-item")) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleMemberBook = async (ev: PublicEvent) => {
    setBookingLoadingId(ev.id);
    setBookingError(null);
    try {
      const res = await bookEvent(ev.id);
      if (res.success) {
        const isFree = ev.creditCost === 0 || (ev.isFreeWalk && (isMember || !isLive));
        const chargedCost = isFree
          ? 0
          : (isLive
              ? (isMember ? (ev.memberCredits ?? ev.creditCost ?? 0) : (ev.nonMemberCredits ?? ev.creditCost ?? 0))
              : (ev.creditCost ?? 0));
        const newCredits = Math.max(0, currentCreditBalance - chargedCost);
        setCurrentCreditBalance(newCredits);

        const newBookedCount = (ev.bookedMember || 0) + 1;
        const finalStatus =
          res.eventStatus ||
          (ev.minToConfirm && newBookedCount >= ev.minToConfirm ? "confirmed" : ev.status);

        const updatedEv: PublicEvent = {
          ...ev,
          status: finalStatus,
          placesTaken: (ev.placesTaken || 0) + 1,
          bookedMember: newBookedCount,
          capacityRemaining:
            ev.capacityRemaining != null ? Math.max(0, ev.capacityRemaining - 1) : null,
          userStatus: {
            ...ev.userStatus,
            isBooked: true,
            bookedAt: new Date(),
            creditsCharged: chargedCost,
          },
        };

        setEventsList((prev) =>
          prev.map((e) => (e.id === ev.id ? updatedEv : e))
        );
        setBookingSuccessEvent(updatedEv);

        if (typeof window !== "undefined") {
          sessionStorage.setItem("tm_first_booking_done", "1");
          window.dispatchEvent(new Event("tm_first_booking_done"));
        }
      } else {
        if (res.error === "INSUFFICIENT_CREDITS") {
          setTopUpEvent(ev);
        } else {
          setBookingError(res.error || (lang === "en" ? "Could not complete booking." : "No se pudo completar la reserva."));
        }
      }
    } catch (err: any) {
      console.error("Booking error:", err);
      const msg = err?.message || "";
      if (msg.includes("Server Action") || msg.includes("failed to fetch") || msg.includes("Failed to fetch")) {
        setBookingError(
          lang === "en"
            ? "The site has updated in the background. Please refresh the page and try again."
            : "El sitio se ha actualizado. Por favor recarga la página e inténtalo de nuevo."
        );
      } else {
        setBookingError(err?.message || (lang === "en" ? "Booking failed." : "Error al reservar."));
      }
    } finally {
      setBookingLoadingId(null);
    }
  };

  const handleMemberWaitlist = async (ev: PublicEvent) => {
    setBookingLoadingId(ev.id);
    setBookingError(null);
    try {
      const res = await joinEventWaitlist(ev.id);
      if (res.success && res.position != null) {
        const updatedEv: PublicEvent = {
          ...ev,
          userStatus: {
            ...ev.userStatus,
            isWaitlisted: true,
            waitlistPosition: res.position,
            waitlistCreatedAt: new Date(),
          },
        };
        setEventsList((prev) =>
          prev.map((e) => (e.id === ev.id ? updatedEv : e))
        );
        setWaitlistSuccess({ event: updatedEv, position: res.position });
      } else {
        setBookingError(res.error || (lang === "en" ? "Could not join waitlist." : "No se pudo unir a la lista de espera."));
      }
    } catch (err: any) {
      console.error("Waitlist join error:", err);
      setBookingError(err?.message || (lang === "en" ? "Waitlist request failed." : "Error en la lista de espera."));
    } finally {
      setBookingLoadingId(null);
    }
  };

  // Category options
  const catOpts = [
    { key: "all", label: lang === "en" ? "All types" : "Todos los tipos" },
    { key: "easy", label: "Easy connection" },
    { key: "baby", label: "Play date" },
    { key: "evenings", label: "MoM's date" },
    { key: "learn", label: "Learn & Grow" },
    { key: "signature", label: "Signature moments" },
  ];

  // Stage options
  const stageOpts = [
    { key: "all", label: lang === "en" ? "All stages" : "Todas las etapas" },
    { key: "pregnant", label: lang === "en" ? "Pregnant" : "Embarazo" },
    { key: "babies", label: lang === "en" ? "Babies" : "Bebés" },
    { key: "toddlers", label: lang === "en" ? "Toddlers" : "Peques" },
    { key: "children", label: lang === "en" ? "Children" : "Niños" },
    { key: "big_kids", label: lang === "en" ? "Big kids" : "Niños mayores" },
  ];

  // Audience options
  const groupOpts = [
    { key: "all", label: lang === "en" ? "All groups" : "Todos los grupos" },
    { key: "kids", label: lang === "en" ? "Kids welcome" : "Con peques" },
    { key: "moms", label: lang === "en" ? "Mothers only" : "Solo madres" },
  ];

  // Dynamic Month options
  const now = new Date();
  const currentMonthNameEn = now.toLocaleString("en-US", { month: "long" });
  const currentMonthNameEs = now.toLocaleString("es-ES", { month: "long" });
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthNameEn = nextMonthDate.toLocaleString("en-US", { month: "long" });
  const nextMonthNameEs = nextMonthDate.toLocaleString("es-ES", { month: "long" });

  const monthOpts = [
    { key: "all", label: lang === "en" ? "All dates" : "Todas las fechas" },
    { key: "this_month", label: lang === "en" ? `This month · ${currentMonthNameEn}` : `Este mes · ${currentMonthNameEs}` },
    { key: "next_month", label: lang === "en" ? `Next month · ${nextMonthNameEn}` : `Próximo mes · ${nextMonthNameEs}` },
  ];

  const stateOpts = [
    { key: "all", label: lang === "en" ? "Any status" : "Cualquier estado" },
    { key: "confirmed", label: lang === "en" ? "Confirmed" : "Confirmados" },
    { key: "pending", label: lang === "en" ? "To be confirmed" : "Por confirmar" },
    { key: "cancelled", label: lang === "en" ? "Cancelled" : "Cancelados" },
    { key: "past", label: lang === "en" ? "Past" : "Pasados" },
  ];

  const hasActiveFilters = activeCategory !== "all" || activeDateFilter !== "all" || activeStatus !== "all" || activeStage !== "all" || activeAudience !== "all" || freeOnly;

  const clearAllFilters = () => {
    setActiveCategory("all");
    setActiveDateFilter("all");
    setActiveStatus("all");
    setActiveStage("all");
    setActiveAudience("all");
    setFreeOnly(false);
  };

  // Filtering
  const filtered = eventsList.filter((ev) => {
    // 0. Free events only
    if (freeOnly) {
      const viewerCost = isMember ? (ev.memberCredits ?? ev.creditCost) : (ev.nonMemberCredits ?? ev.creditCost);
      const isFree = viewerCost === 0 || (ev.isFreeWalk === true && isMember);
      if (!isFree) return false;
    }

    // 1. Category match
    if (activeCategory !== "all") {
      const catInfo = getCategoryInfo(ev, "en");
      if (activeCategory !== catInfo.key) return false;
    }

    // 2. Stage match
    if (activeStage !== "all") {
      const stageInfo = getEventStageDisplay(ev, "en");
      if (!stageInfo.isAllStages) {
        const stageKeys = (ev.targetStages || []).map(s => s.toLowerCase());
        const hasMatch = stageKeys.some(sk => {
          if (activeStage === "big_kids" || activeStage === "big kids") return sk.includes("big") || sk.includes("grande") || sk.includes("10+") || sk.includes("6–10") || sk.includes("6-10") || sk.includes("6+") || sk.includes("children610");
          if (activeStage === "babies") return sk.includes("bab") || sk.includes("0–12") || sk.includes("0-12") || sk.includes("postpartum") || sk.includes("posparto");
          if (activeStage === "toddlers") return sk.includes("toddler") || sk.includes("peque") || sk.includes("1–3") || sk.includes("1-3");
          if (activeStage === "children") return sk.includes("child") || sk.includes("niño") || sk.includes("3–6") || sk.includes("3-6") || sk.includes("3y+") || sk.includes("children36");
          if (activeStage === "pregnant") return sk.includes("pregnant") || sk.includes("embaraz") || sk.includes("expecting");
          return sk.includes(activeStage);
        });
        if (!hasMatch) {
          const rawStage = (ev.stage || "").toLowerCase();
          let fallbackMatch = false;
          if (activeStage === "big_kids" || activeStage === "big kids") {
            fallbackMatch = rawStage.includes("big") || rawStage.includes("grande") || rawStage.includes("10+") || rawStage.includes("6–10") || rawStage.includes("6-10") || rawStage.includes("6+");
          } else if (activeStage === "babies") {
            fallbackMatch = rawStage.includes("bab") || rawStage.includes("0–12") || rawStage.includes("0-12") || rawStage.includes("postpartum") || rawStage.includes("posparto");
          } else if (activeStage === "toddlers") {
            fallbackMatch = rawStage.includes("toddler") || rawStage.includes("peque") || rawStage.includes("1–3") || rawStage.includes("1-3");
          } else if (activeStage === "children") {
            fallbackMatch = rawStage.includes("child") || rawStage.includes("niño") || rawStage.includes("3–6") || rawStage.includes("3-6") || rawStage.includes("3y+");
          } else if (activeStage === "pregnant") {
            fallbackMatch = rawStage.includes("pregnant") || rawStage.includes("embaraz");
          } else {
            fallbackMatch = rawStage.includes(activeStage);
          }
          if (!fallbackMatch) return false;
        }
      }
    }

    // 3. Audience / Kids match
    if (activeAudience === "kids") {
      const isMomsOnly = ev.audienceType === "mothers_only" || ev.audienceType === "moms_only" || ev.categorySlug === "evenings" || (ev.title && ev.title.toLowerCase().includes("date"));
      if (isMomsOnly) return false;
    } else if (activeAudience === "moms") {
      const isKids = ev.audienceType === "kids_welcome" || ev.categorySlug === "baby";
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
      // Show ALL events (past and cancelled placed below by sorter)
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
    <div style={{ backgroundColor: "#fdf8f2", minHeight: "100vh", fontFamily: "'Lora', Georgia, serif", color: "#39292a" }}>
      {/* ─── HERO HEADER ─── */}
      <section style={{ maxWidth: "800px", margin: "0 auto", padding: "clamp(40px, 6vw, 76px) clamp(20px, 5vw, 64px) clamp(20px, 3vw, 30px)", textAlign: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "14px" }}>
          {lang === "en" ? "CALENDAR" : "CALENDARIO"}
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(32px, 4.6vw, 54px)", lineHeight: 1.08, margin: "0 0 16px", textWrap: "pretty" }}>
          {lang === "en" ? "Where mothers meet and friendships start." : "Donde las madres se encuentran y empiezan las amistades."}
        </h1>
        <p style={{ fontSize: "16.5px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.74)", margin: "0 auto", maxWidth: "62ch" }}>
          {lang === "en"
            ? "Small groups, the same faces, a host who makes the introductions."
            : "Grupos reducidos, las mismas caras, una anfitriona que hace las presentaciones."}
        </p>
      </section>

      <section style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 64px) clamp(46px, 6vw, 80px)" }}>
        {/* ─── UNIFIED PILL FILTER BAR ─── */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              border: "1px solid rgba(57, 41, 42, 0.2)",
              borderRadius: "40px",
              background: "#ffffff",
              boxShadow: "0 6px 22px rgba(57, 41, 42, 0.07)",
              position: "relative",
              zIndex: 30,
            }}
          >
            {/* What */}
            <div
              className="pill-dropdown-item"
              style={{
                position: "relative",
                flex: "1 1 150px",
                minWidth: "140px",
                padding: "12px 38px 12px 22px",
                cursor: "pointer",
                borderTopLeftRadius: "40px",
                borderBottomLeftRadius: "40px",
                background: activeCategory !== "all" ? "rgba(123, 31, 44, 0.06)" : "transparent",
                userSelect: "none",
              }}
              onClick={() => setOpenDropdown(openDropdown === "what" ? null : "what")}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: activeCategory !== "all" ? "#7b1f2c" : "rgba(57, 41, 42, 0.66)",
                  display: "block",
                  marginBottom: "2px",
                }}
              >
                {lang === "en" ? "What" : "Qué"}
              </span>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "16.5px",
                  color: "#39292a",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {catOpts.find((o) => o.key === activeCategory)?.label || (lang === "en" ? "All types" : "Todos los tipos")}
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(57,41,42,0.55)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="14"
                height="14"
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  marginTop: "-7px",
                  pointerEvents: "none",
                  transform: openDropdown === "what" ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>

              {/* Floating Menu */}
              {openDropdown === "what" && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    minWidth: "240px",
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(57, 41, 42, 0.16)",
                    borderRadius: "12px",
                    boxShadow: "0 18px 40px rgba(57, 41, 42, 0.16)",
                    padding: "8px 6px",
                    zIndex: 100,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {catOpts.map((o) => {
                    const isSelected = activeCategory === o.key;
                    return (
                      <div
                        key={o.key}
                        onClick={() => {
                          setActiveCategory(o.key);
                          setOpenDropdown(null);
                        }}
                        style={{
                          padding: "11px 16px",
                          margin: "2px 0",
                          borderRadius: "8px",
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontSize: "16.5px",
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? "#7b1f2c" : "#39292a",
                          backgroundColor: isSelected ? "rgba(123, 31, 44, 0.08)" : "transparent",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "#f7f3ee";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <span>{o.label}</span>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#7b1f2c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                            <path d="m5 12 5 5L20 7" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* When */}
            <div
              className="pill-dropdown-item"
              style={{
                position: "relative",
                flex: "1 1 150px",
                minWidth: "140px",
                padding: "12px 38px 12px 22px",
                cursor: "pointer",
                borderLeft: "1px solid rgba(57, 41, 42, 0.12)",
                background: activeDateFilter !== "all" ? "rgba(123, 31, 44, 0.06)" : "transparent",
                userSelect: "none",
              }}
              onClick={() => setOpenDropdown(openDropdown === "when" ? null : "when")}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: activeDateFilter !== "all" ? "#7b1f2c" : "rgba(57, 41, 42, 0.66)",
                  display: "block",
                  marginBottom: "2px",
                }}
              >
                {lang === "en" ? "When" : "Cuándo"}
              </span>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "16.5px",
                  color: "#39292a",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {monthOpts.find((o) => o.key === activeDateFilter)?.label || (lang === "en" ? "All dates" : "Todas las fechas")}
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(57,41,42,0.55)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="14"
                height="14"
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  marginTop: "-7px",
                  pointerEvents: "none",
                  transform: openDropdown === "when" ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>

              {/* Floating Menu */}
              {openDropdown === "when" && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    minWidth: "240px",
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(57, 41, 42, 0.16)",
                    borderRadius: "12px",
                    boxShadow: "0 18px 40px rgba(57, 41, 42, 0.16)",
                    padding: "8px 6px",
                    zIndex: 100,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {monthOpts.map((o) => {
                    const isSelected = activeDateFilter === o.key;
                    return (
                      <div
                        key={o.key}
                        onClick={() => {
                          setActiveDateFilter(o.key);
                          setOpenDropdown(null);
                        }}
                        style={{
                          padding: "11px 16px",
                          margin: "2px 0",
                          borderRadius: "8px",
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontSize: "16.5px",
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? "#7b1f2c" : "#39292a",
                          backgroundColor: isSelected ? "rgba(123, 31, 44, 0.08)" : "transparent",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "#f7f3ee";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <span>{o.label}</span>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#7b1f2c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                            <path d="m5 12 5 5L20 7" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Your stage */}
            <div
              className="pill-dropdown-item"
              style={{
                position: "relative",
                flex: "1 1 150px",
                minWidth: "140px",
                padding: "12px 38px 12px 22px",
                cursor: "pointer",
                borderLeft: "1px solid rgba(57, 41, 42, 0.12)",
                background: activeStage !== "all" ? "rgba(123, 31, 44, 0.06)" : "transparent",
                userSelect: "none",
              }}
              onClick={() => setOpenDropdown(openDropdown === "stage" ? null : "stage")}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: activeStage !== "all" ? "#7b1f2c" : "rgba(57, 41, 42, 0.66)",
                  display: "block",
                  marginBottom: "2px",
                }}
              >
                {lang === "en" ? "Your stage" : "Tu etapa"}
              </span>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "16.5px",
                  color: "#39292a",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {stageOpts.find((o) => o.key === activeStage)?.label || (lang === "en" ? "All stages" : "Todas las etapas")}
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(57,41,42,0.55)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="14"
                height="14"
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  marginTop: "-7px",
                  pointerEvents: "none",
                  transform: openDropdown === "stage" ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>

              {/* Floating Menu */}
              {openDropdown === "stage" && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    minWidth: "240px",
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(57, 41, 42, 0.16)",
                    borderRadius: "12px",
                    boxShadow: "0 18px 40px rgba(57, 41, 42, 0.16)",
                    padding: "8px 6px",
                    zIndex: 100,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {stageOpts.map((o) => {
                    const isSelected = activeStage === o.key;
                    return (
                      <div
                        key={o.key}
                        onClick={() => {
                          setActiveStage(o.key);
                          setOpenDropdown(null);
                        }}
                        style={{
                          padding: "11px 16px",
                          margin: "2px 0",
                          borderRadius: "8px",
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontSize: "16.5px",
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? "#7b1f2c" : "#39292a",
                          backgroundColor: isSelected ? "rgba(123, 31, 44, 0.08)" : "transparent",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "#f7f3ee";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <span>{o.label}</span>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#7b1f2c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                            <path d="m5 12 5 5L20 7" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Who comes */}
            <div
              className="pill-dropdown-item"
              style={{
                position: "relative",
                flex: "1 1 150px",
                minWidth: "140px",
                padding: "12px 38px 12px 22px",
                cursor: "pointer",
                borderLeft: "1px solid rgba(57, 41, 42, 0.12)",
                background: activeAudience !== "all" ? "rgba(123, 31, 44, 0.06)" : "transparent",
                userSelect: "none",
              }}
              onClick={() => setOpenDropdown(openDropdown === "group" ? null : "group")}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: activeAudience !== "all" ? "#7b1f2c" : "rgba(57, 41, 42, 0.66)",
                  display: "block",
                  marginBottom: "2px",
                }}
              >
                {lang === "en" ? "Who comes" : "Quién viene"}
              </span>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "16.5px",
                  color: "#39292a",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {groupOpts.find((o) => o.key === activeAudience)?.label || (lang === "en" ? "All groups" : "Todos los grupos")}
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(57,41,42,0.55)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="14"
                height="14"
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  marginTop: "-7px",
                  pointerEvents: "none",
                  transform: openDropdown === "group" ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>

              {/* Floating Menu */}
              {openDropdown === "group" && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    left: 0,
                    minWidth: "240px",
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(57, 41, 42, 0.16)",
                    borderRadius: "12px",
                    boxShadow: "0 18px 40px rgba(57, 41, 42, 0.16)",
                    padding: "8px 6px",
                    zIndex: 100,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {groupOpts.map((o) => {
                    const isSelected = activeAudience === o.key;
                    return (
                      <div
                        key={o.key}
                        onClick={() => {
                          setActiveAudience(o.key);
                          setOpenDropdown(null);
                        }}
                        style={{
                          padding: "11px 16px",
                          margin: "2px 0",
                          borderRadius: "8px",
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontSize: "16.5px",
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? "#7b1f2c" : "#39292a",
                          backgroundColor: isSelected ? "rgba(123, 31, 44, 0.08)" : "transparent",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "#f7f3ee";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <span>{o.label}</span>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#7b1f2c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                            <path d="m5 12 5 5L20 7" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status */}
            <div
              className="pill-dropdown-item"
              style={{
                position: "relative",
                flex: "1 1 150px",
                minWidth: "140px",
                padding: "12px 38px 12px 22px",
                cursor: "pointer",
                borderLeft: "1px solid rgba(57, 41, 42, 0.12)",
                borderTopRightRadius: "40px",
                borderBottomRightRadius: "40px",
                background: activeStatus !== "all" ? "rgba(123, 31, 44, 0.06)" : "transparent",
                userSelect: "none",
              }}
              onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
            >
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: activeStatus !== "all" ? "#7b1f2c" : "rgba(57, 41, 42, 0.66)",
                  display: "block",
                  marginBottom: "2px",
                }}
              >
                {lang === "en" ? "Status" : "Estado"}
              </span>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "16.5px",
                  color: "#39292a",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {stateOpts.find((o) => o.key === activeStatus)?.label || (lang === "en" ? "Any status" : "Cualquier estado")}
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(57,41,42,0.55)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="14"
                height="14"
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  marginTop: "-7px",
                  pointerEvents: "none",
                  transform: openDropdown === "status" ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>

              {/* Floating Menu */}
              {openDropdown === "status" && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    minWidth: "240px",
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(57, 41, 42, 0.16)",
                    borderRadius: "12px",
                    boxShadow: "0 18px 40px rgba(57, 41, 42, 0.16)",
                    padding: "8px 6px",
                    zIndex: 100,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {stateOpts.map((o) => {
                    const isSelected = activeStatus === o.key;
                    return (
                      <div
                        key={o.key}
                        onClick={() => {
                          setActiveStatus(o.key);
                          setOpenDropdown(null);
                        }}
                        style={{
                          padding: "11px 16px",
                          margin: "2px 0",
                          borderRadius: "8px",
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontSize: "16.5px",
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? "#7b1f2c" : "#39292a",
                          backgroundColor: isSelected ? "rgba(123, 31, 44, 0.08)" : "transparent",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "#f7f3ee";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <span>{o.label}</span>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#7b1f2c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
                            <path d="m5 12 5 5L20 7" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sub Row: Free events only switch & Clear all */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px", alignItems: "center", justifyContent: "center", marginTop: "14px" }}>
            <button
              type="button"
              onClick={() => setFreeOnly(!freeOnly)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                border: "none",
                background: "transparent",
                padding: "4px 0",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "13.5px",
                color: freeOnly ? "#568b05" : "rgba(57, 41, 42, 0.78)",
                cursor: "pointer",
                fontWeight: freeOnly ? 600 : 400,
              }}
            >
              <span
                style={{
                  width: "32px",
                  height: "18px",
                  borderRadius: "9px",
                  background: freeOnly ? "#568b05" : "rgba(57, 41, 42, 0.22)",
                  position: "relative",
                  flex: "none",
                  transition: "background 0.2s ease",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: freeOnly ? "16px" : "2px",
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    transition: "left 0.2s ease",
                  }}
                />
              </span>
              {lang === "en" ? "Free events only" : "Solo eventos gratuitos"}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: "4px 0",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "13.5px",
                  color: "#7b1f2c",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  cursor: "pointer",
                }}
              >
                {lang === "en" ? "Clear all" : "Borrar filtros"}
              </button>
            )}
          </div>
        </div>

        {/* Counter & Status Header Line */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: "26px",
            paddingBottom: "16px",
            borderBottom: "1px solid rgba(57, 41, 42, 0.14)",
          }}
        >
          <span style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.72)", fontFeatureSettings: "'tnum'" }}>
            {sortedEvents.length} {lang === "en" ? (sortedEvents.length === 1 ? "event" : "events") : (sortedEvents.length === 1 ? "evento" : "eventos")}
          </span>
          <span style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.72)" }}>
            {isMember
              ? (lang === "en" ? `Wallet: ${currentCreditBalance} credits` : `Monedero: ${currentCreditBalance} créditos`)
              : (lang === "en" ? "No account yet — you can look before you open one" : "Sin cuenta aún — puedes mirar antes de abrir una")}
          </span>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "24px", alignItems: "stretch" }}>
            {sortedEvents.map((ev) => (
              <EventCard
                key={ev.id}
                ev={ev}
                lang={lang}
                onOpenSignedOut={setSignedOutEvent}
                onOpenTopUp={(e) => setTopUpEvent(e)}
                onMemberBook={handleMemberBook}
                onMemberWaitlist={handleMemberWaitlist}
                isBooking={bookingLoadingId === ev.id}
                isMember={isMember}
                creditBalance={currentCreditBalance}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── MODALS ─── */}
      {/* States 01, 02, 05: Booked / Reserved / Free walk */}
      {bookingSuccessEvent && (
        <BookingSuccessModal
          event={bookingSuccessEvent}
          lang={lang}
          remainingCredits={currentCreditBalance}
          isMember={isMember}
          onClose={() => setBookingSuccessEvent(null)}
        />
      )}

      {/* State 04: Full — joins the waitlist */}
      {waitlistSuccess && (
        <WaitlistModal
          event={waitlistSuccess.event}
          position={waitlistSuccess.position}
          lang={lang}
          onClose={() => setWaitlistSuccess(null)}
        />
      )}


      {/* State 13: Signed out — pressed the member button */}
      {signedOutEvent && (
        <SignedOutMemberModal
          event={signedOutEvent}
          lang={lang}
          onClose={() => setSignedOutEvent(null)}
        />
      )}
      
      {/* State 03: Short on credits — top up */}
      {topUpEvent && (
        <TopUpModal
          event={topUpEvent}
          lang={lang}
          creditBalance={currentCreditBalance}
          isMember={isMember}
          onClose={() => setTopUpEvent(null)}
        />
      )}

      {/* General Alert / Error Notice */}
      {bookingError && (
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
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "440px",
              margin: "auto",
              border: "1px solid rgba(153, 56, 66, 0.3)",
              borderRadius: "8px",
              padding: "32px 28px",
              backgroundColor: "#FEFDF9",
              boxShadow: "0 20px 50px rgba(45,43,43,0.16)",
              textAlign: "center",
            }}
          >
            <div style={{ color: "#993842", marginBottom: "14px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="32" height="32" style={{ margin: "0 auto", display: "block" }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 10px", color: "#39292a" }}>
              {bookingError === "MEMBER_ACCOUNT_REQUIRED" || bookingError.includes("MEMBER_ACCOUNT_REQUIRED")
                ? (lang === "en" ? "Membership Required" : "Membresía requerida")
                : (lang === "en" ? "Booking Notice" : "Aviso de reserva")}
            </h3>
            <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.76)", margin: "0 0 22px" }}>
              {bookingError === "MEMBER_ACCOUNT_REQUIRED" || bookingError.includes("MEMBER_ACCOUNT_REQUIRED")
                ? (lang === "en"
                    ? "You need an active membership to reserve member-only gatherings and access credit top-ups."
                    : "Necesitas una membresía activa para reservar encuentros exclusivos de socias y recargar créditos.")
                : bookingError}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              {(bookingError === "MEMBER_ACCOUNT_REQUIRED" || bookingError.includes("MEMBER_ACCOUNT_REQUIRED")) && (
                <Link
                  href="/membership"
                  onClick={() => setBookingError(null)}
                  style={{
                    border: "1px solid #7b1f2c",
                    backgroundColor: "#7b1f2c",
                    color: "#fdfaf5",
                    padding: "10px 24px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: "14.5px",
                    textDecoration: "none",
                    display: "inline-block",
                  }}
                >
                  {lang === "en" ? "Explore Membership" : "Ver membresía"}
                </Link>
              )}
              <button
                type="button"
                onClick={() => setBookingError(null)}
                style={{
                  border: "1px solid rgba(57,41,42,0.3)",
                  backgroundColor: "transparent",
                  color: "#39292a",
                  padding: "10px 24px",
                  borderRadius: "4px",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: "14.5px",
                  cursor: "pointer",
                }}
              >
                {lang === "en" ? "Close" : "Cerrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
