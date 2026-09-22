"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { buyGuestPass, buyExtraCredits, bookEvent, joinEventWaitlist } from "@/app/actions/booking";
import { submitFreeWalkRsvp } from "@/app/actions/freeWalkRsvp";
import { subscribeToLetter } from "@/app/actions/publicWindow";
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
  bookedGuest?: number;
  isFull?: boolean;
  isGuestFull?: boolean;
  minToConfirm?: number | null;
  guestPriceCents?: number | null;
  showEventPassCta?: boolean | null;
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

export function isGuestPassEligible(ev: PublicEvent, isMember: boolean): boolean {
  if (isMember) return false;
  if (ev.creditCost === 0 || ev.isFreeWalk) return false;
  if (ev.isSignature || ev.creditCost > 18) return false;
  if (ev.status === "cancelled" || ev.status === "completed") return false;
  if (ev.isFull || ev.isGuestFull) return false;

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
      label: "Signature moments",
    };
  }

  const raw = `${ev.categorySlug || ""} ${ev.categoryName || ""} ${ev.title || ""}`.toLowerCase();

  if (raw.includes("walk") || raw.includes("social") || raw.includes("easy") || raw.includes("conexi") || ev.isFreeWalk || ev.creditCost === 0) {
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

function getCardBg(ev: PublicEvent, isPast?: boolean): string {
  if (isPast || ev.status === "cancelled") return "#f1eeea";
  if (ev.status === "published_pending" || ev.status === "pending") return "#fbf3e4";
  if (ev.userStatus?.isBooked) return "#eef4e9";
  if (ev.status === "confirmed") return "#eef4e9";
  if (ev.isSignature) return "#f1eaea";
  return "#f3f0ea";
}

function getCardBorder(ev: PublicEvent, isPast?: boolean): string {
  if (isPast || ev.status === "cancelled") return "rgba(57, 41, 42, 0.18)";
  if (ev.status === "published_pending" || ev.status === "pending") return "rgba(164, 118, 31, 0.45)";
  if (ev.userStatus?.isBooked) return "rgba(86, 139, 5, 0.34)";
  if (ev.status === "confirmed") return "rgba(86, 139, 5, 0.34)";
  if (ev.isSignature) return "rgba(123, 31, 44, 0.32)";
  return "rgba(57, 41, 42, 0.2)";
}

function formatDecideByDate(startsAt: string | Date, lang: Lang, decisionAt?: string | Date | null): string {
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

// ─── FreeWalkRsvpModal (State 06: Free walk — the open list) ─────────────────

export function FreeWalkRsvpModal({
  event: ev,
  lang,
  onClose,
}: {
  event: PublicEvent;
  lang: Lang;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      if (session.user.name && !firstName) {
        const parts = session.user.name.trim().split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
      }
      if (session.user.email && !email) {
        setEmail(session.user.email);
      }
    }
  }, [session]);

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
          boxShadow: "0 20px 50px rgba(45,43,43,0.16)",
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

        {success ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
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
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "23px", fontWeight: 600, margin: "0 0 12px", color: "#39292a" }}>
              {lang === "en" ? "You're on the list." : "Estás en la lista."}
            </h2>
            <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.74)", margin: "0 0 24px" }}>
              {lang === "en"
                ? "We will send an email confirmation and the exact starting point the day before the walk."
                : "Te enviaremos una confirmación por correo electrónico y el punto de encuentro exacto el día anterior al paseo."}
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid #7b1f2c", backgroundColor: "#7b1f2c", color: "#fdfaf5",
                padding: "10px 28px", borderRadius: "4px", fontFamily: "var(--font-heading)",
                fontWeight: 600, fontSize: "14.5px", cursor: "pointer",
              }}
            >
              {lang === "en" ? "Got it" : "Entendido"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#568b05", marginBottom: "10px" }}>
              {lang === "en" ? "FREE WALK — OPEN TO EVERYONE" : "PASEO GRATIS — ABIERTO A TODAS"}
            </div>
            <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.76)", margin: "0 0 18px" }}>
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
              <div style={{ gridColumn: "1 / -1" }}>
                <CountryPhoneInput
                  value={whatsapp}
                  onChange={(fullNumber) => setWhatsapp(fullNumber)}
                  lang={lang}
                  placeholder={lang === "en" ? "Phone (WhatsApp)" : "Teléfono (WhatsApp)"}
                  required
                />
              </div>
            </div>

            <p style={{ fontSize: "12px", color: "rgba(57,41,42,0.6)", margin: "0 0 16px", lineHeight: 1.5 }}>
              {lang === "en"
                ? "We send the exact starting point by WhatsApp the day before, so please give the number you use there."
                : "Enviamos el punto de inicio exacto por WhatsApp el día anterior, por lo que te pedimos el número que uses ahí."}
            </p>

            {error && (
              <p style={{ fontSize: "13px", color: "#993842", margin: "0 0 12px" }}>{error}</p>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "16px", marginTop: "14px", borderTop: "1px solid rgba(57,41,42,0.14)" }}>
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
                  padding: "10px 24px", borderRadius: "4px", fontFamily: "var(--font-heading)",
                  fontWeight: 600, fontSize: "14.5px", cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading ? (lang === "en" ? "Joining..." : "Uniéndome...") : (lang === "en" ? "Join the open list" : "Unirme a la lista abierta")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── EventPassModal (States 14, 07, 08, 10) ──────────────────────────────────

export function EventPassModal({
  event: ev,
  lang,
  onClose,
  onOpenCeiling,
}: {
  event: PublicEvent;
  lang: Lang;
  onClose: () => void;
  onOpenCeiling?: () => void;
}) {
  // Step 1 = State 14 (Name & Email), Step 2 = State 07 (Are you a mother?), Step 3 = State 08 (Not a mother refusal)
  const [step, setStep] = useState<"name_email" | "are_you_mother" | "not_mother" | "passes_exhausted">("name_email");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [isMom, setIsMom] = useState<"yes" | "no" | null>(null);
  const [letterSent, setLetterSent] = useState(false);
  const [letterSubscribedEmail, setLetterSubscribedEmail] = useState<string | null>(null);
  const [subscribingLetter, setSubscribingLetter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrentEmailSubscribed = letterSent && email.trim().toLowerCase() === letterSubscribedEmail;

  const guestPlacesTotal = ev.capacityGuest || 2;
  const guestPlacesLeft = Math.max(0, guestPlacesTotal - (ev.bookedGuest || 0));

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) return;
    setStep("are_you_mother");
  };

  const handleMotherChoice = (choice: "yes" | "no") => {
    setIsMom(choice);
    if (choice === "no") {
      setStep("not_mother");
    }
  };

  const handleSendLetter = async () => {
    if (!email.trim() || !email.includes("@")) {
      setError(lang === "en" ? "Please enter a valid email address." : "Por favor introduce un correo válido.");
      return;
    }
    setSubscribingLetter(true);
    setError(null);
    try {
      const res = await subscribeToLetter(email.trim());
      if (res.success) {
        setLetterSent(true);
        setLetterSubscribedEmail(email.trim().toLowerCase());
      } else {
        setError(res.error || (lang === "en" ? "Failed to subscribe." : "Error al suscribirse."));
      }
    } catch {
      setError(lang === "en" ? "Failed to subscribe." : "Error al suscribirse.");
    } finally {
      setSubscribingLetter(false);
    }
  };

  const handleFinalCheckout = async () => {
    if (isMom !== "yes") return;
    setError(null);
    setLoading(true);
    try {
      const result = await buyGuestPass({
        eventId: ev.id,
        firstName: firstName.trim(),
        lastName: "",
        email: email.trim(),
      });
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        if (result.error === "LIFETIME_PASS_LIMIT_REACHED") {
          setStep("passes_exhausted");
        } else if (result.error === "SIGNATURE_MEMBERS_ONLY" || result.error === "MAX_GUEST_CREDIT_EXCEEDED") {
          onClose();
          onOpenCeiling?.();
        } else {
          setError(result.error || (lang === "en" ? "Something went wrong." : "Algo falló."));
        }
        setLoading(false);
      }
    } catch {
      setError(lang === "en" ? "Something went wrong." : "Algo falló.");
      setLoading(false);
    }
  };

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
          boxShadow: "0 20px 50px rgba(45,43,43,0.16)",
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

        {/* ─── State 14: Signed out — pressed the Event Pass button ─── */}
        {step === "name_email" && (
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "8px" }}>
              EVENT PASS
            </div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "24px", lineHeight: 1.25, margin: "0 0 10px", color: "#39292a" }}>
              {lang === "en" ? "First, your name and email." : "Primero, tu nombre y correo."}
            </h2>
            <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.76)", margin: "0 0 20px" }}>
              {lang === "en"
                ? "A pass belongs to a person rather than a card — two each, ever — so we need to know who is holding this one. It takes a moment and no payment details."
                : "Un pase pertenece a una persona y no a una tarjeta — dos por persona, para siempre — así que necesitamos saber quién lo tiene. Lleva un momento y no requiere datos de pago."}
            </p>

            <form onSubmit={handleStep1Submit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <input
                  type="text"
                  required
                  placeholder={lang === "en" ? "Your name" : "Tu nombre"}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={modalInputStyle}
                />
                <input
                  type="email"
                  required
                  placeholder={lang === "en" ? "Email" : "Correo electrónico"}
                  value={email}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEmail(val);
                    if (letterSent && val.trim().toLowerCase() !== letterSubscribedEmail) {
                      setLetterSent(false);
                      setLetterSubscribedEmail(null);
                    }
                  }}
                  style={modalInputStyle}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                <button
                  type="submit"
                  style={{
                    border: "1px solid #7b1f2c", backgroundColor: "#7b1f2c", color: "#fdfaf5",
                    padding: "10px 24px", borderRadius: "4px", fontFamily: "var(--font-heading)",
                    fontWeight: 600, fontSize: "14.5px", cursor: "pointer",
                  }}
                >
                  {lang === "en" ? "Continue" : "Continuar"}
                </button>
                <Link
                  href={`/account/login?callbackUrl=${encodeURIComponent(`/events?book_event=${ev.id}`)}`}
                  style={{ fontSize: "13.5px", color: "#7b1f2c", textDecoration: "underline" }}
                >
                  {lang === "en" ? "Been here before? Sign in" : "¿Ya has estado aquí? Inicia sesión"}
                </Link>
              </div>
            </form>
          </div>
        )}

        {/* ─── State 07: Buying an Event Pass ─── */}
        {step === "are_you_mother" && (
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "8px" }}>
              EVENT PASS
            </div>
            <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.76)", margin: "0 0 12px" }}>
              {lang === "en"
                ? "First time joining us? An Event Pass gets you into any event up to 18 credits. Everyone gets two, then it's membership. Signature moments stay with members."
                : "Primera vez con nosotras? Un Event Pass te da acceso a cualquier evento de hasta 18 créditos. Todas tienen dos, luego es membresía. Los momentos especiales son exclusivos de socias."}
            </p>

            <div style={{ fontSize: "13.5px", fontWeight: 600, color: "#8a6116", marginBottom: "16px" }}>
              {lang === "en"
                ? `Guest places on this event: ${guestPlacesLeft} of ${guestPlacesTotal} left.`
                : `Plazas de invitada en este evento: ${guestPlacesLeft} de ${guestPlacesTotal} disponibles.`}
            </div>

            <div style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "6px", padding: "16px", backgroundColor: "#faf7f1", marginBottom: "18px" }}>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "#39292a", marginBottom: "10px" }}>
                {lang === "en" ? "Are you a mother?" : "¿Eres madre?"}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => handleMotherChoice("yes")}
                  style={{
                    flex: 1, padding: "9px 16px", borderRadius: "4px",
                    border: isMom === "yes" ? "1.5px solid #7b1f2c" : "1px solid rgba(57,41,42,0.22)",
                    backgroundColor: isMom === "yes" ? "#7b1f2c" : "#ffffff",
                    color: isMom === "yes" ? "#fdfaf5" : "#39292a",
                    fontWeight: 600, fontSize: "14px", cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {lang === "en" ? "Yes" : "Sí"}
                </button>
                <button
                  type="button"
                  onClick={() => handleMotherChoice("no")}
                  style={{
                    flex: 1, padding: "9px 16px", borderRadius: "4px",
                    border: isMom === "no" ? "1.5px solid #7b1f2c" : "1px solid rgba(57,41,42,0.22)",
                    backgroundColor: isMom === "no" ? "#7b1f2c" : "#ffffff",
                    color: isMom === "no" ? "#fdfaf5" : "#39292a",
                    fontWeight: 600, fontSize: "14px", cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {lang === "en" ? "No, not yet" : "No, todavía no"}
                </button>
              </div>
            </div>

            <p style={{ fontSize: "13px", lineHeight: "1.55", color: "rgba(57,41,42,0.68)", margin: "0 0 20px" }}>
              {lang === "en"
                ? "Guests go through the same light review as members — that check is part of what keeps the room what it is. We confirm by email before the event."
                : "Las invitadas pasan por la misma revisión ligera que las socias — esa revisión es parte de lo que mantiene el espacio como es. Confirmamos por correo antes del evento."}
            </p>

            {error && <p style={{ fontSize: "13px", color: "#993842", margin: "0 0 12px" }}>{error}</p>}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setStep("name_email")}
                style={{ border: "none", background: "transparent", color: "rgba(57,41,42,0.6)", fontSize: "13.5px", cursor: "pointer", padding: 0 }}
              >
                {lang === "en" ? "← Back" : "← Volver"}
              </button>
              <button
                type="button"
                onClick={handleFinalCheckout}
                disabled={loading || isMom !== "yes"}
                style={{
                  border: "1px solid #7b1f2c", backgroundColor: "#7b1f2c", color: "#fdfaf5",
                  padding: "10px 28px", borderRadius: "4px", fontFamily: "var(--font-heading)",
                  fontWeight: 600, fontSize: "14.5px", cursor: isMom === "yes" && !loading ? "pointer" : "not-allowed",
                  opacity: isMom === "yes" ? 1 : 0.45,
                }}
              >
                {loading ? (lang === "en" ? "Processing..." : "Procesando...") : (lang === "en" ? "Continue" : "Continuar")}
              </button>
            </div>
          </div>
        )}

        {/* ─── State 08: Not a mother (Refusal) ─── */}
        {step === "not_mother" && (
          <div style={{ textAlign: "left" }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: "24px", lineHeight: 1.25, margin: "0 0 14px", color: "#39292a" }}>
              {lang === "en" ? "Our events are for mothers." : "Nuestros eventos son para madres."}
            </h2>
            <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.76)", margin: "0 0 14px" }}>
              {lang === "en"
                ? "The Mothers exists for women who are already mothers or expecting, and every table is built around that. We can't seat you at this one — but if you are expecting, choose “Yes” and apply: pregnancy counts."
                : "The Mothers existe para mujeres que ya son madres o están esperando un bebé, y cada mesa está pensada para ello. No podemos reservar tu plaza en este — pero si estás embarazada, elige “Sí”: el embarazo cuenta."}
            </p>
            <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.65)", fontStyle: "italic", margin: "0 0 20px" }}>
              {lang === "en"
                ? "If motherhood is somewhere ahead of you, we would rather stay in touch than say goodbye."
                : "Si la maternidad está en tu futuro, preferimos seguir en contacto antes que despedirnos."}
            </p>

            {/* Email field in refusal state so user can confirm or edit their email */}
            <div style={{ marginBottom: "16px" }}>
              <input
                type="email"
                required
                placeholder={lang === "en" ? "Email address" : "Correo electrónico"}
                value={email}
                onChange={(e) => {
                  const val = e.target.value;
                  setEmail(val);
                  if (letterSent && val.trim().toLowerCase() !== letterSubscribedEmail) {
                    setLetterSent(false);
                    setLetterSubscribedEmail(null);
                  }
                }}
                style={modalInputStyle}
              />
            </div>

            {error && <p style={{ fontSize: "13px", color: "#993842", margin: "0 0 12px" }}>{error}</p>}

            {isCurrentEmailSubscribed ? (
              <div style={{ fontSize: "14px", color: "#568b05", fontWeight: 600, padding: "8px 0", marginBottom: "14px" }}>
                {lang === "en" ? "You're on the Letter. We'll write when there is something worth reading." : "Estás en la Carta. Estaremos en contacto."}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSendLetter}
                disabled={subscribingLetter || !email.trim()}
                style={{
                  border: "1px solid #7b1f2c", backgroundColor: "transparent", color: "#7b1f2c",
                  padding: "10px 24px", borderRadius: "4px", fontFamily: "var(--font-heading)",
                  fontWeight: 600, fontSize: "14px", cursor: subscribingLetter ? "wait" : "pointer",
                  marginBottom: "14px",
                }}
              >
                {subscribingLetter
                  ? (lang === "en" ? "Sending..." : "Enviando...")
                  : (lang === "en" ? "Send me the Letter" : "Enviadme la Carta")}
              </button>
            )}

            <div style={{ paddingTop: "12px", borderTop: "1px solid rgba(57,41,42,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => { setStep("are_you_mother"); setIsMom(null); }}
                style={{ border: "none", background: "transparent", color: "rgba(57,41,42,0.6)", fontSize: "13px", cursor: "pointer", padding: 0 }}
              >
                {lang === "en" ? "← Back" : "← Volver"}
              </button>
            </div>
          </div>
        )}

        {/* ─── State 10: Both passes used ─── */}
        {step === "passes_exhausted" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#7b1f2c", marginBottom: "14px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#7b1f2c" strokeWidth="1.6" width="34" height="34" style={{ margin: "0 auto", display: "block" }}>
                <rect x="4" y="11" width="16" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 12px", color: "#39292a" }}>
              {lang === "en" ? "You've used both your Event Passes." : "Ya has usado tus dos Event Passes."}
            </h2>
            <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.76)", margin: "0 0 24px" }}>
              {lang === "en"
                ? "Everyone gets two Event Passes — enough to see whether this is your room. You've had both, so the next step is membership: every event on the calendar, 20 credits a month, and your stage group. Our walks stay free and open to you either way."
                : "Todas reciben dos Event Passes — suficientes para ver si este es tu lugar. Ya has disfrutado de ambos, así que el siguiente paso es la membresía: todos los eventos del calendario, 20 créditos al mes y tu grupo de etapa. Nuestros paseos siguen siendo gratis y abiertos para ti."}
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href="/membership"
                style={{
                  border: "1px solid #7b1f2c", backgroundColor: "#7b1f2c", color: "#fdfaf5",
                  padding: "10px 22px", borderRadius: "4px", fontFamily: "var(--font-heading)",
                  fontWeight: 600, fontSize: "14.5px", textDecoration: "none",
                }}
              >
                {lang === "en" ? "Explore membership" : "Explorar membresía"}
              </Link>
              <button
                type="button"
                onClick={onClose}
                style={{
                  border: "1px solid rgba(57,41,42,0.3)", backgroundColor: "transparent", color: "rgba(57,41,42,0.7)",
                  padding: "10px 20px", borderRadius: "4px", fontSize: "14px", cursor: "pointer",
                }}
              >
                {lang === "en" ? "Close" : "Cerrar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── GuestPlacesNotOpenModal (State 09: Guest places not open yet) ────────────

export function GuestPlacesNotOpenModal({
  event: ev,
  lang,
  onClose,
}: {
  event: PublicEvent | null;
  lang: Lang;
  onClose: () => void;
}) {
  if (!ev) return null;

  const now = new Date();
  const starts = new Date(ev.startsAt);
  const diffDays = Math.ceil((starts.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilOpen = Math.max(1, diffDays - 14);
  const isClosed = diffDays < 2;
  const isPending = ev.status === "published_pending" || ev.status === "pending";

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
            background: "#fbf3e4", color: "#8a6116", marginBottom: "16px",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 12px", color: "#39292a" }}>
          {isClosed
            ? (lang === "en" ? "Guest places have closed." : "Las plazas de invitada se han cerrado.")
            : isPending
            ? (lang === "en" ? "Guest places open once confirmed." : "Plazas de invitada abiertas tras confirmación.")
            : (lang === "en" ? "Guest places open two weeks before." : "Las plazas de invitada se abren dos semanas antes.")}
        </h2>

        <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.76)", margin: "0 0 24px" }}>
          {isClosed
            ? (lang === "en"
                ? `Guest places for “${getEventDisplayTitle(ev, lang)}” closed two days before the date to prepare the room for confirmed attendees. Come to a walk in the meantime; those are always free and open to everyone.`
                : `Las plazas de invitada para “${getEventDisplayTitle(ev, lang)}” se cerraron dos días antes de la fecha. Acompáñanos en un paseo mientras tanto; son siempre gratuitos y abiertos a todas.`)
            : isPending
            ? (lang === "en"
                ? `“${getEventDisplayTitle(ev, lang)}” is currently gathering members. Event Pass places open once the minimum is reached. Come to a walk in the meantime; those are always free and open to everyone.`
                : `“${getEventDisplayTitle(ev, lang)}” está reuniendo socias actualmente. Las plazas de Event Pass se abrirán cuando se alcance el mínimo. Acompáñanos en un paseo mientras tanto.`)
            : (lang === "en"
                ? `Members get the first two weeks on every event. Event Pass places for “${getEventDisplayTitle(ev, lang)}” open two weeks before the date — that is in ${daysUntilOpen} day${daysUntilOpen === 1 ? "" : "s"}. Come to a walk in the meantime; those are always free and open to everyone.`
                : `Las socias tienen las dos primeras semanas en cada evento. Las plazas de Event Pass para “${getEventDisplayTitle(ev, lang)}” se abren dos semanas antes de la fecha — faltan ${daysUntilOpen} día${daysUntilOpen === 1 ? "" : "s"}. Acompáñanos a un paseo mientras tanto.`)}
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            border: "1px solid #7b1f2c", backgroundColor: "transparent", color: "#7b1f2c",
            padding: "10px 24px", borderRadius: "4px", fontFamily: "var(--font-heading)",
            fontWeight: 600, fontSize: "14px", cursor: "pointer",
          }}
        >
          {lang === "en" ? "Browse other events" : "Ver otros eventos"}
        </button>
      </div>
    </div>
  );
}

// ─── CeilingModal (State 11: Members only / over the ceiling) ─────────────────

export function CeilingModal({
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

        {/* Maroon lock icon */}
        <div style={{ color: "#7b1f2c", marginBottom: "14px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#7b1f2c" strokeWidth="1.6" width="34" height="34" style={{ margin: "0 auto", display: "block" }}>
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>

        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 12px", color: "#39292a" }}>
          {ev.isSignature
            ? (lang === "en" ? "Signature moments are members only." : "Los Signature moments son exclusivos para socias.")
            : (lang === "en" ? "This one is beyond the Event Pass." : "Este encuentro supera el Event Pass.")}
        </h2>
        <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.76)", margin: "0 0 24px" }}>
          {ev.isSignature
            ? (lang === "en"
                ? `Signature moments — like “${getEventDisplayTitle(ev, lang)}” — are the handful of experiences each year kept for members alone: everything else on the calendar opens to guests on an Event Pass.`
                : `Los Signature moments — como “${getEventDisplayTitle(ev, lang)}” — son las experiencias reservadas exclusivamente para socias: todo lo demás en el calendario se abre a invitadas con un Event Pass.`)
            : (lang === "en"
                ? `An Event Pass covers experiences up to 18 credits. “${getEventDisplayTitle(ev, lang)}” costs ${ev.creditCost} — the richer end of the calendar, and one of the reasons members pay monthly rather than by the event.`
                : `Un Event Pass cubre experiencias de hasta 18 créditos. “${getEventDisplayTitle(ev, lang)}” cuesta ${ev.creditCost} créditos — el extremo más exclusivo del calendario, y una de las razones por las que las socias pagan mensualmente en lugar de por evento.`)}
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/membership"
            style={{
              border: "1px solid #7b1f2c", backgroundColor: "#7b1f2c", color: "#fdfaf5",
              padding: "10px 22px", borderRadius: "4px", fontFamily: "var(--font-heading)",
              fontWeight: 600, fontSize: "14.5px", textDecoration: "none",
            }}
          >
            {lang === "en" ? "Explore membership" : "Explorar membresía"}
          </Link>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid rgba(57,41,42,0.3)", color: "rgba(57,41,42,0.7)",
              padding: "10px 20px", borderRadius: "4px", fontFamily: "var(--font-body)",
              fontSize: "14px", background: "transparent", cursor: "pointer",
            }}
          >
            {lang === "en" ? "Browse other events" : "Ver otros eventos"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── GuestFullModal (State 12: Full — waitlist is members only) ───────────────

export function GuestFullModal({
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

        <div style={{ color: "#7b1f2c", marginBottom: "14px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#7b1f2c" strokeWidth="1.6" width="34" height="34" style={{ margin: "0 auto", display: "block" }}>
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>

        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "22px", margin: "0 0 12px", color: "#39292a" }}>
          {lang === "en" ? "This one is full." : "Este evento está completo."}
        </h2>
        <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.76)", margin: "0 0 24px" }}>
          {lang === "en"
            ? `“${getEventDisplayTitle(ev, lang)}” has no places left, and the waitlist is for members only — they are the ones the calendar is built for. Join The Mothers and you can hold a place the moment one opens.`
            : `“${getEventDisplayTitle(ev, lang)}” no tiene plazas disponibles, y la lista de espera es exclusiva para socias. Únete a The Mothers y podrás reservar tu puesto en cuanto se libere uno.`}
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/membership"
            style={{
              border: "1px solid #7b1f2c", backgroundColor: "#7b1f2c", color: "#fdfaf5",
              padding: "10px 22px", borderRadius: "4px", fontFamily: "var(--font-heading)",
              fontWeight: 600, fontSize: "14.5px", textDecoration: "none",
            }}
          >
            {lang === "en" ? "See the membership" : "Ver la membresía"}
          </Link>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid rgba(57,41,42,0.3)", color: "rgba(57,41,42,0.7)",
              padding: "10px 20px", borderRadius: "4px", fontSize: "14px", background: "transparent", cursor: "pointer",
            }}
          >
            {lang === "en" ? "Not now" : "Ahora no"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SignedOutMemberModal (State 13: Signed out — pressed the member button) ──

export function SignedOutMemberModal({
  event: ev,
  lang,
  onClose,
}: {
  event: PublicEvent | null;
  lang: Lang;
  onClose: () => void;
}) {
  if (!ev) return null;

  const formattedDate = formatEventDate(ev.startsAt, lang);

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
              window.location.href = `/account/login?callbackUrl=${encodeURIComponent(`/events?book_event=${ev.id}`)}`;
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
            href="/membership"
            style={{ fontSize: "14px", color: "#7b1f2c", textDecoration: "underline", marginLeft: "8px" }}
          >
            {lang === "en" ? "Not a member yet? Join" : "¿Aún no eres socia? Únete"}
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
            ? `We'll hold place ${position} for you on “${displayTitle}”. If someone cancels — and inside 24 hours they often do — we email you straight away and the place is yours for two hours. No credits are spent until you take it.`
            : `Guardamos el puesto ${position} para ti en “${displayTitle}”. Si alguien cancela — y dentro de las 24 horas suele pasar — te enviamos un correo al momento y la plaza es tuya durante dos horas. No se gastan créditos hasta que la aceptes.`}
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
            ? <>This one costs {ev.creditCost} credits and you have {creditBalance}. Add {shortfall} credits for &euro;{shortfall} and we&rsquo;ll book you in straight away.</>
            : <>Este encuentro cuesta {ev.creditCost} créditos y tienes {creditBalance}. Añade {shortfall} créditos por {shortfall}€ y te reservaremos directamente.</>}
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
              {ev.creditCost} {lang === "en" ? "credits" : "créditos"}
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
              {lang === "en" ? `Add ${shortfall} ${shortfall === 1 ? "credit" : "credits"} — €1 each` : `Añadir ${shortfall} ${shortfall === 1 ? "crédito" : "créditos"} — 1€ cada uno`}
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "14.5px", color: "#7b1f2c", fontWeight: 600 }}>
              &euro;{shortfall}
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
  onClose,
}: {
  event: PublicEvent;
  lang: Lang;
  remainingCredits: number;
  onClose: () => void;
}) {
  const displayTitle = getEventDisplayTitle(ev, lang);
  const formattedDate = formatEventDate(ev.startsAt, lang);
  const isFreeWalk = ev.isFreeWalk || ev.creditCost === 0;

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
                Your place at “{displayTitle}” on {formattedDate} is booked. Walks and park socials are included in your membership — no credits needed.
              </>
            ) : (
              <>
                Tu plaza en “{displayTitle}” el {formattedDate} está reservada. Los paseos y encuentros están incluidos en tu membresía — sin coste en créditos.
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
                  · The day before — we send you the exact meeting point on WhatsApp.
                </>
              ) : (
                <>
                  · Tu plaza está reservada — no hay límite de plazas para este encuentro, no hay que esperar.<br />
                  · El día anterior — te enviamos el punto de encuentro exacto por WhatsApp.
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
              Your place at “{displayTitle}” on {formattedDate} is booked, using {ev.creditCost} credit{ev.creditCost === 1 ? "" : "s"}. You have {remainingCredits} credit{remainingCredits === 1 ? "" : "s"} left this month.
            </>
          ) : (
            <>
              Tu plaza en “{displayTitle}” el {formattedDate} está reservada, usando {ev.creditCost} crédito{ev.creditCost === 1 ? "" : "s"}. Te quedan {remainingCredits} crédito{remainingCredits === 1 ? "" : "s"} este mes.
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
                · Three days before — a WhatsApp message confirming whether you have a place.<br />
                · The day before — we send you the exact meeting point on WhatsApp.
              </>
            ) : (
              <>
                · Tres días antes — un mensaje de WhatsApp confirmando si tienes plaza.<br />
                · El día anterior — te enviamos el punto de encuentro exacto por WhatsApp.
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

// ─── GuestPassSuccessModal (Guest Pass Booked / Confirmed from Stripe) ────────

export function GuestPassSuccessModal({
  lang,
  onClose,
}: {
  lang: Lang;
  onClose: () => void;
}) {
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
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "#edf5e8",
            color: "#568b05",
            marginBottom: "16px",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "24px", margin: "0 0 12px", color: "#39292a" }}>
          {lang === "en" ? "Your place is booked." : "Tu plaza está reservada."}
        </h2>

        <p style={{ fontSize: "14.5px", lineHeight: "1.65", color: "rgba(57,41,42,0.76)", margin: "0 0 14px" }}>
          {lang === "en"
            ? "You have a seat at the table. Your confirmation email is on its way — it is your ticket, and it carries the meeting point and a link to release your place if your plans change."
            : "Tienes tu asiento en la mesa. Tu correo de confirmación está en camino — es tu ticket, e incluye el punto de encuentro y un enlace para liberar tu plaza si cambian tus planes."}
        </p>

        <div
          style={{
            border: "1px solid rgba(86,139,5,0.35)",
            background: "rgba(86,139,5,0.07)",
            borderRadius: "6px",
            padding: "12px 16px",
            margin: "0 0 18px",
            textAlign: "left",
          }}
        >
          <div style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#568b05", fontWeight: 600, marginBottom: "4px" }}>
            {lang === "en" ? "Ticket & Meeting point" : "Entrada y punto de encuentro"}
          </div>
          <div style={{ fontSize: "13px", lineHeight: "1.55", color: "rgba(57,41,42,0.78)" }}>
            {lang === "en"
              ? "We have sent your ticket with the exact meeting point and instructions to your email address."
              : "Hemos enviado tu entrada con el punto de encuentro exacto e instrucciones a tu dirección de correo."}
          </div>
        </div>

        <p style={{ fontSize: "13px", lineHeight: "1.6", color: "rgba(57,41,42,0.58)", margin: "0 0 22px", fontStyle: "italic" }}>
          {lang === "en"
            ? "No account needed. Keep that email and you have everything."
            : "Sin cuenta ni contraseña. Guarda ese correo y lo tendrás todo."}
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            border: "1px solid #7b1f2c",
            backgroundColor: "#7b1f2c",
            color: "#f8efe2",
            padding: "11px 32px",
            borderRadius: "4px",
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "15px",
            cursor: "pointer",
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
  onOpenEventPass: (ev: PublicEvent) => void;
  onOpenFreeRsvp: (ev: PublicEvent) => void;
  onOpenGuestNotOpen: (ev: PublicEvent) => void;
  onOpenCeiling: (ev: PublicEvent) => void;
  onOpenGuestFull: (ev: PublicEvent) => void;
  onOpenSignedOut: (ev: PublicEvent) => void;
  onOpenTopUp: (ev: PublicEvent) => void;
  onMemberBook: (ev: PublicEvent) => void;
  onMemberWaitlist: (ev: PublicEvent) => void;
  isBooking?: boolean;
  isMember: boolean;
  creditBalance?: number;
}

function EventCard({
  ev,
  lang,
  onOpenEventPass,
  onOpenFreeRsvp,
  onOpenGuestNotOpen,
  onOpenCeiling,
  onOpenGuestFull,
  onOpenSignedOut,
  onOpenTopUp,
  onMemberBook,
  onMemberWaitlist,
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
  const isOpenList = !ev.capacityTotal || ev.isFreeWalk || ev.creditCost === 0;

  const handleBookClick = () => {
    if (ev.isFreeWalk || ev.creditCost === 0) {
      if (isMember) {
        onMemberBook(ev);
      } else {
        onOpenFreeRsvp(ev);
      }
    } else if (isMember) {
      if (isFull) {
        onMemberWaitlist(ev);
      } else if (creditBalance < ev.creditCost) {
        onOpenTopUp(ev);
      } else {
        onMemberBook(ev);
      }
    } else {
      // Signed out visitor clicking Book -> prompt to sign in to book place
      onOpenSignedOut(ev);
    }
  };

  const handleGuestPassClick = () => {
    if (eligible) {
      onOpenEventPass(ev);
    } else if (ev.creditCost > 18 || ev.isSignature) {
      onOpenCeiling(ev);
    } else {
      onOpenGuestNotOpen(ev);
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
            const stageInfo = getEventStageDisplay(ev, lang);
            if (stageInfo.isAllStages || stageInfo.stages.length === 0) {
              return (
                <span style={{ fontSize: "11px", letterSpacing: "0.04em", color: "rgba(57,41,42,0.62)", border: "1px solid rgba(57,41,42,0.22)", background: "rgba(255,255,255,0.6)", borderRadius: "10px", padding: "3px 10px", whiteSpace: "nowrap" }}>
                  {stageInfo.displayLabel}
                </span>
              );
            }
            return stageInfo.stages.map((stg, sIdx) => (
              <span key={sIdx} style={{ fontSize: "11px", letterSpacing: "0.04em", color: "rgba(57,41,42,0.72)", border: "1px solid rgba(57,41,42,0.25)", background: "rgba(255,255,255,0.6)", borderRadius: "10px", padding: "3px 10px", whiteSpace: "nowrap" }}>
                {stg}
              </span>
            ));
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

      {/* Meta Info */}
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
                <div style={{ fontSize: "12.5px", color: "#39292a", fontWeight: 500 }}>
                  {lang === "en"
                    ? `Places left: ${ev.capacityRemaining ?? ev.capacityTotal} of ${ev.capacityTotal}`
                    : `Plazas libres: ${ev.capacityRemaining ?? ev.capacityTotal} de ${ev.capacityTotal}`}
                </div>
              </div>
            ) : null}

            <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.68)", marginTop: "2px" }}>
              {lang === "en"
                ? (ev.userStatus?.isBooked
                    ? `Your ${ev.creditCost} credits are held, not spent. Confirms or cancels by ${formatDecideByDate(ev.startsAt, lang, ev.decisionAt)}.`
                    : `Confirms or cancels by ${formatDecideByDate(ev.startsAt, lang, ev.decisionAt)}. Credits are only taken if it goes ahead.`)
                : (ev.userStatus?.isBooked
                    ? `Tus ${ev.creditCost} créditos están retenidos, no gastados. Se confirma o cancela el ${formatDecideByDate(ev.startsAt, lang, ev.decisionAt)}.`
                    : `Se confirma o cancela el ${formatDecideByDate(ev.startsAt, lang, ev.decisionAt)}. Los créditos solo se cobran si se confirma.`)}
            </div>
          </div>
        ) : null}

        {/* Free Unlimited / Open list */}
        {isOpenList && !isCancelled && !isPast && (
          <div style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)", marginBottom: "4px" }}>
            {lang === "en" ? "Open list — no limit on places" : "Lista abierta — sin límite de plazas"}
          </div>
        )}

        {/* Scarcity indicator: show when spaces are running low (3 or fewer) but not full, NOT on open list events */}
        {!isOpenList && !isFull && ev.capacityRemaining && ev.capacityRemaining > 0 && ev.capacityRemaining <= 3 && !isCancelled && !isPast && !ev.userStatus?.isBooked && (
          <div style={{ fontSize: "13.5px", color: "#8a6116", fontWeight: 500, marginBottom: "4px" }}>
            {lang === "en" ? `${ev.capacityRemaining} ${ev.capacityRemaining === 1 ? 'place' : 'places'} left` : `${ev.capacityRemaining} ${ev.capacityRemaining === 1 ? 'plaza' : 'plazas'} libre${ev.capacityRemaining === 1 ? '' : 's'}`}
          </div>
        )}

        {/* Full state label */}
        {!isOpenList && isFull && !isPast && !isCancelled && (
          <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", color: "#39292a" }}>
            {lang === "en" ? "Full" : "Completo"}
          </div>
        )}

        {/* Capped events: Places left: X of Y */}
        {!isOpenList && !(isPending && !isPast && !isCancelled && ev.minToConfirm) && !isCancelled && !isPast && !ev.userStatus?.isBooked && (ev.capacityTotal ?? 0) > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <div
              style={{
                fontSize: "13.5px",
                color: (ev.capacityRemaining != null && ev.capacityRemaining <= 3 && !isFull) ? "#8a6116" : "rgba(57,41,42,0.75)",
                fontWeight: (ev.capacityRemaining != null && ev.capacityRemaining <= 3 && !isFull) ? 600 : 400,
              }}
            >
              {lang === "en"
                ? `Places left: ${isFull ? 0 : (ev.capacityRemaining ?? ev.capacityTotal)} of ${ev.capacityTotal}`
                : `Plazas libres: ${isFull ? 0 : (ev.capacityRemaining ?? ev.capacityTotal)} de ${ev.capacityTotal}`}
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

            {/* Member full waitlist note */}
            {isMember && isFull && (
              <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.68)", marginTop: "2px" }}>
                {lang === "en" ? "No credits are taken to wait." : "No se cobran créditos por esperar."}
              </div>
            )}
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.65)" }}>
                    {lang === "en" ? "You're already booked in." : "Ya has reservado."}
                  </div>
                  <button
                    disabled
                    style={{
                      border: "1px solid rgba(57,41,42,0.25)",
                      backgroundColor: "rgba(57,41,42,0.04)",
                      color: "rgba(57,41,42,0.5)",
                      padding: "9px 20px",
                      borderRadius: "4px",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: "default",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isPending
                      ? (lang === "en" ? "Place reserved" : "Plaza reservada")
                      : (ev.isFreeWalk || ev.creditCost === 0 || !ev.capacityTotal
                          ? (lang === "en" ? "You're on the list" : "Estás en la lista")
                          : (lang === "en" ? "Booked" : "Reservada"))}
                  </button>
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
                    onClick={handleBookClick}
                    disabled={isBooking}
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
                    {isBooking ? (lang === "en" ? "Joining..." : "Uniéndome...") : (lang === "en" ? "Join the waitlist" : "Unirme a la lista")}
                  </button>
                ) : null
              ) : (
                <>
                  {eligible && (
                    <button
                      type="button"
                      onClick={handleGuestPassClick}
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
  const isMember = (session?.user as any)?.role === "member" && !!(session?.user as any)?.memberId;

  const { language: lang } = useLanguage();
  const [eventsList, setEventsList] = useState<PublicEvent[]>(events);
  const [currentCreditBalance, setCurrentCreditBalance] = useState<number>(creditBalance);
  const [bookingLoadingId, setBookingLoadingId] = useState<string | null>(null);
  
  // Modals state management for all 14 dialogs
  const [guestPassSuccessModal, setGuestPassSuccessModal] = useState<boolean>(false);
  const [bookingSuccessEvent, setBookingSuccessEvent] = useState<PublicEvent | null>(null);
  const [waitlistSuccess, setWaitlistSuccess] = useState<{ event: PublicEvent; position: number } | null>(null);
  const [eventPassEvent, setEventPassEvent] = useState<PublicEvent | null>(null);
  const [freeRsvpEvent, setFreeRsvpEvent] = useState<PublicEvent | null>(null);
  const [guestNotOpenEvent, setGuestNotOpenEvent] = useState<PublicEvent | null>(null);
  const [ceilingEvent, setCeilingEvent] = useState<PublicEvent | null>(null);
  const [guestFullEvent, setGuestFullEvent] = useState<PublicEvent | null>(null);
  const [signedOutEvent, setSignedOutEvent] = useState<PublicEvent | null>(null);
  const [topUpEvent, setTopUpEvent] = useState<PublicEvent | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    setEventsList(events);
  }, [events]);

  useEffect(() => {
    setCurrentCreditBalance(creditBalance);
  }, [creditBalance]);

  // Check for guest_pass_success in URL params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const query = new URLSearchParams(window.location.search);
      if (query.get("guest_pass_success") === "true") {
        setGuestPassSuccessModal(true);
      }
    }
  }, []);

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

  const handleMemberBook = async (ev: PublicEvent) => {
    setBookingLoadingId(ev.id);
    setBookingError(null);
    try {
      const res = await bookEvent(ev.id);
      if (res.success) {
        const newCredits = Math.max(0, currentCreditBalance - (ev.creditCost || 0));
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
            creditsCharged: ev.creditCost,
          },
        };

        setEventsList((prev) =>
          prev.map((e) => (e.id === ev.id ? updatedEv : e))
        );
        setBookingSuccessEvent(updatedEv);
      } else {
        if (res.error === "INSUFFICIENT_CREDITS") {
          setTopUpEvent(ev);
        } else {
          setBookingError(res.error || (lang === "en" ? "Could not complete booking." : "No se pudo completar la reserva."));
        }
      }
    } catch (err: any) {
      console.error("Booking error:", err);
      setBookingError(err?.message || (lang === "en" ? "Booking failed." : "Error al reservar."));
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

  // Category items matching prototype exactly
  const categoryChips = [
    { id: "all", labelEn: "All events", labelEs: "Todos los eventos" },
    { id: "easy", labelEn: "Easy connection", labelEs: "Easy connection" },
    { id: "baby", labelEn: "Play date", labelEs: "Play date" },
    { id: "evenings", labelEn: "MoM's date", labelEs: "MoM's date" },
    { id: "learn", labelEn: "Learn & Grow", labelEs: "Learn & Grow" },
    { id: "signature", labelEn: "Signature moments", labelEs: "Signature moments" },
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
              ? "Walks, workshops, dinners, and seasonal moments — browse what's coming up and book your place."
              : "Paseos, talleres, cenas y momentos de temporada — mira lo que se viene y reserva tu lugar."}
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
                onOpenEventPass={setEventPassEvent}
                onOpenFreeRsvp={setFreeRsvpEvent}
                onOpenGuestNotOpen={setGuestNotOpenEvent}
                onOpenCeiling={(e) => setCeilingEvent(e)}
                onOpenGuestFull={setGuestFullEvent}
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
      </div>

      {/* ─── MODALS (ALL 14 DIALOG STATES COVERED) ─── */}
      {/* Guest Pass Confirmed (Stripe checkout return) */}
      {guestPassSuccessModal && (
        <GuestPassSuccessModal
          lang={lang}
          onClose={() => setGuestPassSuccessModal(false)}
        />
      )}

      {/* States 01, 02, 05: Booked / Reserved / Free walk */}
      {bookingSuccessEvent && (
        <BookingSuccessModal
          event={bookingSuccessEvent}
          lang={lang}
          remainingCredits={currentCreditBalance}
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

      {/* States 14, 07, 08, 10: Event Pass multi-step flow */}
      {eventPassEvent && (
        <EventPassModal
          event={eventPassEvent}
          lang={lang}
          onClose={() => setEventPassEvent(null)}
          onOpenCeiling={() => setCeilingEvent(eventPassEvent)}
        />
      )}

      {/* State 06: Free walk — the open list */}
      {freeRsvpEvent && (
        <FreeWalkRsvpModal
          event={freeRsvpEvent}
          lang={lang}
          onClose={() => setFreeRsvpEvent(null)}
        />
      )}

      {/* State 09: Guest places not open yet / closed / TBC */}
      {guestNotOpenEvent && (
        <GuestPlacesNotOpenModal
          event={guestNotOpenEvent}
          lang={lang}
          onClose={() => setGuestNotOpenEvent(null)}
        />
      )}

      {/* State 11: Members only / over the ceiling */}
      {ceilingEvent && (
        <CeilingModal
          event={ceilingEvent}
          lang={lang}
          onClose={() => setCeilingEvent(null)}
        />
      )}

      {/* State 12: Full — waitlist is members only */}
      {guestFullEvent && (
        <GuestFullModal
          event={guestFullEvent}
          lang={lang}
          onClose={() => setGuestFullEvent(null)}
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
