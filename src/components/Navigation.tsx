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

  const switchLang = (newLang: "en" | "es" | "fr") => {
    setLanguage(newLang);
  };

  const handleMobileJoinList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail || !leadEmail.includes("@")) {
      setLeadMsg(lang === "en" ? "Enter a valid email" : lang === "es" ? "Introduce un correo válido" : "Entrez un e-mail valide");
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
      setLeadMsg(lang === "en" ? "Error, try again" : lang === "es" ? "Error, inténtalo de nuevo" : "Erreur, réessayez");
    } finally {
      setLeadLoading(false);
    }
  };

  const [scrolled, setScrolled] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;
    const apply = () => {
      const currentScrollY = window.scrollY || 0;
      setScrolled(currentScrollY > 10);

      if (mobileMenuOpen) {
        setHeaderVisible(true);
        lastScrollY.current = currentScrollY;
        ticking = false;
        return;
      }

      const h = stickyContainerRef.current?.offsetHeight || 60;
      if (currentScrollY <= h) {
        setHeaderVisible(true);
      } else if (currentScrollY > lastScrollY.current + 4) {
        setHeaderVisible(false);
      } else if (currentScrollY < lastScrollY.current - 4) {
        setHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileMenuOpen]);

  // Nav links per pre-membership page map
  const navLinks = [
    { href: "/membership", labelEn: "Membership", labelEs: "Membresía", labelFr: "Adhésion" },
    { href: "/events", labelEn: "Events", labelEs: "Eventos", labelFr: "Événements" },
    { href: "/gazette", labelEn: "La Gazette", labelEs: "La Gazette", labelFr: "La Gazette" },
  ];

  const isEventsPage = pathname?.startsWith("/events");
  const isAdminRoute = pathname?.startsWith("/admin");

  return (
    <>
      <div
        data-autohide=""
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 0.28s ease",
          willChange: "transform",
        }}
      >
        <header
          ref={stickyContainerRef}
          className="site-header-container"
          style={{
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
              const linkLabel = lang === "fr" ? link.labelFr : lang === "es" ? link.labelEs : link.labelEn;
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
                  {linkLabel}
                </Link>
              );
            })}

            {/* 3-Language Toggle EN · ES · FR */}
            <div
              role="group"
              aria-label="Language"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "13.5px",
                letterSpacing: "0.04em",
              }}
            >
              <button
                type="button"
                onClick={() => switchLang("en")}
                aria-pressed={lang === "en"}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: "3px 4px",
                  cursor: "pointer",
                  color: lang === "en" ? "#7b1f2c" : "rgba(57, 41, 42, 0.65)",
                  fontWeight: lang === "en" ? 600 : 400,
                  textDecoration: lang === "en" ? "underline" : "none",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "13.5px",
                }}
              >
                EN
              </button>
              <span style={{ color: "rgba(57, 41, 42, 0.35)" }}>·</span>
              <button
                type="button"
                onClick={() => switchLang("es")}
                aria-pressed={lang === "es"}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: "3px 4px",
                  cursor: "pointer",
                  color: lang === "es" ? "#7b1f2c" : "rgba(57, 41, 42, 0.65)",
                  fontWeight: lang === "es" ? 600 : 400,
                  textDecoration: lang === "es" ? "underline" : "none",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "13.5px",
                }}
              >
                ES
              </button>
              <span style={{ color: "rgba(57, 41, 42, 0.35)" }}>·</span>
              <button
                type="button"
                onClick={() => switchLang("fr")}
                aria-pressed={lang === "fr"}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: "3px 4px",
                  cursor: "pointer",
                  color: lang === "fr" ? "#7b1f2c" : "rgba(57, 41, 42, 0.65)",
                  fontWeight: lang === "fr" ? 600 : 400,
                  textDecoration: lang === "fr" ? "underline" : "none",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "13.5px",
                }}
              >
                FR
              </button>
            </div>

            {/* Login / Members Area CTA */}
            {session?.user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {(() => {
                  const role = (session.user as any)?.role;
                  const isAdminUser = role === "owner" || role === "manager" || role === "host" || role === "super_admin";
                  const accountHref = isAdminUser ? "/admin" : "/account";
                  const creditsWord = lang === "fr" ? "crédits" : lang === "es" ? "créditos" : "credits";
                  const myAccountWord = lang === "fr" ? "Mon compte" : lang === "es" ? "Mi cuenta" : "My account";
                  const accountLabel = isAdminUser
                    ? "Admin"
                    : memberCredits !== null
                      ? `${myAccountWord} · ${Math.max(0, memberCredits)} ${creditsWord}`
                      : (lang === "fr" ? "Mon Compte" : lang === "es" ? "Mi Cuenta" : "My Account");

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
                  {lang === "fr" ? "Déconnexion" : lang === "es" ? "Salir" : "Log Out"}
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
                {lang === "fr" ? "Connexion" : lang === "es" ? "Acceder" : "Login"}
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
      </div>

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
              { href: "/membership", label: lang === "fr" ? "Adhésion" : lang === "es" ? "Membresía" : "Membership" },
              { href: "/events", label: lang === "fr" ? "Événements" : lang === "es" ? "Eventos" : "Events" },
              { href: "/gazette", label: "La Gazette" },
              session?.user
                ? { href: "/account", label: lang === "fr" ? "Mon Compte" : lang === "es" ? "Mi Cuenta" : "My Account" }
                : { href: "/account/login", label: lang === "fr" ? "Connexion" : lang === "es" ? "Acceder" : "Login" },
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
                  {lang === "fr" ? "Réservez votre premier événement" : lang === "es" ? "Reserva tu primer evento" : "Book your first event"}
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
                    ? (lang === "fr" ? "✓ Vous êtes sur la liste" : lang === "es" ? "✓ Estás en la lista" : "✓ You're on the list")
                    : (lang === "fr" ? "Rejoindre la liste" : lang === "es" ? "Unirme a la lista" : "Join the list")}
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
                    ? (lang === "fr" ? "Vous êtes sur la liste" : lang === "es" ? "Estás en la lista" : "You're on the list")
                    : (lang === "fr" ? "Rejoindre la liste" : lang === "es" ? "Unirme a la lista" : "Join the list")}
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
                  {lang === "fr" ? "Se déconnecter" : lang === "es" ? "Cerrar sesión" : "Log out"}
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
                <span>·</span>
                <button
                  type="button"
                  onClick={() => switchLang("fr")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: lang === "fr" ? "#7b1f2c" : "rgba(57, 41, 42, 0.65)",
                    textDecoration: lang === "fr" ? "underline" : "none",
                    fontWeight: lang === "fr" ? 600 : 400,
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "14px",
                  }}
                >
                  FR
                </button>
              </div>

              <span>
                {session?.user ? (
                  memberCredits !== null
                    ? `${Math.max(0, memberCredits)} ${lang === "fr" ? "crédits" : lang === "es" ? "créditos" : "credits"}`
                    : ""
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
              {lang === "fr" ? "Rejoindre la liste" : lang === "es" ? "Unirme a la lista" : "Join the list"}
            </h3>
            <p style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.8)", marginBottom: "16px" }}>
              {lang === "fr"
                ? "Recevez des invitations avant le lancement et un accès prioritaire à l'ouverture des adhésions."
                : lang === "es"
                ? "Recibe invitaciones de pre-lanzamiento y acceso prioritario cuando abra la membresía."
                : "Get pre-launch invites and priority access when membership opens."}
            </p>
            <form onSubmit={handleMobileJoinList} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <input
                type="email"
                required
                placeholder={lang === "fr" ? "Votre adresse e-mail" : lang === "es" ? "Tu correo electrónico" : "Your email address"}
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
                {leadLoading ? "..." : (lang === "fr" ? "Confirmer" : lang === "es" ? "Confirmar" : "Confirm")}
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
