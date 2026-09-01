"use client";

import React from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--color-bg, #f8efe2)" }}>
      {children}
    </div>
  );
}
