"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { bookEvent, joinEventWaitlist } from "@/app/actions/booking";
import { getPublicEventById } from "@/app/actions/events";
import { getAccountData } from "@/app/actions/memberAccount";
import ThemeLoader from "@/components/ThemeLoader";
import { BackArrow } from "@/components/Icons";
import {
  PublicEvent,
  Lang,
  BookingSuccessModal,
  WaitlistModal,
  EventPassModal,
  FreeWalkRsvpModal,
  GuestPlacesNotOpenModal,
  CeilingModal,
  GuestFullModal,
  SignedOutMemberModal,
  TopUpModal,
  getEventDisplayTitle,
  getEventDisplayDesc,
  isGuestPassEligible,
  getLanguageLabel,
} from "@/app/events/EventsCalendar";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const { data: session } = useSession();

  const [lang, setLang] = useState<Lang>("en");
  const [ev, setEv] = useState<PublicEvent | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Dialog states for all 14 states
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
  const [actionLoading, setActionLoading] = useState(false);

  const [memberCredits, setMemberCredits] = useState<number | null>(null);
  const [isAlreadyBooked, setIsAlreadyBooked] = useState(false);
  const [isAlreadyWaitlisted, setIsAlreadyWaitlisted] = useState(false);
  const [userWaitlistPos, setUserWaitlistPos] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved as Lang);
  }, []);

  const loadEvent = useCallback(() => {
    if (!eventId) return;
    setFetchLoading(true);
    getPublicEventById(eventId).then((res) => {
      setFetchLoading(false);
      if (res.success && res.event) {
        setEv(res.event as PublicEvent);
      } else {
        setFetchError(res.error || "Event not found.");
      }
    });
  }, [eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    if (session?.user && eventId) {
      getAccountData().then((res) => {
        if (res.success) {
          setMemberCredits(res.credits?.available ?? 0);
          const booked = res.bookings?.some((b: any) => b.eventId === eventId && b.status !== "released");
          setIsAlreadyBooked(!!booked);
          const waitlisted = res.bookings?.find((b: any) => b.eventId === eventId && b.status === "waitlisted");
          if (waitlisted) {
            setIsAlreadyWaitlisted(true);
            setUserWaitlistPos(waitlisted.waitlistPosition || 1);
          }
        }
      });
    }
  }, [session, eventId]);

  const isMember = !!session?.user;
  const currentCreditBalance = memberCredits ?? 0;

  // Handle URL intent triggers
  useEffect(() => {
    if (typeof window !== "undefined" && ev) {
      const query = new URLSearchParams(window.location.search);
      if (query.get("booking_success") === "true") {
        setBookingSuccessEvent(ev);
        window.history.replaceState({}, "", `/events/${eventId}`);
      } else if (query.get("action") === "book") {
        window.history.replaceState({}, "", `/events/${eventId}`);
        if (isMember) {
          handleMemberBook(ev);
        } else {
          setSignedOutEvent(ev);
        }
      }
    }
  }, [ev, isMember, eventId]);

  const handleMemberBook = async (targetEv: PublicEvent) => {
    const isFreeWalk = targetEv.isFreeWalk || targetEv.creditCost === 0;

    // Check credits if not free walk
    if (!isFreeWalk && currentCreditBalance < targetEv.creditCost) {
      setTopUpEvent(targetEv);
      return;
    }

    setActionLoading(true);
    setBookingError(null);
    try {
      const res = await bookEvent(targetEv.id);
      if (res.success) {
        if (!isFreeWalk) {
          setMemberCredits((prev) => Math.max(0, (prev ?? targetEv.creditCost) - targetEv.creditCost));
        }
        setIsAlreadyBooked(true);
        setBookingSuccessEvent(targetEv);
      } else {
        if (res.error === "INSUFFICIENT_CREDITS") {
          setTopUpEvent(targetEv);
        } else if (res.error === "MEMBER_CAPACITY_FULL") {
          handleMemberWaitlist(targetEv);
        } else {
          setBookingError(
            res.error === "ALREADY_BOOKED"
              ? (lang === "en" ? "You already have a booking for this event." : "Ya tienes una reserva para este evento.")
              : res.error || (lang === "en" ? "Booking failed." : "Error en la reserva.")
          );
        }
      }
    } catch {
      setBookingError(lang === "en" ? "Something went wrong." : "Algo falló.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMemberWaitlist = async (targetEv: PublicEvent) => {
    setActionLoading(true);
    setBookingError(null);
    try {
      const res = await joinEventWaitlist(targetEv.id);
      if (res.success) {
        setIsAlreadyWaitlisted(true);
        setUserWaitlistPos(res.position || 1);
        setWaitlistSuccess({ event: targetEv, position: res.position || 1 });
      } else {
        setBookingError(res.error || (lang === "en" ? "Could not join waitlist." : "No se pudo unir a la lista de espera."));
      }
    } catch {
      setBookingError(lang === "en" ? "Something went wrong." : "Algo falló.");
    } finally {
      setActionLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <ThemeLoader fullPage text={lang === "en" ? "Loading event…" : "Cargando evento…"} size="large" />
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
        <Link href="/events" style={{ backgroundColor: "var(--color-accent)", color: "#f8efe2", padding: "12px 24px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          <BackArrow /> {lang === "en" ? "Back to Events" : "Volver a Eventos"}
        </Link>
      </div>
    );
  }

  const displayTitle = getEventDisplayTitle(ev, lang);
  const displayDesc = getEventDisplayDesc(ev, lang);
  const isFreeWalk = ev.isFreeWalk || ev.creditCost === 0;
  const isCapped = !isFreeWalk && !!ev.capacityTotal && ev.capacityTotal > 0;
  const isFull = isCapped && ((ev.capacityRemaining ?? 1) <= 0 || ev.isFull);
  const isGathering = (ev.status === "pending" || ev.status === "published_pending") && (ev.minToConfirm ?? 0) > 0;
  const passEligible = isGuestPassEligible(ev, isMember);

  const statusLabel = {
    confirmed: { en: "Confirmed", es: "Confirmado", color: "#285430", bg: "#e8f1e9" },
    published_pending: { en: "To be confirmed", es: "Por confirmar", color: "#a4761f", bg: "#fff3e4" },
    pending: { en: "To be confirmed", es: "Por confirmar", color: "#a4761f", bg: "#fff3e4" },
    cancelled: { en: "Cancelled", es: "Cancelado", color: "#993842", bg: "#fbf1f1" },
    completed: { en: "Past Event", es: "Evento Pasado", color: "#606e76", bg: "#e9eaea" },
  }[ev.status] || { en: ev.status, es: ev.status, color: "#606e76", bg: "#f0f0f0" };

  const guestPrice = ev.guestPriceCents ? Math.round(ev.guestPriceCents / 100) : 35;
  const guestPassLabel = `€${guestPrice} Event Pass`;

  return (
    <div style={{ backgroundColor: "#FEFDF9", minHeight: "100vh", padding: "48px clamp(24px, 5vw, 64px) 80px" }}>
      <div style={{ maxWidth: "840px", margin: "0 auto" }}>
        {/* Back navigation */}
        <div style={{ marginBottom: "24px" }}>
          <Link href="/events" style={{ color: "var(--color-text-muted)", fontSize: "14px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            <BackArrow /> {lang === "en" ? "Back to Events Calendar" : "Volver al Calendario"}
          </Link>
        </div>

        {/* Main Event Card */}
        <div
          style={{
            backgroundColor: isGathering ? "#fbf3e4" : isAlreadyBooked ? "#eef4e9" : "#FEFDF9",
            border: isGathering ? "1px solid rgba(164, 118, 31, 0.45)" : isAlreadyBooked ? "1px solid rgba(86, 139, 5, 0.34)" : "1px solid rgba(57,41,42,0.16)",
            borderRadius: "10px",
            padding: "clamp(28px, 5vw, 48px)",
          }}
        >
          {/* Top chips */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              {ev.categoryName && (
                <span style={{ fontSize: "12px", color: "var(--color-accent)", border: "1px solid rgba(123,31,44,0.3)", borderRadius: "12px", padding: "3px 10px", backgroundColor: "rgba(255,255,255,0.7)" }}>
                  {ev.categoryName}
                </span>
              )}
              {ev.isSignature && (
                <span style={{ fontSize: "12px", color: "#7b1f2c", border: "1px solid rgba(123,31,44,0.32)", borderRadius: "12px", padding: "3px 10px", backgroundColor: "#fbf1f1", fontWeight: 600 }}>
                  {lang === "en" ? "Signature Moment" : "Momento especial"}
                </span>
              )}
              {passEligible && (
                <span style={{ fontSize: "12px", color: "#568b05", border: "1px solid rgba(86,139,5,0.45)", borderRadius: "12px", padding: "3px 10px", backgroundColor: "rgba(86,139,5,0.07)", fontWeight: 600 }}>
                  {lang === "en" ? `Open to guests — €${guestPrice}` : `Abierto a invitadas — ${guestPrice}€`}
                </span>
              )}
              <span style={{ backgroundColor: statusLabel.bg, color: statusLabel.color, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 9px", borderRadius: "4px", border: `1px solid ${statusLabel.color}33` }}>
                {lang === "en" ? statusLabel.en : statusLabel.es}
              </span>
            </div>

            <div style={{ fontFamily: "var(--font-heading)", fontSize: "17px", fontWeight: 600, color: "var(--color-accent)" }}>
              {isFreeWalk
                ? (lang === "en" ? "Included with membership" : "Incluido con membresía")
                : `${ev.creditCost} ${lang === "en" ? (ev.creditCost === 1 ? "credit" : "credits") : (ev.creditCost === 1 ? "crédito" : "créditos")}`}
              {passEligible && ` · ${guestPassLabel}`}
            </div>
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(26px, 4.5vw, 40px)", fontWeight: 500, margin: "0 0 24px", color: "#39292a" }}>
            {displayTitle}
          </h1>

          {/* Meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", backgroundColor: "rgba(255,255,255,0.7)", padding: "20px", borderRadius: "6px", marginBottom: "28px", fontSize: "14px" }}>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Date" : "Fecha"}</div>
              <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                <span>{ev.dateStr || new Date(ev.startsAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Time" : "Hora"}</div>
              <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                <span>{ev.timeStr || new Date(ev.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Area" : "Zona"}</div>
              <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" style={{ flexShrink: 0 }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                <span>{ev.neighbourhood || "Barcelona"}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Venue" : "Espacio"}</div>
              <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" style={{ flexShrink: 0 }}><path d="M3 21h18M3 7l9-4 9 4M4 10v11M20 10v11M8 10v11M12 10v11M16 10v11" /></svg>
                <span>{ev.venueName || "Meeting point on RSVP"}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Places" : "Plazas"}</div>
              <div style={{ fontWeight: 600, color: isFreeWalk ? "#568b05" : isFull ? "#993842" : "var(--color-accent-2)" }}>
                {isFreeWalk
                  ? (lang === "en" ? "Open list — no limit on places" : "Lista abierta — sin límite de plazas")
                  : isFull
                  ? (lang === "en" ? "Full — waitlist open" : "Completo — lista de espera")
                  : (lang === "en" ? `${ev.capacityRemaining ?? ev.capacityTotal} places left` : `Quedan ${ev.capacityRemaining ?? ev.capacityTotal} plazas`)}
              </div>
            </div>
            {ev.languages && ev.languages.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Language" : "Idioma"}</div>
                <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" /></svg>
                  <span>{ev.languages.map((l) => getLanguageLabel(l, lang)).join(" · ")}</span>
                </div>
              </div>
            )}
            {ev.minToConfirm != null && ev.minToConfirm > 0 && (
              <div>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontWeight: 600, marginBottom: "3px" }}>{lang === "en" ? "Min. to confirm" : "Mín. para confirmar"}</div>
                <div style={{ fontWeight: 600 }}>{ev.bookedMember || 0}/{ev.minToConfirm}</div>
              </div>
            )}
          </div>

          {/* Description */}
          {displayDesc && (
            <>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "19px", margin: "0 0 10px", fontWeight: 600, color: "#39292a" }}>
                {lang === "en" ? "About this experience" : "Sobre este encuentro"}
              </h3>
              <p style={{ fontSize: "16px", lineHeight: "1.7", color: "rgba(57,41,42,0.78)", marginBottom: "32px" }}>
                {displayDesc}
              </p>
            </>
          )}

          {/* Meeting Point Box */}
          {isAlreadyBooked ? (
            <div style={{ backgroundColor: "#f4f7ee", border: "1px solid rgba(86,139,5,0.3)", borderRadius: "6px", padding: "14px 18px", marginBottom: "28px", fontSize: "13.5px", color: "#39292a" }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#568b05", fontWeight: 700, marginBottom: "4px" }}>
                {lang === "en" ? "Meeting Point" : "Punto de Encuentro"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#568b05" strokeWidth="1.8" width="14" height="14" style={{ flexShrink: 0 }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                <span>{ev.meetingPointNote || ev.venueAddress || ev.venueName}</span>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: "rgba(255,255,255,0.7)", border: "1px dashed rgba(57,41,42,0.2)", borderRadius: "6px", padding: "14px 18px", marginBottom: "28px", fontSize: "13px", color: "rgba(57,41,42,0.65)", display: "flex", alignItems: "center", gap: "8px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15" style={{ flexShrink: 0 }}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              <span>
                {lang === "en"
                  ? "Meeting point is shared with confirmed attendees only. Book your place to unlock it."
                  : "El punto de encuentro se comparte solo con las confirmadas. Reserva tu plaza para verlo."}
              </span>
            </div>
          )}

          {/* Action Bar */}
          {ev.status !== "cancelled" && ev.status !== "completed" && (
            <div style={{ borderTop: "1px solid rgba(57,41,42,0.14)", paddingTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.65)" }}>
                {lang === "en"
                  ? "Free cancellation up to 24h before the event."
                  : "Cancelación gratuita hasta 24h antes del evento."}
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                {/* Non-Member Guest Pass Button */}
                {!isMember && !isFreeWalk && passEligible && (
                  <button
                    type="button"
                    onClick={() => setEventPassEvent(ev)}
                    style={{
                      border: "1px solid var(--color-accent)",
                      backgroundColor: "transparent",
                      color: "var(--color-accent)",
                      padding: "12px 22px",
                      borderRadius: "4px",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 600,
                      fontSize: "14.5px",
                      cursor: "pointer",
                    }}
                  >
                    {guestPassLabel}
                  </button>
                )}

                {/* Member / Guest Main Button */}
                {isMember ? (
                  isAlreadyBooked ? (
                    <button
                      type="button"
                      disabled
                      style={{
                        border: "1px solid rgba(86,139,5,0.4)",
                        backgroundColor: "#edf5e8",
                        color: "#568b05",
                        padding: "12px 24px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                        fontSize: "14.5px",
                        cursor: "default",
                      }}
                    >
                      {isFreeWalk
                        ? (lang === "en" ? "You're on the list" : "Estás en la lista")
                        : (lang === "en" ? "Booked" : "Reservada")}
                    </button>
                  ) : isAlreadyWaitlisted ? (
                    <button
                      type="button"
                      disabled
                      style={{
                        border: "1px solid rgba(138,97,22,0.4)",
                        backgroundColor: "#fbf3e4",
                        color: "#8a6116",
                        padding: "12px 24px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                        fontSize: "14.5px",
                        cursor: "default",
                      }}
                    >
                      {lang === "en"
                        ? `On waitlist (position ${userWaitlistPos ?? 1})`
                        : `En lista de espera (posición ${userWaitlistPos ?? 1})`}
                    </button>
                  ) : isFull ? (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleMemberWaitlist(ev)}
                      style={{
                        border: "1px solid #7b1f2c",
                        backgroundColor: "transparent",
                        color: "#7b1f2c",
                        padding: "12px 24px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                        fontSize: "14.5px",
                        cursor: actionLoading ? "wait" : "pointer",
                      }}
                    >
                      {actionLoading
                        ? (lang === "en" ? "Joining…" : "Uniéndome…")
                        : (lang === "en" ? "Join waitlist" : "Unirme a la lista de espera")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleMemberBook(ev)}
                      style={{
                        backgroundColor: "var(--color-accent)",
                        color: "#f8efe2",
                        border: "none",
                        padding: "12px 26px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                        fontSize: "14.5px",
                        cursor: actionLoading ? "wait" : "pointer",
                      }}
                    >
                      {actionLoading
                        ? (lang === "en" ? "Booking…" : "Reservando…")
                        : (lang === "en" ? "Book" : "Reservar")}
                    </button>
                  )
                ) : (
                  /* Signed Out User */
                  isFull ? null : isFreeWalk ? (
                    <button
                      type="button"
                      onClick={() => setFreeRsvpEvent(ev)}
                      style={{
                        backgroundColor: "var(--color-accent)",
                        color: "#f8efe2",
                        border: "none",
                        padding: "12px 26px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                        fontSize: "14.5px",
                        cursor: "pointer",
                      }}
                    >
                      {lang === "en" ? "Book" : "Reservar"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (ev.isSignature || ev.creditCost > 18) {
                          setCeilingEvent(ev);
                        } else {
                          setSignedOutEvent(ev);
                        }
                      }}
                      style={{
                        backgroundColor: "var(--color-accent)",
                        color: "#f8efe2",
                        border: "none",
                        padding: "12px 26px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                        fontSize: "14.5px",
                        cursor: "pointer",
                      }}
                    >
                      {lang === "en" ? "Book" : "Reservar"}
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── ALL 14 DIALOG MODALS ─── */}
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

      {/* General error dialog */}
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
