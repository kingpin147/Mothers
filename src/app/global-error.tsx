"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[The Mothers Global Error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#fcf8f2",
          fontFamily: "'Lora', Georgia, serif",
          color: "#39292a",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          boxSizing: "border-box",
        }}
      >
        <div style={{ padding: "32px 24px", maxWidth: "480px" }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "64px",
              lineHeight: 1,
              color: "rgba(123, 31, 44, 0.25)",
              marginBottom: "16px",
            }}
          >
            500
          </div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "32px",
              fontWeight: 400,
              margin: "0 0 12px",
            }}
          >
            An unexpected error occurred.
          </h1>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.6,
              color: "rgba(57, 41, 42, 0.75)",
              margin: "0 0 24px",
            }}
          >
            Please try reloading the page to continue.
          </p>
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
            }}
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}
