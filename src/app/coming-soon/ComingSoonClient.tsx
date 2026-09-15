"use client";

import React, { useEffect, useState } from "react";
import { subscribeToComingSoon } from "@/app/actions/publicWindow";

export default function ComingSoonClient() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setAlreadySubscribed(false);

    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await subscribeToComingSoon(email);
      if (res.success) {
        if (res.alreadySubscribed) {
          setAlreadySubscribed(true);
        } else {
          setIsSuccess(true);
          setEmail("");
        }
      } else {
        setErrorMessage(res.error || "Failed to join list. Please try again.");
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8efe2",
        color: "#39292a",
        fontFamily: "'Lora', Georgia, serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: "clamp(48px, 8vw, 100px) clamp(24px, 6vw, 80px)",
        boxSizing: "border-box",
      }}
    >
      {/* Decorative background texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(ellipse at 20% 10%, rgba(123,31,44,0.06) 0%, transparent 55%),
                            radial-gradient(ellipse at 80% 90%, rgba(86,139,5,0.05) 0%, transparent 50%)`,
          pointerEvents: "none",
        }}
      />

      {/* Subtle top & bottom horizontal rules */}
      <div
        style={{
          position: "absolute",
          top: "clamp(20px, 4vw, 48px)",
          left: "clamp(24px, 6vw, 80px)",
          right: "clamp(24px, 6vw, 80px)",
          height: "1px",
          background: "rgba(57,41,42,0.16)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "clamp(20px, 4vw, 48px)",
          left: "clamp(24px, 6vw, 80px)",
          right: "clamp(24px, 6vw, 80px)",
          height: "1px",
          background: "rgba(57,41,42,0.16)",
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: "680px",
          width: "100%",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
          zIndex: 1,
        }}
      >
        {/* Brand Logo Lockup (Transparent & Larger to match site branding) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(12px, 2vw, 18px)",
            marginBottom: "clamp(32px, 5vw, 48px)",
          }}
        >
          {/* Transparent Logo Mark */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo-mark-alpha.png"
            alt="The Mothers Mark"
            style={{
              height: "clamp(72px, 10vw, 96px)",
              width: "auto",
              display: "block",
              objectFit: "contain",
            }}
          />

          {/* Divider line */}
          <span
            aria-hidden="true"
            style={{
              width: "1px",
              height: "clamp(34px, 4.5vw, 44px)",
              background: "rgba(57, 41, 42, 0.28)",
              display: "inline-block",
              flex: "none",
            }}
          />

          {/* Transparent Wordmark */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logo-wordmark-alpha.png"
            alt="The Mothers Wordmark"
            style={{
              height: "clamp(18px, 2.4vw, 24px)",
              width: "auto",
              display: "block",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Eyebrow */}
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#7b1f2c",
            marginBottom: "16px",
          }}
        >
          Barcelona · Private Membership Club
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 400,
            fontSize: "clamp(36px, 6vw, 68px)",
            lineHeight: 1.1,
            color: "#39292a",
            margin: "0 0 20px",
            letterSpacing: "-0.01em",
          }}
        >
          Something beautiful
          <br />
          <em>is on its way.</em>
        </h1>

        {/* Divider ornament */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            margin: "0 0 24px",
          }}
        >
          <div style={{ width: "40px", height: "1px", background: "rgba(57,41,42,0.28)" }} />
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#7b1f2c",
              opacity: 0.6,
            }}
          />
          <div style={{ width: "40px", height: "1px", background: "rgba(57,41,42,0.28)" }} />
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "clamp(15px, 1.8vw, 18px)",
            lineHeight: 1.75,
            color: "rgba(57,41,42,0.76)",
            maxWidth: "520px",
            margin: "0 auto 32px",
          }}
        >
          We are putting the finishing touches on our new home. The Mothers — a
          curated community for mothers in Barcelona — will open soon.
        </p>

        {/* Newsletter / Join Waitlist Section */}
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            margin: "0 auto 24px",
          }}
        >
          {isSuccess ? (
            <div
              style={{
                border: "1px solid rgba(86, 139, 5, 0.4)",
                backgroundColor: "rgba(86, 139, 5, 0.08)",
                borderRadius: "6px",
                padding: "16px 20px",
                display: "flex",
                gap: "12px",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  color: "#568b05",
                  fontSize: "18px",
                  fontWeight: "bold",
                  flex: "none",
                }}
              >
                ✓
              </span>
              <span
                style={{
                  fontSize: "15px",
                  lineHeight: 1.5,
                  color: "#39292a",
                  fontFamily: "'Lora', Georgia, serif",
                  textAlign: "left",
                }}
              >
                You are on the list. We will send you an exclusive invitation when our doors open.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: "10px",
                  justifyContent: "center",
                }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setAlreadySubscribed(false);
                    setErrorMessage("");
                  }}
                  placeholder="Enter your email address"
                  required
                  disabled={isSubmitting}
                  style={{
                    flex: "1 1 240px",
                    minHeight: "48px",
                    padding: "12px 18px",
                    fontSize: "15px",
                    fontFamily: "'Lora', Georgia, serif",
                    color: "#39292a",
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    borderRadius: "5px",
                    outline: "none",
                    boxSizing: "border-box",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
                    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#7b1f2c";
                    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(123, 31, 44, 0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(57, 41, 42, 0.25)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.03)";
                  }}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    border: "1px solid #7b1f2c",
                    backgroundColor: "#7b1f2c",
                    color: "#f8efe2",
                    padding: "13px 26px",
                    borderRadius: "5px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "16px",
                    letterSpacing: "0.04em",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    opacity: isSubmitting ? 0.7 : 1,
                    whiteSpace: "nowrap",
                    transition: "background-color 0.2s ease, transform 0.15s ease",
                    boxShadow: "0 2px 6px rgba(123, 31, 44, 0.15)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) e.currentTarget.style.backgroundColor = "#621822";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) e.currentTarget.style.backgroundColor = "#7b1f2c";
                  }}
                >
                  {isSubmitting ? "Joining..." : "Join the List"}
                </button>
              </div>

              {alreadySubscribed && (
                <div
                  style={{
                    border: "1px solid rgba(168, 117, 44, 0.4)",
                    backgroundColor: "rgba(168, 117, 44, 0.08)",
                    borderRadius: "6px",
                    padding: "12px 16px",
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "14px 0 0",
                  }}
                >
                  <span
                    style={{
                      color: "#a8752c",
                      fontSize: "16px",
                      fontWeight: "bold",
                      flex: "none",
                    }}
                  >
                    ℹ
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.45,
                      color: "#39292a",
                      fontFamily: "'Lora', Georgia, serif",
                      textAlign: "left",
                    }}
                  >
                    You are already subscribed with this email. We have your spot reserved and will invite you when doors open.
                  </span>
                </div>
              )}

              {errorMessage && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#993842",
                    margin: "10px 0 0",
                    textAlign: "center",
                  }}
                >
                  {errorMessage}
                </p>
              )}

              <p
                style={{
                  fontSize: "12.5px",
                  lineHeight: 1.5,
                  color: "rgba(57, 41, 42, 0.55)",
                  margin: "12px 0 0",
                  textAlign: "center",
                }}
              >
                Be the first to know when the club launches. No spam, ever.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Bottom wordmark domain */}
      <div
        style={{
          position: "absolute",
          bottom: "clamp(24px, 4vw, 44px)",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "12.5px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(57,41,42,0.42)",
          whiteSpace: "nowrap",
          opacity: mounted ? 1 : 0,
          transition: "opacity 1.2s ease 0.4s",
        }}
      >
        themothers.cc
      </div>
    </div>
  );
}
