"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { processCreditTopUp } from "@/app/actions/topup";

const PACKS = [
  { credits: 10, price: "€20", note: "1 coffee or supper", border: "rgba(57,41,42,0.18)" },
  { credits: 20, price: "€40", note: "A month of gatherings", border: "rgba(57,41,42,0.18)" },
  { credits: 40, price: "€80", note: "For active mothers", border: "rgba(57,41,42,0.18)" },
  { credits: 60, price: "€120", note: "Shared with friends", border: "rgba(57,41,42,0.18)" },
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
  const initialShortfall = shortfallParam ? parseInt(shortfallParam, 10) : 0;

  const [selectedCredits, setSelectedCredits] = useState<number>(
    initialShortfall > 0 ? initialShortfall : 20
  );
  const [customAmount, setCustomAmount] = useState<string>(
    initialShortfall > 0 ? String(initialShortfall) : ""
  );

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; color: string } | null>(null);

  const activeAmount = customAmount ? parseInt(customAmount, 10) || 0 : selectedCredits;
  const totalPrice = activeAmount * 2;
  const walletAfter = currentBalance + activeAmount;

  const handleSelectPack = (cr: number) => {
    setSelectedCredits(cr);
    setCustomAmount("");
  };

  const handleCustomChange = (val: string) => {
    setCustomAmount(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedCredits(parsed);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setMessage({ text: "Please log in before buying credits.", color: "#7b1f2c" });
      return;
    }

    if (activeAmount <= 0) {
      setMessage({ text: "Please select or enter a valid credit amount.", color: "#993842" });
      return;
    }

    // Decline demonstration if ends with 0002
    if (cardNumber.replace(/\s/g, "").endsWith("0002")) {
      setMessage({ text: "Card declined by issuer. Please use another payment card.", color: "#993842" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await processCreditTopUp({
        amount: activeAmount,
      });

      if (res.success) {
        setMessage({
          text: `Payment successful! Added ${activeAmount} credits to your wallet.`,
          color: "#3b5e04",
        });

        setTimeout(() => {
          if (returnToParam) {
            router.push(returnToParam);
          } else {
            router.push("/account");
          }
        }, 1500);
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Payment failed. Please try again.", color: "#993842" });
    } finally {
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
            ? "Two euros a credit, in whatever quantity suits you. Credits last six months from the day you buy them, and the oldest in your wallet are always spent first."
            : "Dos euros por crédito, en la cantidad que prefieras. Duran seis meses desde la compra y siempre se gastan primero los más antiguos."}
        </p>

        {initialShortfall > 0 && (
          <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "#5c4708", maxWidth: "58ch", margin: "0 0 28px" }}>
            {lang === "en"
              ? `You need ${initialShortfall} more credits to complete your reservation. After top-up, you will be returned to finish your booking.`
              : `Necesitas ${initialShortfall} créditos más para completar tu reserva. Tras la recarga, volverás al evento.`}
          </p>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "32px", alignItems: "flex-start", marginTop: "24px" }}>
          {/* Left Form */}
          <div style={{ flex: "1 1 360px", minWidth: "280px", display: "flex", flexDirection: "column", gap: "22px" }}>
            {/* Packs Box */}
            <div style={{ border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "24px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", marginBottom: "16px" }}>
                How many credits?
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
                  Or another amount
                </span>
                <input
                  type="number"
                  min="1"
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

            {/* Payment Details Box */}
            <div style={{ border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "24px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", marginBottom: "16px" }}>
                Payment card
              </div>

              <form onSubmit={handlePay} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.7)" }}>
                    Card number
                  </span>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 4242 4242 4242"
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

                <div style={{ display: "flex", gap: "12px" }}>
                  <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.7)" }}>
                      Expiry
                    </span>
                    <input
                      type="text"
                      required
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      placeholder="MM/YY"
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

                  <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.7)" }}>
                      CVC
                    </span>
                    <input
                      type="text"
                      required
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      placeholder="123"
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

                <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.65)", marginTop: "4px" }}>
                  Card payments are encrypted and processed securely. Ending 0002 simulates a card decline test.
                </div>
              </form>
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
              Your order
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14.5px", padding: "10px 0", borderTop: "1px solid rgba(57,41,42,0.12)" }}>
              <span style={{ color: "rgba(57,41,42,0.74)" }}>Credits</span>
              <span style={{ fontWeight: 600 }}>{activeAmount}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14.5px", padding: "10px 0", borderTop: "1px solid rgba(57,41,42,0.12)" }}>
              <span style={{ color: "rgba(57,41,42,0.74)" }}>Price per credit</span>
              <span>€2</span>
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
              disabled={loading}
              onClick={handlePay}
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
                cursor: loading ? "wait" : "pointer",
                letterSpacing: "0.04em",
              }}
            >
              {loading ? "Processing..." : `Pay €${totalPrice}`}
            </button>

            {message && (
              <div style={{ fontSize: "13px", lineHeight: 1.5, color: message.color, marginTop: "12px" }}>
                {message.text}
              </div>
            )}

            <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57, 41, 42, 0.65)", marginTop: "14px" }}>
              Credits expire six months after purchase. Nothing renews automatically, and there is no subscription to cancel.
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
