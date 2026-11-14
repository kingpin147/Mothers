"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { BackArrow } from "@/components/Icons";
import { evaluateConditionals, interpolateVariables } from "@/lib/email-parser";

const WINE = "#7b1f2c";

interface EmailTemplateDef {
  baseName: string;
  name: string;
  when: string;
}

const ALL_28_EMAILS: EmailTemplateDef[] = [
  { baseName: "Email - Receipt", name: "Receipt", when: "Every card payment (top-ups, subscriptions)" },
  { baseName: "Email - Booking Confirmation", name: "Booking Confirmation", when: "Every booking — with meeting point & calendar invite" },
  { baseName: "Email - Meeting-Point Reminder", name: "Meeting-Point Reminder", when: "24–36 h before the event" },
  { baseName: "Email - Place Still Open", name: "Place Still Open", when: "24 h after she left Top Up without booking" },
  { baseName: "Email - After Your First Event", name: "After Your First Event", when: "The morning after her first attended event" },
  { baseName: "Email - Event Cancelled", name: "Event Cancelled", when: "The team cancels an event — credits back" },
  { baseName: "Email - Credits Expiring", name: "Credits Expiring", when: "30 days and 7 days before credits expire" },
  { baseName: "Email - Location Confirmed", name: "Location Confirmed", when: "When you set the real area for an event" },
  { baseName: "Email - Minimum Not Reached", name: "Minimum Not Reached", when: "To the team, T-2 days before event" },
  { baseName: "Email - Welcome To Membership", name: "Welcome To Membership", when: "After Subscribe to membership" },
  { baseName: "Email - Membership Is Open", name: "Membership Is Open", when: "Once, when you switch membership on" },
  { baseName: "Email - Membership Paused", name: "Membership Paused", when: "She pauses membership" },
  { baseName: "Email - Membership Resumed", name: "Membership Resumed", when: "She resumes, or the pause ends" },
  { baseName: "Email - Membership Cancelled", name: "Membership Cancelled", when: "She cancels membership" },
  { baseName: "Email - Godmother Credited", name: "Godmother Credited", when: "Her referral becomes a member" },
  { baseName: "Email - Host Request Received", name: "Host Request Received", when: "She clicks “Host this”" },
  { baseName: "Email - Host Request Accepted", name: "Host Request Accepted", when: "Team accepts on the Pre-launch desk" },
  { baseName: "Email - Host Request Declined", name: "Host Request Declined", when: "Team declines host request" },
  { baseName: "Email - Host Thank You", name: "Host Thank You", when: "Event marked as run" },
  { baseName: "Email - Host Cancelled", name: "Host Cancelled", when: "A host cancels her host assignment" },
  { baseName: "Email - Verify Your Email", name: "Verify Your Email", when: "Before her first payment / signup verification code" },
  { baseName: "Email - Password Reset", name: "Password Reset", when: "Forgot password — link valid 1 hour" },
  { baseName: "Email - Account Suspended", name: "Account Suspended", when: "Team suspends account" },
  { baseName: "Email - Account Reinstated", name: "Account Reinstated", when: "Team lifts a suspension" },
  { baseName: "Email - Account Deleted", name: "Account Deleted", when: "She deletes her own account in My Account" },
  { baseName: "Email - Waitlist Place Open", name: "Waitlist Place Open", when: "A place frees up on a full event for waitlist" },
  { baseName: "Email - New Reply", name: "New Reply", when: "Someone replies to her post or thread she follows" },
  { baseName: "Email - New Message", name: "New Message", when: "Another mother sends her a private message (DMs)" },
];

const SAMPLE_MOCK_DATA: Record<string, any> = {
  first_name: "Elena",
  last_name: "Garcia",
  event_title: "Watercolor & Coffee",
  event_date: "Thursday 19 November",
  event_time: "17:00",
  venue_name: "Ehia Barcelona",
  neighbourhood: "Sarrià-Sant Gervasi",
  meeting_point: "Carrer de la Duquessa d'Orleans, 48",
  credits: "13",
  balance: "2",
  release_deadline: "Tuesday 17 Nov at 17:00",
  event_url: "https://themothers.cc/events/watercolor-coffee",
  events_url: "https://themothers.cc/events",
  account_url: "https://themothers.cc/account",
  admin_url: "https://themothers.cc/admin",
  account_membership_url: "https://themothers.cc/account?tab=membership",
  thread_url: "https://themothers.cc/lagazette/pediatricians-in-gracia",
  post_url: "https://themothers.cc/lagazette/pediatricians-in-gracia",
  receipt_id: "TM-2026-8841",
  amount: "€26.00",
  date: "14 November 2026",
  card_brand: "Visa",
  last4: "4242",
  code: "749201",
  reset_url: "https://themothers.cc/account/reset-password/sample-token",
  expiry_date: "14 May 2027",
  credits_expiring: "6",
  booking_line: "Watercolor & Coffee on Thursday 19 November",
  cancel_reason: "Venue emergency maintenance",
  friend_first_name: "Camille",
  bonus: "2 credits",
  months_left: "4",
  next_date: "1 December 2026",
  until_date: "15 January 2027",
  stage_label: "Babies",
  replier_name: "Sophie",
  reply_preview: "We loved visiting Dr. Puig at Gràcia CAP, she is wonderful!",
  post_title: "Looking for an English/French speaking pediatrician in Gràcia",
  sender_first_name: "Julia",
  message_preview: "Hi Elena! So lovely meeting you yesterday at the meetup. Are you free next Tuesday for a stroll in Ciutadella?",
  is_author: true,
  released_places: "Watercolor & Coffee (19 Nov)",
  credits_removed: "5",
  membership_cancelled: true,
  first_in_line: true,
  booking_closes: "today at 19:00",
  minimum: "6",
  booked: "3",
  host_line: "Host: Julia (GOA Breath)",
  host_again_line: "You can host again anytime from your account.",
  host_url: "https://themothers.cc/host",
  discount: "10%",
  first_payment: "€39",
  monthly_fee: "€39",
  monthly_credits: "10",
  attendee_count: "8",
  attendee_names: "Elena, Camille, Sophie, Maria, Laura",
  met_first_names: "Camille, Sophie and Maria",
  places_left: "1",
  maps_url: "https://maps.google.com/?q=Ehia+Barcelona",
};

export default function AdminEmailsPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedLang, setSelectedLang] = useState<"en" | "es" | "fr">("en");
  const [previewWithData, setPreviewWithData] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [rawHtml, setRawHtml] = useState<string>("");
  const [loadingHtml, setLoadingHtml] = useState<boolean>(true);

  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return ALL_28_EMAILS;
    const q = searchQuery.toLowerCase().trim();
    return ALL_28_EMAILS.filter(
      (e) => e.name.toLowerCase().includes(q) || e.when.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const cur = filteredEmails[selectedIndex] || filteredEmails[0] || ALL_28_EMAILS[0];

  const currentFilename = useMemo(() => {
    const ext = selectedLang === "es" ? ".es.html" : selectedLang === "fr" ? ".fr.html" : ".html";
    return `${cur.baseName}${ext}`;
  }, [cur.baseName, selectedLang]);

  const fileUrl = `/emails/${encodeURIComponent(currentFilename)}`;

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
          setRawHtml(html);
          setLoadingHtml(false);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch email directly:", err);
        if (isMounted) {
          setRawHtml("");
          setLoadingHtml(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fileUrl]);

  const processedHtml = useMemo(() => {
    if (!rawHtml) return "";
    if (!previewWithData) return rawHtml;

    // Evaluate conditionals with sample data, then interpolate placeholders
    const withConditionals = evaluateConditionals(rawHtml, SAMPLE_MOCK_DATA);
    return interpolateVariables(withConditionals, SAMPLE_MOCK_DATA);
  }, [rawHtml, previewWithData]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", WebkitFontSmoothing: "antialiased" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "clamp(24px,4vw,38px) clamp(18px,4vw,34px) 60px" }}>
        <Link href="/admin" style={{ fontSize: "13px", color: WINE, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "10px" }}>
          <BackArrow /> Dashboard
        </Link>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: "14px", margin: "10px 0 6px" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px,4vw,40px)", lineHeight: 1.1, margin: 0 }}>
            Email templates & previews
          </h1>
          <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)" }}>
            84 files · 28 templates in EN, ES & FR
          </div>
        </div>

        <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 22px", maxWidth: "80ch" }}>
          Service emails sent through Brevo. Each email is available in English (.html), Spanish (.es.html) and French (.fr.html), matched to the mother’s site language.
        </p>

        {/* Global Toolbar: Language switcher & Preview Mode */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "14px 18px", backgroundColor: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", marginBottom: "20px" }}>
          {/* Language selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", fontWeight: 600 }}>Language:</span>
            {(["en", "es", "fr"] as const).map((lng) => {
              const active = selectedLang === lng;
              const labels = { en: "English (EN)", es: "Español (ES)", fr: "Français (FR)" };
              return (
                <button
                  key={lng}
                  type="button"
                  onClick={() => setSelectedLang(lng)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: `1px solid ${active ? WINE : "rgba(57,41,42,0.2)"}`,
                    backgroundColor: active ? WINE : "transparent",
                    color: active ? "#ffffff" : "#39292a",
                    fontSize: "12.5px",
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {labels[lng]}
                </button>
              );
            })}
          </div>

          {/* Preview Mode Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", fontWeight: 600 }}>View Mode:</span>
            <button
              type="button"
              onClick={() => setPreviewWithData(true)}
              style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: `1px solid ${previewWithData ? WINE : "rgba(57,41,42,0.2)"}`,
                backgroundColor: previewWithData ? "rgba(123,31,44,0.08)" : "transparent",
                color: previewWithData ? WINE : "rgba(57,41,42,0.7)",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Filled preview (Sample Data)
            </button>
            <button
              type="button"
              onClick={() => setPreviewWithData(false)}
              style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: `1px solid ${!previewWithData ? WINE : "rgba(57,41,42,0.2)"}`,
                backgroundColor: !previewWithData ? "rgba(123,31,44,0.08)" : "transparent",
                color: !previewWithData ? WINE : "rgba(57,41,42,0.7)",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Raw template (with {"{{tags}}"})
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))", gap: "20px", alignItems: "start" }}>
          {/* Email Selector List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "440px" }}>
            {/* Search Input */}
            <input
              type="text"
              placeholder="Filter 28 email templates..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 14px",
                fontSize: "13.5px",
                fontFamily: "'Lora', Georgia, serif",
                color: "#39292a",
                backgroundColor: "#fffdfa",
                border: "1px solid rgba(57,41,42,0.22)",
                borderRadius: "6px",
                outline: "none",
                marginBottom: "4px",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 2px" }}>
              <span style={{ fontSize: "11.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.66)" }}>
                Templates · {filteredEmails.length} of {ALL_28_EMAILS.length}
              </span>
              <span style={{ fontSize: "11.5px", color: "rgba(57,41,42,0.5)" }}>
                Showing: {currentFilename}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "720px", overflowY: "auto", paddingRight: "4px" }}>
              {filteredEmails.map((e, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={e.baseName}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    style={{
                      textAlign: "left",
                      border: `1px solid ${isSelected ? WINE : "rgba(57,41,42,0.18)"}`,
                      background: isSelected ? "rgba(123,31,44,0.06)" : "#fffdfa",
                      borderRadius: "6px",
                      padding: "11px 14px",
                      cursor: "pointer",
                      fontFamily: "'Lora', Georgia, serif",
                      color: "#39292a",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                      transition: "border-color 0.15s, background-color 0.15s",
                    }}
                  >
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", color: isSelected ? WINE : "#39292a" }}>
                      {e.name}
                    </span>
                    <span style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.7)" }}>
                      {e.when}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email Preview Frame */}
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", overflow: "hidden", minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid rgba(57,41,42,0.12)", backgroundColor: "#fbf8f4" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", color: "#39292a" }}>
                  {cur.name}
                </span>
                <span style={{ fontSize: "12px", color: WINE, fontFamily: "monospace" }}>
                  {currentFilename}
                </span>
              </div>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "13px", color: WINE, textDecoration: "none" }}>
                Open raw file ↗
              </a>
            </div>
            <div style={{ position: "relative", minHeight: "780px", background: "#f8efe2" }}>
              {loadingHtml && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8efe2", zIndex: 2 }}>
                  <div style={{ fontSize: "14px", color: "rgba(57,41,42,0.6)" }}>Loading preview...</div>
                </div>
              )}
              <iframe
                srcDoc={processedHtml || undefined}
                src={!processedHtml ? fileUrl : undefined}
                title={cur.name}
                style={{ display: "block", width: "100%", height: "780px", border: 0, background: "#f8efe2" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
