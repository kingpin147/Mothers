"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";

interface FaqEntry {
  qEn: string;
  aEn: string;
  qEs: string;
  aEs: string;
}

const FAQ_LIST: FaqEntry[] = [
  {
    qEn: "What is The Mothers?",
    aEn: "The Mothers is a private membership club for mothers in Barcelona, from pregnancy through the school years. We curate small-group experiences, walks, play dates, and evenings out, alongside trusted partner perks.",
    qEs: "¿Qué es The Mothers?",
    aEs: "The Mothers es un club privado de membresía para madres en Barcelona, desde el embarazo hasta la etapa escolar. Organizamos encuentros en grupos reducidos, paseos, play dates y planes de noche, además de ventajas en partners de confianza.",
  },
  {
    qEn: "How do monthly credits work?",
    aEn: "Each month you receive 20 credits with your subscription. You can spend them on any event in the calendar. Unspent credits roll over up to a 40-credit cap, with a 6-month FIFO expiry. If you cancel a booking at least 24h in advance, your credits return automatically.",
    qEs: "¿Cómo funcionan los créditos mensuales?",
    aEs: "Cada mes recibes 20 créditos con tu suscripción para reservar los encuentros del calendario. Los créditos no utilizados se acumulan hasta un máximo de 40 créditos con caducidad FIFO a 6 meses. Si cancelas una reserva con 24h de antelación, recuperas tus créditos íntegramente.",
  },
  {
    qEn: "Can I bring my baby or child to events?",
    aEn: "Yes! Daytime walks, park socials, and play dates are designed specifically for mothers with babies or children. MoM's Dates and certain evening workshops are designed as adults-only evenings for mothers to recharge.",
    qEs: "¿Puedo llevar a mi bebé o hijo/a a los encuentros?",
    aEs: "¡Sí! Los paseos matinales y los play dates están pensados para venir con tu bebé o peque. Los MoM's Dates y ciertos talleres de tarde son exclusivos para madres para desconectar y disfrutar.",
  },
  {
    qEn: "What is the Godmother referral reward?",
    aEn: "When a friend joins with your referral link, you receive +20 credits (a full month's allowance) once their membership is active. Godmother bonus credits sit outside the 40-credit rollover cap.",
    qEs: "¿Cuál es la recompensa de Madrina por recomendar?",
    aEs: "Cuando una amiga se une con tu enlace, recibes +20 créditos (un mes completo) cuando su membresía esté activa. Estos créditos extra quedan fuera del límite de 40 créditos.",
  },
  {
    qEn: "Can I pause my membership?",
    aEn: "Yes. Members can pause their membership for up to 2 months per calendar year free of charge. Your credit expiry clock freezes during the pause.",
    qEs: "¿Puedo pausar mi membresía?",
    aEs: "Sí. Puedes pausar tu membresía hasta 2 meses por año natural sin coste alguno. El reloj de caducidad de tus créditos se congela mientras estés en pausa.",
  },
];

export default function FaqPage() {
  const [lang, setLang] = useState<Locale>("en");
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  const toggleAccordion = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: "12px"
          }}>
            FAQ
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(34px, 5vw, 52px)", marginBottom: "16px" }}>
            {lang === "en" ? "Frequently Asked Questions" : "Preguntas Frecuentes"}
          </h1>
          <p style={{ fontSize: "17px", color: "var(--color-text-muted)", maxWidth: "560px", margin: "0 auto" }}>
            {lang === "en"
              ? "Everything you need to know about membership, credits, events and joining."
              : "Todo lo que necesitas saber sobre la membresía, créditos, eventos y cómo unirte."}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {FAQ_LIST.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="card"
                style={{
                  backgroundColor: "#fff",
                  padding: "20px 24px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onClick={() => toggleAccordion(idx)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  <h3 style={{ fontSize: "17.5px", margin: 0, color: "var(--color-text)" }}>
                    {lang === "en" ? faq.qEn : faq.qEs}
                  </h3>
                  <span style={{ fontSize: "20px", color: "var(--color-accent)", flexShrink: 0 }}>
                    {isOpen ? "−" : "+"}
                  </span>
                </div>

                {isOpen && (
                  <p style={{ fontSize: "15px", lineHeight: "1.65", color: "var(--color-text-muted)", marginTop: "14px", marginBottom: 0 }}>
                    {lang === "en" ? faq.aEn : faq.aEs}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: "48px" }}>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
            {lang === "en" ? "Have a question not listed here?" : "¿Tienes alguna otra duda?"}{" "}
            <a href="mailto:hello@themothers.cc" style={{ fontWeight: 600 }}>hello@themothers.cc</a>
          </p>
        </div>
      </div>
    </div>
  );
}
