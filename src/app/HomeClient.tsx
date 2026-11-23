"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";
import { tStr } from "@/lib/i18nEngine";
import {
  formatEventDate,
  EventCardImage,
} from "@/app/events/EventsCalendar";
import { getPublicEvents } from "@/app/actions/events";
import { getHomepageMedia } from "@/app/actions/homepageCms";
import { getMotherGatherings } from "@/app/actions/gatherings";

export default function HomeClient({ initialEvents = [] }: { initialEvents?: any[] }) {
  const { language: lang } = useLanguage();
  const { data: session } = useSession();
  const [eventsList, setEventsList] = useState<any[]>(initialEvents);
  const [gatheringsList, setGatheringsList] = useState<any[]>([]);
  const [cmsMedia, setCmsMedia] = useState<Record<string, any>>({});
  const [activeSponsor, setActiveSponsor] = useState<any | null>(null);
  const [waitlisted, setWaitlisted] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("tm_pre_joined_list");
    if (saved) setWaitlisted(true);

    getHomepageMedia().then((res) => {
      setCmsMedia(res.media || {});
      setActiveSponsor(res.sponsor || null);
    }).catch(() => {});

    getMotherGatherings().then((list) => {
      setGatheringsList(list || []);
    }).catch(() => {});

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
      setErrorMsg(lang === "fr" ? "Veuillez saisir une adresse e-mail valide." : lang === "es" ? "Introduce un correo válido." : "Please enter a valid email.");
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
    } catch {
      setErrorMsg(lang === "fr" ? "Une erreur est survenue." : lang === "es" ? "Ocurrió un error." : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const heroImage = cmsMedia["hero"]?.imageUrl || "/assets/home-hero.webp";
  const part1Image = cmsMedia["card_1"]?.imageUrl || "/assets/part-1.jpg";
  const part2Image = cmsMedia["card_2"]?.imageUrl || "/assets/part-2.jpg";
  const part3Image = cmsMedia["card_3"]?.imageUrl || "/assets/part-3.jpg";
  const bandImage = cmsMedia["band"]?.imageUrl || "/assets/band.jpg";

  const moments = [1, 2, 3, 4, 5, 6].map((i) => ({
    id: `moment_${i}`,
    url: cmsMedia[`moment_${i}`]?.imageUrl || null,
    alt: cmsMedia[`moment_${i}`]?.altText || `Moment ${i}`,
  }));

  const quotes = [1, 2, 3].map((i) => ({
    id: `quote_${i}`,
    text: cmsMedia[`quote_${i}`]?.quoteText || (i === 1 ? "The first time in months I felt like myself again, not just a feeding schedule." : i === 2 ? "I moved here knowing no one. Three weeks later I had a group of mothers I see every Tuesday." : "Honest, calm, and zero pressure. Exactly what new mothers need."),
    who: cmsMedia[`quote_${i}`]?.quoteWho || (i === 1 ? "Elena, Gràcia" : i === 2 ? "Sophie, Eixample" : "Camille, Poblenou"),
  }));

  return (
    <div style={{ background: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      {/* 1. Hero Banner */}
      <section style={{ position: "relative", height: "clamp(420px, 60vw, 620px)", overflow: "hidden", background: "#39292a" }}>
        <img
          src={heroImage}
          alt={cmsMedia["hero"]?.altText || "The Mothers gathering"}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: cmsMedia["hero"]?.focalPoint || "center" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(32, 24, 24, 0.1) 30%, rgba(32, 24, 24, 0.65) 100%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "clamp(30px, 6vw, 64px)", textAlign: "center", color: "#fdf8f2", pointerEvents: "none", padding: "0 20px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontWeight: 500, fontSize: "clamp(26px, 4.4vw, 50px)", lineHeight: 1 }}>
            {lang === "fr" ? "Bienvenue à" : lang === "es" ? "Bienvenida a" : "Welcome to"}
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "clamp(44px, 8.5vw, 104px)", lineHeight: 0.95, letterSpacing: "0.02em", textTransform: "uppercase" }}>
            The Mothers
          </div>
        </div>
      </section>

      {/* 2. Philosophy & CTA */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "clamp(48px, 7vw, 90px) clamp(20px, 5vw, 40px) clamp(40px, 6vw, 70px)", textAlign: "center" }}>
        <div style={{ fontSize: "14px", letterSpacing: "0.04em", marginBottom: "16px", color: "rgba(57, 41, 42, 0.75)" }}>
          {lang === "fr" ? "La maternité n'a jamais été faite pour être vécue seule." : lang === "es" ? "La maternidad nunca estuvo pensada para vivirse a solas." : "Motherhood was never meant to be done alone."}
        </div>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.25, margin: "0 0 28px", textWrap: "balance" }}>
          {lang === "fr"
            ? "Un cercle grandissant de mères qui se rencontrent dans la vraie vie — promenades, déjeuners et partages près de chez vous — pour tisser de vraies amitiés."
            : lang === "es"
            ? "Un círculo creciente de madres que se encuentran en la vida real — paseos, comidas y charlas cerca de ti — forjando amistades auténticas."
            : "A growing circle of mothers who meet in real life — walks, play dates, suppers and talks near you — building real friendships, so you are never on your own."}
        </p>
        <Link
          href={session?.user ? "/events" : "/account/login?mode=register"}
          style={{
            display: "inline-flex",
            border: "1px solid #7b1f2c",
            background: "#7b1f2c",
            color: "#fdf8f2",
            borderRadius: "24px",
            padding: "11px 28px",
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
            fontSize: "16px",
            textDecoration: "none",
          }}
        >
          {lang === "fr" ? "Rejoindre The Mothers" : lang === "es" ? "Unirme a The Mothers" : "Join The Mothers"}
        </Link>
      </section>

      {/* 3. How to be part of The Mothers */}
      <section style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(30px, 4vw, 50px) clamp(20px, 4vw, 40px) clamp(50px, 6vw, 80px)", borderTop: "1px solid rgba(123, 31, 44, 0.18)" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "clamp(28px, 3.4vw, 40px)", textAlign: "center", margin: "0 0 clamp(26px, 3vw, 40px)" }}>
          {lang === "fr" ? "Comment participer à The Mothers" : lang === "es" ? "Cómo formar parte de The Mothers" : "How to be part of The Mothers"}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "clamp(18px, 2.4vw, 30px)" }}>
          <Link href="/events" style={{ display: "flex", flexDirection: "column", gap: "14px", color: "#39292a", textDecoration: "none" }}>
            <div style={{ aspectRatio: "1/1", borderRadius: "8px", overflow: "hidden", background: "#f5ece1" }}>
              {part1Image ? <img src={part1Image} alt="Meet local mothers" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "21px", textAlign: "center" }}>
              {lang === "fr" ? "Rencontrer des mamans près de chez vous" : lang === "es" ? "Conocer a madres de tu zona" : "Meet local mothers"}
            </div>
          </Link>

          <Link href="/forum" style={{ display: "flex", flexDirection: "column", gap: "14px", color: "#39292a", textDecoration: "none" }}>
            <div style={{ aspectRatio: "1/1", borderRadius: "8px", overflow: "hidden", background: "#f5ece1" }}>
              {part2Image ? <img src={part2Image} alt="The Forum" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "21px", textAlign: "center" }}>
              {lang === "fr" ? "Échanger dans Le Forum" : lang === "es" ? "Hablar en El Foro" : "Talk in The Forum"}
            </div>
          </Link>

          <Link href="/partner-apply" style={{ display: "flex", flexDirection: "column", gap: "14px", color: "#39292a", textDecoration: "none" }}>
            <div style={{ aspectRatio: "1/1", borderRadius: "8px", overflow: "hidden", background: "#f5ece1" }}>
              {part3Image ? <img src={part3Image} alt="Bring your community" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "21px", textAlign: "center" }}>
              {lang === "fr" ? "Proposer votre communauté" : lang === "es" ? "Trae tu comunidad o taller" : "Bring your community"}
            </div>
          </Link>
        </div>
      </section>

      {/* 4. Photo Band */}
      <section style={{ position: "relative", minHeight: "260px", background: "#39292a", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center", color: "#fdf8f2", overflow: "hidden" }}>
        {bandImage && (
          <img
            src={bandImage}
            alt="Not everything has to be about the baby"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }}
          />
        )}
        <div style={{ position: "relative", maxWidth: "720px", margin: "0 auto" }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(26px, 3.8vw, 36px)", fontWeight: 400, margin: "0 0 12px" }}>
            {lang === "fr" ? "Tout ne tourne pas autour de bébé." : lang === "es" ? "No todo tiene que ser sobre el bebé." : "Not everything has to be about the baby."}
          </h3>
          <p style={{ fontSize: "15px", lineHeight: 1.6, opacity: 0.9, margin: "0 0 20px" }}>
            {lang === "fr"
              ? "Devenir mère ne signifie pas s'oublier. Nos dîners, moments bien-être et sorties sont pensés pour vous."
              : lang === "es"
              ? "Ser madre no significa dejar de ser tú. Nuestras cenas, sesiones de autocuidado y veladas son para ti."
              : "Becoming a mother doesn't mean losing who you are. Our suppers, wellness sessions and evenings out are made for you."}
          </p>
          <Link href="/events" style={{ display: "inline-block", border: "1px solid #fdf8f2", color: "#fdf8f2", padding: "8px 20px", borderRadius: "20px", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>
            {lang === "fr" ? "Voir le programme →" : lang === "es" ? "Ver el programa →" : "See what's on →"}
          </Link>
        </div>
      </section>

      {/* 5. Moments From Our Events */}
      <section style={{ padding: "clamp(44px, 6vw, 70px) 0 0" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "clamp(28px, 3.4vw, 40px)", textAlign: "center", margin: "0 0 6px" }}>
          {lang === "fr" ? "Moments de nos rencontres" : lang === "es" ? "Momentos de nuestros encuentros" : "Moments from our events"}
        </h2>
        <p style={{ textAlign: "center", fontSize: "14px", color: "rgba(57, 41, 42, 0.7)", margin: "0 0 24px" }}>
          {lang === "fr" ? "De vraies mères, de vrais après-midis. Partagés avec leur accord." : lang === "es" ? "Madres reales, tardes auténticas. Compartido con su permiso." : "Real mothers, real afternoons. Shared with their permission."}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "4px" }}>
          {moments.map((m) => (
            <div key={m.id} style={{ aspectRatio: "4/5", background: "#ebdcd0", overflow: "hidden" }}>
              {m.url ? (
                <img src={m.url} alt={m.alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "#f5ece1" }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 6. What Mothers Say */}
      <section style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(50px, 6vw, 80px) clamp(20px, 4vw, 40px)" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "clamp(28px, 3.4vw, 40px)", textAlign: "center", margin: "0 0 clamp(24px, 3vw, 36px)" }}>
          {lang === "fr" ? "Ce que disent les mères" : lang === "es" ? "Lo que dicen las madres" : "What mothers say"}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "18px" }}>
          {quotes.map((q) => (
            <figure key={q.id} style={{ margin: 0, border: "1px solid rgba(57, 41, 42, 0.14)", borderRadius: "8px", background: "#ffffff", padding: "24px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", textAlign: "center" }}>
              <blockquote style={{ margin: 0, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "19px", lineHeight: 1.4 }}>
                “{q.text}”
              </blockquote>
              <figcaption style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.7)" }}>{q.who}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* 7. Coming Up (Upcoming Events) */}
      <section style={{ padding: "0 0 clamp(60px, 7vw, 90px)" }}>
        <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 clamp(20px, 4vw, 40px)", display: "flex", flexWrap: "wrap", gap: "10px 20px", alignItems: "baseline", justifyContent: "space-between", borderTop: "1px solid rgba(123, 31, 44, 0.18)", paddingTop: "clamp(30px, 4vw, 46px)", marginBottom: "22px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "clamp(28px, 3.4vw, 40px)", margin: 0 }}>
            {lang === "fr" ? "À venir" : lang === "es" ? "Próximos eventos" : "Coming up"}
          </h2>
          <Link href="/events" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", color: "#7b1f2c", textDecoration: "none" }}>
            {lang === "fr" ? "Tous les événements →" : lang === "es" ? "Todos los eventos →" : "All events →"}
          </Link>
        </div>
        <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 clamp(20px, 4vw, 40px)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "18px" }}>
          {eventsList.slice(0, 3).map((e) => (
            <Link key={e.id} href={`/events/${e.slug || e.id}`} style={{ position: "relative", display: "block", aspectRatio: "4/3", borderRadius: "6px", overflow: "hidden", color: "#39292a", textDecoration: "none" }}>
              <EventCardImage imageId={e.imageId} imageUrl={e.imageUrl} title={e.title} lang={lang} />
              <div style={{ position: "absolute", left: "14px", right: "14px", bottom: "14px", background: "rgba(253, 248, 242, 0.96)", borderRadius: "4px", padding: "12px 14px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: "11.5px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#7b1f2c" }}>
                  {formatEventDate(e.startsAt, lang)}
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "20px", lineHeight: 1.2, marginTop: "3px" }}>
                  {e.title}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 8. Gatherings By Mothers */}
      {gatheringsList.length > 0 && (
        <section style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 clamp(20px, 4vw, 40px) clamp(50px, 6vw, 80px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "18px", borderTop: "1px solid rgba(123, 31, 44, 0.18)", paddingTop: "28px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "clamp(26px, 3.2vw, 36px)", margin: 0 }}>
              {lang === "fr" ? "Rencontres entre mamans" : lang === "es" ? "Encuentros organizados por madres" : "Gatherings by mothers"}
            </h2>
            <Link href="/account" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px", color: "#7b1f2c", textDecoration: "none" }}>
              {lang === "fr" ? "Créer la vôtre →" : lang === "es" ? "Crea el tuyo →" : "Create your own →"}
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {gatheringsList.slice(0, 3).map((g) => (
              <Link key={g.id} href={`/events/${g.slug || g.id}`} style={{ border: "1px solid rgba(57, 41, 42, 0.14)", borderRadius: "8px", background: "#ffffff", padding: "18px", color: "#39292a", textDecoration: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#3b5e04", background: "rgba(59, 94, 4, 0.08)", padding: "2px 8px", borderRadius: "10px", width: "fit-content" }}>
                  Gathering · free
                </span>
                <strong style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "19px" }}>{g.title}</strong>
                <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.7)" }}>
                  {formatEventDate(g.startsAt, lang)} · {g.neighbourhood}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 9. Sponsor of the Month */}
      {activeSponsor && (
        <section style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(26px, 3.5vw, 40px) clamp(20px, 5vw, 64px)", borderTop: "1px solid rgba(57, 41, 42, 0.16)" }}>
          <div style={{ border: "1px solid rgba(164, 118, 31, 0.45)", borderRadius: "8px", background: "#ffffff", padding: "clamp(18px, 2.6vw, 26px)", display: "flex", flexWrap: "wrap", gap: "14px 28px", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ flex: "1 1 380px", minWidth: 0 }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7a5612" }}>
                  This month with
                </span>
                <span style={{ fontSize: "10.5px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.72)", border: "1px solid rgba(57, 41, 42, 0.3)", borderRadius: "10px", padding: "1px 7px" }}>
                  Sponsored
                </span>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "24px", lineHeight: 1.15, marginBottom: "6px" }}>
                {activeSponsor.name}
              </div>
              <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.8)", margin: "0 0 6px", maxWidth: "60ch" }}>
                {activeSponsor.line}
              </p>
              {activeSponsor.perk && (
                <div style={{ fontSize: "14px", color: "#39292a", fontWeight: 600 }}>{activeSponsor.perk}</div>
              )}
            </div>
            {activeSponsor.url && (
              <a
                href={activeSponsor.url.includes("?") ? `${activeSponsor.url}&ref=themothers` : `${activeSponsor.url}?ref=themothers`}
                target="_blank"
                rel="sponsored noopener noreferrer"
                style={{
                  border: "1px solid #7b1f2c",
                  color: "#7b1f2c",
                  borderRadius: "4px",
                  padding: "11px 20px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Visit {activeSponsor.name} →
              </a>
            )}
          </div>
        </section>
      )}

      {/* 10. Waitlist / Stay in Touch */}
      <section style={{ maxWidth: "700px", margin: "0 auto", padding: "clamp(40px, 6vw, 70px) 24px", textAlign: "center" }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 400, margin: "0 0 8px" }}>
          {lang === "fr" ? "Restez informée" : lang === "es" ? "Mantente al día" : "Stay in touch"}
        </h3>
        <p style={{ fontSize: "14.5px", color: "rgba(57, 41, 42, 0.7)", margin: "0 0 20px" }}>
          {lang === "fr" ? "Recevez notre lettre mensuelle et les nouvelles rencontres en premier." : lang === "es" ? "Recibe nuestra carta mensual y los próximos encuentros." : "Receive our monthly letter and new gatherings near you."}
        </p>

        {waitlisted ? (
          <div style={{ color: "#3b5e04", fontWeight: 600, fontSize: "15px" }}>
            ✓ {lang === "fr" ? "Vous êtes inscrite !" : lang === "es" ? "¡Estás en la lista!" : "You're on the list!"}
          </div>
        ) : (
          <form onSubmit={handleJoinList} style={{ display: "flex", gap: "8px", maxWidth: "420px", margin: "0 auto" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={lang === "fr" ? "Votre e-mail" : lang === "es" ? "Tu correo" : "Your email address"}
              required
              style={{ flex: 1, padding: "10px 14px", borderRadius: "20px", border: "1px solid rgba(57, 41, 42, 0.25)", fontSize: "14px" }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ background: "#7b1f2c", color: "#fdf8f2", border: "none", borderRadius: "20px", padding: "10px 22px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px", cursor: "pointer" }}
            >
              {loading ? "..." : (lang === "fr" ? "S'inscrire" : lang === "es" ? "Unirme" : "Join the list")}
            </button>
          </form>
        )}
        {errorMsg && <div style={{ color: "#993842", fontSize: "13px", marginTop: "8px" }}>{errorMsg}</div>}
      </section>
    </div>
  );
}
