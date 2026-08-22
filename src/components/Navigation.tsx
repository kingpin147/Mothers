"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [lang, setLang] = useState<"en" | "es">("en");

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") {
      setLang(saved);
    }
  }, []);

  const switchLang = (newLang: "en" | "es") => {
    setLang(newLang);
    localStorage.setItem("tm_lang", newLang);
    window.dispatchEvent(new Event("tm_lang_change"));
  };

  const navLinks = [
    { href: "/", labelEn: "Home", labelEs: "Inicio" },
    { href: "/membership", labelEn: "Membership", labelEs: "Membresía" },
    { href: "/events", labelEn: "Events", labelEs: "Eventos" },
    { href: "/journal", labelEn: "Journal", labelEs: "Diario" },
    { href: "/ambassadors", labelEn: "Godmothers", labelEs: "Madrinas" },
    { href: "/partners", labelEn: "Partners", labelEs: "Partners" },
    { href: "/faq", labelEn: "FAQ", labelEs: "Preguntas" },
  ];

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "18px",
      padding: "20px clamp(24px, 5vw, 64px)",
      borderBottom: "1px solid rgba(57, 41, 42, 0.16)",
      backgroundColor: "var(--color-bg)"
    }}>
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <img
          src="/assets/logo-mark-alpha.png"
          alt="The Mothers"
          style={{ height: "64px", width: "auto", display: "block" }}
        />
        <img
          src="/assets/logo-wordmark-alpha.png"
          alt="The Mothers"
          style={{ height: "16px", width: "auto", display: "block" }}
        />
      </Link>

      <nav style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 1.8vw, 24px)", flexWrap: "wrap" }}>
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

        {/* Language switcher */}
        <div style={{ display: "flex", border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "4px", overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => switchLang("en")}
            style={{
              border: "none",
              background: "transparent",
              padding: "6px 8px",
              fontFamily: "var(--font-heading)",
              fontSize: "12px",
              cursor: "pointer",
              color: lang === "en" ? "var(--color-accent)" : "rgba(57, 41, 42, 0.55)",
              fontWeight: lang === "en" ? 600 : 400,
            }}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => switchLang("es")}
            style={{
              border: "none",
              borderLeft: "1px solid rgba(57, 41, 42, 0.2)",
              background: "transparent",
              padding: "6px 8px",
              fontFamily: "var(--font-heading)",
              fontSize: "12px",
              cursor: "pointer",
              color: lang === "es" ? "var(--color-accent)" : "rgba(57, 41, 42, 0.55)",
              fontWeight: lang === "es" ? 600 : 400,
            }}
          >
            ES
          </button>
        </div>

        {/* Auth / Account button */}
        {session?.user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {(() => {
              const role = (session.user as any)?.role;
              const isAdminUser = role === "owner" || role === "manager" || role === "host";
              const accountHref = isAdminUser ? "/admin" : "/account";
              const accountLabel = isAdminUser
                ? (lang === "en" ? "Admin Dashboard" : "Panel Admin")
                : (lang === "en" ? "My Account" : "Mi Cuenta");

              return (
                <Link
                  href={accountHref}
                  className="btn btn-outline"
                  style={{
                    padding: "7px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    borderColor: isAdminUser ? "var(--color-accent)" : undefined,
                    color: isAdminUser ? "var(--color-accent)" : undefined,
                  }}
                >
                  {accountLabel}
                </Link>
              );
            })()}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="btn btn-secondary"
              style={{ padding: "7px 12px", fontSize: "13px" }}
            >
              {lang === "en" ? "Log Out" : "Salir"}
            </button>
          </div>
        ) : (
          <Link
            href="/account/login"
            className="btn btn-outline"
            style={{ padding: "7px 14px", fontSize: "13px" }}
          >
            {lang === "en" ? "Members Area" : "Área Socias"}
          </Link>
        )}
      </nav>
    </header>
  );
}
