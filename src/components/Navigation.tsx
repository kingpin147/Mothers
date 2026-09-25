"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";
import { getMyCredits } from "@/app/actions/memberAccount";
import { StickyCountdownBanner } from "@/components/StickyCountdownBanner";

export function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { language: lang, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [memberCredits, setMemberCredits] = useState<number | null>(null);
  const [joinedList, setJoinedList] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadMsg, setLeadMsg] = useState("");

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const saved = localStorage.getItem("tm_pre_joined_list");
    if (saved) setJoinedList(true);
  }, []);

  // Fetch credit balance for logged-in members
  useEffect(() => {
    const role = (session?.user as any)?.role;
    const isAdminUser = role === "owner" || role === "manager" || role === "host" || role === "super_admin";
    if (session?.user && !isAdminUser) {
      getMyCredits().then(({ balance }) => setMemberCredits(balance)).catch(() => {});
    } else {
      setMemberCredits(null);
    }
  }, [session?.user?.id, (session?.user as any)?.role]);

  const switchLang = (newLang: "en" | "es") => {
    setLanguage(newLang);
  };

  const handleMobileJoinList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail || !leadEmail.includes("@")) {
      setLeadMsg(lang === "en" ? "Enter a valid email" : "Introduce un correo válido");
      return;
    }
    setLeadLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: leadEmail, source: "mobile_menu" }),
      });
      if (res.ok) {
        setJoinedList(true);
        localStorage.setItem("tm_pre_joined_list", "true");
        setJoinModalOpen(false);
      }
    } catch {
      setLeadMsg(lang === "en" ? "Error, try again" : "Error, inténtalo de nuevo");
    } finally {
      setLeadLoading(false);
    }
  };

  // Nav links per pre-membership page map
  const navLinks = [
    { href: "/membership", labelEn: "Membership", labelEs: "Membresía" },
    { href: "/events", labelEn: "Events", labelEs: "Eventos" },
    { href: "/circle", labelEn: "The Circle", labelEs: "The Circle" },
  ];

  const isEventsPage = pathname?.startsWith("/events");
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px clamp(20px, 5vw, 64px)",
          borderBottom: "1px solid rgba(57, 41, 42, 0.16)",
          backgroundColor: isEventsPage ? "var(--color-bg-events, #fefdf9)" : "var(--color-bg, #fdf8f2)",
        }}
      >
        {/* Brand Lockup */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <img
            src="/assets/logo-mark-alpha.png"
            alt="The Mothers"
            style={{ height: isAdminRoute ? "46px" : "54px", width: "auto", display: "block" }}
          />
          <span
            aria-hidden="true"
            style={{
              width: "1px",
              height: isAdminRoute ? "22px" : "26px",
              background: "rgba(57, 41, 42, 0.28)",
              display: "inline-block",
              flex: "none",
            }}
          />
          <img
            src="/assets/logo-wordmark-alpha.png"
            alt="The Mothers"
            style={{ height: isAdminRoute ? "12px" : "13.5px", width: "auto", display: "block" }}
          />
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="desktop-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(16px, 2.2vw, 32px)",
          }}
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: isActive ? "#7b1f2c" : "var(--color-text, #39292a)",
                  fontSize: "15.5px",
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: "none",
                  fontFamily: "'Lora', Georgia, serif",
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
              color: "var(--color-text, #39292a)",
              padding: "5px 9px",
              borderRadius: "4px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "'Lora', Georgia, serif",
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
                  : memberCredits !== null
                    ? `${lang === "en" ? "My account" : "Mi cuenta"} · ${Math.max(0, memberCredits)} ${lang === "en" ? "credits" : "créditos"}`
                    : (lang === "en" ? "My Account" : "Mi Cuenta");

                return (
                  <Link
                    href={accountHref}
                    style={{
                      border: "1px solid #7b1f2c",
                      color: "#7b1f2c",
                      padding: "7px 14px",
                      borderRadius: "4px",
                      fontWeight: 500,
                      fontSize: "15px",
                      textDecoration: "none",
                      fontFamily: "'Lora', Georgia, serif",
                    }}
                  >
                    {accountLabel}
                  </Link>
                );
              })()}
              <button
                onClick={async () => {
                  await signOut({ redirect: false });
                  window.location.href = "/";
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "rgba(57, 41, 42, 0.65)",
                  fontSize: "14.5px",
                  fontWeight: 500,
                  cursor: "pointer",
                  padding: "6px 8px",
                  fontFamily: "'Lora', Georgia, serif",
                }}
              >
                {lang === "en" ? "Log Out" : "Salir"}
              </button>
            </div>
          ) : (
            <Link
              href="/account/login"
              style={{
                border: "1px solid #7b1f2c",
                color: "#7b1f2c",
                padding: "7px 14px",
                borderRadius: "4px",
                fontWeight: 500,
                fontSize: "15px",
                textDecoration: "none",
                fontFamily: "'Lora', Georgia, serif",
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
            color: "var(--color-text, #39292a)",
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

      {/* Sticky Countdown Banner (Membership Opens Jan 2027) */}
      <StickyCountdownBanner />

      {/* Mobile Drawer Overlay Matching UI Extras #3 */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: "var(--site-header-height, 120px)",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#fdf8f2",
            zIndex: 99,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "16px 24px 32px",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            fontFamily: "'Lora', Georgia, serif",
          }}
        >
          {/* Main Links */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { href: "/membership", label: lang === "en" ? "Membership" : "Membresía" },
              { href: "/events", label: lang === "en" ? "Events" : "Eventos" },
              { href: "/circle", label: "The Circle" },
              session?.user
                ? { href: "/account", label: lang === "en" ? "My Account" : "Mi Cuenta" }
                : { href: "/account/login", label: lang === "en" ? "Login" : "Acceder" },
            ].map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minHeight: "56px",
                    borderBottom: "1px solid rgba(57, 41, 42, 0.12)",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontWeight: isActive ? 600 : 400,
                    fontSize: "24px",
                    color: isActive ? "#7b1f2c" : "#39292a",
                    textDecoration: "none",
                  }}
                >
                  <span>{item.label}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(57, 41, 42, 0.45)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </Link>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto", paddingTop: "24px" }}>
            {!session?.user ? (
              <>
                <Link
                  href="/events"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    minHeight: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #7b1f2c",
                    backgroundColor: "#7b1f2c",
                    color: "#fdf8f2",
                    borderRadius: "4px",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontWeight: 600,
                    fontSize: "16px",
                    textDecoration: "none",
                  }}
                >
                  {lang === "en" ? "Book your first event" : "Reserva tu primer evento"}
                </Link>

                <button
                  type="button"
                  onClick={() => setJoinModalOpen(true)}
                  style={{
                    minHeight: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #7b1f2c",
                    backgroundColor: "transparent",
                    color: "#7b1f2c",
                    borderRadius: "4px",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontWeight: 600,
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  {joinedList
                    ? (lang === "en" ? "✓ You're on the list" : "✓ Estás en la lista")
                    : (lang === "en" ? "Join the list" : "Unirme a la lista")}
                </button>
              </>
            ) : (
              <>
                <div
                  style={{
                    minHeight: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #7b1f2c",
                    backgroundColor: "#7b1f2c",
                    color: "#fdf8f2",
                    borderRadius: "4px",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontWeight: 600,
                    fontSize: "16px",
                  }}
                >
                  {lang === "en" ? "✓ You're on the list" : "✓ Estás en la lista"}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await signOut({ redirect: false });
                    window.location.href = "/";
                  }}
                  style={{
                    minHeight: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(57, 41, 42, 0.28)",
                    backgroundColor: "transparent",
                    color: "#39292a",
                    borderRadius: "4px",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontWeight: 600,
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  {lang === "en" ? "Log out" : "Cerrar sesión"}
                </button>
              </>
            )}

            {/* Foot info & language switch */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", fontSize: "13.5px", color: "rgba(57, 41, 42, 0.72)" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <span
                  onClick={() => switchLang("en")}
                  style={{
                    cursor: "pointer",
                    color: lang === "en" ? "#7b1f2c" : "#39292a",
                    borderBottom: lang === "en" ? "1px solid #7b1f2c" : "none",
                    fontWeight: lang === "en" ? 600 : 400,
                  }}
                >
                  EN
                </span>
                <span>·</span>
                <span
                  onClick={() => switchLang("es")}
                  style={{
                    cursor: "pointer",
                    color: lang === "es" ? "#7b1f2c" : "#39292a",
                    borderBottom: lang === "es" ? "1px solid #7b1f2c" : "none",
                    fontWeight: lang === "es" ? 600 : 400,
                  }}
                >
                  ES
                </span>
              </div>

              <span>
                {session?.user && memberCredits !== null
                  ? `${Math.max(0, memberCredits)} ${lang === "en" ? "credits" : "créditos"}`
                  : "Instagram"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Join modal for mobile trigger */}
      {joinModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(57, 41, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setJoinModalOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              backgroundColor: "#fdf8f2",
              borderRadius: "8px",
              padding: "24px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", margin: "0 0 8px" }}>
              {lang === "en" ? "Join the list" : "Unirme a la lista"}
            </h3>
            <p style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.8)", marginBottom: "16px" }}>
              {lang === "en"
                ? "Get pre-launch invites and waive the €19 joining fee."
                : "Recibe invitaciones de pre-lanzamiento y no pagues cuota de alta."}
            </p>
            <form onSubmit={handleMobileJoinList} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input
                type="email"
                required
                placeholder={lang === "en" ? "Your email address" : "Tu correo electrónico"}
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(57,41,42,0.3)",
                  fontSize: "14px",
                }}
              />
              {leadMsg && <div style={{ color: "#993842", fontSize: "12px" }}>{leadMsg}</div>}
              <button
                type="submit"
                disabled={leadLoading}
                style={{
                  padding: "10px",
                  backgroundColor: "#7b1f2c",
                  color: "#fdf8f2",
                  border: "none",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                {leadLoading ? "..." : (lang === "en" ? "Confirm" : "Confirmar")}
              </button>
            </form>
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
    </div>
  );
}
