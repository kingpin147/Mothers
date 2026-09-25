"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { submitHostRequest } from "@/app/actions/host";

const FORMAT_OPTIONS = [
  { id: "walk", label: "Neighbourhood walk" },
  { id: "park_social", label: "Park social with prams" },
  { id: "hosted_coffee", label: "Hosted coffee & conversation" },
];

const NEIGHBOURHOODS = [
  "Gràcia",
  "Eixample Dret",
  "Eixample Esquerre",
  "Poblenou",
  "Sarrià - Sant Gervasi",
  "Sant Antoni",
  "El Born / Gòtic",
  "Les Corts",
  "Sants / Montjuïc",
  "Diagonal Mar",
];

const LANGUAGES = ["English", "Spanish (Español)", "Catalan (Català)", "French (Français)", "German (Deutsch)", "Italian (Italiano)"];

export function HostClient({
  eligibility,
  currentUser,
}: {
  eligibility: any;
  currentUser: any;
}) {
  const { language: lang } = useLanguage();

  const [format, setFormat] = useState("walk");
  const [neighbourhood, setNeighbourhood] = useState("Gràcia");
  const [preferredDays, setPreferredDays] = useState("Tuesday mornings, 10:00");
  const [selectedLangs, setSelectedLangs] = useState<string[]>(["English", "Spanish (Español)"]);
  const [reason, setReason] = useState("");
  const [charterAgreed, setCharterAgreed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const toggleLang = (l: string) => {
    if (selectedLangs.includes(l)) {
      if (selectedLangs.length > 1) {
        setSelectedLangs(selectedLangs.filter((x) => x !== l));
      }
    } else {
      setSelectedLangs([...selectedLangs, l]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setErrorMsg("Please log in before submitting your host application.");
      return;
    }

    if (!charterAgreed) {
      setErrorMsg("Please agree to the Host Charter to proceed.");
      return;
    }

    if (reason.trim().length < 15) {
      setErrorMsg("Please tell us a little more about why you'd like to host (minimum 15 characters).");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      await submitHostRequest({
        format,
        neighbourhood,
        preferredDays,
        languages: selectedLangs,
        reason,
        charterAgreed,
      });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      {/* Hero Section */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(38px, 5vw, 68px) clamp(20px, 5vw, 64px) clamp(30px, 4vw, 48px)",
          display: "flex",
          flexWrap: "wrap",
          gap: "clamp(30px, 4vw, 54px)",
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 420px", minWidth: "290px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#3b5e04",
              marginBottom: "14px",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ flex: "none" }}>
              <path d="m12 2 2.9 6.3 6.6.8-4.9 4.5 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9.1l6.6-.8Z" />
            </svg>
            <span>{lang === "en" ? "Become a host" : "Sé anfitriona"}</span>
          </div>

          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 400,
              fontSize: "clamp(32px, 4.6vw, 56px)",
              lineHeight: 1.06,
              margin: "0 0 18px",
            }}
          >
            {lang === "en" ? "Gather the mothers near you." : "Reúne a las madres cerca de ti."}
          </h1>

          <p style={{ fontSize: "17px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.76)", margin: "0 0 24px", maxWidth: "48ch" }}>
            {lang === "en" ? (
              <>
                Lead a walk, a park social or a coffee in your neighbourhood. We publish it, fill it and support you — and you earn{" "}
                <strong style={{ fontWeight: 600, color: "#39292a" }}>2 credits</strong> every time it runs.
              </>
            ) : (
              <>
                Lidera un paseo, un encuentro en el parque o un café en tu barrio. Nosotras lo publicamos, llenamos las plazas y te apoyamos — y ganas{" "}
                <strong style={{ fontWeight: 600, color: "#39292a" }}>2 créditos</strong> cada vez que se celebra.
              </>
            )}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            <a
              href="#host-form"
              style={{
                border: "1px solid #568b05",
                backgroundColor: "#568b05",
                color: "#ffffff",
                padding: "13px 24px",
                borderRadius: "4px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "15.5px",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {lang === "en" ? "Request to host" : "Quiero ser anfitriona"}
            </a>
            <a
              href="#host-conditions"
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "15px",
                color: "#3b5e04",
                textDecoration: "none",
              }}
            >
              {lang === "en" ? "See the conditions ↓" : "Ver condiciones ↓"}
            </a>
          </div>
        </div>

        {/* Hero Illustration Card */}
        <div style={{ flex: "1 1 340px", minWidth: "270px" }}>
          <div style={{ backgroundColor: "#ecdcd0", padding: "8px", borderRadius: "6px", boxShadow: "0 12px 32px rgba(45,43,43,0.12)" }}>
            <div
              style={{
                border: "1px solid rgba(57, 41, 42, 0.18)",
                borderRadius: "3px",
                height: "340px",
                backgroundColor: "rgba(123, 31, 44, 0.08)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                textAlign: "center",
              }}
            >
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "36px", color: "#7b1f2c", marginBottom: "8px" }}>
                ☕ 🌿
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 600, color: "#39292a", marginBottom: "6px" }}>
                Hosted by mothers, for mothers
              </div>
              <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: 0, maxWidth: "32ch" }}>
                Small, intimate groups in parks, cafés and promenades across Barcelona.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Steps Section */}
      <section
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "10px" }}>
          How it works
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.12, margin: "0 0 26px" }}>
          From request to your first gathering.
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "18px" }}>
          {[
            { step: "01", title: "Send a request", desc: "Tell us what you would like to host, where and when." },
            { step: "02", title: "A short call", desc: "Fifteen minutes with the team, and your host guide." },
            { step: "03", title: "Co-host first", desc: "Your first event runs alongside an experienced host." },
            { step: "04", title: "Host your own", desc: 'We publish it as "Hosted by you" and fill the places.' },
          ].map((item) => (
            <div key={item.step} style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "20px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", lineHeight: 1, color: "rgba(123,31,44,0.4)", marginBottom: "10px" }}>
                {item.step}
              </div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "18px", margin: "0 0 6px" }}>
                {item.title}
              </h3>
              <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.74)", margin: 0 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Conditions Section */}
      <section
        id="host-conditions"
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px)",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
        }}
      >
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "10px" }}>
          Conditions
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.12, margin: "0 0 10px" }}>
          Light, but real — to keep every room safe.
        </h2>
        <p style={{ fontSize: "15.5px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.74)", margin: "0 0 26px", maxWidth: "62ch" }}>
          Hosting is open to mothers who already know the club. These conditions protect the mothers who come, and you.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "20px" }}>
          {[
            {
              title: "Before you request",
              items: [
                "An account with verified email & phone",
                "Attended ≥2 events in the club",
                "No no-shows in the last 3 months",
              ],
            },
            {
              title: "When you host",
              items: [
                "Public places only (parks, cafés, walks)",
                "Welcome every mother warmly",
                "Follow the host charter & house rules",
                "Max 4 hosted events per month",
              ],
            },
            {
              title: "Credits & Rewards",
              items: [
                "+2 credits paid once the event has run",
                "Reward credits have 6-month validity",
                "Hosting status carries over into January 2027",
              ],
            },
          ].map((group, gIdx) => (
            <div key={gIdx} style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "24px" }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "20px", margin: "0 0 12px" }}>
                {group.title}
              </h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {group.items.map((it, iIdx) => (
                  <div key={iIdx} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid rgba(57,41,42,0.1)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#568b05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" style={{ flex: "none", marginTop: "3px" }}>
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                    <span style={{ fontSize: "14.5px", lineHeight: 1.55, color: "#39292a" }}>{it}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Host Application Form Section */}
      <section
        id="host-form"
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "clamp(30px, 4vw, 52px) clamp(20px, 5vw, 64px) 80px",
          borderTop: "1px solid rgba(57, 41, 42, 0.16)",
          display: "flex",
          flexWrap: "wrap",
          gap: "40px",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: "1 1 320px", minWidth: "270px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, fontSize: "clamp(26px, 3.4vw, 38px)", lineHeight: 1.12, margin: "0 0 14px" }}>
            Request to host.
          </h2>
          <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.76)", margin: "0 0 20px" }}>
            Tell us about the kind of gathering you want to lead. We review every request within 48 hours and set up a short intro call.
          </p>

          {/* Eligibility status badge */}
          {currentUser && (
            <div
              style={{
                border: "1px solid rgba(57,41,42,0.16)",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
                padding: "16px",
                fontSize: "13.5px",
                lineHeight: 1.55,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "4px" }}>Your Host Readiness:</div>
              <div>• Events attended: <strong>{eligibility.totalAttended || 0}</strong> (need ≥ 2)</div>
              <div>• No-shows (90d): <strong>{eligibility.totalNoShows || 0}</strong> (need 0)</div>
              <div style={{ marginTop: "8px", color: eligibility.eligible ? "#3b5e04" : "rgba(57,41,42,0.7)" }}>
                {eligibility.eligible
                  ? "✓ You meet all conditions to become a host."
                  : "You can submit your application now; it will be fully approved once your second gathering attendance is completed."}
              </div>
            </div>
          )}
        </div>

        {/* Form Container */}
        <div
          style={{
            flex: "1 1 500px",
            minWidth: "300px",
            backgroundColor: "#ffffff",
            border: "1px solid rgba(57, 41, 42, 0.18)",
            borderRadius: "8px",
            padding: "32px",
            boxShadow: "0 4px 16px rgba(57, 41, 42, 0.04)",
          }}
        >
          {submitted ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🌿</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", margin: "0 0 10px" }}>
                Request received.
              </h3>
              <p style={{ fontSize: "15px", lineHeight: 1.65, color: "rgba(57, 41, 42, 0.78)", margin: "0 0 24px" }}>
                Thank you! We have sent a confirmation to your email. We will review your gathering proposal and email you a calendar link for a quick 15-minute chat.
              </p>
              <Link
                href="/events"
                style={{
                  border: "1px solid #7b1f2c",
                  backgroundColor: "#7b1f2c",
                  color: "#fdf8f2",
                  padding: "10px 20px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Back to Events
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Format Picker */}
              <div>
                <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "8px" }}>
                  Gathering format
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {FORMAT_OPTIONS.map((opt) => (
                    <label
                      key={opt.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 14px",
                        border: format === opt.id ? "1px solid #568b05" : "1px solid rgba(57, 41, 42, 0.2)",
                        borderRadius: "6px",
                        backgroundColor: format === opt.id ? "rgba(86, 139, 5, 0.05)" : "#fdf8f2",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={opt.id}
                        checked={format === opt.id}
                        onChange={(e) => setFormat(e.target.value)}
                        style={{ accentColor: "#568b05" }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Neighbourhood */}
              <div>
                <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
                  Neighbourhood / Area
                </label>
                <select
                  value={neighbourhood}
                  onChange={(e) => setNeighbourhood(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    borderRadius: "4px",
                    backgroundColor: "#fdf8f2",
                    fontSize: "14.5px",
                    color: "#39292a",
                    fontFamily: "'Lora', Georgia, serif",
                    outline: "none",
                  }}
                >
                  {NEIGHBOURHOODS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Preferred Days / Time */}
              <div>
                <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
                  Preferred days & time
                </label>
                <input
                  type="text"
                  required
                  value={preferredDays}
                  onChange={(e) => setPreferredDays(e.target.value)}
                  placeholder="e.g. Wednesday mornings 10:00 - 11:30"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    borderRadius: "4px",
                    backgroundColor: "#fdf8f2",
                    fontSize: "14.5px",
                    color: "#39292a",
                    fontFamily: "'Lora', Georgia, serif",
                  }}
                />
              </div>

              {/* Languages */}
              <div>
                <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "8px" }}>
                  Languages you speak
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {LANGUAGES.map((l) => {
                    const sel = selectedLangs.includes(l);
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => toggleLang(l)}
                        style={{
                          border: sel ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.2)",
                          backgroundColor: sel ? "rgba(123, 31, 44, 0.08)" : "#fdf8f2",
                          color: sel ? "#7b1f2c" : "#39292a",
                          borderRadius: "14px",
                          padding: "5px 12px",
                          fontFamily: "'Lora', Georgia, serif",
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Why you want to host */}
              <div>
                <label style={{ display: "block", fontSize: "13.5px", fontWeight: 600, marginBottom: "6px" }}>
                  Why would you like to host?
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us a little about yourself and the atmosphere you want to create..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    borderRadius: "4px",
                    backgroundColor: "#fdf8f2",
                    fontSize: "14.5px",
                    color: "#39292a",
                    fontFamily: "'Lora', Georgia, serif",
                  }}
                />
              </div>

              {/* Charter agreement checkbox */}
              <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  required
                  checked={charterAgreed}
                  onChange={(e) => setCharterAgreed(e.target.checked)}
                  style={{ marginTop: "3px", accentColor: "#568b05" }}
                />
                <span style={{ fontSize: "13px", lineHeight: 1.55, color: "rgba(57, 41, 42, 0.8)" }}>
                  I agree to the <strong>Host Charter</strong>: welcoming every mother warmly, meeting in public places, no selling, and fostering a kind, supportive circle.
                </span>
              </label>

              {errorMsg && (
                <div style={{ color: "#993842", fontSize: "13.5px" }}>{errorMsg}</div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "13px 24px",
                  backgroundColor: "#568b05",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "16px",
                  cursor: submitting ? "wait" : "pointer",
                }}
              >
                {submitting ? "Sending request..." : "Submit host application"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
