"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { createTopUpCheckoutSession } from "@/app/actions/topup";

const PACKS = [
  { credits: 5, price: "€10", note: "Introductory pack", border: "rgba(57,41,42,0.18)" },
  { credits: 10, price: "€20", note: "1 coffee or supper", border: "rgba(57,41,42,0.18)" },
  { credits: 20, price: "€40", note: "A month of gatherings", border: "rgba(57,41,42,0.18)" },
  { credits: 40, price: "€80", note: "For active mothers", border: "rgba(57,41,42,0.18)" },
];

export function TopUpClient({
  currentUser,
  currentBalance,
}: {
  currentUser: any;
  currentBalance: number;
}) {
  const { language: lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const shortfallParam = searchParams.get("shortfall");
  const returnToParam = searchParams.get("return_to");
  const eventIdParam = searchParams.get("eventId");
  const initialShortfall = shortfallParam ? parseInt(shortfallParam, 10) : 0;
  const roundedShortfall = initialShortfall > 0 ? Math.max(5, initialShortfall) : 0;

  const [selectedCredits, setSelectedCredits] = useState<number>(
    roundedShortfall > 0 ? roundedShortfall : 10
  );
  const [customAmount, setCustomAmount] = useState<string>(
    roundedShortfall > 0 && !PACKS.some(p => p.credits === roundedShortfall) ? String(roundedShortfall) : ""
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; color: string } | null>(null);

  // 10-minute hold timer for event reservation
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(600);

  useEffect(() => {
    if (initialShortfall > 0 || returnToParam) {
      const interval = setInterval(() => {
        setHoldSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [initialShortfall, returnToParam]);

  const activeAmount = customAmount ? parseInt(customAmount, 10) || 0 : selectedCredits;
  const totalPrice = activeAmount * 2;
  const walletAfter = currentBalance + activeAmount;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleSelectPack = (cr: number) => {
    setSelectedCredits(cr);
    setCustomAmount("");
  };

  const handleCustomChange = (val: string) => {
    setCustomAmount(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 5) {
      setSelectedCredits(parsed);
    }
  };

  const handleProceedToCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setMessage({ text: lang === "en" ? "Please log in before buying credits." : "Inicia sesión antes de comprar créditos.", color: "#7b1f2c" });
      return;
    }

    if (activeAmount < 5) {
      setMessage({ text: lang === "en" ? "Minimum top-up is 5 credits (€10.00)." : "La recarga mínima es de 5 créditos (€10.00).", color: "#993842" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await createTopUpCheckoutSession({
        amount: activeAmount,
        eventId: eventIdParam || undefined,
        returnTo: returnToParam || undefined,
      });

      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        setMessage({ text: res.error || "Failed to create checkout session.", color: "#993842" });
        setLoading(false);
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Checkout failed. Please try again.", color: "#993842" });
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      <section
        style={{
          maxWidth: "1020px",
          margin: "0 auto",
          padding: "clamp(34px, 5vw, 62px) clamp(20px, 5vw, 64px) clamp(46px, 6vw, 78px)",
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#7b1f2c",
            marginBottom: "12px",
          }}
        >
          Wallet
        </div>

        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 400,
            fontSize: "clamp(30px, 4vw, 46px)",
            lineHeight: 1.1,
            margin: "0 0 14px",
          }}
        >
          {lang === "en" ? "Buy credits." : "Comprar créditos."}
        </h1>

        <p style={{ fontSize: "16.5px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.72)", maxWidth: "58ch", margin: "0 0 8px" }}>
          {lang === "en"
            ? "Two euros a credit, in whatever quantity suits you (minimum 5 credits). Credits last six months from the day you buy them, and the oldest in your wallet are always spent first."
            : "Dos euros por crédito, en la cantidad que prefieras (mínimo 5 créditos). Duran seis meses desde la compra y siempre se gastan primero los más antiguos."}
        </p>

        {(initialShortfall > 0 || returnToParam) && (
          <div
            style={{
              marginTop: "20px",
              marginBottom: "24px",
              padding: "16px 20px",
              backgroundColor: "rgba(123, 31, 44, 0.06)",
              border: "1px solid rgba(123, 31, 44, 0.2)",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: "#7b1f2c", fontSize: "15px" }}>
                {lang === "en" ? "Spot held for your booking" : "Plaza reservada para ti"}
              </div>
              <div style={{ fontSize: "14px", color: "#39292a", marginTop: "2px" }}>
                {lang === "en"
                  ? `Your place is temporarily reserved while you top up. Complete checkout to confirm your reservation.`
                  : `Tu plaza está retenida mientras realizas la recarga. Completa el pago para confirmarla.`}
              </div>
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 700,
                fontSize: "22px",
                color: "#7b1f2c",
                backgroundColor: "#ffffff",
                padding: "6px 14px",
                borderRadius: "4px",
                border: "1px solid rgba(123, 31, 44, 0.2)",
              }}
            >
              {formatTime(holdSecondsLeft)}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "32px", alignItems: "flex-start", marginTop: "24px" }}>
          {/* Left Form */}
          <div style={{ flex: "1 1 360px", minWidth: "280px", display: "flex", flexDirection: "column", gap: "22px" }}>
            {/* Packs Box */}
            <div style={{ border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "24px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", marginBottom: "16px" }}>
                {lang === "en" ? "Select credit package" : "Selecciona paquete de créditos"}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))", gap: "10px" }}>
                {PACKS.map((pack) => {
                  const isSelected = !customAmount && selectedCredits === pack.credits;
                  return (
                    <button
                      key={pack.credits}
                      type="button"
                      onClick={() => handleSelectPack(pack.credits)}
                      style={{
                        border: isSelected ? "2px solid #7b1f2c" : "1px solid rgba(57,41,42,0.2)",
                        backgroundColor: isSelected ? "rgba(123, 31, 44, 0.05)" : "#fdf8f2",
                        borderRadius: "5px",
                        padding: "14px 12px",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "'Lora', Georgia, serif",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "24px", lineHeight: 1, color: "#39292a", marginBottom: "4px" }}>
                        {pack.credits}
                      </div>
                      <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.72)", fontWeight: 500 }}>
                        {pack.price}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "rgba(57, 41, 42, 0.65)", marginTop: "4px" }}>
                        {pack.note}
                      </div>
                    </button>
                  );
                })}
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "18px" }}>
                <span style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.72)" }}>
                  {lang === "en" ? "Or another amount (min 5)" : "O cantidad personalizada (mín 5)"}
                </span>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={customAmount}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  placeholder="e.g. 15"
                  style={{
                    border: "1px solid rgba(57, 41, 42, 0.24)",
                    borderRadius: "4px",
                    backgroundColor: "#fdf8f2",
                    padding: "12px 14px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "15px",
                    color: "#39292a",
                  }}
                />
              </label>
            </div>

            {/* Secure Stripe Checkout Info Box */}
            <div style={{ border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "24px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", marginBottom: "10px" }}>
                {lang === "en" ? "Secure Checkout" : "Pago Seguro"}
              </div>
              <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.75)", margin: 0 }}>
                {lang === "en"
                  ? "Payments are encrypted and processed through Stripe. We accept Visa, MasterCard, American Express, Apple Pay, and Google Pay."
                  : "Los pagos se procesan de forma cifrada a través de Stripe. Aceptamos Visa, MasterCard, American Express, Apple Pay y Google Pay."}
              </p>
            </div>
          </div>

          {/* Right Summary Sidebar */}
          <aside
            style={{
              flex: "0 1 320px",
              minWidth: "260px",
              position: "sticky",
              top: "100px",
              border: "1px solid rgba(57, 41, 42, 0.2)",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              padding: "24px",
              boxShadow: "0 4px 16px rgba(57, 41, 42, 0.04)",
            }}
          >
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", marginBottom: "16px" }}>
              {lang === "en" ? "Order summary" : "Resumen del pedido"}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14.5px", padding: "10px 0", borderTop: "1px solid rgba(57,41,42,0.12)" }}>
              <span style={{ color: "rgba(57,41,42,0.74)" }}>Credits</span>
              <span style={{ fontWeight: 600 }}>{activeAmount}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14.5px", padding: "10px 0", borderTop: "1px solid rgba(57,41,42,0.12)" }}>
              <span style={{ color: "rgba(57,41,42,0.74)" }}>Price per credit</span>
              <span>€2.00</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14.5px", padding: "10px 0", borderTop: "1px solid rgba(57,41,42,0.12)" }}>
              <span style={{ color: "rgba(57,41,42,0.74)" }}>Current balance</span>
              <span>{currentBalance} credits</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14.5px", padding: "10px 0", borderTop: "1px solid rgba(57,41,42,0.12)" }}>
              <span style={{ color: "rgba(57,41,42,0.74)" }}>Wallet after</span>
              <span style={{ fontWeight: 600 }}>{walletAfter} credits</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "16px 0", borderTop: "1px solid rgba(57,41,42,0.2)", marginTop: "4px" }}>
              <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px" }}>Total</span>
              <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 500, color: "#39292a" }}>
                €{totalPrice}
              </span>
            </div>

            <button
              type="button"
              disabled={loading || activeAmount < 5}
              onClick={handleProceedToCheckout}
              style={{
                width: "100%",
                border: "1px solid #7b1f2c",
                backgroundColor: "#7b1f2c",
                color: "#fdf8f2",
                borderRadius: "4px",
                padding: "13px 16px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "16px",
                cursor: loading || activeAmount < 5 ? "not-allowed" : "pointer",
                opacity: loading || activeAmount < 5 ? 0.7 : 1,
                letterSpacing: "0.04em",
                transition: "opacity 0.15s ease",
              }}
            >
              {loading ? "Redirecting to Stripe..." : `Proceed to Checkout · €${totalPrice}`}
            </button>

            {message && (
              <div style={{ fontSize: "13px", lineHeight: 1.5, color: message.color, marginTop: "12px" }}>
                {message.text}
              </div>
            )}

            <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57, 41, 42, 0.65)", marginTop: "14px" }}>
              {lang === "en"
                ? "Credits expire six months after purchase. Nothing renews automatically, and there is no subscription to cancel."
                : "Los créditos caducan seis meses después de la compra. No hay renovaciones automáticas ni suscripciones."}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
