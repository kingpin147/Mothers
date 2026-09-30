"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { applyToHostEvent, withdrawHostRequest } from "@/app/actions/host";

interface EventNeedingHost {
  id: string;
  title: string;
  startsAt: Date | string;
  neighbourhood: string | null;
  venueName: string | null;
  languages: string[] | null;
  creditCost: number;
  needsHost: boolean | null;
  hostPersonId: string | null;
  status: string;
}

interface HostClientProps {
  currentUser: any;
  eligibility: any;
  eventsNeedingHost: EventNeedingHost[];
  userBookings: string[];
  userHostRequests: { id: string; eventId: string; status: string }[];
}

export function HostClient({
  currentUser,
  eligibility,
  eventsNeedingHost = [],
  userBookings = [],
  userHostRequests = [],
}: HostClientProps) {
  const { language: lang } = useLanguage();
  const isEn = lang === "en";

  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [localHostRequests, setLocalHostRequests] = useState(userHostRequests);

  const isEligible = eligibility?.eligible === true;

  const handleApplyToHost = async (eventId: string) => {
    if (!currentUser) return;
    setLoadingEventId(eventId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await applyToHostEvent(eventId);
      if (res.success) {
        setSuccessMsg(
          isEn
            ? "Your host request has been submitted! The team will review and confirm by email."
            : "¡Tu solicitud de anfitriona ha sido enviada! El equipo la revisará y confirmará por correo."
        );
        setLocalHostRequests((prev) => [
          ...prev.filter((r) => r.eventId !== eventId),
          { id: res.hostRequestId || "new", eventId, status: "pending" },
        ]);
      } else {
        setErrorMsg(res.error || "Failed to submit host request.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
    } finally {
      setLoadingEventId(null);
    }
  };

  const handleWithdrawRequest = async (requestId: string, eventId: string) => {
    if (!confirm(isEn ? "Withdraw your host request?" : "¿Retirar tu solicitud de anfitriona?")) return;
    setLoadingEventId(eventId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await withdrawHostRequest(requestId);
      if (res.success) {
        setSuccessMsg(isEn ? "Host request withdrawn." : "Solicitud de anfitriona retirada.");
        setLocalHostRequests((prev) => prev.filter((r) => r.id !== requestId && r.eventId !== eventId));
      } else {
        setErrorMsg(res.error || "Failed to withdraw request.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
    } finally {
      setLoadingEventId(null);
    }
  };

  const conditionGroups = [
    {
      title: isEn ? "Eligibility" : "Requisitos",
      items: isEn
        ? [
            "An account on themothers.cc",
            "At least 2 events attended in person",
            "No no-shows in the last 3 months",
          ]
        : [
            "Tener cuenta en themothers.cc",
            "Haber asistido al menos a 2 eventos",
            "Sin ausencias injustificadas en 3 meses",
          ],
    },
    {
      title: isEn ? "Commitment" : "Compromiso",
      items: isEn
        ? [
            "Arrive 10 minutes early at the meeting point",
            "Welcome mothers as they arrive",
            "No commercial selling or promotion",
          ]
        : [
            "Llegar 10 minutos antes al punto de encuentro",
            "Dar la bienvenida a cada madre al llegar",
            "Prohibida la venta o promoción comercial",
          ],
    },
    {
      title: isEn ? "Rewards" : "Compensación",
      items: isEn
        ? [
            "2 credits awarded once the event runs",
            "50% credit refund on your booked place",
            "Credits valid for 6 months across calendar",
          ]
        : [
            "2 créditos al completarse el encuentro",
            "50% de devolución en créditos de tu plaza",
            "Créditos válidos durante 6 meses",
          ],
    },
  ];

  return (
    <div style={{ backgroundColor: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      {/* ─── 1. HERO SECTION ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(38px, 5vw, 70px) clamp(20px, 5vw, 64px) clamp(30px, 4vw, 48px)",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(30px, 4vw, 54px)",
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 420px", minWidth: "290px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#3b5e04",
              marginBottom: "14px",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ flex: "none" }}>
              <path d="m12 2 2.9 6.3 6.6.8-4.9 4.5 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9.1l6.6-.8Z" />
            </svg>
            {isEn ? "Become a host" : "Sé anfitriona"}
          </div>

          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.6vw, 56px)",
              lineHeight: 1.06,
              margin: "0 0 18px",
            }}
          >
            {isEn ? "Be the first friendly face." : "Sé la primera cara amiga."}
          </h1>

          <p style={{ fontSize: "17px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.76)", margin: "0 0 22px", maxWidth: "46ch" }}>
            {isEn ? (
              <>
                A host welcomes the other mothers at an event on the calendar — says hello, makes the introductions, and makes sure nobody stands alone. You earn <strong style={{ fontWeight: 600 }}>2 credits</strong> each time.
              </>
            ) : (
              <>
                Una anfitriona da la bienvenida a las demás madres en un evento del calendario: saluda, hace las presentaciones y cuida que ninguna madre se sienta sola. Ganas <strong style={{ fontWeight: 600 }}>2 créditos</strong> en cada encuentro.
              </>
            )}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            <a
              href="#host-form"
              style={{
                border: "1px solid #568b05",
                backgroundColor: "#568b05",
                color: "#ffffff",
                padding: "13px 24px",
                borderRadius: "4px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "15.5px",
                whiteSpace: "nowrap",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              {isEn ? "Pick an event to host" : "Elige un evento para ser anfitriona"}
            </a>
          </div>
        </div>

        <div style={{ flex: "1 1 340px", minWidth: "270px" }}>
          <div style={{ backgroundColor: "#ecdcd0", padding: "8px", borderRadius: "6px", boxShadow: "0 12px 32px rgba(45, 43, 43, 0.14)" }}>
            <div style={{ border: "1px solid rgba(57, 41, 42, 0.18)", borderRadius: "3px", overflow: "hidden", height: "340px", position: "relative" }}>
              <img
                src="/assets/home-hero.webp"
                alt="Mother welcoming other mothers"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. HOW IT WORKS (3 SIMPLE STEPS) ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#7b1f2c",
            marginBottom: "10px",
          }}
        >
          {isEn ? "How it works" : "Cómo funciona"}
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.12, margin: "0 0 26px" }}>
          {isEn ? "Three simple steps." : "Tres pasos sencillos."}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "18px" }}>
          <div style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "30px", lineHeight: 1, color: "rgba(123, 31, 44, 0.4)", marginBottom: "10px" }}>
              01
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", margin: "0 0 6px" }}>
              {isEn ? "Pick an event" : "Elige un evento"}
            </h3>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: 0 }}>
              {isEn
                ? "Book an event that still needs a host, then ask to host it."
                : "Reserva un evento que necesite anfitriona y solicita dinamizarlo."}
            </p>
          </div>

          <div style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "30px", lineHeight: 1, color: "rgba(123, 31, 44, 0.4)", marginBottom: "10px" }}>
              02
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", margin: "0 0 6px" }}>
              {isEn ? "Arrive 10 minutes early" : "Llega 10 minutos antes"}
            </h3>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: 0 }}>
              {isEn
                ? "Be there first, so every mother is greeted as she arrives."
                : "Llega con tiempo para recibir a cada madre con calidez."}
            </p>
          </div>

          <div style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "30px", lineHeight: 1, color: "rgba(123, 31, 44, 0.4)", marginBottom: "10px" }}>
              03
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", margin: "0 0 6px" }}>
              {isEn ? "Welcome & introduce" : "Presenta y dinamiza"}
            </h3>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: 0 }}>
              {isEn
                ? "Say hello, make the introductions — nobody stands alone."
                : "Haz las presentaciones iniciales: nadie se queda fuera."}
            </p>
          </div>
        </div>
      </section>

      {/* ─── 3. CONDITIONS (ELIGIBILITY, COMMITMENT, REWARDS) ─── */}
      <section
        id="host-conditions"
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#7b1f2c",
            marginBottom: "10px",
          }}
        >
          {isEn ? "Conditions" : "Condiciones"}
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.12, margin: "0 0 26px" }}>
          {isEn ? "Simple, and fair." : "Sencillas y transparentes."}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "20px", alignItems: "stretch" }}>
          {conditionGroups.map((g, gi) => (
            <div key={gi} style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "clamp(20px, 3vw, 26px)" }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px", margin: "0 0 10px", paddingBottom: "12px" }}>
                {g.title}
              </h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {g.items.map((c, ci) => (
                  <div key={ci} style={{ display: "flex", gap: "11px", alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#568b05" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" style={{ flex: "none", marginTop: "3px" }}>
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                    <span style={{ fontSize: "14px", lineHeight: "1.55", color: "#39292a" }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 4. PICK AN EVENT TO HOST (INTERACTIVE ROSTER) ─── */}
      <section
        id="host-form"
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px) clamp(46px, 6vw, 80px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(26px, 4vw, 48px)",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: "1 1 300px", minWidth: "260px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.12, margin: "0 0 14px" }}>
            {isEn ? "Pick an event to host." : "Elige un encuentro para ser anfitriona."}
          </h2>
          <p style={{ fontSize: "15.5px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.74)", margin: "0 0 18px", maxWidth: "44ch" }}>
            {isEn
              ? "The team reviews each request and confirms by email, usually within a day."
              : "El equipo revisa cada solicitud y te confirma por correo, normalmente en menos de 24 horas."}
          </p>

          {/* Eligibility Card */}
          <div
            style={{
              border: !currentUser ? "1px solid rgba(57, 41, 42, 0.16)" : (isEligible ? "1px solid rgba(86, 139, 5, 0.4)" : "1px solid rgba(123, 31, 44, 0.3)"),
              backgroundColor: !currentUser ? "#ffffff" : (isEligible ? "rgba(86, 139, 5, 0.08)" : "rgba(123, 31, 44, 0.06)"),
              borderRadius: "6px",
              padding: "16px 18px",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "12px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: !currentUser ? "rgba(57, 41, 42, 0.65)" : (isEligible ? "#3b5e04" : "#7b1f2c"),
                marginBottom: "6px",
              }}
            >
              {isEn ? "Your eligibility" : "Tu estado para ser anfitriona"}
            </div>
            {!currentUser ? (
              <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                {isEn ? (
                  <>
                    Please{" "}
                    <Link href="/account/login" style={{ color: "#7b1f2c", textDecoration: "underline", fontWeight: 500 }}>
                      log in
                    </Link>{" "}
                    to check your eligibility and request to host.
                  </>
                ) : (
                  <>
                    <Link href="/account/login" style={{ color: "#7b1f2c", textDecoration: "underline", fontWeight: 500 }}>
                      Inicia sesión
                    </Link>{" "}
                    para comprobar tu estado y solicitar ser anfitriona.
                  </>
                )}
              </p>
            ) : isEligible ? (
              <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                {isEn
                  ? `You are eligible to host! You have attended ${eligibility.totalAttended} events with 0 no-shows.`
                  : `¡Cumples los requisitos! Has asistido a ${eligibility.totalAttended} eventos sin ausencias.`}
              </p>
            ) : (
              <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                {eligibility.totalAttended < 2
                  ? (isEn
                      ? `Attend ${2 - eligibility.totalAttended} more event(s) to unlock hosting eligibility.`
                      : `Asiste a ${2 - eligibility.totalAttended} evento(s) más para poder ser anfitriona.`)
                  : (isEn
                      ? "Hosting is temporarily paused due to a recent no-show or cancellation."
                      : "La opción de ser anfitriona está en pausa por una ausencia reciente.")}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Event List */}
        <div style={{ flex: "1 1 400px", minWidth: "280px", border: "1px solid rgba(57, 41, 42, 0.18)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "clamp(22px, 3vw, 30px)" }}>
          <div style={{ fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.72)", marginBottom: "14px" }}>
            {isEn ? "Coming up — needs a host" : "Próximos eventos — necesitan anfitriona"}
          </div>

          {successMsg && (
            <div style={{ padding: "12px 14px", backgroundColor: "rgba(86, 139, 5, 0.12)", border: "1px solid #568b05", borderRadius: "4px", fontSize: "13.5px", color: "#3b5e04", marginBottom: "14px" }}>
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div style={{ padding: "12px 14px", backgroundColor: "rgba(123, 31, 44, 0.1)", border: "1px solid #7b1f2c", borderRadius: "4px", fontSize: "13.5px", color: "#7b1f2c", marginBottom: "14px" }}>
              {errorMsg}
            </div>
          )}

          {eventsNeedingHost.length === 0 ? (
            <p style={{ fontSize: "14.5px", color: "rgba(57, 41, 42, 0.7)", margin: "14px 0" }}>
              {isEn ? "All upcoming events currently have a host confirmed. Check back soon!" : "Todos los próximos eventos ya cuentan con anfitriona confirmada. ¡Vuelve a consultar pronto!"}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {eventsNeedingHost.map((ev) => {
                const isBooked = userBookings.includes(ev.id);
                const hostReq = localHostRequests.find((r) => r.eventId === ev.id);
                const starts = new Date(ev.startsAt);
                const dateFormatted = starts.toLocaleDateString(isEn ? "en-GB" : "es-ES", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={ev.id}
                    style={{
                      border: "1px solid rgba(57, 41, 42, 0.14)",
                      borderRadius: "6px",
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                      <div>
                        <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", margin: "0 0 4px", color: "#39292a" }}>
                          {ev.title}
                        </h4>
                        <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.72)" }}>
                          {dateFormatted} · {ev.neighbourhood || "Barcelona"}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "#3b5e04",
                          backgroundColor: "rgba(86, 139, 5, 0.1)",
                          border: "1px solid rgba(86, 139, 5, 0.3)",
                          borderRadius: "10px",
                          padding: "2px 8px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        +2 credits
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "10px", marginTop: "4px" }}>
                      {!currentUser ? (
                        <Link
                          href={`/events/${ev.id}`}
                          style={{
                            fontSize: "13.5px",
                            fontFamily: "'Cormorant Garamond', serif",
                            fontWeight: 600,
                            color: "#7b1f2c",
                            textDecoration: "none",
                          }}
                        >
                          {isEn ? "View event details" : "Ver detalles"}
                        </Link>
                      ) : hostReq ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "12.5px", color: hostReq.status === "accepted" ? "#3b5e04" : "rgba(57, 41, 42, 0.72)" }}>
                            {hostReq.status === "accepted"
                              ? (isEn ? "Host confirmed" : "Anfitriona confirmada")
                              : (isEn ? "Request pending" : "Solicitud en revisión")}
                          </span>
                          {hostReq.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleWithdrawRequest(hostReq.id, ev.id)}
                              disabled={loadingEventId === ev.id}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "rgba(57, 41, 42, 0.6)",
                                fontSize: "12px",
                                textDecoration: "underline",
                                cursor: "pointer",
                              }}
                            >
                              {isEn ? "Withdraw" : "Retirar"}
                            </button>
                          )}
                        </div>
                      ) : !isBooked ? (
                        <Link
                          href={`/events/${ev.id}`}
                          style={{
                            border: "1px solid rgba(57, 41, 42, 0.28)",
                            backgroundColor: "transparent",
                            color: "#39292a",
                            borderRadius: "4px",
                            padding: "8px 16px",
                            fontFamily: "'Cormorant Garamond', serif",
                            fontWeight: 600,
                            fontSize: "14px",
                            textDecoration: "none",
                          }}
                        >
                          {isEn ? "Book place first" : "Reservar plaza primero"}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled={!isEligible || loadingEventId === ev.id}
                          onClick={() => handleApplyToHost(ev.id)}
                          style={{
                            border: "1px solid #568b05",
                            backgroundColor: "#568b05",
                            color: "#ffffff",
                            borderRadius: "4px",
                            padding: "8px 16px",
                            fontFamily: "'Cormorant Garamond', serif",
                            fontWeight: 600,
                            fontSize: "14px",
                            cursor: isEligible && loadingEventId !== ev.id ? "pointer" : "not-allowed",
                            opacity: isEligible ? 1 : 0.6,
                          }}
                        >
                          {loadingEventId === ev.id
                            ? "..."
                            : (isEn ? "Ask to host this event" : "Solicitar ser anfitriona")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
