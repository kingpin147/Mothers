"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useLanguage } from "@/components/LanguageProvider";
import { getMyCredits } from "@/app/actions/memberAccount";
import { StickyCountdownBanner } from "@/components/StickyCountdownBanner";
import { AdminModeBanner } from "@/components/AdminModeBanner";

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
  const stickyContainerRef = useRef<HTMLDivElement>(null);
  const [navTotalHeight, setNavTotalHeight] = useState(74);

  // Measure height of sticky header
  useEffect(() => {
    const updateHeight = () => {
      if (stickyContainerRef.current) {
        setNavTotalHeight(stickyContainerRef.current.offsetHeight);
      }
    };
    updateHeight();
    const timer = setTimeout(updateHeight, 60);
    window.addEventListener("resize", updateHeight, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateHeight);
    };
  }, [mobileMenuOpen, pathname]);

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
    const saved = typeof window !== "undefined" ? localStorage.getItem("tm_pre_joined_list") : null;
    if (saved === "true") setJoinedList(true);
  }, []);

  // Fetch credit balance for logged-in members
  useEffect(() => {
    const role = (session?.user as any)?.role;
    const isAdminUser = role === "owner" || role === "manager" || role === "host" || role === "super_admin";
    if (session?.user && !isAdminUser) {
      getMyCredits().then(({ balance }) => setMemberCredits(balance)).catch(() => { });
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
        if (typeof window !== "undefined") {
          localStorage.setItem("tm_pre_joined_list", "true");
        }
        setJoinModalOpen(false);
      }
    } catch {
      setLeadMsg(lang === "en" ? "Error, try again" : "Error, inténtalo de nuevo");
    } finally {
      setLeadLoading(false);
    }
  };

  const [scrolled, setScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 10);

      // On mobile (screen width <= 768) or when menu is open, always keep pinned
      if (mobileMenuOpen || window.innerWidth <= 768) {
        setHeaderVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      if (currentScrollY < 10) {
        setHeaderVisible(true);
      } else if (currentScrollY > lastScrollY.current + 8 && currentScrollY > 100) {
        setHeaderVisible(false);
      } else if (currentScrollY < lastScrollY.current - 8) {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileMenuOpen]);

  // Nav links per pre-membership page map
  const navLinks = [
    { href: "/membership", labelEn: "Membership", labelEs: "Membresía" },
    { href: "/events", labelEn: "Events", labelEs: "Eventos" },
    { href: "/gazette", labelEn: "La Gazette", labelEs: "La Gazette" },
  ];

  const isEventsPage = pathname?.startsWith("/events");
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <>
      <header
        ref={stickyContainerRef}
        className="site-header-container"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          padding: "16px clamp(20px, 5vw, 64px)",
          borderBottom: "1px solid rgba(57, 41, 42, 0.16)",
          backgroundColor: isEventsPage ? "var(--color-bg-events, #fefdf9)" : "var(--color-bg, #fdf8f2)",
          boxShadow: scrolled ? "0 4px 20px rgba(57, 41, 42, 0.08)" : "none",
          transition: "box-shadow 0.2s ease, background-color 0.2s ease",
        }}
      >
        <div
          style={{
            maxWidth: "1160px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {/* Brand Lockup */}
          <Link href="/home" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <img
              src="/assets/logo-mark-alpha.png"
              alt="The Mothers"
              className="site-logo-mark"
              style={{ height: isAdminRoute ? "46px" : "54px", width: "auto", display: "block" }}
            />
            <span
              aria-hidden="true"
              className="site-logo-divider"
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
              className="site-logo-wordmark"
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

          {/* Mobile Hamburger / Close Button (44x44 Target) */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-burger-btn"
            style={{
              display: "none",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0",
              width: "44px",
              height: "44px",
              minWidth: "44px",
              minHeight: "44px",
              color: "var(--color-text, #39292a)",
              zIndex: 1002,
              alignItems: "center",
              justifyContent: "center",
              touchAction: "manipulation",
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
        </div>
      </header>

      {/* Public pages: countdown banner. Admin pages: pre-membership mode banner. */}
      {isAdminRoute ? <AdminModeBanner /> : <StickyCountdownBanner />}

      {/* Mobile Drawer Overlay: Below Banner, matching client design */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: navTotalHeight || 102,
            left: 0,
            right: 0,
            bottom: 0,
            height: `calc(100dvh - ${navTotalHeight || 102}px)`,
            backgroundColor: "#fdf8f2",
            zIndex: 999,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "8px 24px 28px",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            fontFamily: "'Lora', Georgia, serif",
            boxSizing: "border-box",
          }}
        >
          {/* Main Links: Membership, Events, La Gazette, Login / My Account */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              { href: "/membership", label: lang === "en" ? "Membership" : "Membresía" },
              { href: "/events", label: lang === "en" ? "Events" : "Eventos" },
              { href: "/gazette", label: "La Gazette" },
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
                    minHeight: "58px",
                    borderBottom: "1px solid rgba(57, 41, 42, 0.12)",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontWeight: isActive ? 600 : 400,
                    fontSize: "25px",
                    color: isActive ? "#7b1f2c" : "#39292a",
                    textDecoration: "none",
                  }}
                >
                  <span>{item.label}</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isActive ? "#7b1f2c" : "rgba(57, 41, 42, 0.45)"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    width="18"
                    height="18"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              );
            })}
          </div>

          {/* Bottom Action Area: Guest vs Member States */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "auto", paddingTop: "20px" }}>
            {!session?.user ? (
              /* Guest / Signed Out State (Screen 2) */
              <>
                {/* Primary CTA: Book your first event */}
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
                    fontSize: "17px",
                    textDecoration: "none",
                  }}
                >
                  {lang === "en" ? "Book your first event" : "Reserva tu primer evento"}
                </Link>

                {/* Secondary CTA: Join the list */}
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
                    fontSize: "17px",
                    cursor: "pointer",
                  }}
                >
                  {joinedList
                    ? (lang === "en" ? "✓ You're on the list" : "✓ Estás en la lista")
                    : (lang === "en" ? "Join the list" : "Unirme a la lista")}
                </button>
              </>
            ) : (
              /* Member / Signed In State (Screen 3) */
              <>
                {/* Primary CTA: You're on the list / Join the list */}
                <button
                  type="button"
                  onClick={() => {
                    if (!joinedList) setJoinModalOpen(true);
                  }}
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
                    fontSize: "17px",
                    cursor: joinedList ? "default" : "pointer",
                  }}
                >
                  {joinedList
                    ? (lang === "en" ? "You're on the list" : "Estás en la lista")
                    : (lang === "en" ? "Join the list" : "Unirme a la lista")}
                </button>

                {/* Secondary CTA: Log out */}
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
                    fontSize: "17px",
                    cursor: "pointer",
                  }}
                >
                  {lang === "en" ? "Log out" : "Cerrar sesión"}
                </button>
              </>
            )}

            {/* Foot info: Language Switch (Left) & Instagram / Credits (Right) */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "8px",
                fontSize: "14px",
                fontFamily: "'Lora', Georgia, serif",
                color: "rgba(57, 41, 42, 0.72)",
              }}
            >
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => switchLang("en")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: lang === "en" ? "#7b1f2c" : "rgba(57, 41, 42, 0.65)",
                    textDecoration: lang === "en" ? "underline" : "none",
                    fontWeight: lang === "en" ? 600 : 400,
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "14px",
                  }}
                >
                  EN
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => switchLang("es")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: lang === "es" ? "#7b1f2c" : "rgba(57, 41, 42, 0.65)",
                    textDecoration: lang === "es" ? "underline" : "none",
                    fontWeight: lang === "es" ? 600 : 400,
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "14px",
                  }}
                >
                  ES
                </button>
              </div>

              <span>
                {session?.user ? (
                  memberCredits !== null ? `${Math.max(0, memberCredits)} ${lang === "en" ? "credits" : "créditos"}` : ""
                ) : (
                  <a
                    href="https://www.instagram.com/themothers.club"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "rgba(57, 41, 42, 0.75)",
                      textDecoration: "none",
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: "14px",
                    }}
                  >
                    Instagram
                  </a>
                )}
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
                ? "Get pre-launch invites and priority access when membership opens."
                : "Recibe invitaciones de pre-lanzamiento y acceso prioritario cuando abra la membresía."}
            </p>
            <form onSubmit={handleMobileJoinList} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input
                type="email"
                required
                placeholder={lang === "en" ? "Your email address" : "Tu correo electrónico"}
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#c9a227";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(201, 162, 39, 0.35)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(57,41,42,0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                style={{
                  padding: "10px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(57,41,42,0.3)",
                  backgroundColor: "#ffffff",
                  fontSize: "14px",
                  outline: "none",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
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
            display: flex !important;
            align-items: center;
            justify-content: center;
            width: 44px !important;
            height: 44px !important;
            min-width: 44px !important;
            min-height: 44px !important;
          }
          .site-header-container {
            padding: 12px 18px !important;
          }
          .site-logo-mark {
            height: 42px !important;
          }
          .site-logo-divider {
            height: 20px !important;
          }
          .site-logo-wordmark {
            height: 12px !important;
          }
          .countdown-banner-desktop {
            display: none !important;
          }
          .countdown-banner-mobile {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .countdown-banner-mobile {
            display: none !important;
          }
          .countdown-banner-desktop {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
