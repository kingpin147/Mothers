import React from "react";

export function BackArrow({ size = 13, style, className }: { size?: number; style?: React.CSSProperties; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      style={{
        display: "inline-block",
        marginRight: "5px",
        verticalAlign: "-2px",
        position: "relative",
        top: "0.5px",
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

export function ForwardArrow({ size = 13, style, className }: { size?: number; style?: React.CSSProperties; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      style={{
        display: "inline-block",
        marginLeft: "5px",
        verticalAlign: "-2px",
        position: "relative",
        top: "0.5px",
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}
