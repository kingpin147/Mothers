"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { bookEvent, joinEventWaitlist, releaseBooking } from "@/app/actions/booking";
import { getPublicEventById } from "@/app/actions/events";
import { getAccountData } from "@/app/actions/memberAccount";
import ThemeLoader from "@/components/ThemeLoader";
import { BackArrow } from "@/components/Icons";
import {
  PublicEvent,
  Lang,
  BookingSuccessModal,
  WaitlistModal,
  SignedOutMemberModal,
  TopUpModal,
  getEventDisplayTitle,
  getEventDisplayDesc,
  getEventStageDisplay,
  getLanguageLabel,
  EventCardImage,
} from "@/app/events/EventsCalendar";
import { CancelBookingModal } from "@/components/CancelBookingModal";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const { data: session, status } = useSession();

  const [lang, setLang] = useState<Lang>("en");
  const [ev, setEv] = useState<PublicEvent | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Dialog states
  const [bookingSuccessEvent, setBookingSuccessEvent] = useState<PublicEvent | null>(null);
  const [waitlistSuccess, setWaitlistSuccess] = useState<{ event: PublicEvent; position: number } | null>(null);
  
  const [signedOutEvent, setSignedOutEvent] = useState<PublicEvent | null>(null);
  const [topUpEvent, setTopUpEvent] = useState<PublicEvent | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [memberCredits, setMemberCredits] = useState<number | null>(null);
  const [isAlreadyBooked, setIsAlreadyBooked] = useState(false);
  const [userBookingId, setUserBookingId] = useState<string | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelToast, setCancelToast] = useState<{ type: 'refunded' | 'lost', message: string, title: string } | null>(null);
  const [isAlreadyWaitlisted, setIsAlreadyWaitlisted] = useState(false);
  const [userWaitlistPos, setUserWaitlistPos] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [launchAt, setLaunchAt] = useState<Date | null>(null);
  const [creditLifeMonths, setCreditLifeMonths] = useState<number>(6);

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved as Lang);

    import("@/app/actions/adminSettings").then(({ getPublicClubSettings }) => {
      getPublicClubSettings().then((s) => {
        if (s.membershipLive) setIsLive(true);
        if (s.creditLifeMonths && s.creditLifeMonths > 0) setCreditLifeMonths(s.creditLifeMonths);
        if (s.expectedLaunch) {
          const d = new Date(s.expectedLaunch);
          if (!isNaN(d.getTime())) setLaunchAt(d);
        }
      }).catch(() => {});
    });
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
    if (session?.user && ev?.id) {
      getAccountData().then((res) => {
        if (res.success) {
          setMemberCredits(res.credits?.available ?? 0);
          const activeBooking = res.bookings?.find((b: any) => b.eventId === ev.id && b.status !== "released");
          setIsAlreadyBooked(!!activeBooking);
          setUserBookingId(activeBooking?.id || null);
          const waitlisted = res.bookings?.find((b: any) => b.eventId === ev.id && b.status === "waitlisted");
          if (waitlisted) {
            setIsAlreadyWaitlisted(true);
            setUserWaitlistPos(waitlisted.waitlistPosition || 1);
          }
        }
      });
    }
  }, [session, ev?.id]);

  const isMember = (session?.user as any)?.role === "member" && !!(session?.user as any)?.memberId;

  const handleReleaseBooking = async () => {
    if (!userBookingId || !ev) return;
    setCancellingBooking(true);
    try {
      const res = await releaseBooking(userBookingId);
      if (res.success) {
        setIsAlreadyBooked(false);
        setUserBookingId(null);
        setShowCancelModal(false);
        
        const isFree = ev.creditCost === 0 || (ev.isFreeWalk && (isMember || !ev.isLive));
        const viewerCost = isFree ? 0 : (ev.isLive ? (isMember ? (ev.memberCredits ?? ev.creditCost ?? 0) : (ev.nonMemberCredits ?? ev.creditCost ?? 0)) : (ev.creditCost ?? 0));
        
        const win = ev.cancellationWindowHours ?? 24;
        const isInsideWindow = new Date() > new Date(new Date(ev.startsAt).getTime() - win * 3600000);
        
        if (isFree || viewerCost === 0) {
           setCancelToast({ type: 'refunded', title: lang === "en" ? "Your place is cancelled" : "Tu plaza está cancelada", message: lang === "en" ? "Nothing to refund." : "Nada que reembolsar." });
        } else if (isInsideWindow) {
           setCancelToast({ type: 'lost', title: lang === "en" ? "Your place is cancelled" : "Tu plaza está cancelada", message: lang === "en" ? `Your ${viewerCost} credits were not refunded because you cancelled inside the ${win}-hour window. If someone takes your place, we will add them back and email you.` : `Tus ${viewerCost} créditos no fueron reembolsados porque cancelaste dentro del plazo de ${win} horas. Si alguien ocupa tu lugar, te los devolveremos y te enviaremos un correo.` });
        } else {
           setCancelToast({ type: 'refunded', title: lang === "en" ? "Your place is cancelled" : "Tu plaza está cancelada", message: lang === "en" ? `${viewerCost} credits are back in your wallet.` : `${viewerCost} créditos han vuelto a tu monedero.` });
        }
        
        loadEvent();
        getAccountData().then((r) => {
          if (r.success) setMemberCredits(r.credits?.available ?? 0);
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCancellingBooking(false);
    }
  };

  const currentCreditBalance = memberCredits ?? 0;

  // Handle URL intent triggers
  useEffect(() => {
    if (typeof window !== "undefined" && ev && status !== "loading") {
      const query = new URLSearchParams(window.location.search);
      const isBookingSuccess = query.get("booking_success") === "true";
      const isTopUpSuccess = query.get("topup_success") === "true";
      const isActionBook = query.get("action") === "book";

      if (isBookingSuccess || (isTopUpSuccess && isAlreadyBooked)) {
        setBookingSuccessEvent(ev);
        window.history.replaceState({}, "", `/events/${eventId}`);
      } else if (isTopUpSuccess || isActionBook) {
        window.history.replaceState({}, "", `/events/${eventId}`);
        if (!isMember) {
          setSignedOutEvent(ev);
        } else {
          handleMemberBook(ev);
        }
      }
    }
  }, [ev, isMember, status, eventId, isAlreadyBooked]);

  const handleMemberBook = async (targetEv: PublicEvent) => {
    const viewerCost = isLive
      ? (isMember ? (targetEv.memberCredits ?? targetEv.creditCost) : (targetEv.nonMemberCredits ?? targetEv.creditCost))
      : targetEv.creditCost;
    const isFree = viewerCost === 0 || (targetEv.isFreeWalk && (isMember || !isLive));

    // Check credits if not free event - BLOCKER: must check BEFORE booking attempt
    if (!isFree && currentCreditBalance < viewerCost) {
      setTopUpEvent(targetEv);
      return;
    }

    setActionLoading(true);
    setBookingError(null);
    try {
      const res = await bookEvent(targetEv.id);
      if (res.success) {
        if (!isFree) {
          setMemberCredits((prev) => Math.max(0, (prev ?? viewerCost) - viewerCost));
        }
        setIsAlreadyBooked(true);
        setBookingSuccessEvent(targetEv);

        if (typeof window !== "undefined") {
          sessionStorage.setItem("tm_first_booking_done", "1");
          window.dispatchEvent(new Event("tm_first_booking_done"));
        }
      } else {
        if (res.error === "ALREADY_BOOKED") {
          setIsAlreadyBooked(true);
          setBookingSuccessEvent(targetEv);
        } else if (res.error === "INSUFFICIENT_CREDITS") {
          setTopUpEvent(targetEv);
        } else if (res.error === "MEMBER_CAPACITY_FULL") {
          handleMemberWaitlist(targetEv);
        } else {
          setBookingError(
            res.error || (lang === "en" ? "Booking failed." : "Error en la reserva.")
          );
        }
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Server Action") || msg.includes("failed to fetch") || msg.includes("Failed to fetch")) {
        setBookingError(
          lang === "en"
            ? "The site has updated in the background. Please refresh the page and try again."
            : "El sitio se ha actualizado. Por favor recarga la página e inténtalo de nuevo."
        );
      } else {
        setBookingError(err?.message || (lang === "en" ? "Something went wrong." : "Algo falló."));
      }
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
  const viewerCost = isLive
    ? (isMember ? (ev.memberCredits ?? ev.creditCost) : (ev.nonMemberCredits ?? ev.creditCost))
    : ev.creditCost;
  const isFree = viewerCost === 0 || (ev.isFreeWalk && (isMember || !isLive));
  const isCapped = !!ev.capacityTotal && ev.capacityTotal > 0;
  const isOpenList = !isCapped;
  const isFull = isCapped && ((ev.capacityRemaining ?? 1) <= 0 || ev.isFull);
  const isGathering = (ev.status === "pending" || ev.status === "published_pending") && (ev.minToConfirm ?? 0) > 0;

  const statusLabel = {
    confirmed: { en: "Confirmed", es: "Confirmado", color: "#285430", bg: "#e8f1e9" },
    published_pending: { en: "To be confirmed", es: "Por confirmar", color: "#a4761f", bg: "#fff3e4" },
    pending: { en: "To be confirmed", es: "Por confirmar", color: "#a4761f", bg: "#fff3e4" },
    cancelled: { en: "Cancelled", es: "Cancelado", color: "#993842", bg: "#fbf1f1" },
    completed: { en: "Past Event", es: "Evento Pasado", color: "#606e76", bg: "#e9eaea" },
  }[ev.status] || { en: ev.status, es: ev.status, color: "#606e76", bg: "#f0f0f0" };

  return (
    <div style={{ backgroundColor: "#fdf8f2", minHeight: "100vh", fontFamily: "'Lora', Georgia, serif", color: "#39292a" }}>
      {cancelToast && (
        <div style={{ maxWidth: "1160px", margin: "24px auto 0", padding: "0 clamp(20px, 5vw, 64px)" }}>
          <div style={{ padding: "16px", backgroundColor: cancelToast.type === 'refunded' ? "#e8f1e9" : "#fbf1f1", color: "#39292a", borderRadius: "8px", position: "relative" }}>
            <button onClick={() => setCancelToast(null)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "rgba(57,41,42,0.6)" }}>✕</button>
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>{cancelToast.title}</div>
            <div style={{ fontSize: "14.5px" }}>{cancelToast.message}</div>
          </div>
        </div>
      )}
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
          padding: "clamp(18px, 3vw, 30px) clamp(12px, 4vw, 48px) clamp(40px, 5vw, 70px)",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(24px, 4vw, 48px)",
          alignItems: "flex-start",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Left Column: Event details & content */}
        <div style={{ flex: "1 1 420px", minWidth: 0, width: "100%", maxWidth: "100%" }}>
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
                backgroundColor: "#ecdcd0",
                position: "relative",
              }}
            >
              <EventCardImage
                imageUrl={ev.imageUrl}
                imageId={ev.imageId}
                title={displayTitle}
                lang={lang}
              />
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
                ? (lang === "en" ? "Mothers only" : lang === "es" ? "Solo madres" : "Mères seulement")
                : (lang === "en" ? "Children welcome" : lang === "es" ? "Peques bienvenidos" : "Enfants bienvenus")}
            </span>
            <span style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.72)", display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <span>·</span>
              <span>{getEventStageDisplay(ev, lang).displayLabel}</span>
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
                {ev.dateStr || new Date(ev.startsAt).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { weekday: "long", day: "numeric", month: "short", timeZone: "Europe/Madrid" })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11.5px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.72)", marginBottom: "6px" }}>
                {lang === "en" ? "Where" : "Dónde"}
              </div>
              <div style={{ fontSize: "15px", lineHeight: 1.5 }}>
                {ev.neighbourhood === "To be confirmed"
                  ? (lang === "es" ? "Lugar por confirmar" : lang === "fr" ? "Lieu à confirmer" : "Location to be confirmed")
                  : (ev.neighbourhood || "Barcelona")}
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
              {ev.neighbourhood === "To be confirmed"
                ? (lang === "es" ? "Estamos confirmando el lugar. Todas las inscritas recibirán un email con la zona y el punto de encuentro en cuanto se defina." : lang === "fr" ? "Nous confirmons le lieu. Toutes les inscrites recevront un email avec la zone et le point de rendez-vous dès qu'il sera défini." : "We are confirming the location. Everyone booked gets an email with the area and the meeting point as soon as it is set.")
                : isAlreadyBooked
                ? (ev.meetingPointNote || ev.venueAddress || ev.venueName || (lang === "en" ? "Meeting point details will be sent via email." : "Los detalles del punto de encuentro se enviarán por email."))
                : (lang === "en"
                    ? `The exact address is sent when you book.${ev.neighbourhood ? ` ${ev.neighbourhood}, near public transport.` : ""}`
                    : `La dirección exacta se envía al reservar.${ev.neighbourhood ? ` ${ev.neighbourhood}, cerca del transporte público.` : ""}`)}
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
                {(() => {
                  const win = (ev as any).cancellationWindowHours ?? 24;
                  if (win === 0) return lang === "en" ? "Free cancellation any time." : "Cancelación gratuita en cualquier momento.";
                  if (win === 168) return lang === "en" ? "Free cancellation up to 7 days before." : "Cancelación gratuita hasta 7 días antes.";
                  return lang === "en" ? `Free cancellation up to ${win} hours before.` : `Cancelación gratuita hasta ${win} horas antes.`;
                })()}
              </p>
              {(ev.minToConfirm ?? 0) > 0 && (
                <p style={{ margin: 0 }}>
                  {lang === "en"
                    ? `This event gathers ${ev.minToConfirm} mothers before it is confirmed. Credits are only taken if it goes ahead.`
                    : `Este evento reúne a ${ev.minToConfirm} madres para confirmarse. Los créditos solo se descuentan si se realiza.`}
                </p>
              )}
              <p style={{ margin: 0 }}>
                {ev.membersOnly
                  ? (lang === "en"
                    ? "This event is exclusively for members. You book for yourself, and the place is yours the moment it is confirmed."
                    : "Este evento es exclusivo para socias. Reservas para ti y la plaza es tuya en cuanto se confirma.")
                  : isLive
                    ? (lang === "en"
                      ? "This event is open to members and non-members. You book for yourself, and the place is yours the moment it is confirmed."
                      : "Este evento está abierto a socias y no socias. Reservas para ti y la plaza es tuya en cuanto se confirma.")
                    : (lang === "en"
                      ? "Before membership launch, this event is open to every mother, member or not. You book for yourself, and the place is yours the moment it is confirmed."
                      : "Antes del lanzamiento de la membresía, este evento está abierto a todas las madres, socias o no. Reservas para ti y la plaza es tuya en cuanto se confirma.")}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Booking Sidebar */}
        <aside style={{ flex: "1 1 300px", minWidth: 0, width: "100%", maxWidth: "100%", position: "sticky", top: "90px" }}>
          <div style={{ border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "8px", background: "#ffffff", padding: "24px" }}>
            {/* Price Row */}
            {(() => {
              const cost = isFree ? 0 : viewerCost;
              return (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "44px", lineHeight: 1, fontFeatureSettings: "'tnum'" }}>
                      {cost === 0 ? (lang === "en" ? "Free" : "Gratis") : cost}
                    </span>
                    {cost > 0 && (
                      <span style={{ fontSize: "14px", color: "rgba(57, 41, 42, 0.72)" }}>
                        {cost === 1 ? (lang === "en" ? "credit" : "crédito") : (lang === "en" ? "credits" : "créditos")}
                      </span>
                    )}
                  </div>
                  
                  {cost > 0 && (
                    <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.72)", marginBottom: "18px" }}>
                      {(() => {
                        const m = creditLifeMonths;
                        const en = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
                        const es = ["", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce"];
                        const word = (lang === "en" ? en : es)[m] || String(m);
                        return lang === "en"
                          ? `Credits last ${word} ${m === 1 ? "month" : "months"}.`
                          : `Los créditos duran ${word} ${m === 1 ? "mes" : "meses"}.`;
                      })()}
                    </div>
                  )}
                </>
              );
            })()}

            {/* Status Line */}
            <div style={{ fontSize: "13px", color: "#456f04", borderTop: "1px solid rgba(57, 41, 42, 0.12)", paddingTop: "14px", marginBottom: "6px" }}>
              {isOpenList
                ? (lang === "en" ? "Open list — no limit on places" : "Lista abierta — sin límite de plazas")
                : isFull
                ? (lang === "en" ? "Full" : "Completo")
                : (() => {
                    const left = ev.capacityRemaining ?? ev.capacityTotal ?? 0;
                    const total = ev.capacityTotal;
                    if (total) return lang === "en" ? `${left} of ${total} places left` : `Quedan ${left} de ${total} plazas`;
                    return lang === "en" ? `${left} places left` : `Quedan ${left} plazas`;
                  })()}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "12.5px", color: "rgba(57, 41, 42, 0.74)", marginBottom: "14px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13" style={{ flex: "none" }}>
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              {(() => {
                const win = (ev as any).cancellationWindowHours ?? 24;
                const cost = isFree ? 0 : viewerCost;
                if (cost === 0) {
                  // Free events - no cancellation policy needed
                  return lang === "en" ? "Free — no credits to refund" : "Gratis — sin créditos que devolver";
                }
                if (win === 0) return lang === "en" ? "Cancel any time" : "Cancela en cualquier momento";
                if (win === 168) return lang === "en" ? "Free cancellation up to 7 days before" : "Cancelación gratuita hasta 7 días antes";
                return lang === "en" ? `Free cancellation up to ${win}h before` : `Cancelación gratuita hasta ${win}h antes`;
              })()}
            </div>

            {/* Main Booking Button */}
            {isMember ? (
              isAlreadyBooked ? (
                <Link
                  href="/account"
                  style={{
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                    textAlign: "center",
                    border: "1px solid rgba(86, 139, 5, 0.4)",
                    backgroundColor: "rgba(86, 139, 5, 0.1)",
                    color: "#456f04",
                    borderRadius: "4px",
                    padding: "13px 16px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "15.5px",
                    textDecoration: "none",
                  }}
                >
                  {isOpenList
                    ? (lang === "en" ? "You're on the list — see your account" : "Estás en la lista — ver mi cuenta")
                    : (lang === "en" ? "Booked — see your account" : "Reservada — ver mi cuenta")}
                </Link>
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
                  onClick={() => {
                    // BLOCKER FIX: If insufficient credits, go directly to top-up instead of attempting book
                    if (!isFree && currentCreditBalance < viewerCost) {
                      setTopUpEvent(ev);
                    } else {
                      handleMemberBook(ev);
                    }
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
                    cursor: actionLoading ? "wait" : "pointer",
                  }}
                >
                  {actionLoading
                    ? (lang === "en" ? "Booking…" : "Reservando…")
                    : (!isFree && currentCreditBalance < viewerCost)
                    ? (lang === "en" ? "Top up to book" : "Recargar para reservar")
                    : (lang === "en" ? "Book" : "Reservar")}
                </button>
              )
            ) : (
              /* Signed-out User */
              <button
                type="button"
                onClick={() => {
                  setSignedOutEvent(ev);
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
                {lang === "en" ? "Book" : "Reservar"}
              </button>
            )}

            {!session?.user ? (
              <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57, 41, 42, 0.72)", marginTop: "12px" }}>
                {lang === "en" ? "No account yet? It is created with this booking." : "¿Aún sin cuenta? Se crea con esta reserva."}
              </div>
            ) : memberCredits !== null && (
              <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57, 41, 42, 0.72)", marginTop: "12px" }}>
                {(() => {
                  const cr = (n: number) => lang === "en"
                    ? `${n} ${n === 1 ? "credit" : "credits"}`
                    : `${n} ${n === 1 ? "crédito" : "créditos"}`;
                  if (isAlreadyBooked) return lang === "en" ? "Confirmation and the meeting point are in your account." : "La confirmación y el punto de encuentro están en tu cuenta.";
                  if (isFree || viewerCost === 0) return lang === "en" ? "Nothing is deducted from your wallet." : "No se descuenta nada de tu monedero.";
                  const need = viewerCost - currentCreditBalance;
                  if (need <= 0) return lang === "en" ? `Balance after booking: ${cr(currentCreditBalance - viewerCost)}.` : `Saldo tras reservar: ${cr(currentCreditBalance - viewerCost)}.`;
                  return lang === "en"
                    ? `You have ${cr(currentCreditBalance)}. Add ${cr(need)} in your account to book.`
                    : `Tienes ${cr(currentCreditBalance)}. Añade ${cr(need)} en tu cuenta para reservar.`;
                })()}
              </div>
            )}

            {/* Release my place section when booked (§Event.dc.html) */}
            {isAlreadyBooked && (
              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid rgba(57, 41, 42, 0.12)" }}>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  disabled={cancellingBooking || !userBookingId}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(57, 41, 42, 0.28)",
                    background: "transparent",
                    color: "rgba(57, 41, 42, 0.72)",
                    borderRadius: "4px",
                    padding: "11px 16px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "13.5px",
                    cursor: cancellingBooking ? "wait" : "pointer",
                  }}
                >
                  {cancellingBooking
                    ? (lang === "en" ? "Releasing…" : "Liberando…")
                    : (lang === "en" ? "Release my place" : "Liberar mi plaza")}
                </button>
                <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57, 41, 42, 0.72)", marginTop: "8px" }}>
                  {isFree
                    ? (lang === "en" ? "Nothing to refund." : "Nada que reembolsar.")
                    : (lang === "en"
                      ? `You will get your ${viewerCost} ${viewerCost === 1 ? "credit" : "credits"} back.`
                      : `Recibirás ${viewerCost} ${viewerCost === 1 ? "crédito" : "créditos"} de vuelta.`)}
                </div>
              </div>
            )}
          </div>

          {/* Gold Notice Box below Sidebar */}
          {!isLive && (
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
              {(() => {
                const when = launchAt
                  ? launchAt.toLocaleDateString(lang === "es" ? "es-ES" : "en-GB", { month: "long", year: "numeric" })
                  : (lang === "en" ? "January 2027" : "enero de 2027");
                return lang === "en" ? `Coming before ${when}?` : `¿Vienes antes de ${when}?`;
              })()}
            </div>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "#5c4708", margin: 0 }}>
              {lang === "en"
                ? "Every mother who books an event before membership opens hears from us first, before it opens publicly."
                : "Toda madre que reserve un evento antes de abrir la membresía se enterará antes que nadie."}
            </p>
          </div>
          )}
        </aside>
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
                : bookingError === "PERSON_NOT_FOUND"
                ? (lang === "en" ? "Your account profile could not be found (Admins cannot book events). Please contact support." : "No se encontró tu perfil de cuenta (Los administradores no pueden reservar eventos). Por favor, contacta con soporte.")
                : bookingError === "ACCOUNT_SUSPENDED"
                ? (lang === "en" ? "Your account is currently suspended." : "Tu cuenta está suspendida actualmente.")
                : bookingError === "EVENT_FULL"
                ? (lang === "en" ? "This event is fully booked." : "Este evento está completo.")
                : bookingError === "MEMBERS_ONLY_WINDOW"
                ? (lang === "en" ? "This event is currently only open to members." : "Este evento actualmente solo está abierto para socias.")
                : bookingError === "NOT_OPEN_YET"
                ? (lang === "en" ? "Booking is not open yet." : "Las reservas aún no están abiertas.")
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
