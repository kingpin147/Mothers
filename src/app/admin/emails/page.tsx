"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BackArrow } from "@/components/Icons";

const WINE = "#7b1f2c";

const READY_EMAILS = [
  { file: "Email - Receipt.html", name: "Receipt", when: "Every card payment (top-ups, subscriptions)" },
  { file: "Email - Place Still Open.html", name: "Place Still Open", when: "24 h after she left Top Up without booking" },
  { file: "Email - After Your First Event.html", name: "After Your First Event", when: "The morning after her first attended event" },
  { file: "Email - Event Cancelled.html", name: "Event Cancelled", when: "The team cancels an event — credits back" },
  { file: "Email - Credits Expiring.html", name: "Credits Expiring", when: "30 days and 7 days before credits expire" },
  { file: "Email - Membership Is Open.html", name: "Membership Is Open", when: "Once, when you switch membership on" },
  { file: "Email - Booking Confirmation.html", name: "Booking Confirmation", when: "Every booking — with meeting point" },
  { file: "Email - Meeting-Point Reminder.html", name: "Meeting-Point Reminder", when: "24 h before the event" },
  { file: "Email - Verify Your Email.html", name: "Verify Your Email", when: "Before her first payment" },
  { file: "Email - Password Reset.html", name: "Password Reset", when: "Forgot password — link valid 1 hour" },
  { file: "Email - Host Request Received.html", name: "Host Request Received", when: "She clicks “Host this”" },
  { file: "Email - Host Request Accepted.html", name: "Host Request Accepted", when: "Team accepts on the Pre-launch desk" },
  { file: "Email - Host Request Declined.html", name: "Host Request Declined", when: "Team declines" },
  { file: "Email - Host Thank You.html", name: "Host Thank You", when: "Event marked as run" },
  { file: "Email - Minimum Not Reached.html", name: "Minimum Not Reached", when: "To the team, T-2 days" },
  { file: "Email - Welcome To Membership.html", name: "Welcome To Membership", when: "After Subscribe" },
  { file: "Email - Membership Paused.html", name: "Membership Paused", when: "She pauses" },
  { file: "Email - Membership Cancelled.html", name: "Membership Cancelled", when: "She cancels" },
  { file: "Email - Godmother Credited.html", name: "Godmother Credited", when: "Her referral becomes a member" },
  { file: "Email - Account Suspended.html", name: "Account Suspended", when: "Team suspends" },
  { file: "Email - Membership Resumed.html", name: "Membership Resumed", when: "She resumes, or the pause ends" },
  { file: "Email - Account Reinstated.html", name: "Account Reinstated", when: "Team lifts a suspension" },
  { file: "Email - Host Cancelled.html", name: "Host Cancelled", when: "A host cancels" },
];

export default function AdminEmailsPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [loadingHtml, setLoadingHtml] = useState<boolean>(true);

  const cur = READY_EMAILS[selectedIndex] || READY_EMAILS[0];
  const fileUrl = `/emails/${encodeURIComponent(cur.file)}`;

  useEffect(() => {
    let isMounted = true;
    setLoadingHtml(true);

    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch template");
        return res.text();
      })
      .then((html) => {
        if (isMounted) {
          setHtmlContent(html);
          setLoadingHtml(false);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch email directly:", err);
        if (isMounted) {
          setHtmlContent("");
          setLoadingHtml(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fileUrl]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", WebkitFontSmoothing: "antialiased" }}>
      {/* Mode banner is rendered for every admin page by AdminModeBanner (Navigation). */}

      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(24px,4vw,38px) clamp(18px,4vw,34px) 60px" }}>
        <Link href="/admin" style={{ fontSize: "13px", color: WINE, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "10px" }}>
          <BackArrow /> Dashboard
        </Link>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px,4vw,40px)", lineHeight: 1.1, margin: "10px 0 6px" }}>
          Email previews
        </h1>
        <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 22px", maxWidth: "70ch" }}>
          The service emails sent through Brevo. Words in double braces are filled in when each one is sent.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: "20px", alignItems: "start" }}>
          {/* Email Selector List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "420px" }}>
            <div style={{ fontSize: "11.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.66)" }}>
              Written · {READY_EMAILS.length}
            </div>
            {READY_EMAILS.map((e, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={e.file}
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  style={{
                    textAlign: "left",
                    border: `1px solid ${isSelected ? WINE : "rgba(57,41,42,0.18)"}`,
                    background: isSelected ? "rgba(123,31,44,0.05)" : "#fffdfa",
                    borderRadius: "6px",
                    padding: "11px 14px",
                    cursor: "pointer",
                    fontFamily: "'Lora', Georgia, serif",
                    color: "#39292a",
                    display: "flex",
                    flexDirection: "column",
                    gap: "3px",
                  }}
                >
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", color: isSelected ? WINE : "#39292a" }}>
                    {e.name}
                  </span>
                  <span style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.7)" }}>
                    {e.when}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Email Preview Frame */}
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", overflow: "hidden", minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(57,41,42,0.12)" }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px" }}>
                {cur.name}
              </span>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13px", color: WINE, textDecoration: "none" }}>
                Open on its own ↗
              </a>
            </div>
            <div style={{ position: "relative", minHeight: "760px", background: "#f8efe2" }}>
              {loadingHtml && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8efe2", zIndex: 2 }}>
                  <div style={{ fontSize: "14px", color: "rgba(57,41,42,0.6)" }}>Loading preview...</div>
                </div>
              )}
              <iframe
                srcDoc={htmlContent || undefined}
                src={!htmlContent ? fileUrl : undefined}
                title={cur.name}
                style={{ display: "block", width: "100%", height: "760px", border: 0, background: "#f8efe2" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
