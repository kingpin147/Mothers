"use client";

import React, { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log client error
    console.error("[The Mothers Error Boundary]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "75vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "72px 24px 80px",
        textAlign: "center",
        fontFamily: "'Lora', Georgia, serif",
        color: "#39292a",
      }}
    >
      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 400,
          fontSize: "clamp(64px, 10vw, 84px)",
          lineHeight: 1,
          color: "rgba(123, 31, 44, 0.22)",
          fontFeatureSettings: "'tnum'",
          marginBottom: "12px",
        }}
      >
        500
      </div>

      <h1
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 400,
          fontSize: "clamp(26px, 4.5vw, 36px)",
          margin: "0 0 14px",
          lineHeight: 1.15,
        }}
      >
        Something unexpected happened.
      </h1>

      <p
        style={{
          fontSize: "15.5px",
          lineHeight: 1.65,
          color: "rgba(57, 41, 42, 0.76)",
          margin: "0 0 28px",
          maxWidth: "46ch",
        }}
      >
        We have automatically noted this and our team is on it. You can try refreshing the page or head back home.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          onClick={() => reset()}
          style={{
            border: "1px solid #7b1f2c",
            backgroundColor: "#7b1f2c",
            color: "#ffffff",
            padding: "11px 24px",
            borderRadius: "4px",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "15px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            border: "1px solid rgba(57, 41, 42, 0.28)",
            backgroundColor: "transparent",
            color: "#39292a",
            padding: "11px 24px",
            borderRadius: "4px",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "15px",
            textDecoration: "none",
            transition: "all 0.15s ease",
          }}
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
