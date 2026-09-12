"use client";

import React from "react";

interface ThemeLoaderProps {
  text?: string;
  fullPage?: boolean;
  size?: "small" | "medium" | "large";
}

export default function ThemeLoader({
  text = "Loading...",
  fullPage = false,
  size = "medium",
}: ThemeLoaderProps) {
  const spinnerSize = size === "small" ? 24 : size === "large" ? 48 : 36;
  const fontSize = size === "small" ? "14px" : size === "large" ? "20px" : "16px";

  const content = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px" }}>
      <svg
        width={spinnerSize}
        height={spinnerSize}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: "tm_spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        }}
      >
        <circle
          cx="20"
          cy="20"
          r="16"
          stroke="#7b1f2c"
          strokeWidth="3"
          strokeOpacity="0.18"
        />
        <path
          d="M36 20C36 11.1634 28.8366 4 20 4"
          stroke="#7b1f2c"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
      {text && (
        <span
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 500,
            fontSize,
            color: "#7b1f2c",
            letterSpacing: "0.04em",
          }}
        >
          {text}
        </span>
      )}
      <style jsx global>{`
        @keyframes tm_spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );

  if (fullPage) {
    return (
      <div
        style={{
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}
