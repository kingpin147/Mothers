"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { buyGuestPass } from "@/app/actions/booking";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublicEvent {
  id: string;
  title: string;
  slug: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  stage: string | null;
  description: string | null;
  neighbourhood: string | null;
  venueName: string | null;
  startsAt: Date | string;
  endsAt: Date | string;
  creditCost: number;
  guestPriceCents: number | null;
  capacityMember: number;
  capacityGuest: number | null;
  minToConfirm: number | null;
  isSignature: boolean;
  isFreeWalk: boolean;
  status: string;
  category: string;
  dateStr: string;
  timeStr: string;
  bookedMember: number;
}

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  stageAffinity: string | null;
}

interface Props {
  events: PublicEvent[];
  categories: PublicCategory[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_FILTERS = [
  { id: "all",       labelEn: "All Stages",           labelEs: "Todas las etapas" },
  { id: "pregnant",  labelEn: "Pregnant",              labelEs: "Embarazada" },
  { id: "babies",    labelEn: "Babies (0–12m)",        labelEs: "Bebés (0–12m)" },
  { id: "toddlers",  labelEn: "Toddlers (1–3y)",       labelEs: "Toddlers (1–3a)" },
  { id: "children",  labelEn: "Children (3–6y)",       labelEs: "Niños (3–6a)" },
  { id: "big_kids",  labelEn: "Big Kids (6–10y)",      labelEs: "Niños (6–10a)" },
  { id: "open",      labelEn: "Open to every stage",   labelEs: "Para cualquier etapa" },
] as const;

type Lang = "en" | "es";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(startsAt: Date | string): number {
  const now = new Date();
  const start = new Date(startsAt);
  return Math.round((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function isGuestPassEligible(ev: PublicEvent): boolean {
  const days = daysUntil(ev.startsAt);
  return (
    ev.status === "confirmed" &&
    !ev.isSignature &&
    ev.creditCost <= 18 &&
    days >= 2 &&
    days <= 14
  );
}

function getCardBg(status: string): string {
  switch (status) {
    case "confirmed":         return "#e8f1e9";
    case "published_pending": return "#fff3e4";
    case "pending":           return "#fff3e4";
    case "cancelled":         return "#fbf1f1";
    case "past":              return "#e9eaea";
    default:                  return "#FEFDF9";
  }
}

function getCardBorder(status: string): string {
  switch (status) {
    case "confirmed":         return "rgba(74, 122, 80, 0.35)";
    case "published_pending": return "rgba(164, 118, 31, 0.35)";
    case "pending":           return "rgba(164, 118, 31, 0.35)";
    case "cancelled":         return "rgba(153, 56, 66, 0.3)";
    case "past":              return "rgba(96, 110, 118, 0.3)";
    default:                  return "rgba(57, 41, 42, 0.16)";
  }
}

function getStatusLabel(status: string, lang: Lang): string {
  if (status === "confirmed")         return lang === "en" ? "✓ Confirmed event" : "✓ Evento confirmado";
  if (status === "published_pending") return lang === "en" ? "⏳ Pending confirmation" : "⏳ Pendiente de confirmación";
  if (status === "pending")           return lang === "en" ? "⏳ Pending confirmation" : "⏳ Pendiente de confirmación";
  if (status === "cancelled")         return lang === "en" ? "✕ Cancelled" : "✕ Cancelado";
  if (status === "past")              return lang === "en" ? "Past event" : "Evento pasado";
  return "";
}

function getStatusColor(status: string): string {
  if (status === "confirmed")                                   return "#456f04";
  if (status === "published_pending" || status === "pending")   return "#a4761f";
  if (status === "cancelled")                                   return "#99384a";
  return "rgba(57, 41, 42, 0.5)";
}

function matchesStageFilter(ev: PublicEvent, activeStage: string): boolean {
  if (activeStage === "all") return true;
  const stage = (ev.stage || "").toLowerCase();
  // "open to every stage" type values match every filter
  if (stage === "open" || stage === "all stages" || stage === "all" || stage === "open to every stage") return true;
  if (activeStage === "pregnant")  return stage.includes("pregnant") || stage.includes("expecting") || stage.includes("embaraz");
  if (activeStage === "babies")    return stage.includes("bab") || stage.includes("bebé") || stage.includes("infant");
  if (activeStage === "toddlers")  return stage.includes("toddler") || stage.includes("1-3") || stage.includes("1–3");
  if (activeStage === "children")  return stage.includes("child") || stage.includes("niño") || stage.includes("3-6") || stage.includes("3–6");
  if (activeStage === "big_kids")  return stage.includes("big") || stage.includes("6-10") || stage.includes("6–10");
  if (activeStage === "open")      return stage.includes("open") || stage.includes("all") || stage.includes("todas");
  return stage === activeStage;
}

// ─── GuestPassModal ───────────────────────────────────────────────────────────

interface GuestPassModalProps {
  event: PublicEvent;
  lang: Lang;
  onClose: () => void;
}

function GuestPassModal({ event: ev, lang, onClose }: GuestPassModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const t = {
    title:       lang === "en" ? "€35 Event Pass"             : "35€ Event Pass",
    subtitle:    lang === "en" ? `Join us for: ${ev.title}`   : `Únete a: ${ev.title}`,
    firstNameLbl:lang === "en" ? "First name"                 : "Nombre",
    lastNameLbl: lang === "en" ? "Last name (optional)"       : "Apellido (opcional)",
    emailLbl:    lang === "en" ? "Email address"              : "Correo electrónico",
    cta:         lang === "en" ? "Pay €35 & Reserve"          : "Pagar 35€ y Reservar",
    loading:     lang === "en" ? "Redirecting to payment…"    : "Redirigiendo al pago…",
    cancel:      lang === "en" ? "Cancel"                     : "Cancelar",
    errorFallback: lang === "en" ? "Something went wrong. Please try again." : "Algo falló. Inténtalo de nuevo.",
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
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
        setError(result.error || t.errorFallback);
        setLoading(false);
      }
    } catch {
      setError(t.errorFallback);
      setLoading(false);
    }
  }, [ev.id, firstName, lastName, email, t.errorFallback]);

  // Trap scroll behind modal
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gp-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(57, 41, 42, 0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#FEFDF9",
          borderRadius: "10px",
          padding: "32px 28px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 8px 40px rgba(57, 41, 42, 0.22)",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute", top: "14px", right: "16px",
            background: "none", border: "none", cursor: "pointer",
            fontSize: "20px", color: "rgba(57, 41, 42, 0.5)", lineHeight: 1,
          }}
        >
          ✕
        </button>

        <h2
          id="gp-modal-title"
          style={{
            fontFamily: "var(--font-heading)", fontSize: "24px",
            color: "var(--color-accent)", margin: "0 0 6px 0",
          }}
        >
          {t.title}
        </h2>
        <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.65)", margin: "0 0 22px 0" }}>
          {t.subtitle}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label htmlFor="gp-fname" style={labelStyle}>{t.firstNameLbl}</label>
            <input
              id="gp-fname"
              type="text"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="gp-lname" style={labelStyle}>{t.lastNameLbl}</label>
            <input
              id="gp-lname"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="gp-email" style={labelStyle}>{t.emailLbl}</label>
            <input
              id="gp-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && (
            <p role="alert" style={{ fontSize: "13px", color: "#99384a", margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "var(--color-accent)",
              color: "#f8efe2",
              border: "none",
              borderRadius: "4px",
              padding: "11px 20px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "14px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginTop: "4px",
            }}
          >
            {loading ? t.loading : t.cta}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid rgba(57, 41, 42, 0.2)",
              borderRadius: "4px",
              padding: "10px 20px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "13px",
              color: "rgba(57, 41, 42, 0.65)",
              cursor: "pointer",
            }}
          >
            {t.cancel}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12.5px",
  fontWeight: 600,
  color: "rgba(57, 41, 42, 0.7)",
  marginBottom: "5px",
  fontFamily: "var(--font-heading)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 13px",
  fontFamily: "var(--font-body)",
  fontSize: "14px",
  color: "var(--color-text)",
  background: "#fff",
  border: "1px solid rgba(57, 41, 42, 0.2)",
  borderRadius: "4px",
  outline: "none",
  boxSizing: "border-box",
};

// ─── EventCard ────────────────────────────────────────────────────────────────

interface EventCardProps {
  ev: PublicEvent;
  lang: Lang;
  onOpenGuestPass: (ev: PublicEvent) => void;
}

function EventCard({ ev, lang, onOpenGuestPass }: EventCardProps) {
  const eligible = isGuestPassEligible(ev);
  const guestPriceLabel =
    ev.guestPriceCents
      ? `€${(ev.guestPriceCents / 100).toFixed(0)} Event Pass`
      : "€35 Event Pass";

  return (
    <article
      style={{
        border: `1px solid ${getCardBorder(ev.status)}`,
        borderRadius: "8px",
        padding: "24px 22px",
        backgroundColor: getCardBg(ev.status),
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      {/* Chips row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {/* Category chip */}
          <span style={categoryChipStyle}>{ev.categoryName || ev.category || "General"}</span>
          {/* Stage chip */}
          {ev.stage && ev.stage !== "General" && (
            <span style={stageChipStyle}>{ev.stage}</span>
          )}
        </div>

        {/* Credit cost */}
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-accent)", whiteSpace: "nowrap", flexShrink: 0 }}>
          {ev.creditCost === 0 || ev.isFreeWalk
            ? (lang === "en" ? "Included" : "Incluido")
            : `${ev.creditCost} ${lang === "en" ? "credits" : "créditos"}`}
        </span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 600,
          fontSize: "20px",
          margin: 0,
          lineHeight: 1.25,
          color: "var(--color-text)",
        }}
      >
        {ev.title}
      </h3>

      {/* Meta */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "13.5px", color: "rgba(57, 41, 42, 0.72)" }}>
        <div>📅 {ev.dateStr}</div>
        <div>🕐 {ev.timeStr}</div>
        {ev.neighbourhood && <div>📍 {ev.neighbourhood}{ev.venueName ? ` · ${ev.venueName}` : ""}</div>}
        {!ev.neighbourhood && ev.venueName && <div>📍 {ev.venueName}</div>}
        <div style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.5)", fontStyle: "italic" }}>
          🔒 {lang === "en" ? "Meeting point sent to confirmed attendees" : "Punto de encuentro enviado a confirmadas"}
        </div>
      </div>

      {/* Description */}
      {ev.description && (
        <p style={{ fontSize: "14px", lineHeight: "1.55", color: "rgba(57, 41, 42, 0.75)", margin: 0, flex: 1 }}>
          {ev.description}
        </p>
      )}

      {/* Action bar */}
      <div
        style={{
          borderTop: "1px solid rgba(57, 41, 42, 0.12)",
          paddingTop: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 600, color: getStatusColor(ev.status) }}>
          {getStatusLabel(ev.status, lang)}
        </span>

        <div style={{ display: "flex", gap: "8px" }}>
          {eligible && (
            <button
              type="button"
              onClick={() => onOpenGuestPass(ev)}
              style={{
                border: "1px solid var(--color-accent)",
                color: "var(--color-accent)",
                padding: "8px 14px",
                borderRadius: "4px",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "13px",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {lang === "en" ? guestPriceLabel : guestPriceLabel.replace("€", "€").replace("Event Pass", "Event Pass")}
            </button>
          )}
          <Link
            href="/account/login"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "#f8efe2",
              padding: "8px 16px",
              borderRadius: "4px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "13px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            {lang === "en" ? "Reserve Place" : "Reservar Plaza"}
          </Link>
        </div>
      </div>
    </article>
  );
}

const categoryChipStyle: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.04em",
  color: "var(--color-accent)",
  border: "1px solid rgba(123, 31, 44, 0.3)",
  borderRadius: "10px",
  padding: "2px 9px",
  backgroundColor: "rgba(255, 255, 255, 0.6)",
};

const stageChipStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "rgba(57, 41, 42, 0.65)",
  border: "1px solid rgba(57, 41, 42, 0.2)",
  borderRadius: "10px",
  padding: "2px 9px",
  backgroundColor: "rgba(255, 255, 255, 0.6)",
};

// ─── Main EventsCalendar component ───────────────────────────────────────────

export function EventsCalendar({ events, categories }: Props) {
  const [lang,           setLang]           = useState<Lang>("en");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeStage,    setActiveStage]    = useState<string>("all");
  const [activeMonth,    setActiveMonth]    = useState<string>("all");
  const [guestPassEvent, setGuestPassEvent] = useState<PublicEvent | null>(null);

  // Sync language from localStorage
  useEffect(() => {
    const sync = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved);
    };
    sync();
    window.addEventListener("tm_lang_change", sync);
    return () => window.removeEventListener("tm_lang_change", sync);
  }, []);

  // Build category chip list from DB categories + "All events" sentinel
  const categoryChips = [
    { id: "all", labelEn: "All events", labelEs: "Todos los eventos" },
    ...categories.map((c) => ({
      id: c.id,
      labelEn: c.name,
      labelEs: c.name,   // DB has single name; translate if bilingual names are added later
    })),
  ];

  const monthChips = React.useMemo(() => {
    const monthsMap = new Map<string, { id: string, labelEn: string, labelEs: string, time: number }>();
    events.forEach(ev => {
      const d = new Date(ev.startsAt);
      const yearMonth = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthsMap.has(yearMonth)) {
        monthsMap.set(yearMonth, {
          id: yearMonth,
          labelEn: d.toLocaleString('en-US', { month: 'long' }),
          labelEs: d.toLocaleString('es-ES', { month: 'long' }),
          time: d.getTime()
        });
      }
    });
    const sorted = Array.from(monthsMap.values()).sort((a, b) => a.time - b.time);
    return [
      { id: "all", labelEn: "All months", labelEs: "Todos los meses" },
      ...sorted
    ];
  }, [events]);

  // Filter events
  const filtered = events.filter((ev) => {
    const matchCat =
      activeCategory === "all" || ev.categoryId === activeCategory;
    const matchStage = matchesStageFilter(ev, activeStage);
    const d = new Date(ev.startsAt);
    const yearMonth = `${d.getFullYear()}-${d.getMonth()}`;
    const matchMonth = activeMonth === "all" || yearMonth === activeMonth;
    return matchCat && matchStage && matchMonth;
  });

  return (
    <div
      style={{
        backgroundColor: "#FEFDF9",
        minHeight: "100vh",
        padding: "clamp(48px, 6vw, 88px) clamp(24px, 5vw, 64px)",
      }}
    >
      <div style={{ maxWidth: "1160px", margin: "0 auto" }}>
        {/* ── Page header ─────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-accent)",
              marginBottom: "12px",
            }}
          >
            {lang === "en" ? "Calendar" : "Calendario"}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(34px, 5vw, 54px)",
              fontWeight: 400,
              lineHeight: 1.1,
              margin: "0 0 16px 0",
            }}
          >
            {lang === "en" ? "Upcoming events." : "Próximos eventos."}
          </h1>
          <p
            style={{
              fontSize: "16.5px",
              color: "var(--color-text-muted)",
              maxWidth: "600px",
              margin: "0 auto 12px auto",
            }}
          >
            {lang === "en"
              ? "Walks, workshops, dinners, and seasonal moments — browse what's coming up and reserve your spot."
              : "Paseos, talleres, cenas y momentos de temporada — consulta la agenda y reserva tu plaza."}
          </p>
          <Link
            href="/membership"
            style={{
              color: "var(--color-accent)",
              fontSize: "14px",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {lang === "en"
              ? "New here? Take an Event Pass →"
              : "¿Nueva por aquí? Consigue un Event Pass →"}
          </Link>
        </div>

        {/* ── Filter rows ──────────────────────────────────── */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "36px" }}
        >
          {/* Category chips */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "4px",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {categoryChips.map((cat) => {
              const selected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  aria-pressed={selected}
                  style={{
                    border: selected
                      ? "1px solid var(--color-accent)"
                      : "1px solid rgba(57, 41, 42, 0.2)",
                    color: selected ? "var(--color-accent)" : "var(--color-text)",
                    backgroundColor: selected
                      ? "rgba(123, 31, 44, 0.08)"
                      : "transparent",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    fontSize: "13px",
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {lang === "en" ? cat.labelEn : cat.labelEs}
                </button>
              );
            })}
          </div>

          {/* Stage chips */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "4px",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {STAGE_FILTERS.map((st) => {
              const selected = activeStage === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setActiveStage(st.id)}
                  aria-pressed={selected}
                  style={{
                    border: selected
                      ? "1px solid var(--color-accent-2)"
                      : "1px solid rgba(57, 41, 42, 0.16)",
                    color: selected
                      ? "var(--color-accent-2)"
                      : "rgba(57, 41, 42, 0.65)",
                    backgroundColor: selected
                      ? "rgba(86, 139, 5, 0.08)"
                      : "transparent",
                    padding: "6px 14px",
                    borderRadius: "16px",
                    fontSize: "12px",
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {lang === "en" ? st.labelEn : st.labelEs}
                </button>
              );
            })}
          </div>

          {/* Month chips */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "4px",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {monthChips.map((mo) => {
              const selected = activeMonth === mo.id;
              return (
                <button
                  key={mo.id}
                  type="button"
                  onClick={() => setActiveMonth(mo.id)}
                  aria-pressed={selected}
                  style={{
                    border: selected
                      ? "1px solid var(--color-accent-2)"
                      : "1px solid rgba(57, 41, 42, 0.16)",
                    color: selected
                      ? "var(--color-accent-2)"
                      : "rgba(57, 41, 42, 0.65)",
                    backgroundColor: selected
                      ? "rgba(86, 139, 5, 0.08)"
                      : "transparent",
                    padding: "6px 14px",
                    borderRadius: "16px",
                    fontSize: "12px",
                    fontFamily: "var(--font-body)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  {lang === "en" ? mo.labelEn : mo.labelEs}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Events grid ──────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "64px 24px",
              color: "var(--color-text-muted)",
            }}
          >
            <p style={{ fontFamily: "var(--font-heading)", fontSize: "20px", margin: "0 0 8px 0" }}>
              {lang === "en" ? "No events found." : "No se encontraron eventos."}
            </p>
            <p style={{ fontSize: "14px", margin: 0 }}>
              {lang === "en"
                ? "Try a different filter, or check back soon."
                : "Prueba con otro filtro, o vuelve pronto."}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "24px",
            }}
          >
            {filtered.map((ev) => (
              <EventCard
                key={ev.id}
                ev={ev}
                lang={lang}
                onOpenGuestPass={setGuestPassEvent}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Guest Pass Modal ─────────────────────────────── */}
      {guestPassEvent && (
        <GuestPassModal
          event={guestPassEvent}
          lang={lang}
          onClose={() => setGuestPassEvent(null)}
        />
      )}
    </div>
  );
}
