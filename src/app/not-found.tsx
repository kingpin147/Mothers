import React from "react";
import Link from "next/link";

export default function NotFound() {
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
          fontSize: "clamp(72px, 12vw, 96px)",
          lineHeight: 1,
          color: "rgba(123, 31, 44, 0.22)",
          fontFeatureSettings: "'tnum'",
          marginBottom: "12px",
        }}
      >
        404
      </div>

      <h1
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 400,
          fontSize: "clamp(28px, 5vw, 38px)",
          margin: "0 0 14px",
          lineHeight: 1.15,
        }}
      >
        This page wandered off.
      </h1>

      <p
        style={{
          fontSize: "16px",
          lineHeight: 1.65,
          color: "rgba(57, 41, 42, 0.76)",
          margin: "0 0 28px",
          maxWidth: "44ch",
        }}
      >
        It may have moved, or the link was mistyped. Here is where the mothers are.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          justifyContent: "center",
        }}
      >
        <Link
          href="/events"
          style={{
            border: "1px solid #7b1f2c",
            backgroundColor: "#7b1f2c",
            color: "#fdf8f2",
            padding: "12px 24px",
            borderRadius: "4px",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "15.5px",
            textDecoration: "none",
          }}
        >
          Upcoming events
        </Link>

        <Link
          href="/circle"
          style={{
            border: "1px solid #7b1f2c",
            backgroundColor: "transparent",
            color: "#7b1f2c",
            padding: "12px 24px",
            borderRadius: "4px",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "15.5px",
            textDecoration: "none",
          }}
        >
          The Circle
        </Link>

        <Link
          href="/"
          style={{
            border: "1px solid rgba(57, 41, 42, 0.24)",
            backgroundColor: "transparent",
            color: "#39292a",
            padding: "12px 24px",
            borderRadius: "4px",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "15.5px",
            textDecoration: "none",
          }}
        >
          Home
        </Link>
      </div>
    </div>
  );
}
