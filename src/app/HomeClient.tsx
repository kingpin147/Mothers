"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";
import {
  getEventDisplayTitle,
  getCategoryInfo,
  formatEventDate,
  EventCardImage,
} from "@/app/events/EventsCalendar";
import { getPublicEvents } from "@/app/actions/events";

export default function HomeClient({ initialEvents = [] }: { initialEvents?: any[] }) {
  const { language: lang } = useLanguage();
  const { data: session } = useSession();
  const isMember = (session?.user as any)?.role === "member" && !!(session?.user as any)?.memberId;
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [eventsList, setEventsList] = useState<any[]>(initialEvents);
  const [waitlisted, setWaitlisted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tm_pre_joined_list");
    if (saved) setWaitlisted(true);

    import("@/app/actions/adminSettings").then(({ getPublicClubSettings }) => {
      getPublicClubSettings().then((s) => {
        if (s.membershipLive) setIsLive(true);
      }).catch(() => {});
    });

    if (!initialEvents || initialEvents.length === 0) {
      getPublicEvents()
        .then((data) => {
          if (data?.events && data.events.length > 0) {
            setEventsList(data.events);
          }
        })
        .catch(() => {});
    }
  }, [initialEvents]);

  const handleJoinList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg(lang === "en" ? "Please enter a valid email." : "Introduce un correo válido.");
      return;
    }
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "home_page_waitlist" }),
      });
      if (!res.ok) throw new Error("Failed");
      setWaitlisted(true);
      localStorage.setItem("tm_pre_joined_list", "true");
      setModalOpen(false);
    } catch {
      setErrorMsg(lang === "en" ? "Something went wrong. Please try again." : "Algo ha fallado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const activeEvents = (eventsList || [])
    .filter((ev: any) => {
      if (!ev) return false;
      if (ev.status === "cancelled" || ev.status === "draft" || ev.status === "completed" || ev.status === "past") {
        return false;
      }
      if (!ev.startsAt) return false;
      const start = new Date(ev.startsAt);
      if (isNaN(start.getTime())) return false;
      const isPast = ev.endsAt ? new Date(ev.endsAt) < now : start < now;
      return !isPast;
    })
    .sort((a: any, b: any) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const displayEvents = activeEvents.slice(0, 10);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const checkOverflow = () => {
      if (!el) return;
      // Arrows are only shown when there is more content to swipe than can fit in the viewport
      setCanScroll(el.scrollWidth > el.clientWidth + 10);
    };

    checkOverflow();

    window.addEventListener("resize", checkOverflow);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(checkOverflow) : null;
    if (observer) observer.observe(el);

    return () => {
      window.removeEventListener("resize", checkOverflow);
      if (observer) observer.disconnect();
    };
  }, [displayEvents]);

  return (
    <div style={{ backgroundColor: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      {/* ─── 1. HERO SECTION ─── */}
      <section
        style={{
          maxWidth: "1240px",
          margin: "0 auto",
          padding: "clamp(40px, 6vw, 80px) clamp(20px, 5vw, 64px) clamp(32px, 4vw, 56px)",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(32px, 5vw, 56px)",
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 440px", minWidth: "280px" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              marginBottom: "18px",
            }}
          >
            {lang === "en" ? "Barcelona · a circle of mothers" : "Barcelona · un círculo de madres"}
          </div>

          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 400,
              fontSize: "clamp(38px, 5.4vw, 70px)",
              lineHeight: 1.04,
              letterSpacing: "-0.01em",
              margin: "0 0 22px",
              textWrap: "pretty",
            }}
          >
            {lang === "en" ? "Find your people. Build your circle." : "Encuentra a tu gente. Crea tu círculo."}
          </h1>

          <p
            style={{
              fontSize: "18px",
              lineHeight: 1.65,
              color: "rgba(57, 41, 42, 0.75)",
              maxWidth: "52ch",
              margin: "0 0 18px",
            }}
          >
            {lang === "en"
              ? "Motherhood is better with friends who get it. Meet mothers at your stage, in your neighbourhood — and keep seeing them, week after week, until they are yours."
              : "La maternidad se vive mejor con amigas que te entienden. Conoce a madres en tu misma etapa, en tu barrio — y sigue viéndolas, semana tras semana, hasta que formen parte de tu vida."}
          </p>

          <p
            style={{
              fontSize: "14.5px",
              lineHeight: 1.6,
              color: "rgba(57, 41, 42, 0.72)",
              borderTop: "1px solid rgba(57, 41, 42, 0.16)",
              paddingTop: "16px",
              margin: 0,
              maxWidth: "48ch",
            }}
          >
            {lang === "en"
              ? "Walks, play dates, suppers and talks across Barcelona — from pregnancy through the school years."
              : "Caminatas, quedadas, cenas y charlas por toda Barcelona — desde el embarazo hasta la etapa escolar."}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", marginTop: "26px" }}>
            <Link
              href="/events"
              style={{
                border: "1px solid #7b1f2c",
                color: "#7b1f2c",
                backgroundColor: "transparent",
                padding: "13px 24px",
                borderRadius: "4px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "15.5px",
                whiteSpace: "nowrap",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(123, 31, 44, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {lang === "en" ? "See what's on" : "Ver qué eventos hay"}
            </Link>
          </div>
        </div>

        {/* Hero Image Frame */}
        <div style={{ flex: "1 1 380px", minWidth: "270px" }}>
          <div
            style={{
              backgroundColor: "#ecdcd0",
              padding: "8px",
              borderRadius: "6px",
              boxShadow: "0 12px 32px rgba(45, 43, 43, 0.16)",
            }}
          >
            <div
              style={{
                border: "1px solid rgba(57, 41, 42, 0.18)",
                borderRadius: "3px",
                overflow: "hidden",
                height: "440px",
                backgroundColor: "#f4ece1",
              }}
            >
              <img
                src="/assets/home-hero.webp"
                alt="Mothers in Barcelona walking and enjoying a picnic together"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. HOW FRIENDSHIPS START (3-STEP GUIDE) ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(40px, 5vw, 70px) clamp(20px, 5vw, 64px) clamp(24px, 3vw, 36px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "620px", margin: "0 auto 36px" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#7b1f2c",
              marginBottom: "10px",
            }}
          >
            {lang === "en" ? "How friendships start" : "Cómo empiezan las amistades"}
          </div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "clamp(27px, 3.6vw, 40px)",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {lang === "en" ? "From stranger to friend, in three steps." : "De desconocida a amiga, en tres pasos."}
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", gap: "28px" }}>
          {/* Step 01 */}
          <div style={{ textAlign: "center", padding: "0 10px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 400,
                fontSize: "38px",
                lineHeight: 1.1,
                color: "rgba(123, 31, 44, 0.28)",
                marginBottom: "6px",
                fontFeatureSettings: "'tnum'",
              }}
            >
              01
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "21px", margin: "0 0 7px" }}>
              {lang === "en" ? "Come once" : "Ven una vez"}
            </h3>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: 0 }}>
              {lang === "en"
                ? "Start with a walk or a hosted coffee. A host makes the introductions, so you never walk in alone."
                : "Empieza con una caminata o un café con anfitriona. Una madre anfitriona hace las presentaciones para que nunca llegues sola."}
            </p>
          </div>

          {/* Step 02 */}
          <div style={{ textAlign: "center", padding: "0 10px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 400,
                fontSize: "38px",
                lineHeight: 1.1,
                color: "rgba(123, 31, 44, 0.28)",
                marginBottom: "6px",
                fontFeatureSettings: "'tnum'",
              }}
            >
              02
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "21px", margin: "0 0 7px" }}>
              {lang === "en" ? "Keep coming back" : "Sigue viniendo"}
            </h3>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: 0 }}>
              {lang === "en"
                ? "Small groups, the same faces. By the third time, you are not talking about the babies any more."
                : "Grupos reducidos, las mismas caras. A la tercera vez, ya no solo habláis de los bebés."}
            </p>
          </div>

          {/* Step 03 */}
          <div style={{ textAlign: "center", padding: "0 10px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 400,
                fontSize: "38px",
                lineHeight: 1.1,
                color: "rgba(123, 31, 44, 0.28)",
                marginBottom: "6px",
                fontFeatureSettings: "'tnum'",
              }}
            >
              03
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "21px", margin: "0 0 7px" }}>
              {lang === "en" ? "Find your circle" : "Encuentra tu círculo"}
            </h3>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: 0 }}>
              {lang === "en"
                ? "The mothers you call on a bad Tuesday. The ones who get it, because they are living it too."
                : "Las madres a las que llamas un martes difícil. Las que te entienden porque están viviendo lo mismo."}
            </p>
          </div>
        </div>
      </section>

      {/* ─── 3. NEXT ON THE CALENDAR (CAROUSEL) ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "baseline", justifyContent: "space-between", marginBottom: "26px" }}>
          <div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#7b1f2c",
                marginBottom: "9px",
              }}
            >
              {lang === "en" ? "Next on the calendar" : "Próximamente en el calendario"}
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "clamp(25px, 3.2vw, 34px)", margin: 0 }}>
              {lang === "en" ? "Where you will meet her." : "Donde la conocerás."}
            </h2>
          </div>

          <Link
            href="/events"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "15px",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "#7b1f2c",
              textDecoration: "none",
            }}
          >
            <span>{lang === "en" ? "The whole calendar" : "Ver todo el calendario"}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        {/* Carousel Navigation Arrows - ONLY when there is more content to swipe */}
        {canScroll && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", margin: "-8px 0 16px" }}>
            <button
              type="button"
              onClick={() => scrollContainerRef.current?.scrollBy({ left: -310, behavior: "smooth" })}
              aria-label="Previous events"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "1px solid rgba(57, 41, 42, 0.25)",
                background: "#ffffff",
                color: "#39292a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#7b1f2c";
                e.currentTarget.style.color = "#7b1f2c";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(57, 41, 42, 0.25)";
                e.currentTarget.style.color = "#39292a";
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollContainerRef.current?.scrollBy({ left: 310, behavior: "smooth" })}
              aria-label="Next events"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "1px solid rgba(57, 41, 42, 0.25)",
                background: "#ffffff",
                color: "#39292a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#7b1f2c";
                e.currentTarget.style.color = "#7b1f2c";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(57, 41, 42, 0.25)";
                e.currentTarget.style.color = "#39292a";
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        )}

        {/* Scrollable Container */}
        {displayEvents.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(57, 41, 42, 0.7)" }}>
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "19px", margin: "0 0 8px" }}>
              {lang === "en" ? "New gatherings are being scheduled." : "Nuevos encuentros próximamente."}
            </p>
            <Link
              href="/events"
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "14px",
                color: "#7b1f2c",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              {lang === "en" ? "Browse calendar →" : "Ver calendario →"}
            </Link>
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            style={{
              display: "flex",
              gap: "20px",
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              paddingBottom: "14px",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
            }}
          >
            {displayEvents.map((ev: any) => {
              const catInfo = getCategoryInfo(ev, lang);
              const title = getEventDisplayTitle(ev, lang);
              const dateDisplay = formatEventDate(ev.startsAt, lang);
              const viewerCost = isLive
                ? (isMember ? (ev.memberCredits ?? ev.creditCost) : (ev.nonMemberCredits ?? ev.creditCost))
                : ev.creditCost;
              const isViewerFree = viewerCost === 0 || (ev.isFreeWalk && (isMember || !isLive));
              const priceDisplay =
                isViewerFree || viewerCost === 0
                  ? lang === "en"
                    ? "Free"
                    : "Gratis"
                  : `${viewerCost} ${
                      viewerCost === 1
                        ? lang === "en"
                          ? "credit"
                          : "crédito"
                        : lang === "en"
                        ? "credits"
                        : "créditos"
                    }`;
            const locationDisplay = ev.neighbourhood
              ? `${ev.neighbourhood}${ev.venueName ? ` · ${ev.venueName}` : ""}`
              : lang === "en"
              ? "Barcelona"
              : "Barcelona";
            const imgUrl =
              ev.imageUrl ||
              (ev.imageId &&
              (ev.imageId.startsWith("http") ||
                ev.imageId.startsWith("/") ||
                ev.imageId.startsWith("data:"))
                ? ev.imageId
                : null);

            return (
              <Link
                key={ev.id}
                href={`/events/${ev.slug || ev.id}`}
                style={{
                  flex: "0 0 clamp(260px, 75vw, 290px)",
                  scrollSnapAlign: "start",
                  border: "1px solid rgba(57, 41, 42, 0.18)",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  color: "#39292a",
                  textDecoration: "none",
                  transition: "border-color 0.2s ease, transform 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(123, 31, 44, 0.5)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(57, 41, 42, 0.18)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    height: "140px",
                    borderBottom: "1px solid rgba(57, 41, 42, 0.12)",
                    backgroundColor: "#ecdcd0",
                    overflow: "hidden",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <EventCardImage
                    imageUrl={ev.imageUrl}
                    imageId={ev.imageId}
                    title={title}
                    lang={lang as any}
                  />
                </div>

                <div
                  style={{
                    padding: "16px 18px 18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "9px",
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        letterSpacing: "0.04em",
                        color: "#7b1f2c",
                        border: "1px solid rgba(123, 31, 44, 0.35)",
                        borderRadius: "10px",
                        padding: "3px 10px",
                        whiteSpace: "nowrap",
                        background: "rgba(255, 255, 255, 0.6)",
                      }}
                    >
                      {catInfo.label}
                    </span>
                    <span
                      style={{
                        fontSize: "11.5px",
                        color: "rgba(57, 41, 42, 0.72)",
                        whiteSpace: "nowrap",
                        fontFeatureSettings: "'tnum'",
                      }}
                    >
                      {priceDisplay}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontWeight: 600,
                      fontSize: "18px",
                      margin: 0,
                      lineHeight: 1.3,
                      color: "#39292a",
                    }}
                  >
                    {title}
                  </h3>

                  {ev.partnerName && (
                    <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.55)" }}>
                      {lang === "en" ? "Hosted by " : "Organizado por "}
                      <span>{ev.partnerName}</span>
                    </div>
                  )}

                  <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.72)" }}>
                    {dateDisplay}
                  </div>
                  <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.72)" }}>
                    {locationDisplay}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        )}
      </section>

      {/* ─── 4. THE GODMOTHER PROGRAM ─── */}
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
            border: "1px solid rgba(86, 139, 5, 0.4)",
            borderRadius: "8px",
            backgroundColor: "rgba(86, 139, 5, 0.06)",
            padding: "clamp(24px, 4vw, 40px)",
            display: "flex",
            flexWrap: "wrap",
            gap: "clamp(24px, 4vw, 48px)",
            alignItems: "center",
          }}
        >
          <div style={{ flex: "1 1 380px", minWidth: "270px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "13px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#3b5e04",
                marginBottom: "12px",
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ flex: "none" }}>
                <path d="m12 2 2.9 6.3 6.6.8-4.9 4.5 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9.1l6.6-.8Z" />
              </svg>
              <span>{lang === "en" ? "The Godmother program" : "El programa Madrinas"}</span>
            </div>

            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.12, margin: "0 0 14px" }}>
              {lang === "en" ? "Bring a mother into the circle." : "Invita a una madre al círculo."}
            </h2>

            <p style={{ fontSize: "16px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.74)", margin: "0 0 20px", maxWidth: "52ch" }}>
              {lang === "en"
                ? "Every account comes with a personal invite code. Share it with the friend who has just moved here, the neighbour with the pram — and you earn 5 credits for every mother who becomes a member with it."
                : "Cada cuenta incluye un código de invitación personal. Compártelo con la amiga que acaba de mudarse o la vecina con el carrito — y ganarás 5 créditos por cada madre que se haga socia con él."}
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
              <Link
                href="/account"
                style={{
                  border: "1px solid #568b05",
                  backgroundColor: "#568b05",
                  color: "#ffffff",
                  padding: "12px 22px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  whiteSpace: "nowrap",
                  textDecoration: "none",
                }}
              >
                {lang === "en" ? "Get your invite code" : "Consigue tu código"}
              </Link>

              <Link
                href="/faq"
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  whiteSpace: "nowrap",
                  color: "#3b5e04",
                  textDecoration: "none",
                }}
              >
                {lang === "en" ? "How it works" : "Cómo funciona"}
              </Link>
            </div>
          </div>

          <div style={{ flex: "0 1 320px", minWidth: "240px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "13px 0", borderTop: "1px solid rgba(86, 139, 5, 0.3)" }}>
              <span style={{ flex: "none", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#568b05", marginTop: "9px" }} />
              <span style={{ fontSize: "14.5px", lineHeight: 1.55, color: "#39292a" }}>
                {lang === "en" ? "Share your code with a mother you know" : "Comparte tu código con una madre que conozcas"}
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "13px 0", borderTop: "1px solid rgba(86, 139, 5, 0.3)" }}>
              <span style={{ flex: "none", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#568b05", marginTop: "9px" }} />
              <span style={{ fontSize: "14.5px", lineHeight: 1.55, color: "#39292a" }}>
                <span style={{ display: "inline-block", fontSize: "10.5px", letterSpacing: "0.09em", textTransform: "uppercase", color: "#fdf8f2", backgroundColor: "#7b1f2c", border: "1px solid #7b1f2c", borderRadius: "10px", padding: "2px 9px", whiteSpace: "nowrap", marginBottom: "6px" }}>
                  {lang === "en" ? "Members only" : "Solo socias"}
                </span>
                <br />
                {lang === "en"
                  ? <>You earn <strong style={{ fontWeight: 600 }}>5 credits</strong> for each mother who becomes a member with your code{isLive ? "" : " (once membership opens)"}</>
                  : <>Ganas <strong style={{ fontWeight: 600 }}>5 créditos</strong> por cada madre que se haga socia con tu código{isLive ? "" : " (una vez abierta la membresía)"}</>}
              </span>
            </div>

            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "13px 0", borderTop: "1px solid rgba(86, 139, 5, 0.3)", borderBottom: "1px solid rgba(86, 139, 5, 0.3)" }}>
              <span style={{ flex: "none", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#568b05", marginTop: "9px" }} />
              <span style={{ fontSize: "14.5px", lineHeight: 1.55, color: "#39292a" }}>
                {lang === "en"
                  ? <>Earn <strong style={{ fontWeight: 600 }}>2 credits</strong> each time you host — welcome the mothers at an event on the calendar — <Link href="/host" style={{ color: "#3b5e04", textDecoration: "underline", textUnderlineOffset: "3px" }}>become a host</Link></>
                  : <>Gana <strong style={{ fontWeight: 600 }}>2 créditos</strong> cada vez que seas anfitriona — da la bienvenida a las madres en un evento del calendario — <Link href="/host" style={{ color: "#3b5e04", textDecoration: "underline", textUnderlineOffset: "3px" }}>sé anfitriona</Link></>}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. MEMBERSHIP / PREVIEW (VISUAL 4-CARD GRID) ─── */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px) clamp(46px, 6vw, 76px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(57, 41, 42, 0.2)",
            borderRadius: "8px",
            padding: "clamp(24px, 4vw, 40px)",
            backgroundColor: "#ffffff",
          }}
        >
          {/* Header Row */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", marginBottom: "32px" }}>
            <div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "13px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#568b05",
                  marginBottom: "8px",
                }}
              >
                {isLive
                  ? (lang === "en" ? "MEMBERSHIP" : "MEMBRESÍA")
                  : (lang === "en" ? "FROM LAUNCH" : "DESDE EL LANZAMIENTO")}
              </div>

              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "clamp(26px, 3.4vw, 36px)", lineHeight: 1.15, margin: 0 }}>
                {lang === "en" ? "Keep your circle, all year round." : "Mantén tu círculo todo el año."}
              </h2>
            </div>

            <Link
              href="/membership"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "15px",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                color: "#7b1f2c",
                border: "1px solid rgba(123, 31, 44, 0.4)",
                padding: "8px 16px",
                borderRadius: "4px",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(123, 31, 44, 0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <span>{lang === "en" ? "What membership will be" : "Cómo será la membresía"}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          {/* 4 Visual Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: "20px" }}>
            {/* Card 1: Events */}
            <div
              style={{
                padding: "22px 20px",
                border: "1px solid rgba(57, 41, 42, 0.12)",
                borderRadius: "6px",
                backgroundColor: "#fdf8f2",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ color: "#568b05" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "19px", margin: "0 0 4px", color: "#39292a" }}>
                  {lang === "en" ? "4+ events a month" : "4+ eventos al mes"}
                </h3>
                <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.7)", margin: 0, lineHeight: 1.45 }}>
                  {lang === "en" ? "With the same mothers" : "Con las mismas madres"}
                </p>
              </div>
            </div>

            {/* Card 2: Stage group */}
            <div
              style={{
                padding: "22px 20px",
                border: "1px solid rgba(57, 41, 42, 0.12)",
                borderRadius: "6px",
                backgroundColor: "#fdf8f2",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ color: "#568b05" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "19px", margin: "0 0 4px", color: "#39292a" }}>
                  {lang === "en" ? "Your stage group" : "Tu grupo por etapa"}
                </h3>
                <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.7)", margin: 0, lineHeight: 1.45 }}>
                  {lang === "en" ? "Mothers at your stage" : "Madres en tu misma etapa"}
                </p>
              </div>
            </div>

            {/* Card 3: The Circle */}
            <div
              style={{
                padding: "22px 20px",
                border: "1px solid rgba(57, 41, 42, 0.12)",
                borderRadius: "6px",
                backgroundColor: "#fdf8f2",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ color: "#568b05" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "19px", margin: "0 0 4px", color: "#39292a" }}>
                  La Gazette
                </h3>
                <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.7)", margin: 0, lineHeight: 1.45 }}>
                  {lang === "en" ? "Talk in between events" : "Habla entre eventos"}
                </p>
              </div>
            </div>

            {/* Card 4: Credits carry over */}
            <div
              style={{
                padding: "22px 20px",
                border: "1px solid rgba(57, 41, 42, 0.12)",
                borderRadius: "6px",
                backgroundColor: "#fdf8f2",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ color: "#568b05" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "19px", margin: "0 0 4px", color: "#39292a" }}>
                  {lang === "en" ? "Credits carry over" : "Créditos acumulables"}
                </h3>
                <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.7)", margin: 0, lineHeight: 1.45 }}>
                  {lang === "en" ? "Nothing you buy is lost" : "Nada de lo que compras se pierde"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Join the List Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(57, 41, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              backgroundColor: "#fdf8f2",
              border: "1px solid rgba(57, 41, 42, 0.2)",
              borderRadius: "8px",
              boxShadow: "0 12px 36px rgba(57, 41, 42, 0.24)",
              padding: "28px 32px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#39292a",
                fontSize: "20px",
              }}
            >
              ✕
            </button>

            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "12px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#7b1f2c",
                marginBottom: "6px",
                fontWeight: 600,
              }}
            >
              {isLive
                ? (lang === "en" ? "Stay in touch" : "Mantente al día")
                : (lang === "en" ? "Early access" : "Acceso preferente")}
            </div>

            <h3
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 500,
                fontSize: "28px",
                margin: "0 0 10px",
                color: "#39292a",
                lineHeight: 1.15,
              }}
            >
              {lang === "en" ? "Be first to know when memberships open." : "Sé la primera en saber cuándo abrimos membresías."}
            </h3>

            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "rgba(57, 41, 42, 0.78)",
                margin: "0 0 20px",
              }}
            >
              {lang === "en"
                ? "Mothers on this list receive pre-launch invitations. No joining fee if you join before launch."
                : "Las madres en esta lista recibirán invitaciones exclusivas de pre-lanzamiento. Sin cuota de alta si te unes antes del lanzamiento."}
            </p>

            <form onSubmit={handleJoinList} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                type="email"
                required
                placeholder={lang === "en" ? "Your email address" : "Tu correo electrónico"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#c9a227";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(201, 162, 39, 0.35)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(57, 41, 42, 0.25)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "4px",
                  border: "1px solid rgba(57, 41, 42, 0.25)",
                  backgroundColor: "#ffffff",
                  fontSize: "14.5px",
                  color: "#39292a",
                  fontFamily: "'Lora', Georgia, serif",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
              />

              {errorMsg && <div style={{ color: "#993842", fontSize: "13px" }}>{errorMsg}</div>}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "12px 20px",
                  backgroundColor: "#7b1f2c",
                  color: "#fdf8f2",
                  border: "1px solid #7b1f2c",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "16px",
                  cursor: loading ? "wait" : "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                {loading
                  ? (lang === "en" ? "Saving..." : "Guardando...")
                  : (lang === "en" ? "Join the list" : "Unirme a la lista")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
