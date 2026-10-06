"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminFooter() {
  const pathname = usePathname();

  const exploreLinks = [
    { label: "Membership", href: "/membership" },
    { label: "Events", href: "/events" },
    { label: "FAQ", href: "/faq" },
  ];

  const backOfficeLinks = [
    { label: "Dashboard", href: "/admin", exact: true },
    { label: "Events", href: "/admin/events" },
    { label: "Members", href: "/admin/members" },
    { label: "Pre-launch", href: "/admin/pre-launch" },
    { label: "Subscribers", href: "/admin/subscribers" },
    { label: "Finance", href: "/admin/finance" },
    { label: "Partners", href: "/admin/partners" },
    { label: "Journal", href: "/admin/journal" },
    { label: "FAQ (CMS)", href: "/admin/faq" },
    { label: "Settings", href: "/admin/settings" },
    { label: "Emails", href: "/admin/emails" },
  ];

  const headingStyle: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontWeight: 600,
    fontSize: "10.5px",
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "rgba(57, 41, 42, 0.5)",
    marginBottom: "12px",
  };

  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    fontSize: "13.5px",
    color: isActive ? "rgba(57, 41, 42, 0.5)" : "#7b1f2c",
    textDecoration: "none",
    transition: "color 0.15s ease",
    fontWeight: isActive ? 600 : 400,
    pointerEvents: isActive ? "none" : "auto",
  });

  return (
    <footer
      style={{
        borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        background: "#FDF8F2",
        fontFamily: "'Lora', Georgia, serif",
        color: "#39292a",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "40px clamp(18px, 3vw, 30px) 26px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
          gap: "28px",
        }}
      >
        {/* Brand Column */}
        <div>
          <Link
            href="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "14px",
              textDecoration: "none",
            }}
          >
            <img
              src="/assets/logo-mark-alpha.png"
              alt="The Mothers"
              style={{ height: "54px", width: "auto", display: "block" }}
            />
            <span
              aria-hidden="true"
              style={{
                width: "1px",
                height: "26px",
                background: "rgba(57, 41, 42, 0.28)",
                flex: "none",
              }}
            />
            <img
              src="/assets/logo-wordmark-alpha.png"
              alt="The Mothers"
              style={{ height: "13.5px", width: "auto", display: "block" }}
            />
          </Link>
          <p
            style={{
              fontSize: "13.5px",
              lineHeight: 1.65,
              color: "rgba(57, 41, 42, 0.7)",
              margin: 0,
              maxWidth: "34ch",
              textWrap: "pretty",
            }}
          >
            A private membership club for mothers, from pregnancy through the school years.
          </p>
        </div>

        {/* Explore Column */}
        <div>
          <div style={headingStyle}>Explore</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {exploreLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  fontSize: "13.5px",
                  color: "#7b1f2c",
                  textDecoration: "none",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Back Office Column */}
        <div>
          <div style={headingStyle}>Back office</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {backOfficeLinks.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={linkStyle(Boolean(isActive))}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Get in touch Column */}
        <div>
          <div style={headingStyle}>Get in touch</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <a
              href="mailto:hello@themothers.cc"
              style={{
                fontSize: "13.5px",
                color: "#7b1f2c",
                textDecoration: "none",
              }}
            >
              hello@themothers.cc
            </a>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "16px clamp(18px, 3vw, 30px) 30px",
          borderTop: "1px solid rgba(57, 41, 42, 0.12)",
          display: "flex",
          justifyContent: "space-between",
          gap: "14px",
          flexWrap: "wrap",
          fontSize: "12.5px",
          color: "rgba(57, 41, 42, 0.55)",
        }}
      >
        <span>© 2026 The Mothers</span>
        <span>Barcelona</span>
      </div>
    </footer>
  );
}
