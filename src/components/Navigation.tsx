"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";

export function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { language: lang, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/super-admin")) {
    return null;
  }

  const switchLang = (newLang: "en" | "es") => {
    setLanguage(newLang);
  };

  // The 3 approved header navigation links
  const navLinks = [
    { href: "/membership", labelEn: "Membership", labelEs: "Membresía" },
    { href: "/events", labelEn: "Events", labelEs: "Eventos" },
  ];

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px clamp(20px, 4vw, 64px)",
          borderBottom: "1px solid rgba(57, 41, 42, 0.16)",
          backgroundColor: "var(--color-bg)",
          position: "sticky",
          top: 0,
          zIndex: 90,
        }}
      >
        {/* Brand Lockup */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <img
            src="/assets/logo-mark-alpha.png"
            alt="The Mothers"
            style={{ height: "72px", width: "auto", display: "block" }}
          />
          <span
            aria-hidden="true"
            style={{
              width: "1px",
              height: "30px",
              background: "rgba(57, 41, 42, 0.28)",
              display: "inline-block",
              flex: "none",
            }}
          />
          <img
            src="/assets/logo-wordmark-alpha.png"
            alt="The Mothers"
            style={{ height: "16px", width: "auto", display: "block" }}
          />
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="desktop-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(12px, 2vw, 28px)",
          }}
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: isActive ? "var(--color-accent)" : "var(--color-text)",
                  fontSize: "14px",
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: "none",
                }}
              >
                {lang === "en" ? link.labelEn : link.labelEs}
              </Link>
            );
          })}



          {/* Language Toggle */}
          <button
            onClick={() => switchLang(lang === "en" ? "es" : "en")}
            style={{
              border: "1px solid rgba(57, 41, 42, 0.2)",
              background: "transparent",
              color: "var(--color-text)",
              padding: "6px 10px",
              borderRadius: "4px",
              fontSize: "13px",
              fontFamily: "var(--font-heading)",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {lang === "en" ? "ES" : "EN"}
          </button>

          {/* Login / Members Area CTA */}
          {session?.user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {(() => {
                const role = (session.user as any)?.role;
                const isAdminUser = role === "owner" || role === "manager" || role === "host" || role === "super_admin";
                const accountHref = isAdminUser ? "/admin" : "/account";
                const accountLabel = isAdminUser
                  ? (lang === "en" ? "Admin" : "Admin")
                  : (lang === "en" ? "My Account" : "Mi Cuenta");

                return (
                  <Link
                    href={accountHref}
                    style={{
                      border: "1px solid var(--color-accent)",
                      color: "var(--color-accent)",
                      padding: "8px 16px",
                      borderRadius: "4px",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 600,
                      fontSize: "13.5px",
                      textDecoration: "none",
                    }}
                  >
                    {accountLabel}
                  </Link>
                );
              })()}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "rgba(57, 41, 42, 0.65)",
                  fontSize: "13px",
                  cursor: "pointer",
                  padding: "6px 8px",
                }}
              >
                {lang === "en" ? "Log Out" : "Salir"}
              </button>
            </div>
          ) : (
            <Link
              href="/account/login"
              style={{
                border: "1px solid var(--color-accent)",
                color: "var(--color-accent)",
                padding: "8px 16px",
                borderRadius: "4px",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "13.5px",
                textDecoration: "none",
              }}
            >
              {lang === "en" ? "Login" : "Acceder"}
            </Link>
          )}
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-burger-btn"
          style={{
            display: "none",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "8px",
            color: "var(--color-text)",
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.8" fill="none">
            {mobileMenuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: "81px",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(248, 239, 226, 0.98)",
            backdropFilter: "blur(8px)",
            zIndex: 89,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "32px 24px",
            borderBottom: "1px solid rgba(57, 41, 42, 0.16)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <Link
              href="/membership"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "24px",
                fontWeight: 500,
                color: "var(--color-text)",
                textDecoration: "none",
              }}
            >
              {lang === "en" ? "Membership" : "Membresía"}
            </Link>
            <Link
              href="/events"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "24px",
                fontWeight: 500,
                color: "var(--color-text)",
                textDecoration: "none",
              }}
            >
              {lang === "en" ? "Events" : "Eventos"}
            </Link>

          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "24px", borderTop: "1px solid rgba(57, 41, 42, 0.14)" }}>
            {session?.user ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(() => {
                  const role = (session.user as any)?.role;
                  const isAdminUser = role === "owner" || role === "manager" || role === "host" || role === "super_admin";
                  const accountHref = isAdminUser ? "/admin" : "/account";
                  const accountLabel = isAdminUser
                    ? (lang === "en" ? "Admin Dashboard" : "Panel de Admin")
                    : (lang === "en" ? "My Account" : "Mi Cuenta");

                  return (
                    <Link
                      href={accountHref}
                      onClick={() => setMobileMenuOpen(false)}
                      style={{
                        textAlign: "center",
                        backgroundColor: "var(--color-accent)",
                        color: "#fff",
                        padding: "12px",
                        borderRadius: "4px",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                        fontSize: "15px",
                        textDecoration: "none",
                      }}
                    >
                      {accountLabel}
                    </Link>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  style={{
                    width: "100%",
                    textAlign: "center",
                    backgroundColor: "transparent",
                    color: "rgba(57, 41, 42, 0.75)",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    padding: "11px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: "14.5px",
                    cursor: "pointer",
                  }}
                >
                  {lang === "en" ? "Log Out" : "Cerrar Sesión"}
                </button>
              </div>
            ) : (
              <Link
                href="/account/login"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  textAlign: "center",
                  backgroundColor: "var(--color-accent)",
                  color: "#fff",
                  padding: "12px",
                  borderRadius: "4px",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: "15px",
                  textDecoration: "none",
                }}
              >
                {lang === "en" ? "Login" : "Acceder"}
              </Link>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-burger-btn {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
