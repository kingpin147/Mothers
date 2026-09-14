"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

export default function ComingSoonClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        padding: "clamp(40px, 8vw, 100px) clamp(24px, 6vw, 80px)",
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
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: "clamp(36px, 5vw, 56px)" }}>
          <Image
            src="/assets/logo.png"
            alt="The Mothers"
            width={72}
            height={72}
            style={{ objectFit: "contain" }}
            priority
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
            marginBottom: "20px",
          }}
        >
          Barcelona · Private Membership Club
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 400,
            fontSize: "clamp(40px, 6.5vw, 72px)",
            lineHeight: 1.1,
            color: "#39292a",
            margin: "0 0 24px",
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
            margin: "0 0 28px",
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
            fontSize: "clamp(16px, 2vw, 19px)",
            lineHeight: 1.75,
            color: "rgba(57,41,42,0.72)",
            maxWidth: "520px",
            margin: "0 auto 0",
          }}
        >
          We are putting the finishing touches on our new home. The Mothers — a
          curated community for mothers in Barcelona — will be ready for you very
          soon.
        </p>
      </div>

      {/* Bottom wordmark */}
      <div
        style={{
          position: "absolute",
          bottom: "clamp(32px, 5vw, 56px)",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "12px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(57,41,42,0.38)",
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
