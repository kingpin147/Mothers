"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface UATItem {
  id: string;
  prio: "P1" | "P2" | "P3";
  title: string;
  steps: string;
  expected: string;
}

interface UATGroup {
  title: string;
  page: string;
  items: UATItem[];
}

const STORAGE_KEY = "tmp_uat_results_v2";

const GROUPS: UATGroup[] = [
  {
    title: "Global — header, banner, footer",
    page: "All pages",
    items: [
      { id: "G-01", prio: "P1", title: "Header on every page", steps: "Open each page.", expected: "Logo, Membership, Events, The Circle, ES/EN and Login / My Account identical everywhere. Logo → Home." },
      { id: "G-02", prio: "P1", title: "Sticky header + banner", steps: "Scroll a long page.", expected: "Nav and countdown banner stay pinned." },
      { id: "G-03", prio: "P1", title: "Countdown", steps: "Compare with 6 Jan 2027 00:00 Madrid; wait 5 s.", expected: "Correct values, ticking every minute on every page." },
      { id: "G-04", prio: "P2", title: "Join the list (banner)", steps: "Click it, reload, open another page.", expected: 'Becomes "You\'re on the list" everywhere. Email stored in leads.' },
      { id: "G-05", prio: "P2", title: "Account button", steps: "Check signed out, then signed in.", expected: '"Login" → Sign In; "My Account" → Account.' },
      { id: "G-06", prio: "P2", title: "Footer links + Instagram", steps: "Click every footer link and the Instagram icon.", expected: "All pages open (incl. Become a host, The Circle, Cookie settings). Mail opens client; Instagram opens profile." },
      { id: "G-07", prio: "P2", title: "Footer newsletter", steps: "Submit empty, invalid, valid email.", expected: 'Errors for empty/invalid; confirmation for valid; stored with source "footer".' },
      { id: "G-08", prio: "P1", title: "No launch leaks", steps: 'Search pages for "guest", "€19", "no joining fee, ever".', expected: "None appear. Fee only described as waived before launch." },
      { id: "G-09", prio: "P3", title: "Language toggle", steps: "Click ES.", expected: "Label switches between EN and ES." }
    ]
  },
  {
    title: "Home",
    page: "Home",
    items: [
      { id: "H-01", prio: "P1", title: "Hero CTAs", steps: 'Click "See what\'s on" and "Book your first event".', expected: "Both open Events." },
      { id: "H-02", prio: "P2", title: "Next on the calendar", steps: "Click an event card.", expected: "Correct Event detail opens; labels match filter categories." },
      { id: "H-03", prio: "P2", title: "Godmother module", steps: 'Read bullets; click "Get your invite code", "How it works", "become a host".', expected: "5 credits marked Members only; 2 credits for hosting. Links → Account, FAQ, Host." },
      { id: "H-04", prio: "P2", title: "Membership block", steps: 'Click "What membership will be" and the list button.', expected: "Membership opens; list button toggles and persists." }
    ]
  },
  {
    title: "Events Calendar",
    page: "Events",
    items: [
      { id: "E-01", prio: "P1", title: "Category filter", steps: "Click each category.", expected: "Only matching events; count updates; card labels match filter names." },
      { id: "E-02", prio: "P1", title: "Combined filters", steps: 'Month + stage + "Mothers only" + "To be confirmed".', expected: "Filters combine; empty state when nothing matches." },
      { id: "E-10", prio: "P1", title: "Credit price on cards", steps: "Check every paid card and Home cards.", expected: 'Cards show credits only (e.g. "6 credits"), no euro amount.' },
      { id: "E-03", prio: "P1", title: "Card content + Details", steps: "Inspect a card; toggle Details.", expected: "Photo, badges, credits, date, area, languages, audience; Details shows partner, meeting note, description." },
      { id: "E-04", prio: "P1", title: "Availability states", steps: "Find near-full and gathering events.", expected: 'Red "N places left" when ≤3; gathering bar with "X more to confirm".' },
      { id: "E-05", prio: "P1", title: "Book signed out", steps: "Click Book on a paid event.", expected: "Event detail opens the first-booking panel (name, email, phone, password)." },
      { id: "E-06", prio: "P1", title: "Book with enough credits", steps: 'Click "Book with N credits".', expected: "Balance drops by N; card shows booked." },
      { id: "E-07", prio: "P1", title: "Book with too few credits", steps: "Click Book.", expected: "Top Up with shortfall; after paying returns and auto-books." },
      { id: "E-08", prio: "P1", title: "Cancellation rule per event", steps: "Check a walk, a coffee, a class, a supper.", expected: "Cards and detail show: any time · 24 h · 48 h · 7 days." }
    ]
  },
  {
    title: "The Circle (Forum)",
    page: "The Circle",
    items: [
      { id: "C-01", prio: "P1", title: "Read without account", steps: "Open signed out.", expected: "Feed readable; composer asks to book a first event." },
      { id: "C-02", prio: "P1", title: "Post + persist", steps: "Post 10+ characters; reload.", expected: "Post appears on top and survives reload." },
      { id: "C-03", prio: "P1", title: "Too short", steps: "Post under 10 characters.", expected: "Error; nothing posted." },
      { id: "C-04", prio: "P1", title: "Anonymous post", steps: "Tick anonymous and post.", expected: 'Shown as "A mother in Barcelona"; still linked to real account.' },
      { id: "C-05", prio: "P1", title: "Photo type + size", steps: "Upload a PDF/GIF, then a >10 MB image.", expected: "Rejected with the right message." },
      { id: "C-06", prio: "P1", title: "Photo count", steps: "Add 5 photos.", expected: "Only 4 kept, with message." },
      { id: "C-07", prio: "P1", title: "Children consent", steps: "Attach a photo, post without ticking.", expected: "Blocked until consent ticked." },
      { id: "C-08", prio: "P1", title: "Rate limits", steps: "Post twice in 30 s; post 6 times in a day; reply 21 times.", expected: "Wait message; daily limit messages at 5 posts / 20 replies." },
      { id: "C-09", prio: "P1", title: "Replies + hearts persist", steps: "Reply and heart; reload.", expected: "Both saved." },
      { id: "C-10", prio: "P1", title: "Report", steps: "Report a post with a reason; reload.", expected: '"Reported — thank you" stays; Report button hidden for that post.' },
      { id: "C-11", prio: "P2", title: "Topic filters", steps: "Click topic chips.", expected: "Only matching posts." }
    ]
  },
  {
    title: "Core UI Extras",
    page: "All pages",
    items: [
      { id: "UI-01", prio: "P1", title: "Cookie banner", steps: "Open site in a private window.", expected: "Accept all / Reject all / Choose, equal weight. No analytics or marketing scripts before consent." },
      { id: "UI-02", prio: "P1", title: "Cookie choices saved", steps: 'Choose Analytics only; reload; open "Cookie settings" in footer.', expected: "Choice kept; settings re-open and can be changed." },
      { id: "UI-03", prio: "P2", title: "404 page", steps: "Visit a made-up URL.", expected: "404 with Events, The Circle and Home links; header, banner, footer present." },
      { id: "UI-04", prio: "P1", title: "Mobile menu", steps: "On a phone, open the menu signed out, then signed in.", expected: 'Full-screen; header and banner stay; signed out shows "Book your first event" + "Join the list"; signed in shows My Account + Log out.' }
    ]
  },
  {
    title: "Moderation & Admin",
    page: "/admin/reports",
    items: [
      { id: "MOD-01", prio: "P1", title: "Auto-hide at 3 reports", steps: "Report one post from 3 accounts.", expected: 'Post replaced by "This post was removed for moderation"; replies stay; appears in /admin/reports queue.' },
      { id: "MOD-02", prio: "P1", title: "Admin hide / restore", steps: "Hide from /admin/reports, then restore.", expected: "Placeholder shows, then post returns." },
      { id: "MOD-03", prio: "P1", title: "Pause account", steps: "Pause a mother with bookings and credits.", expected: "She can read but not post, reply or book. Bookings kept; credits frozen with same expiry." },
      { id: "MOD-04", prio: "P1", title: "Posting after free booking", steps: "New account books a free walk, then posts.", expected: "Posting unlocked." }
    ]
  },
  {
    title: "Credits & Top Up",
    page: "Top Up · Account",
    items: [
      { id: "T-01", prio: "P1", title: "Amount + price", steps: "Pick packs, then a custom amount.", expected: '€2 per credit: 10 → €20, 20 → €40, 40 → €80, 60 → €120; summary and "Pay €N" update.' },
      { id: "T-03", prio: "P1", title: "Declined card", steps: "Card ending 0002.", expected: "Decline message; no credits." },
      { id: "T-04", prio: "P1", title: "Successful payment", steps: "4242…", expected: "Credits added as a batch with 6-month expiry." }
    ]
  },
  {
    title: "Account & GDPR",
    page: "Account",
    items: [
      { id: "A-01", prio: "P1", title: "Signed-out state", steps: "Open signed out.", expected: '"Your account starts with your first booking" with Events and Sign in buttons.' },
      { id: "A-02", prio: "P1", title: "Strip + tabs", steps: "Check credits, invite code, all 4 tabs.", expected: "Values correct; tabs switch." },
      { id: "CR-01", prio: "P1", title: "Godmother trigger", steps: "Invitee registers, then books.", expected: "+5 pending after register, active only after first confirmed booking." },
      { id: "CR-03", prio: "P1", title: "Delete account", steps: "Delete from Account settings.", expected: 'Signed out; posts show "A mother in Barcelona"; photos gone; payment records kept.' }
    ]
  }
];

export default function UATPage() {
  const [results, setResults] = useState<Record<string, { status?: string; note?: string }>>({});
  const [filter, setFilter] = useState("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setResults(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const saveResults = (updated: Record<string, { status?: string; note?: string }>) => {
    setResults(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const setStatus = (id: string, status: string) => {
    const cur = results[id] || {};
    const nextStatus = cur.status === status ? "" : status;
    saveResults({ ...results, [id]: { ...cur, status: nextStatus } });
  };

  const setNote = (id: string, note: string) => {
    const cur = results[id] || {};
    saveResults({ ...results, [id]: { ...cur, note } });
  };

  const handleReset = () => {
    if (window.confirm("Clear all UAT test results?")) {
      saveResults({});
    }
  };

  const allItems = GROUPS.flatMap((g) => g.items);
  const passCount = allItems.filter((i) => results[i.id]?.status === "pass").length;
  const failCount = allItems.filter((i) => results[i.id]?.status === "fail").length;
  const blockedCount = allItems.filter((i) => results[i.id]?.status === "blocked").length;
  const todoCount = allItems.length - passCount - failCount - blockedCount;
  const pct = allItems.length > 0 ? Math.round((passCount / allItems.length) * 100) : 0;

  return (
    <div style={{ backgroundColor: "#fdf8f2", minHeight: "100vh", fontFamily: "'Lora', Georgia, serif", color: "#39292a" }}>
      {/* Sticky Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          backgroundColor: "#fdf8f2",
          borderBottom: "1px solid rgba(57,41,42,0.16)",
          padding: "14px clamp(20px, 4vw, 48px)",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px 24px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/assets/logo-mark-alpha.png" alt="The Mothers" style={{ height: "38px", width: "auto" }} />
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "19px" }}>
              UAT — Pre-membership site
            </div>
            <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.72)" }}>
              For Tech & QA · September 2026
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", fontSize: "13.5px" }}>
          <span style={{ color: "#3b5e04", fontWeight: 600 }}>{passCount} pass</span>
          <span style={{ color: "#993842", fontWeight: 600 }}>{failCount} fail</span>
          <span style={{ color: "#7a5612", fontWeight: 600 }}>{blockedCount} blocked</span>
          <span style={{ color: "rgba(57,41,42,0.72)" }}>{todoCount} to test</span>
          <div style={{ width: "120px", height: "6px", borderRadius: "3px", backgroundColor: "rgba(57,41,42,0.12)", overflow: "hidden" }}>
            <div style={{ height: "100%", backgroundColor: "#568b05", width: `${pct}%`, transition: "width 0.2s" }} />
          </div>
        </div>
      </header>

      {/* Intro & Filters */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "clamp(26px, 4vw, 44px) clamp(20px, 4vw, 48px) 6px" }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(28px, 3.8vw, 42px)", margin: "0 0 12px" }}>
          User Acceptance Tests (87 Scenarios)
        </h1>
        <p style={{ fontSize: "15px", lineHeight: 1.65, color: "rgba(57,41,42,0.78)", margin: "0 0 18px", maxWidth: "72ch" }}>
          Run on desktop (Chrome, Safari) and mobile (iOS, Android). Start each full run in a private window: no account, empty wallet. Results persist in this browser.
        </p>

        {/* Filter Buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
          {[
            { id: "all", label: "All tests" },
            { id: "todo", label: "To test" },
            { id: "P1", label: "P1 only" },
            { id: "fail", label: "Failed" },
            { id: "blocked", label: "Blocked" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              style={{
                border: filter === f.id ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.22)",
                backgroundColor: filter === f.id ? "rgba(123,31,44,0.08)" : "#ffffff",
                color: filter === f.id ? "#7b1f2c" : "#39292a",
                borderRadius: "16px",
                padding: "6px 14px",
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Test Groups */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "6px clamp(20px, 4vw, 48px) 60px" }}>
        {GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) => {
            const st = results[item.id]?.status || "";
            if (filter === "all") return true;
            if (filter === "todo") return !st;
            if (filter === "P1") return item.prio === "P1";
            return st === filter;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} style={{ marginTop: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(57,41,42,0.2)", paddingBottom: "8px" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "22px", margin: 0 }}>
                  {group.title}
                </h2>
                <span style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.65)" }}>{group.page}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {visibleItems.map((item) => {
                  const res = results[item.id] || {};
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        padding: "16px 0",
                        borderBottom: "1px solid rgba(57,41,42,0.1)",
                      }}
                    >
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px", alignItems: "baseline" }}>
                        <span style={{ fontSize: "12px", color: "rgba(57,41,42,0.7)", minWidth: "44px" }}>{item.id}</span>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            border: item.prio === "P1" ? "1px solid rgba(153,56,66,0.4)" : "1px solid rgba(164,118,31,0.4)",
                            color: item.prio === "P1" ? "#993842" : "#7a5612",
                          }}
                        >
                          {item.prio}
                        </span>
                        <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "17px" }}>
                          {item.title}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "10px 24px" }}>
                        <div>
                          <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "4px" }}>
                            Steps
                          </div>
                          <p style={{ fontSize: "13.5px", lineHeight: 1.55, margin: 0 }}>{item.steps}</p>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "4px" }}>
                            Expected
                          </div>
                          <p style={{ fontSize: "13.5px", lineHeight: 1.55, margin: 0 }}>{item.expected}</p>
                        </div>
                      </div>

                      {/* Status Buttons & Notes */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                        {[
                          { key: "pass", label: "Pass", color: "#3b5e04" },
                          { key: "fail", label: "Fail", color: "#993842" },
                          { key: "blocked", label: "Blocked", color: "#7a5612" },
                        ].map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => setStatus(item.id, s.key)}
                            style={{
                              border: res.status === s.key ? `1.5px solid ${s.color}` : "1px solid rgba(57,41,42,0.22)",
                              backgroundColor: res.status === s.key ? `${s.color}15` : "#ffffff",
                              color: res.status === s.key ? s.color : "#39292a",
                              fontWeight: res.status === s.key ? 600 : 400,
                              borderRadius: "4px",
                              padding: "5px 12px",
                              fontFamily: "'Lora', Georgia, serif",
                              fontSize: "12.5px",
                              cursor: "pointer",
                            }}
                          >
                            {s.label}
                          </button>
                        ))}

                        <input
                          type="text"
                          value={res.note || ""}
                          onChange={(e) => setNote(item.id, e.target.value)}
                          placeholder="Note / ticket link"
                          style={{
                            flex: "1 1 200px",
                            border: "1px solid rgba(57,41,42,0.2)",
                            borderRadius: "4px",
                            backgroundColor: "#ffffff",
                            padding: "6px 10px",
                            fontSize: "13px",
                            fontFamily: "'Lora', Georgia, serif",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: "36px", display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              border: "1px solid rgba(57,41,42,0.24)",
              background: "transparent",
              color: "rgba(57,41,42,0.74)",
              borderRadius: "4px",
              padding: "8px 16px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Clear all results
          </button>
        </div>
      </section>
    </div>
  );
}
