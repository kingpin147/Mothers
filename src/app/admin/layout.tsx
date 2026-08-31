"use client";

import React from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", WebkitFontSmoothing: "antialiased", display: "flex", flexDirection: "column" }}>
      
      {/* HEADER */}
      <div style={{ borderBottom: "1px solid rgba(57,41,42,0.16)", background: "#f8efe2", position: "sticky", top: 0, zIndex: 90 }}>
        <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "16px clamp(18px,4vw,34px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <img src="/assets/logo-mark-alpha.png" alt="The Mothers" style={{ height: "56px", width: "auto", display: "block" }} />
            <span aria-hidden="true" style={{ width: "1px", height: "26px", background: "rgba(57,41,42,0.28)", flex: "none" }}></span>
            <img src="/assets/logo-wordmark-alpha.png" alt="The Mothers" style={{ height: "14px", width: "auto", display: "block" }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "22px", flexWrap: "wrap", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px" }}>
            <Link href="/membership" style={{ color: "#39292a", textDecoration: "none" }}>Membership</Link>
            <Link href="/events" style={{ color: "#39292a", textDecoration: "none" }}>Events</Link>
            <Link href="/admin" style={{ border: "1px solid #7b1f2c", color: "#7b1f2c", borderRadius: "4px", padding: "6px 14px", textDecoration: "none" }}>Admin</Link>
            <button onClick={() => signOut({ callbackUrl: "/super-admin/login" })} style={{ color: "rgba(57,41,42,0.55)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", padding: 0 }}>Log out</button>
          </div>
        </div>
      </div>

      {/* PAGE CONTENT */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </main>

      {/* FOOTER */}
      <div style={{ borderTop: "1px solid rgba(57,41,42,0.16)", background: "#f3e7d7" }}>
        <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "44px clamp(18px,4vw,34px) 30px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,190px),1fr))", gap: "28px" }}>
          <div>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "14px", textDecoration: "none" }}>
              <img src="/assets/logo-mark-alpha.png" alt="The Mothers" style={{ height: "56px", width: "auto", display: "block" }} />
              <span aria-hidden="true" style={{ width: "1px", height: "26px", background: "rgba(57,41,42,0.28)", flex: "none" }}></span>
              <img src="/assets/logo-wordmark-alpha.png" alt="The Mothers" style={{ height: "14px", width: "auto", display: "block" }} />
            </Link>
            <p style={{ fontSize: "13.5px", lineHeight: 1.65, color: "rgba(57,41,42,0.7)", margin: 0, maxWidth: "34ch", textWrap: "pretty" }}>A private membership club for mothers, from pregnancy through the school years.</p>
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "12px" }}>Explore</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13.5px" }}>
              <Link href="/membership" style={{ color: "#39292a", textDecoration: "none" }}>Membership</Link>
              <Link href="/events" style={{ color: "#39292a", textDecoration: "none" }}>Events</Link>
              <Link href="/admin/journal" style={{ color: "#39292a", textDecoration: "none" }}>Journal</Link>
              <Link href="/admin/partners" style={{ color: "#39292a", textDecoration: "none" }}>Partners</Link>
              <Link href="/faq" style={{ color: "#39292a", textDecoration: "none" }}>FAQ</Link>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "12px" }}>Legal</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13.5px" }}>
              <Link href="/legal" style={{ color: "#39292a", textDecoration: "none" }}>Terms &amp; Privacy</Link>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "12px" }}>Get in touch</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13.5px" }}>
              <a href="mailto:hello@themothers.cc" style={{ color: "#39292a", textDecoration: "none" }}>hello@themothers.cc</a>
              <Link href="#" style={{ color: "#39292a", textDecoration: "none" }}>Instagram</Link>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "16px clamp(18px,4vw,34px) 34px", borderTop: "1px solid rgba(57,41,42,0.12)", display: "flex", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", fontSize: "12.5px", color: "rgba(57,41,42,0.55)" }}>
          <span>© 2026 The Mothers</span>
          <span>Barcelona</span>
        </div>
      </div>
    </div>
  );
}
