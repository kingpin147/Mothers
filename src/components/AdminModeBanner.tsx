"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getPublicClubSettings } from "@/app/actions/adminSettings";

/**
 * Admin-only mode banner. Shown under the header on every /admin page,
 * in place of the public countdown banner.
 */
export function AdminModeBanner() {
  const [isLive, setIsLive] = useState<boolean | null>(null);

  useEffect(() => {
    getPublicClubSettings()
      .then((s) => setIsLive(!!s.membershipLive))
      .catch(() => setIsLive(false));
  }, []);

  if (isLive === null) return null;

  const linkStyle: React.CSSProperties = { color: "#c9a227", textDecoration: "underline", textUnderlineOffset: "2px" };

  return (
    <div style={{ background: "#2e1e1e", color: "#f8efe2" }}>
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "13px clamp(18px,4vw,34px)",
          fontSize: "12.5px",
          lineHeight: 1.6,
          fontFamily: "'Lora', Georgia, serif",
        }}
      >
        <div>
          <strong style={{ fontWeight: 600, color: "#c9a227", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "11px" }}>
            {isLive ? "MEMBERSHIP LIVE" : "PRE-MEMBERSHIP MODE"}
          </strong>{" "}
          {isLive ? (
            <>
              · Subscriptions and member / non-member prices are active across the site. Change this in{" "}
              <Link href="/admin/settings" style={linkStyle}>Settings</Link>.
            </>
          ) : (
            <>
              · Until you activate membership in{" "}
              <Link href="/admin/settings" style={linkStyle}>Settings</Link>. Subscriptions and joining fees are built and kept
              ready, but stay dormant until launch; mothers subscribe from My Account, no application, No Event Pass — non-members
              book with credits at the non-member price.
            </>
          )}
        </div>
        {!isLive && (
          <Link
            href="/admin/pre-launch"
            style={{
              display: "inline-block",
              marginTop: "8px",
              color: "#f8efe2",
              border: "1px solid rgba(248,239,226,0.4)",
              borderRadius: "4px",
              padding: "4px 12px",
              whiteSpace: "nowrap",
              fontFamily: "'Lora', Georgia, serif",
              fontWeight: 400,
              fontSize: "12px",
              textDecoration: "none",
            }}
          >
            Pre-launch desk →
          </Link>
        )}
      </div>
    </div>
  );
}
