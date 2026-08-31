"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { bookEvent, buyGuestPass, buyExtraCredits } from "@/app/actions/booking";
import { getPublicEventById } from "@/app/actions/events";
import { submitFreeWalkRsvp } from "@/app/actions/freeWalkRsvp";
import { getAccountData } from "@/app/actions/memberAccount";

const getLanguageLabel = (code: string, currentLang: "en" | "es") => {
  const mapping: Record<string, { en: string; es: string }> = {
    en: { en: "English", es: "Inglés" },
    es: { en: "Spanish", es: "Español" },
    fr: { en: "French", es: "Francés" },
    ca: { en: "Catalan", es: "Catalán" },
  };
  return mapping[code.toLowerCase()] ? mapping[code.toLowerCase()][currentLang] : code;
};

interface EventDetail {
  id: string;
  title: string;
  slug: string | null;
  categoryId: string | null;
  categoryName: string | null;
  description: string | null;
  neighbourhood: string;
  venueName: string;
  startsAt: Date;
  endsAt: Date;
  creditCost: number;
  guestPriceCents: number | null;
  capacityMember: number;
  capacityGuest: number | null;
  minToConfirm: number | null;
  isSignature: boolean;
  isFreeWalk: boolean;
  status: string;
  stageAffinity: string | null;
  guestOpenAt: Date | null;
  guestCloseAt: Date | null;
  dateStr: string;
  timeStr: string;
  bookedMember: number;
  bookedGuest: number;
  spotsRemaining: number;
  daysUntil: number;
  guestPassEligible: boolean;
  audienceType?: string | null;
  languages?: string[] | null;
}

function getCardBg(status: string) {
  switch (status) {
    case "confirmed":         return "#e8f1e9";
    case "published_pending": return "#fff3e4";
    case "cancelled":         return "#fbf1f1";
    case "completed":         return "#e9eaea";
    default:                  return "#fff";
  }
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const router = useRouter();
  const { data: session } = useSession();

  const [lang, setLang] = useState<"en" | "es">("en");
  const [ev, setEv] = useState<EventDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [isRsvpModal, setIsRsvpModal] = useState(false);
  const [guestForm, setGuestForm] = useState({ firstName: "", lastName: "", email: "" });
  const [rsvpForm, setRsvpForm] = useState({ firstName: "", lastName: "", email: "", whatsapp: "" });
  const [actionLoading, setActionLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved as "en" | "es");
  }, []);

  useEffect(() => {
    if (!eventId) return;
    setFetchLoading(true);
    getPublicEventById(eventId).then((res) => {
      setFetchLoading(false);
      if (res.success && res.event) {
        setEv(res.event as EventDetail);
      } else {
        setFetchError(res.error || "Event not found.");
      }
    });
  }, [eventId]);

  const [memberCredits, setMemberCredits] = useState<number | null>(null);
  const [isAlreadyBooked, setIsAlreadyBooked] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const query = new URLSearchParams(window.location.search);
      if (query.get("booking_success") === "true") {
        setBookingSuccess(true);
        setModalOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    if (session?.user && eventId) {
      getAccountData().then((res) => {
        if (res.success) {
          setMemberCredits(res.credits?.available ?? 0);
          const booked = res.bookings?.some((b: any) => b.eventId === eventId && b.status !== "released");
          setIsAlreadyBooked(!!booked);
        }
      });
    }
  }, [session, eventId]);

  const isMember = !!session?.user;

  const handleMemberBook = useCallback(async () => {
    setActionLoading(true);
    setErrorMsg(null);
    const res = await bookEvent(eventId);
    setActionLoading(false);
    if (res.success) {
      setBookingSuccess(true);
    } else {
      setErrorMsg(
        res.error === "INSUFFICIENT_CREDITS"
          ? (lang === "en" ? "Not enough credits for this event." : "No tienes suficientes créditos.")
          : res.error === "ALREADY_BOOKED"
          ? (lang === "en" ? "You already have a booking for this event." : "Ya tienes una reserva para este evento.")
          : res.error === "MEMBER_CAPACITY_FULL"
          ? (lang === "en" ? "This event is fully booked." : "Este evento está completo.")
          : res.error || "Booking failed."
      );
    }
  }, [eventId, lang]);

  const handleGuestBuy = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestForm.firstName || !guestForm.email) {
      setErrorMsg(lang === "en" ? "Please fill in your name and email." : "Por favor completa tu nombre y correo.");
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    const res = await buyGuestPass({
      eventId,
      firstName: guestForm.firstName,
      lastName: guestForm.lastName,
      email: guestForm.email,
    });
    setActionLoading(false);
    if (res.success && res.url) {
      window.location.href = res.url;
    } else {
      setErrorMsg(
        res.error === "LIFETIME_PASS_LIMIT_REACHED"
          ? (lang === "en" ? "You've used both lifetime guest passes. Apply to become a member." : "Has usado los 2 pases de por vida. Solicita la membresía.")
          : res.error === "GUEST_CAPACITY_FULL"
          ? (lang === "en" ? "Guest spots are full for this event." : "No quedan plazas de invitada.")
          : res.error || "Purchase failed."
      );
    }
  }, [eventId, guestForm, lang]);

  const handleRsvpSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpForm.firstName || !rsvpForm.email) {
      setErrorMsg(lang === "en" ? "Please fill in your name and email." : "Por favor completa tu nombre y correo.");
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    const res = await submitFreeWalkRsvp({
      eventId,
      firstName: rsvpForm.firstName,
      lastName: rsvpForm.lastName,
      email: rsvpForm.email,
      whatsappE164: rsvpForm.whatsapp,
    });
    setActionLoading(false);
    if (res.success) {
      setBookingSuccess(true);
    } else {
      setErrorMsg(lang === "en" ? "Failed to submit RSVP." : "Error al enviar la reserva.");
    }
  }, [eventId, rsvpForm, lang]);

  // ── Loading / error states ────────────────────────────────────────────────

  if (fetchLoading) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "18px", color: "var(--color-text-muted)" }}>
          {lang === "en" ? "Loading event…" : "Cargando evento…"}
        </p>
      </div>
    );
  }

  if (fetchError || !ev) {
    return (
      <div style={{ maxWidth: "640px", margin: "80px auto", padding: "32px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "28px", color: "var(--color-accent)", marginBottom: "12px" }}>
          {lang === "en" ? "Event not found" : "Evento no encontrado"}
        </h2>
        <p style={{ fontSize: "14.5px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
          {fetchError || (lang === "en" ? "This event doesn't exist or is no longer available." : "Este evento no existe o ya no está disponible.")}
        </p>
        <Link href="/events" style={{ backgroundColor: "var(--color-accent)", color: "#f8efe2", padding: "12px 24px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", textDecoration: "none" }}>
          ← {lang === "en" ? "Back to Events" : "Volver a Eventos"}
        </Link>
      </div>
    );
  }

  const statusLabel = {
    confirmed: { en: "Confirmed Event", es: "Evento Confirmado", color: "#285430", bg: "#e8f1e9" },
    published_pending: { en: "Pending Confirmation", es: "Pendiente de Confirmación", color: "#a4761f", bg: "#fff3e4" },
    cancelled: { en: "Cancelled", es: "Cancelado", color: "#993842", bg: "#fbf1f1" },
    completed: { en: "Past Event", es: "Evento Pasado", color: "#606e76", bg: "#e9eaea" },
  }[ev.status] || { en: ev.status, es: ev.status, color: "#606e76", bg: "#f0f0f0" };

  const guestPassLabel = ev.guestPriceCents
    ? `€${(ev.guestPriceCents / 100).toFixed(0)} Event Pass`
    : "€35 Event Pass";

  return (
    <div style={{ backgroundColor: "#FEFDF9", minHeight: "100vh", padding: "48px clamp(24px, 5vw, 64px) 80px" }}>
      <div style={{ maxWidth: "840px", margin: "0 auto" }}>
        {/* Back */}
        <div style={{ marginBottom: "24px" }}>
          <Link href="/events" style={{ color: "var(--color-text-muted)", fontSize: "14px", textDecoration: "none" }}>
            ← {lang === "en" ? "Back to Events Calendar" : "Volver al Calendario"}
          </Link>
        </div>

        {/* Main Card */}
        <div style={{ backgroundColor: getCardBg(ev.status), border: "1px solid rgba(57,41,42,0.16)", borderRadius: "10px", padding: "clamp(28px, 5vw, 48px)" }}>
          {/* Status + cost row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
            <span style={{ backgroundColor: statusLabel.bg, color: statusLabel.color, fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "5px 12px", borderRadius: "4px", border: `1px solid ${statusLabel.color}44` }}>
              {lang === "en" ? statusLabel.en : statusLabel.es}
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 600, color: "var(--color-accent)" }}>
              {ev.creditCost === 0 || ev.isFreeWalk
                ? (lang === "en" ? "Included with membership" : "Incluido con membresía")
                : `${ev.creditCost} ${lang === "en" ? "credits" : "créditos"}`}
              {ev.guestPassEligible && ` · ${guestPassLabel}`}
            </span>
          </div>

          {/* Category + stage chips */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            {ev.categoryName && (
              <span style={{ fontSize: "12px", color: "var(--color-accent)", border: "1px solid rgba(123,31,44,0.3)", borderRadius: "12px", padding: "3px 10px", backgroundColor: "rgba(255,255,255,0.7)" }}>
                {ev.categoryName}
              </span>
            )}
            {ev.stageAffinity && ev.stageAffinity !== "General" && (
              <span style={{ fontSize: "12px", color: "rgba(57,41,42,0.65)", border: "1px solid rgba(57,41,42,0.18)", borderRadius: "12px", padding: "3px 10px", backgroundColor: "rgba(255,255,255,0.7)" }}>
                {ev.stageAffinity}
              </span>
            )}
            {ev.isSignature && (
              <span style={{ fontSize: "12px", color: "#7b5a00", border: "1px solid #d4a800", borderRadius: "12px", padding: "3px 10px", backgroundColor: "#fffbeb" }}>
                ★ {lang === "en" ? "Signature Moment" : "Signature Moment"}
              </span>
            )}
            {ev.guestPassEligible && (
              <span style={{ fontSize: "12px", color: "#456f04", border: "1px solid rgba(86,139,5,0.45)", borderRadius: "12px", padding: "3px 10px", backgroundColor: "rgba(86,139,5,0.07)" }}>
                {lang === "en" ? "Open to guests — €35" : "Abierto a invitadas — 35€"}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px, 4.5vw, 42px)", fontWeight: 500, margin: "0 0 24px" }}>
            {ev.title}
          </h1>

          {/* Meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", backgroundColor: "rgba(255,255,255,0.65)", padding: "20px", borderRadius: "6px", marginBottom: "28px", fontSize: "14px" }}>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Date" : "Fecha"}</div>
              <div style={{ fontWeight: 600 }}>📅 {ev.dateStr}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Time" : "Hora"}</div>
              <div style={{ fontWeight: 600 }}>🕐 {ev.timeStr}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Area" : "Zona"}</div>
              <div style={{ fontWeight: 600 }}>📍 {ev.neighbourhood}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Venue" : "Espacio"}</div>
              <div style={{ fontWeight: 600 }}>🏛 {ev.venueName}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Member spots" : "Plazas socias"}</div>
              <div style={{ fontWeight: 600, color: ev.capacityMember === 0 ? "#568b05" : ev.spotsRemaining === 0 ? "#993842" : "var(--color-accent-2)" }}>
                {ev.capacityMember === 0
                  ? (lang === "en" ? "Open list — no limit on places" : "Lista abierta — sin límite de plazas")
                  : ev.spotsRemaining > 0
                  ? `${ev.spotsRemaining} ${lang === "en" ? "remaining" : "disponibles"}`
                  : (lang === "en" ? "Full" : "Completo")}
                {(() => {
                  const now = new Date();
                  const isGuestWindowClosed = !isMember && ev.guestPassEligible && ev.guestCloseAt && now > new Date(ev.guestCloseAt);
                  return isGuestWindowClosed ? (lang === "en" ? " · guest places have closed" : " · las plazas de invitada se han cerrado") : "";
                })()}
              </div>
            </div>
            {ev.languages && ev.languages.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Language" : "Idioma"}</div>
                <div style={{ fontWeight: 600 }}>🌐 {ev.languages.map(l => getLanguageLabel(l, lang)).join(" · ")}</div>
              </div>
            )}
            {ev.audienceType && (
              <div>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Audience" : "Público"}</div>
                <div style={{ fontWeight: 600 }}>
                  👤 {ev.audienceType === "moms_only"
                    ? (lang === "en" ? "Moms only" : "Solo madres")
                    : (lang === "en" ? "Moms + Child" : "Madres con peques")}
                </div>
              </div>
            )}
            {ev.minToConfirm != null && ev.minToConfirm > 0 && (
              <div>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Min. to confirm" : "Mín. para confirmar"}</div>
                <div style={{ fontWeight: 600 }}>{ev.bookedMember}/{ev.minToConfirm}</div>
              </div>
            )}
          </div>

          {/* Description */}
          {ev.description && (
            <>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "19px", margin: "0 0 10px", fontWeight: 600 }}>
                {lang === "en" ? "About this experience" : "Sobre este encuentro"}
              </h3>
              <p style={{ fontSize: "16px", lineHeight: "1.7", color: "rgba(57,41,42,0.78)", marginBottom: "32px" }}>
                {ev.description}
              </p>
            </>
          )}

          {/* Meeting point note */}
          <div style={{ backgroundColor: "rgba(255,255,255,0.7)", border: "1px dashed rgba(57,41,42,0.2)", borderRadius: "6px", padding: "14px 18px", marginBottom: "28px", fontSize: "13px", color: "rgba(57,41,42,0.65)" }}>
            🔒 {lang === "en"
              ? "Meeting point is shared with confirmed attendees only. Book your place to unlock it."
              : "El punto de encuentro se comparte solo con las confirmadas. Reserva tu plaza para verlo."}
          </div>

          {/* Action bar */}
          {ev.status !== "cancelled" && ev.status !== "completed" && (
            <div style={{ borderTop: "1px solid rgba(57,41,42,0.14)", paddingTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.65)" }}>
                {lang === "en"
                  ? "Free cancellation up to 24h before the event."
                  : "Cancelación gratuita hasta 24h antes del evento."}
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {ev.guestPassEligible && !isMember && (
                  <button
                    type="button"
                    onClick={() => { setModalOpen(true); setIsRsvpModal(false); setErrorMsg(null); }}
                    style={{ border: "1px solid var(--color-accent)", color: "var(--color-accent)", backgroundColor: "#fff", padding: "12px 22px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14.5px", cursor: "pointer" }}
                  >
                    {guestPassLabel}
                  </button>
                )}
                {isMember ? (
                  isAlreadyBooked ? (
                    <button
                      type="button"
                      disabled
                      style={{
                        backgroundColor: "rgba(86,139,5,0.1)",
                        border: "1px solid #568b05",
                        color: "#568b05",
                        padding: "12px 26px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                        fontSize: "14.5px",
                        cursor: "default",
                      }}
                    >
                      ✓ {lang === "en" ? "You are booked" : "Ya estás reservada"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setModalOpen(true); setIsRsvpModal(false); setErrorMsg(null); }}
                      style={{ backgroundColor: "var(--color-accent)", color: "#f8efe2", border: "none", padding: "12px 26px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14.5px", cursor: "pointer" }}
                    >
                      {ev.creditCost === 0 || ev.isFreeWalk
                        ? (lang === "en" ? "Reserve Free Place" : "Reservar Plaza Gratuita")
                        : (lang === "en" ? `Reserve (${ev.creditCost} Credits)` : `Reservar (${ev.creditCost} Créditos)`)}
                    </button>
                  )
                ) : ev.isFreeWalk ? (
                  <button
                    type="button"
                    onClick={() => { setModalOpen(true); setIsRsvpModal(true); setErrorMsg(null); }}
                    style={{ backgroundColor: "var(--color-accent)", color: "#f8efe2", border: "none", padding: "12px 26px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14.5px", cursor: "pointer" }}
                  >
                    {lang === "en" ? "RSVP for Free Walk" : "Reservar Paseo Gratuito"}
                  </button>
                ) : (
                  <Link
                    href="/account/login"
                    style={{ backgroundColor: "var(--color-accent)", color: "#f8efe2", padding: "12px 22px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14.5px", textDecoration: "none", display: "inline-block" }}
                  >
                    {lang === "en" ? "Sign In to Book" : "Acceder para Reservar"}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── BOOKING MODAL ─── */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) { setModalOpen(false); setBookingSuccess(false); setErrorMsg(null); } }}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(57,41,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", zIndex: 100 }}
        >
          <div style={{ maxWidth: "480px", width: "100%", backgroundColor: "#FEFDF9", padding: "32px", borderRadius: "10px", position: "relative", boxShadow: "0 8px 40px rgba(57,41,42,0.2)" }}>
            <button
              type="button"
              aria-label="Close"
              onClick={() => { setModalOpen(false); setBookingSuccess(false); setErrorMsg(null); }}
              style={{ position: "absolute", top: "16px", right: "18px", background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "rgba(57,41,42,0.5)", lineHeight: 1 }}
            >
              ✕
            </button>

            {bookingSuccess ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: "40px", marginBottom: "12px" }}>✓</div>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "24px", marginBottom: "10px", color: "var(--color-accent-2)" }}>
                  {lang === "en" ? "Place confirmed!" : "¡Plaza confirmada!"}
                </h3>
                <p style={{ fontSize: "14.5px", color: "rgba(57,41,42,0.7)", marginBottom: "24px", lineHeight: 1.6 }}>
                  {lang === "en"
                    ? "Check your email for the meeting point and confirmation details."
                    : "Revisa tu correo para ver el punto de encuentro y los detalles de confirmación."}
                </p>
                <button type="button" onClick={() => { setModalOpen(false); router.push("/account"); }} style={{ backgroundColor: "var(--color-accent)", color: "#f8efe2", border: "none", padding: "12px 28px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", cursor: "pointer", width: "100%" }}>
                  {lang === "en" ? "Go to My Account" : "Ir a Mi Cuenta"}
                </button>
              </div>
            ) : (
              <div>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "22px", margin: "0 0 6px" }}>
                  {isRsvpModal
                    ? (lang === "en" ? "Free Walk RSVP" : "Reserva de Paseo")
                    : isMember
                    ? (memberCredits !== null && memberCredits < ev.creditCost)
                      ? (lang === "en" ? "ADD CREDITS & BOOK" : "AÑADIR CRÉDITOS Y RESERVAR")
                      : (lang === "en" ? "Confirm Your Booking" : "Confirmar Reserva")
                    : (lang === "en" ? "€35 Event Pass" : "35€ Event Pass")}
                </h2>
                <p style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.6)", margin: "0 0 20px" }}>{ev.title}</p>

                {errorMsg && (
                  <div role="alert" style={{ backgroundColor: "#fff0f0", border: "1px solid rgba(200,0,0,0.2)", color: "#993842", padding: "10px 14px", borderRadius: "4px", fontSize: "13.5px", marginBottom: "16px" }}>
                    {errorMsg}
                  </div>
                )}

                {isRsvpModal ? (
                  <form onSubmit={handleRsvpSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ backgroundColor: "#f4f7ee", padding: "12px 16px", borderRadius: "4px", fontSize: "13px" }}>
                      <div style={{ fontWeight: 600, marginBottom: "4px" }}>{lang === "en" ? "Free Walk RSVP" : "Reserva de Paseo Gratuito"}</div>
                      <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.65)", lineHeight: 1.5 }}>
                        {lang === "en"
                          ? "This event is free and open to all mothers. Let us know you're coming!"
                          : "Este evento es gratuito y abierto a todas las madres. ¡Infórmanos que vienes!"}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(57,41,42,0.6)", marginBottom: "5px" }}>{lang === "en" ? "First Name" : "Nombre"} *</label>
                      <input type="text" className="input" value={rsvpForm.firstName} onChange={(e) => setRsvpForm({ ...rsvpForm, firstName: e.target.value })} required />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(57,41,42,0.6)", marginBottom: "5px" }}>{lang === "en" ? "Surname (optional)" : "Apellido (opcional)"}</label>
                      <input type="text" className="input" value={rsvpForm.lastName} onChange={(e) => setRsvpForm({ ...rsvpForm, lastName: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(57,41,42,0.6)", marginBottom: "5px" }}>{lang === "en" ? "Email" : "Correo"} *</label>
                      <input type="email" className="input" value={rsvpForm.email} onChange={(e) => setRsvpForm({ ...rsvpForm, email: e.target.value })} required />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(57,41,42,0.6)", marginBottom: "5px" }}>{lang === "en" ? "WhatsApp (optional)" : "WhatsApp (opcional)"}</label>
                      <input type="tel" className="input" value={rsvpForm.whatsapp} onChange={(e) => setRsvpForm({ ...rsvpForm, whatsapp: e.target.value })} />
                    </div>
                    <button type="submit" disabled={actionLoading} style={{ width: "100%", padding: "13px", backgroundColor: "var(--color-accent)", color: "#f8efe2", border: "none", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "15px", cursor: actionLoading ? "wait" : "pointer", opacity: actionLoading ? 0.7 : 1, marginTop: "4px" }}>
                      {actionLoading ? (lang === "en" ? "Submitting…" : "Enviando…") : (lang === "en" ? "Confirm RSVP" : "Confirmar Reserva")}
                    </button>
                  </form>
                ) : isMember ? (
                  memberCredits !== null && memberCredits < ev.creditCost ? (
                    <div>
                      {(() => {
                        const shortfall = ev.creditCost - memberCredits;
                        return (
                          <div>
                            <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "#39292a", margin: "0 0 20px" }}>
                              {lang === "en"
                                ? memberCredits === 0
                                  ? `You have no credits left this month, and this one costs ${ev.creditCost}. Rather than wait for them to renew, add ${shortfall} credits for €${shortfall} — €1 each, and we'll book you in straight away.`
                                  : `This one costs ${ev.creditCost} credits and you have ${memberCredits}. Add ${shortfall} credits for €${shortfall} and we'll book you in straight away.`
                                : memberCredits === 0
                                  ? `No te quedan créditos este mes, y este encuentro cuesta ${ev.creditCost}. En lugar de esperar a que se renueven, añade ${shortfall} créditos por ${shortfall}€ — 1€ cada uno — y te reservaremos al instante.`
                                  : `Este encuentro cuesta ${ev.creditCost} créditos y tienes ${memberCredits}. Añade ${shortfall} créditos por ${shortfall}€ y te reservaremos al instante.`}
                            </p>

                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px", borderTop: "1px solid rgba(57,41,42,0.12)", paddingTop: "16px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                                <span style={{ color: "rgba(57,41,42,0.7)" }}>{lang === "en" ? "This experience" : "Este encuentro"}</span>
                                <strong>{ev.creditCost} credits</strong>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                                <span style={{ color: "rgba(57,41,42,0.7)" }}>{lang === "en" ? "Your balance" : "Tu saldo"}</span>
                                <strong>{memberCredits} credits</strong>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", borderTop: "1px dashed rgba(57,41,42,0.15)", paddingTop: "10px", marginTop: "4px" }}>
                                <span style={{ color: "#7b1f2c", fontWeight: 600 }}>{lang === "en" ? "Add" : "Añadir"}</span>
                                <strong style={{ color: "#7b1f2c" }}>{shortfall} credits — €{shortfall}</strong>
                              </div>
                            </div>

                            {topUpError && (
                              <div style={{ padding: "10px 14px", backgroundColor: "#fff0f0", border: "1px solid rgba(200,0,0,0.2)", borderRadius: "4px", fontSize: "13px", color: "#b91c1c", marginBottom: "16px" }}>
                                {topUpError}
                              </div>
                            )}

                            <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                onClick={() => { setModalOpen(false); setTopUpError(null); }}
                                style={{ border: "none", background: "none", color: "rgba(57,41,42,0.6)", cursor: "pointer", fontSize: "14.5px", fontFamily: "var(--font-heading)" }}
                              >
                                {lang === "en" ? "Not now" : "Ahora no"}
                              </button>
                              <button
                                type="button"
                                disabled={topUpLoading}
                                onClick={async () => {
                                  setTopUpLoading(true);
                                  setTopUpError(null);
                                  try {
                                    const res = await buyExtraCredits(shortfall, ev.id);
                                    if (res.success && res.url) {
                                      window.location.href = res.url;
                                    } else {
                                      setTopUpError(res.error || (lang === "en" ? "Purchase failed." : "Fallo en la compra."));
                                    }
                                  } catch (err) {
                                    setTopUpError(lang === "en" ? "An error occurred." : "Ha ocurrido un error.");
                                  } finally {
                                    setTopUpLoading(false);
                                  }
                                }}
                                style={{
                                  backgroundColor: "#7b1f2c",
                                  color: "#f8efe2",
                                  border: "none",
                                  padding: "12px 24px",
                                  borderRadius: "4px",
                                  fontFamily: "var(--font-heading)",
                                  fontWeight: 600,
                                  fontSize: "14.5px",
                                  cursor: topUpLoading ? "wait" : "pointer"
                                }}
                              >
                                {topUpLoading
                                  ? (lang === "en" ? "Redirecting…" : "Redirigiendo…")
                                  : (lang === "en" ? `Book` : `Reservar`)}
                              </button>
                            </div>

                            <p style={{ fontSize: "11.5px", color: "rgba(57,41,42,0.5)", lineHeight: "1.5", marginTop: "22px", borderTop: "1px solid rgba(57,41,42,0.1)", paddingTop: "12px", textAlign: "center" }}>
                              {lang === "en"
                                ? "Top-up credits join your balance under the same rules: 6-month expiry, oldest credits used first."
                                : "Los créditos extra se suman a tu saldo bajo las mismas reglas: caducan a los 6 meses y se usan los más antiguos primero."}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div>
                      <div style={{ backgroundColor: "#f8efe2", padding: "16px", borderRadius: "6px", marginBottom: "20px", fontSize: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{lang === "en" ? "Credits to deduct" : "Créditos a descontar"}</span>
                          <strong style={{ color: "var(--color-accent)" }}>{ev.creditCost === 0 ? (lang === "en" ? "Free" : "Gratis") : `${ev.creditCost} credits`}</strong>
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.6)" }}>
                          {lang === "en" ? "Free cancellation up to 24h before. After that, credits return only if your spot is taken." : "Cancelación gratuita hasta 24h antes. Después, los créditos se devuelven solo si tu plaza se ocupa."}
                        </div>
                      </div>
                      <button type="button" onClick={handleMemberBook} disabled={actionLoading} style={{ width: "100%", padding: "13px", backgroundColor: "var(--color-accent)", color: "#f8efe2", border: "none", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "15px", cursor: actionLoading ? "wait" : "pointer", opacity: actionLoading ? 0.7 : 1 }}>
                        {actionLoading ? (lang === "en" ? "Confirming…" : "Confirmando…") : (lang === "en" ? "Confirm Booking" : "Confirmar Reserva")}
                      </button>
                    </div>
                  )
                ) : (
                  <form onSubmit={handleGuestBuy} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ backgroundColor: "#f4f7ee", padding: "12px 16px", borderRadius: "4px", fontSize: "13px" }}>
                      <div style={{ fontWeight: 600, marginBottom: "4px" }}>{lang === "en" ? "Guest Event Pass: €35" : "Event Pass de Invitada: 35€"}</div>
                      <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.65)", lineHeight: 1.5 }}>
                        {lang === "en"
                          ? "Includes ticket + meeting point. Join as a member within 30 days and your €35 comes off your first invoice."
                          : "Incluye entrada y punto de encuentro. Únete en 30 días y tus 35€ se descuentan del primer pago."}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(57,41,42,0.6)", marginBottom: "5px" }}>{lang === "en" ? "First Name" : "Nombre"} *</label>
                      <input type="text" className="input" value={guestForm.firstName} onChange={(e) => setGuestForm({ ...guestForm, firstName: e.target.value })} required autoComplete="given-name" />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(57,41,42,0.6)", marginBottom: "5px" }}>{lang === "en" ? "Surname (optional)" : "Apellido (opcional)"}</label>
                      <input type="text" className="input" value={guestForm.lastName} onChange={(e) => setGuestForm({ ...guestForm, lastName: e.target.value })} autoComplete="family-name" />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(57,41,42,0.6)", marginBottom: "5px" }}>{lang === "en" ? "Email" : "Correo"} *</label>
                      <input type="email" className="input" value={guestForm.email} onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })} required autoComplete="email" />
                    </div>
                    <button type="submit" disabled={actionLoading} style={{ width: "100%", padding: "13px", backgroundColor: "var(--color-accent)", color: "#f8efe2", border: "none", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "15px", cursor: actionLoading ? "wait" : "pointer", opacity: actionLoading ? 0.7 : 1, marginTop: "4px" }}>
                      {actionLoading ? (lang === "en" ? "Redirecting to payment…" : "Redirigiendo al pago…") : (lang === "en" ? "Pay €35 & Reserve" : "Pagar 35€ y Reservar")}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
