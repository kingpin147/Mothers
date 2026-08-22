"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { bookEvent, buyGuestPass } from "@/app/actions/booking";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const router = useRouter();
  const { data: session } = useSession();

  const [lang, setLang] = useState<"en" | "es">("en");
  const [modalOpen, setModalOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<"member" | "guest">("member");
  const [guestForm, setGuestForm] = useState({ firstName: "", lastName: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved);
  }, []);

  const eventData = {
    id: eventId,
    title: "Sensory Play & Stroller Meetup",
    category: "Play Dates",
    stage: "0–12 months",
    neighbourhood: "Sarrià-Sant Gervasi",
    venueName: "Parc de Can Ponsic",
    meetingPoint: "Meeting point details will be revealed in your account and confirmation email.",
    dateStr: "Saturday, 29 Aug 2026",
    timeStr: "11:00 – 12:30",
    creditCost: 18,
    guestPriceCents: 3500,
    status: "confirmed",
    capacityMember: 8,
    bookedMember: 6,
    description:
      "A gently paced morning for mothers with babies from birth to first steps. We gather for sensory exploration, tea in the park, and honest postpartum conversations.",
  };

  const spotsRemaining = eventData.capacityMember - eventData.bookedMember;
  const isMember = !!session?.user;

  const handleMemberBook = async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await bookEvent(eventId);
    setLoading(false);

    if (res.success) {
      setBookingSuccess(true);
    } else {
      setErrorMsg(res.error || "Booking failed.");
    }
  };

  const handleGuestBuy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestForm.firstName || !guestForm.email) {
      setErrorMsg("Please fill in your name and email.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    const res = await buyGuestPass({
      eventId,
      firstName: guestForm.firstName,
      lastName: guestForm.lastName,
      email: guestForm.email,
    });
    setLoading(false);

    if (res.success) {
      setBookingSuccess(true);
    } else {
      setErrorMsg(res.error || "Purchase failed.");
    }
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg-events)", minHeight: "100vh", padding: "48px clamp(24px, 5vw, 64px) 80px" }}>
      <div style={{ maxWidth: "840px", margin: "0 auto" }}>
        {/* Back link */}
        <div style={{ marginBottom: "24px" }}>
          <Link href="/events" style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
            ← {lang === "en" ? "Back to Events Calendar" : "Volver al Calendario"}
          </Link>
        </div>

        {/* Main Event Card */}
        <div className="card" style={{ backgroundColor: "#fff", padding: "clamp(32px, 5vw, 48px)", border: "1px solid var(--color-divider)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <span style={{
              backgroundColor: "var(--color-status-confirmed)",
              color: "#285430",
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: "4px"
            }}>
              {lang === "en" ? "Confirmed Event" : "Encuentro Confirmado"}
            </span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "22px", fontWeight: 600, color: "var(--color-accent)" }}>
              {eventData.creditCost} credits / €35 Guest Pass
            </span>
          </div>

          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(28px, 4.5vw, 42px)", margin: "0 0 16px" }}>
            {eventData.title}
          </h1>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            backgroundColor: "#fdf9f2",
            padding: "20px",
            borderRadius: "6px",
            margin: "24px 0",
            fontSize: "14px"
          }}>
            <div><strong>📅 Date:</strong> {eventData.dateStr}</div>
            <div><strong>⏰ Time:</strong> {eventData.timeStr}</div>
            <div><strong>📍 Area:</strong> {eventData.neighbourhood}</div>
            <div><strong>👶 Stage:</strong> {eventData.stage}</div>
          </div>

          <h3 style={{ fontSize: "18px", marginTop: "28px", marginBottom: "8px" }}>
            {lang === "en" ? "About this experience" : "Sobre este encuentro"}
          </h3>
          <p style={{ fontSize: "16px", lineHeight: "1.65", color: "var(--color-text-muted)", marginBottom: "32px" }}>
            {eventData.description}
          </p>

          {/* Action Bar */}
          <div style={{
            borderTop: "1px solid var(--color-divider)",
            paddingTop: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-accent)" }}>
                {spotsRemaining} {lang === "en" ? "Member spots available" : "Plazas para socias disponibles"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                {lang === "en" ? "Meeting point sent upon booking" : "Punto de encuentro enviado tras reservar"}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => { setModalOpen(true); setBookingMode(isMember ? "member" : "guest"); }}
                className="btn btn-primary"
                style={{ padding: "12px 26px", fontSize: "15px" }}
              >
                {isMember
                  ? lang === "en" ? `Book (${eventData.creditCost} Credits)` : `Reservar (${eventData.creditCost} Créditos)`
                  : lang === "en" ? "Book Place / Pass" : "Reservar Plaza"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOOKING MODAL ─── */}
      {modalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(57, 41, 42, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          zIndex: 100
        }}>
          <div className="card" style={{
            maxWidth: "480px",
            width: "100%",
            backgroundColor: "#fff",
            padding: "32px",
            borderRadius: "8px",
            position: "relative"
          }}>
            <button
              onClick={() => { setModalOpen(false); setBookingSuccess(false); }}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}
            >
              ✕
            </button>

            {bookingSuccess ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: "36px", color: "var(--color-accent-2)", marginBottom: "12px" }}>✓</div>
                <h3 style={{ fontSize: "22px", marginBottom: "8px" }}>
                  {lang === "en" ? "Place Confirmed!" : "¡Plaza Confirmada!"}
                </h3>
                <p style={{ fontSize: "14.5px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
                  {lang === "en"
                    ? "Your booking has been recorded. Check your email for full meeting point details."
                    : "Tu reserva ha sido registrada. Revisa tu correo con los detalles del punto de encuentro."}
                </p>
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); router.push("/account"); }}
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                >
                  {lang === "en" ? "Go to My Account" : "Ir a Mi Cuenta"}
                </button>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: "22px", marginBottom: "6px" }}>
                  {lang === "en" ? "Confirm Your Booking" : "Confirmar Reserva"}
                </h2>
                <p style={{ fontSize: "13.5px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
                  {eventData.title}
                </p>

                {errorMsg && (
                  <div style={{ backgroundColor: "var(--color-status-cancelled)", color: "#993842", padding: "10px", borderRadius: "4px", fontSize: "13px", marginBottom: "16px" }}>
                    {errorMsg}
                  </div>
                )}

                {/* Member Flow */}
                {isMember ? (
                  <div>
                    <div style={{ backgroundColor: "#fdf9f2", padding: "16px", borderRadius: "6px", marginBottom: "20px", fontSize: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span>{lang === "en" ? "Credits to deduct:" : "Créditos a descontar:"}</span>
                        <strong style={{ color: "var(--color-accent)" }}>{eventData.creditCost} credits</strong>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                        {lang === "en" ? "Free cancellation up to 24h prior." : "Cancelación gratuita hasta 24h antes."}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleMemberBook}
                      disabled={loading}
                      className="btn btn-primary"
                      style={{ width: "100%", padding: "12px", fontSize: "15px" }}
                    >
                      {loading
                        ? lang === "en" ? "Confirming..." : "Confirmando..."
                        : lang === "en" ? `Confirm (${eventData.creditCost} Credits)` : `Confirmar (${eventData.creditCost} Créditos)`}
                    </button>
                  </div>
                ) : (
                  /* Guest Pass Flow */
                  <form onSubmit={handleGuestBuy} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ backgroundColor: "#f4f7ee", padding: "12px 16px", borderRadius: "4px", fontSize: "13px" }}>
                      <strong>Guest Event Pass: €35</strong>
                      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                        Includes ticket, meeting point, and €35 credit toward membership within 30 days.
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "4px" }}>
                        First Name
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={guestForm.firstName}
                        onChange={(e) => setGuestForm({ ...guestForm, firstName: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "4px" }}>
                        Surname
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={guestForm.lastName}
                        onChange={(e) => setGuestForm({ ...guestForm, lastName: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "4px" }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="input"
                        value={guestForm.email}
                        onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                      style={{ width: "100%", padding: "12px", marginTop: "8px", fontSize: "15px" }}
                    >
                      {loading ? "Processing..." : "Buy Guest Pass (€35) →"}
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
