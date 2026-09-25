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

  const isMember = (session?.user as any)?.role === "member" && !!(session?.user as any)?.memberId;
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
        if (ev.isFreeWalk || ev.creditCost === 0) {
          if (isMember) {
            handleMemberBook(ev);
          } else {
            setFreeRsvpEvent(ev);
          }
        } else if (isMember) {
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
    <div style={{ backgroundColor: "#fdf8f2", minHeight: "100vh", fontFamily: "'Lora', Georgia, serif", color: "#39292a" }}>
      {/* ─── BREADCRUMB / BACK LINK ─── */}
      <section style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(26px, 4vw, 44px) clamp(20px, 5vw, 64px) 0" }}>
        <Link
          href="/events"
          style={{
            fontSize: "14px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#7b1f2c",
            textDecoration: "none",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          {lang === "en" ? "All events" : "Todos los eventos"}
        </Link>
      </section>

      {/* ─── TWO COLUMN MAIN SECTION ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(20px, 3vw, 30px) clamp(20px, 5vw, 64px) clamp(40px, 5vw, 70px)",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(28px, 4vw, 48px)",
          alignItems: "flex-start",
        }}
      >
        {/* Left Column: Event details & content */}
        <div style={{ flex: "1 1 420px", minWidth: "290px" }}>
          {/* Photo Slot */}
          <div style={{ background: "#ecdcd0", padding: "7px", borderRadius: "6px", marginBottom: "26px" }}>
            <div
              style={{
                border: "1px solid rgba(57, 41, 42, 0.18)",
                borderRadius: "3px",
                overflow: "hidden",
                height: "340px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f4eae1",
                color: "rgba(57, 41, 42, 0.6)",
                textAlign: "center",
                padding: "20px",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ marginBottom: "12px", opacity: 0.7 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px", fontStyle: "italic" }}>
                Photo — {displayTitle}
              </div>
            </div>
          </div>

          {/* Category & Kids Badge Row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "14px" }}>
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "0.04em",
                color: "#7b1f2c",
                border: "1px solid rgba(123, 31, 44, 0.35)",
                borderRadius: "10px",
                padding: "3px 10px",
              }}
            >
              {ev.categoryName || (lang === "en" ? "Easy connection" : "Conexión")}
            </span>
            <span style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.72)" }}>
              {ev.audienceType === "mothers_only" || ev.audienceType === "moms_only"
                ? (lang === "en" ? "Mothers only — no children" : "Solo madres — sin peques")
                : (lang === "en" ? "Children welcome" : "Peques bienvenidos")}
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              fontSize: "clamp(30px, 4vw, 46px)",
              lineHeight: 1.1,
              margin: "0 0 18px",
              textWrap: "pretty",
            }}
          >
            {displayTitle}
          </h1>

          {/* Description */}
          {displayDesc && (
            <p
              style={{
                fontSize: "17px",
                lineHeight: 1.7,
                color: "rgba(57, 41, 42, 0.78)",
                margin: "0 0 26px",
                maxWidth: "62ch",
              }}
            >
              {displayDesc}
            </p>
          )}

          {/* 4-Grid Meta: When, Where, Spoken, Hosted with */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
              gap: "18px",
              borderTop: "1px solid rgba(57, 41, 42, 0.16)",
              paddingTop: "22px",
            }}
          >
            <div>
              <div style={{ fontSize: "11.5px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.72)", marginBottom: "6px" }}>
                {lang === "en" ? "When" : "Cuándo"}
              </div>
              <div style={{ fontSize: "15px", lineHeight: 1.5 }}>
                {ev.dateStr || new Date(ev.startsAt).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { weekday: "long", day: "numeric", month: "short" })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11.5px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.72)", marginBottom: "6px" }}>
                {lang === "en" ? "Where" : "Dónde"}
              </div>
              <div style={{ fontSize: "15px", lineHeight: 1.5 }}>
                {ev.neighbourhood || "Barcelona"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11.5px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.72)", marginBottom: "6px" }}>
                {lang === "en" ? "Spoken" : "Idioma"}
              </div>
              <div style={{ fontSize: "15px", lineHeight: 1.5 }}>
                {ev.languages && ev.languages.length > 0
                  ? ev.languages.map((l) => getLanguageLabel(l, lang)).join(" · ")
                  : (lang === "en" ? "English, Spanish" : "Inglés, Español")}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11.5px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.72)", marginBottom: "6px" }}>
                {lang === "en" ? "Hosted with" : "Colaborador"}
              </div>
              <div style={{ fontSize: "15px", lineHeight: 1.5 }}>
                {ev.partnerName || "The Mothers"}
              </div>
            </div>
          </div>

          {/* Meeting Point Section */}
          <div style={{ borderTop: "1px solid rgba(57, 41, 42, 0.16)", marginTop: "22px", paddingTop: "22px" }}>
            <div style={{ fontSize: "11.5px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.72)", marginBottom: "8px" }}>
              {lang === "en" ? "Meeting point" : "Punto de encuentro"}
            </div>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: isAlreadyBooked ? "#39292a" : "rgba(57, 41, 42, 0.72)", margin: 0, maxWidth: "60ch" }}>
              {isAlreadyBooked
                ? (ev.meetingPointNote || ev.venueAddress || ev.venueName || "Meeting point details will be sent via WhatsApp.")
                : (lang === "en"
                    ? `The exact address is sent when you book. ${ev.neighbourhood || "Barcelona"}, a short walk from public transport.`
                    : `La dirección exacta se envía al reservar. ${ev.neighbourhood || "Barcelona"}, cerca del transporte público.`)}
            </p>
          </div>

          {/* Before You Book Section */}
          <div style={{ borderTop: "1px solid rgba(57, 41, 42, 0.16)", marginTop: "22px", paddingTop: "22px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "21px", margin: "0 0 12px" }}>
              {lang === "en" ? "Before you book" : "Antes de reservar"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.7)", maxWidth: "64ch" }}>
              <p style={{ margin: 0 }}>
                <strong style={{ fontWeight: 600, color: "#39292a" }}>
                  {lang === "en" ? "Cancellation: " : "Cancelación: "}
                </strong>
                {lang === "en" ? "Free cancellation up to 24 hours before." : "Cancelación gratuita hasta 24 horas antes."}
              </p>
              {ev.minToConfirm && ev.minToConfirm > 0 && (
                <p style={{ margin: 0 }}>
                  {lang === "en"
                    ? `This event gathers ${ev.minToConfirm} mothers before it is confirmed. Credits are only taken if it goes ahead.`
                    : `Este evento reúne a ${ev.minToConfirm} madres para confirmarse. Los créditos solo se descuentan si se realiza.`}
                </p>
              )}
              <p style={{ margin: 0 }}>
                {lang === "en"
                  ? "Until January 2027 this event is open to every mother, member or not. You book for yourself, and the place is yours the moment it is confirmed."
                  : "Hasta enero de 2027 este evento está abierto a todas las madres, socias o no. Reservas para ti y la plaza es tuya en cuanto se confirma."}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Booking Sidebar */}
        <aside style={{ flex: "0 1 330px", minWidth: "270px", position: "sticky", top: "90px" }}>
          <div style={{ border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "8px", background: "#ffffff", padding: "24px" }}>
            {/* Price Row */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "44px", lineHeight: 1, fontFeatureSettings: "'tnum'" }}>
                {isFreeWalk ? "Free" : `${ev.creditCost} ${ev.creditCost === 1 ? "credit" : "credits"}`}
              </span>
              {!isFreeWalk && (
                <span style={{ fontSize: "14px", color: "rgba(57, 41, 42, 0.72)" }}>
                  (€{ev.creditCost * 2})
                </span>
              )}
            </div>
            <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.72)", marginBottom: "18px" }}>
              {isFreeWalk
                ? (lang === "en" ? "Walks and park socials never cost credits." : "Los paseos y encuentros en el parque nunca cuestan créditos.")
                : (lang === "en" ? "€2 per credit · buy as you go" : "2€ por crédito · compra según necesites")}
            </div>

            {/* Status Line */}
            <div style={{ fontSize: "13px", color: "#456f04", borderTop: "1px solid rgba(57, 41, 42, 0.12)", paddingTop: "14px", marginBottom: "6px" }}>
              {isFreeWalk
                ? (lang === "en" ? "Open list" : "Lista abierta")
                : isFull
                ? (lang === "en" ? "Full" : "Completo")
                : (lang === "en"
                    ? `${ev.capacityRemaining ?? ev.capacityTotal ?? 12} places left`
                    : `Quedan ${ev.capacityRemaining ?? ev.capacityTotal ?? 12} plazas`)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12.5px", color: "rgba(57, 41, 42, 0.74)", marginBottom: "14px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" style={{ flex: "none" }}>
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              {lang === "en" ? "Cancel any time up to 24h before" : "Cancela gratis hasta 24h antes"}
            </div>

            {/* Main Booking Button */}
            {isMember ? (
              isAlreadyBooked ? (
                <button
                  type="button"
                  disabled
                  style={{
                    width: "100%",
                    border: "1px solid rgba(86, 139, 5, 0.4)",
                    backgroundColor: "#edf5e8",
                    color: "#568b05",
                    borderRadius: "4px",
                    padding: "13px 16px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "15.5px",
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
                    width: "100%",
                    border: "1px solid rgba(138, 97, 22, 0.4)",
                    backgroundColor: "#fbf3e4",
                    color: "#8a6116",
                    borderRadius: "4px",
                    padding: "13px 16px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "15.5px",
                    cursor: "default",
                  }}
                >
                  {lang === "en" ? `On waitlist (position ${userWaitlistPos ?? 1})` : `En lista de espera (${userWaitlistPos ?? 1})`}
                </button>
              ) : isFull ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleMemberWaitlist(ev)}
                  style={{
                    width: "100%",
                    border: "1px solid #7b1f2c",
                    background: "transparent",
                    color: "#7b1f2c",
                    borderRadius: "4px",
                    padding: "13px 16px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "15.5px",
                    cursor: actionLoading ? "wait" : "pointer",
                  }}
                >
                  {actionLoading ? (lang === "en" ? "Joining…" : "Uniéndome…") : (lang === "en" ? "Join waitlist" : "Unirme a la lista")}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleMemberBook(ev)}
                  style={{
                    width: "100%",
                    border: "1px solid #7b1f2c",
                    background: "#7b1f2c",
                    color: "#fdf8f2",
                    borderRadius: "4px",
                    padding: "13px 16px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "15.5px",
                    cursor: actionLoading ? "wait" : "pointer",
                  }}
                >
                  {actionLoading
                    ? (lang === "en" ? "Booking…" : "Reservando…")
                    : isFreeWalk
                    ? (lang === "en" ? "Join — free" : "Unirme — gratis")
                    : (lang === "en" ? `Book with ${ev.creditCost} credits` : `Reservar con ${ev.creditCost} créditos`)}
                </button>
              )
            ) : (
              /* Signed-out User */
              <button
                type="button"
                onClick={() => {
                  if (isFreeWalk) setFreeRsvpEvent(ev);
                  else setSignedOutEvent(ev);
                }}
                style={{
                  width: "100%",
                  border: "1px solid #7b1f2c",
                  background: "#7b1f2c",
                  color: "#fdf8f2",
                  borderRadius: "4px",
                  padding: "13px 16px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "15.5px",
                  cursor: "pointer",
                }}
              >
                {isFreeWalk
                  ? (lang === "en" ? "Join — free" : "Unirme — gratis")
                  : (lang === "en" ? "Book your place" : "Reservar mi plaza")}
              </button>
            )}

            <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57, 41, 42, 0.72)", marginTop: "12px" }}>
              {lang === "en" ? "Your account is created with this booking." : "Tu cuenta se crea con esta reserva."}
            </div>
          </div>

          {/* Gold Notice Box below Sidebar */}
          <div
            style={{
              border: "1px solid rgba(201, 162, 39, 0.5)",
              background: "rgba(201, 162, 39, 0.08)",
              borderRadius: "8px",
              padding: "18px 20px",
              marginTop: "16px",
            }}
          >
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", whiteSpace: "nowrap", marginBottom: "6px" }}>
              {lang === "en" ? "Coming before January 2027?" : "¿Vienes antes de enero de 2027?"}
            </div>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "#5c4708", margin: 0 }}>
              {lang === "en"
                ? "Every mother who books an event before membership opens hears from us first, before it opens publicly."
                : "Toda madre que reserve un evento antes de abrir la membresía se enterará antes que nadie."}
            </p>
          </div>
        </aside>
      </section>

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
