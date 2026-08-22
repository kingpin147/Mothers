"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Locale } from "@/lib/i18n";

export default function TermsPage() {
  const [lang, setLang] = useState<Locale>("en");

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem("tm_lang");
      if (saved === "es" || saved === "en") setLang(saved as Locale);
    };
    updateLang();
    window.addEventListener("tm_lang_change", updateLang);
    return () => window.removeEventListener("tm_lang_change", updateLang);
  }, []);

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px) 100px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-accent)", fontWeight: 600, marginBottom: "8px" }}>
            The Mothers · Legal
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5vw, 48px)", margin: "0 0 12px" }}>
            {lang === "en" ? "Terms & Conditions" : "Términos y Condiciones"}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
            {lang === "en" ? "Last updated: August 2026 · Governing law: Spain & European Union" : "Última actualización: Agosto 2026 · Legislación aplicable: España y Unión Europea"}
          </p>
        </div>

        <div className="card" style={{ backgroundColor: "#fff", padding: "clamp(28px, 5vw, 44px)", display: "flex", flexDirection: "column", gap: "24px", fontSize: "15px", lineHeight: "1.7" }}>
          <section>
            <h2 style={{ fontSize: "20px", color: "var(--color-accent)", marginBottom: "8px" }}>
              1. {lang === "en" ? "The Circle & Membership" : "El Círculo y la Membresía"}
            </h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {lang === "en"
                ? "The Mothers is a private membership club for women and mothers in Barcelona. Membership is personal, non-transferable, and structured around monthly subscription credits and curated experiences."
                : "The Mothers es un club privado de membresía para mujeres y madres en Barcelona. La membresía es personal, intransferible y estructurada en torno a créditos mensuales y experiencias seleccionadas."}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "20px", color: "var(--color-accent)", marginBottom: "8px" }}>
              2. {lang === "en" ? "Credit Ledger & Rollover Rules" : "Saldo de Créditos y Acumulación"}
            </h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {lang === "en"
                ? "Active members receive 20 credits per billing period. Credits are valid for 6 months (FIFO). Subscription credits roll over up to a maximum cap of 40 credits. Bonus credits earned through the Godmother referral program sit outside this cap."
                : "Las socias activas reciben 20 créditos por período de facturación con caducidad FIFO a 6 meses. Los créditos de suscripción se acumulan hasta un máximo de 40 créditos. Los créditos de Madrina quedan exentos de este límite."}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "20px", color: "var(--color-accent)", marginBottom: "8px" }}>
              3. {lang === "en" ? "Event Bookings & Cancellation" : "Reservas de Encuentros y Cancelaciones"}
            </h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {lang === "en"
                ? "Bookings may be cancelled up to 24 hours prior to the event start time for a full credit refund to your ledger. Inside 24 hours, credits are non-refundable as event capacity and catering are locked."
                : "Las reservas se pueden cancelar hasta 24 horas antes del inicio del encuentro con devolución íntegra de créditos. Dentro de las 24 horas previas, los créditos no son reembolsables para proteger el aforo."}
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: "20px", color: "var(--color-accent)", marginBottom: "8px" }}>
              4. {lang === "en" ? "Pauses & Cancellations" : "Pausas y Cancelaciones"}
            </h2>
            <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
              {lang === "en"
                ? "Members may pause their subscription for up to 2 months per calendar year at no charge. The credit expiry clock is frozen during pause. Subscriptions may be cancelled anytime with effect at the end of the current billing period."
                : "Las socias pueden pausar su suscripción hasta 2 meses por año natural sin coste alguno, congelando la caducidad de sus créditos. La cancelación puede solicitarse en cualquier momento con efecto al final del período en curso."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
