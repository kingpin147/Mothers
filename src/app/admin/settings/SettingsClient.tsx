"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  saveClubSettingsAudit,
  setMembershipLiveMode,
  setPriceDisplayMode,
} from "@/app/actions/adminSettings";
import { BackArrow } from "@/components/Icons";

const WINE = "#7b1f2c";
const AMBER = "#a8752c";
const GREEN = "#3f6604";

/* Which public pages quote each figure — shown in the review step so nobody
   changes a price without seeing what has to be rewritten. */
const QUOTED_PAGES: Record<string, [string, string]> = {
  joiningFee: ["Joining fee (€)", "Membership, Payment, FAQ, Legal §02"],
  monthlyFee: ["Membership · monthly (€)", "Home, Membership, Payment, FAQ, Legal §02"],
  quarterlyFee: ["Membership · quarterly (€)", "Membership, Payment, FAQ, Legal §02"],
  nonMemberWalkCredits: ["Non-member price for a free walk (credits)", "Events, FAQ"],
  nonMemberMarkup: ["Non-member mark-up (default)", "Events"],
  monthlyCredits: ["Monthly grant", "Membership, Account, FAQ"],
  quarterlyCredits: ["Quarterly grant", "Membership, Account"],
  creditExpiryMonths: ["Credit life (months)", "Account, FAQ, Legal §03"],
  rolloverCeiling: ["Rollover ceiling", "FAQ, Legal §03"],
  topUpCreditPrice: ["Top-up price (€ per credit)", "Account, FAQ"],
  releaseDeadlineHours: ["Release deadline (hours before)", "Events, FAQ, Legal §05"],
  godmotherBonusReferrer: ["Godmother bonus (credits)", "Godmother, Membership, FAQ"],
  pauseAllowanceMonths: ["Pause allowance (months per year)", "FAQ, Account, Legal §07"],
  pinnedCircleTag: ["Pinned tag", "Circle"],
  blockedCircleTags: ["Blocked tags", "Circle"],
};

interface SettingsClientProps {
  initialSettings: any;
}

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
  // Config state
  const [cfg, setCfg] = useState<Record<string, any>>({
    membershipLive: initialSettings.membershipLive ?? false,
    expectedLaunch: initialSettings.expectedLaunch ?? "2027-01-06",
    priceDisplay: initialSettings.priceDisplay ?? "single",

    joiningFee: Math.round((initialSettings.joiningFeeCents ?? 1900) / 100),
    monthlyFee: Math.round((initialSettings.monthlyFeeCents ?? 3900) / 100),
    quarterlyFee: Math.round((initialSettings.quarterlyFeeCents ?? 9900) / 100),

    nonMemberWalkCredits: initialSettings.nonMemberWalkCredits ?? 3,
    nonMemberMarkup: initialSettings.nonMemberMarkup ?? 1.5,

    monthlyCredits: initialSettings.monthlyGrantCredits ?? 20,
    quarterlyCredits: initialSettings.quarterlyGrantCredits ?? 60,
    creditExpiryMonths: initialSettings.creditLifeMonths ?? 6,
    rolloverCeiling: initialSettings.rolloverCapCredits ?? null,
    topUpCreditPrice: Math.round((initialSettings.topUpPriceCents ?? 100) / 100),
    releaseDeadlineHours: initialSettings.releaseDeadlineHours ?? 48,

    godmotherBonusReferrer: initialSettings.referralBonusCredits ?? 5,
    pauseAllowanceMonths: initialSettings.pauseAllowanceMonths ?? 2,
    pinnedCircleTag: initialSettings.pinnedCircleTag ?? "",
    blockedCircleTags: initialSettings.blockedCircleTags ?? "",

    scheduleMembersFrom: initialSettings.scheduleMembersFrom ?? 28,
    scheduleEarlyWarning: initialSettings.scheduleEarlyWarning ?? 10,
    scheduleDecisionPoint: initialSettings.scheduleDecisionPoint ?? 7,
  });

  const [snapshot, setSnapshot] = useState<Record<string, any>>({
    ...cfg,
  });

  // Modal / status states
  const [liveAsk, setLiveAsk] = useState(false);
  const [liveDual, setLiveDual] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [flash, setFlash] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find changed keys compared to snapshot
  const changedKeys = Object.keys(QUOTED_PAGES).filter((k) => {
    return String(cfg[k] ?? "") !== String(snapshot[k] ?? "");
  });

  const handleFieldChange = (key: string, val: any) => {
    setCfg((prev) => ({ ...prev, [key]: val }));
  };

  const handleDiscard = () => {
    const keys = changedKeys;
    if (keys.length === 0) return;
    setCfg({ ...snapshot });
    setReviewOpen(false);
    setFlash(
      `${keys.length} ${keys.length === 1 ? "figure was" : "figures were"} put back to what the store held when you opened this page.`
    );
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    const keys = changedKeys;
    const pages = keys.map((k) => QUOTED_PAGES[k][1]).join("; ");
    const patch: Record<string, any> = {};
    keys.forEach((k) => {
      patch[k] = cfg[k];
    });

    const res = await saveClubSettingsAudit(patch, {
      summary: `${keys.length} figure(s) published`,
      flaggedPages: pages,
    });

    setIsSubmitting(false);
    if (res.success) {
      setSnapshot({ ...cfg });
      setReviewOpen(false);
      setFlash(
        `${keys.length} ${keys.length === 1 ? "figure is" : "figures are"} live. The pages that quote them are flagged for rewriting.`
      );
    } else {
      alert("Failed to save settings.");
    }
  };

  const handleToggleLiveMode = async () => {
    setIsSubmitting(true);
    const targetLive = !cfg.membershipLive;
    const res = await setMembershipLiveMode(targetLive, targetLive && liveDual);
    setIsSubmitting(false);
    if (res.success) {
      setCfg((prev) => ({
        ...prev,
        membershipLive: targetLive,
        priceDisplay: targetLive && liveDual ? "dual" : targetLive ? prev.priceDisplay : "single",
      }));
      setSnapshot((prev) => ({
        ...prev,
        membershipLive: targetLive,
        priceDisplay: targetLive && liveDual ? "dual" : targetLive ? prev.priceDisplay : "single",
      }));
      setLiveAsk(false);
      setFlash(
        targetLive
          ? "Membership plan is now LIVE. Dual pricing and subscriptions enabled."
          : "Membership switched to Pre-launch mode."
      );
    } else {
      alert("Failed to update membership status.");
    }
  };

  const handleSetPriceMode = async (mode: "single" | "dual") => {
    const res = await setPriceDisplayMode(mode);
    if (res.success) {
      setCfg((prev) => ({ ...prev, priceDisplay: mode }));
      setSnapshot((prev) => ({ ...prev, priceDisplay: mode }));
    }
  };

  const isLive = cfg.membershipLive;
  const launchDate = new Date(cfg.expectedLaunch + "T00:00:00");
  const isPassed = !isLive && Date.now() >= launchDate.getTime();
  const launchMonthYear = isNaN(launchDate.getTime())
    ? cfg.expectedLaunch
    : launchDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const fmtVal = (v: any) => (v === null || v === undefined || v === "" ? "No ceiling" : String(v));

  return (
    <div style={{ minHeight: "100vh", background: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", WebkitFontSmoothing: "antialiased" }}>
      {/* Top Banner */}
      <div style={{ background: "#39292a", color: "#f8efe2" }}>
        <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "10px clamp(18px,4vw,34px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px 20px", flexWrap: "wrap", fontSize: "13px", lineHeight: 1.5 }}>
          <span>
            <strong style={{ fontWeight: 600, color: "#c9a227", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "11.5px" }}>
              {isLive ? "Live Membership Mode" : "Pre-membership mode"}
            </strong>{" "}
            · {isLive ? "Subscriptions and member/non-member rates active across the site." : "Until you activate membership in Settings. Subscriptions and joining fees are built and kept ready, but stay dormant until launch. Non-members book with credits at the non-member price."}
          </span>
          <Link
            href="/admin/pre-launch"
            style={{ color: "#f8efe2", border: "1px solid rgba(248,239,226,0.5)", borderRadius: "4px", padding: "5px 12px", whiteSpace: "nowrap", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", textDecoration: "none" }}
          >
            Pre-launch desk →
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "clamp(24px,3.4vw,36px) clamp(18px,3vw,30px) 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "22px" }}>
          <div style={{ flex: "1 1 400px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: WINE, marginBottom: "9px" }}>
              <Link href="/admin" style={{ color: WINE, textDecoration: "none" }}>← Dashboard</Link> · Configuration
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px,4vw,42px)", lineHeight: 1.1, margin: "0 0 9px" }}>
              Club &amp; credit policy
            </h1>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "70ch" }}>
              Every number the public pages quote lives here, once. Change one and each page that mentions it is flagged for rewriting — nothing is written in two places.
            </p>
          </div>
          <Link
            href="/admin"
            style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap", textDecoration: "none" }}
          >
            ← Dashboard
          </Link>
        </div>

        {/* 1. Membership Plan Switch Card */}
        <div style={{ border: `1px solid ${isLive ? "rgba(86,139,5,0.5)" : "rgba(123,31,44,0.45)"}`, borderRadius: "8px", background: "#fffdfa", padding: "clamp(20px,2.6vw,26px)", marginBottom: "18px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 24px", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ flex: "1 1 380px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", lineHeight: 1.2, margin: "0 0 5px", color: WINE }}>
                Membership plan
              </h2>
              <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "66ch" }}>
                {isLive
                  ? "Membership is live. Mothers can subscribe from My Account; members-first dates and member prices apply."
                  : "You switch membership on when you are ready — nothing happens automatically on a date. Until then the site runs pre-launch: one price, no applications, countdown banner."}
              </p>
            </div>
            <span style={{ border: `1px solid ${isLive ? GREEN : AMBER}`, color: isLive ? GREEN : AMBER, borderRadius: "4px", padding: "6px 12px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              {isLive ? "Live" : "Off · pre-launch"}
            </span>
          </div>

          <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "10px 18px", alignItems: "center" }}>
            <label style={{ fontSize: "13.5px", color: "#39292a", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              Expected launch
              <input
                type="date"
                value={cfg.expectedLaunch}
                onChange={(e) => handleFieldChange("expectedLaunch", e.target.value)}
                style={{ border: "1px solid rgba(57,41,42,0.24)", borderRadius: "4px", background: "#ffffff", padding: "8px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a" }}
              />
            </label>
            <span style={{ fontSize: "12.5px", lineHeight: 1.5, color: isPassed ? "#993842" : "rgba(57,41,42,0.7)", flex: "1 1 260px" }}>
              {isLive
                ? "Membership is live — the countdown and launch copy are hidden."
                : isPassed
                ? 'This date has passed. The site now hides the countdown and says "Membership opens soon" until you set a new date or switch membership on.'
                : `The countdown runs to this date and the site says "${launchMonthYear}". It is an announcement only — membership opens when you switch it on.`}
            </span>
          </div>

          {!liveAsk ? (
            <button
              type="button"
              onClick={() => setLiveAsk(true)}
              style={{
                marginTop: "16px",
                border: isLive ? "1px solid rgba(57,41,42,0.3)" : `1px solid ${WINE}`,
                background: isLive ? "transparent" : WINE,
                color: isLive ? "#39292a" : "#ffffff",
                borderRadius: "4px",
                padding: "11px 20px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              {isLive ? "Switch membership off" : "Activate the membership plan"}
            </button>
          ) : (
            <div style={{ marginTop: "16px", border: "1px solid rgba(57,41,42,0.18)", borderRadius: "6px", background: "#fff", padding: "14px 16px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px", marginBottom: "8px" }}>
                {isLive ? "Back to pre-launch?" : "Activate membership now?"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
                {(isLive
                  ? ["Subscriptions close", "Members-first dates stop applying", "Existing members keep their membership"]
                  : [
                      "Subscriptions and joining fees switch on",
                      "Accounts opened before launch keep the joining fee waived permanently",
                      "Members-first dates on events start applying",
                      "The countdown banner disappears from the site",
                      "Admin leaves pre-launch mode (Dashboard shows full membership statistics)",
                    ]
                ).map((x, idx) => (
                  <div key={idx} style={{ fontSize: "13.5px", lineHeight: 1.55 }}>· {x}</div>
                ))}
              </div>
              {!isLive && (
                <label style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "13.5px", marginBottom: "12px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={liveDual}
                    onChange={(e) => setLiveDual(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: WINE }}
                  />
                  Also switch Price display to “Member &amp; non-member prices”
                </label>
              )}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setLiveAsk(false)}
                  style={{ border: "1px solid rgba(57,41,42,0.28)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={handleToggleLiveMode}
                  disabled={isSubmitting}
                  style={{ border: `1px solid ${WINE}`, background: WINE, color: "#ffffff", borderRadius: "4px", padding: "9px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
                >
                  {isSubmitting ? "Updating..." : isLive ? "Switch off" : "Activate membership"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. Price display on the site */}
        <div style={{ border: "1px solid rgba(123,31,44,0.45)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(20px,2.6vw,26px)", marginBottom: "18px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", lineHeight: 1.2, margin: "0 0 5px", color: WINE }}>
            Price display on the site
          </h2>
          <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 16px", maxWidth: "74ch" }}>
            Every event has a member price and a non-member price. Choose what the site shows. Each event can override this in Create event.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {[
              {
                key: "single",
                label: "One price for everyone",
                note: "Before launch, everyone pays the non-member price; one figure on every card.",
                example: "4 credits",
              },
              {
                key: "dual",
                label: "Member & non-member prices",
                note: "From launch. Both prices on every card; each mother pays her own.",
                example: "Members 4 credits · Non-members 6 credits",
              },
            ].map((o) => {
              const isSelected = cfg.priceDisplay === o.key;
              return (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => handleSetPriceMode(o.key as any)}
                  style={{
                    flex: "1 1 260px",
                    border: `1px solid ${isSelected ? WINE : "rgba(57,41,42,0.2)"}`,
                    background: isSelected ? "rgba(123,31,44,0.05)" : "#fff",
                    color: "#39292a",
                    borderRadius: "6px",
                    padding: "14px 16px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <strong style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px", color: isSelected ? WINE : "#39292a", marginBottom: "4px" }}>
                    {o.label} {isSelected ? "· on" : ""}
                  </strong>
                  <span style={{ display: "block", color: "rgba(57,41,42,0.72)", lineHeight: 1.5 }}>{o.note}</span>
                  <span style={{ display: "block", marginTop: "8px", fontSize: "12.5px", color: "rgba(57,41,42,0.6)" }}>Card: {o.example}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Settings Sections */}
        {[
          {
            title: "Rates and fees",
            intro: "What a membership costs. Existing members keep the rate they joined on — changing a figure here only affects who joins next.",
            fields: [
              { key: "joiningFee", label: "Joining fee (€)", help: "One-off, charged with the first payment. Waived for accounts opened before launch.", parse: (v: string) => parseInt(v, 10) || 0 },
              { key: "monthlyFee", label: "Membership · monthly (€)", help: "The one membership rate. Quoted on Membership, Payment, the FAQ and Legal.", parse: (v: string) => parseInt(v, 10) || 0 },
              { key: "quarterlyFee", label: "Membership · quarterly (€)", help: "The same membership paid three months at a time.", parse: (v: string) => parseInt(v, 10) || 0 },
            ],
          },
          {
            title: "Non-member pricing",
            intro: "There is no Event Pass: once membership opens mothers without membership book the same events with credits, at the non-member price.",
            fields: [
              { key: "nonMemberWalkCredits", label: "Non-member price for a free walk (credits)", help: "Pre-filled as the non-member price when an event is free for members.", parse: (v: string) => parseInt(v, 10) || 0 },
              { key: "nonMemberMarkup", label: "Non-member mark-up (default)", help: "Pre-fills the non-member price from the member price on a new event. Always editable per event.", parse: (v: string) => parseFloat(v) || 1.5, suffix: "×" },
            ],
          },
          {
            title: "Credits",
            intro: "Credits are money in all but name. Nothing here rewrites credits already granted — they keep the expiry they arrived with.",
            fields: [
              { key: "monthlyCredits", label: "Monthly grant", help: "Monthly plan: deposited on each successful renewal.", parse: (v: string) => parseInt(v, 10) || 0 },
              { key: "quarterlyCredits", label: "Quarterly grant", help: "Quarterly plan: deposited on each successful renewal (every 3 months).", parse: (v: string) => parseInt(v, 10) || 0 },
              { key: "creditExpiryMonths", label: "Credit life (months)", help: "From the day each credit arrives. Oldest are always spent first.", parse: (v: string) => parseInt(v, 10) || 0 },
              { key: "rolloverCeiling", label: "Rollover ceiling", help: "Leave as “No ceiling” and credits accumulate for as long as they live. A number here destroys credits a member has already paid for.", parse: (v: string) => { const n = parseInt(v, 10); return isNaN(n) ? null : n; } },
              { key: "expiryWarningDays", label: "Expiry warning (days before)", valueFixed: "30", help: "She is told a month before anything expires." },
              { key: "topUpCreditPrice", label: "Top-up price (€ per credit)", help: "Bought credits behave like any other.", parse: (v: string) => parseInt(v, 10) || 0 },
              { key: "releaseDeadlineHours", label: "Release deadline (hours before)", help: "Release a booking with more than this to go and the credits come back.", quoted: true, parse: (v: string) => parseInt(v, 10) || 0 },
            ],
          },
          {
            title: "Godmother",
            intro: "Every member is a Godmother automatically, with a code derived from her name. There is no application and no approval.",
            fields: [
              { key: "godmotherBonusReferrer", label: "Godmother bonus (credits)", help: "To the Godmother when the mother she referred becomes a member.", parse: (v: string) => parseInt(v, 10) || 0 },
              { key: "referralsPerGodmother", label: "Referrals per Godmother", valueFixed: "No limit", help: "Any mother with an account can refer as many mothers as she likes; each one who becomes a member earns her the bonus." },
              { key: "bonusLife", label: "Bonus credit life (months)", valueFixed: "6", help: "The same life as any other credit." },
            ],
          },
          {
            title: "Membership behaviour",
            intro: "Pausing and cancelling. Quoted in the FAQ and in My Account.",
            fields: [
              { key: "pauseAllowanceMonths", label: "Pause allowance (months per year)", help: "No payment and no new credits while paused; credits keep their expiry dates.", quoted: true, parse: (v: string) => parseInt(v, 10) || 0 },
            ],
          },
          {
            title: "The Circle",
            intro: "Control what appears in 'Talked about this week'.",
            fields: [
              { key: "pinnedCircleTag", label: "Pinned tag (slug)", help: "Example: 'health', 'toddlers'. Leaves room for 5 organic tags." },
              { key: "blockedCircleTags", label: "Blocked tags (comma separated)", help: "Example: 'marketplace, admin'. These will never appear in trending." },
            ],
          },
        ].map((sec, sIdx) => (
          <div key={sIdx} style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(20px,2.6vw,26px)", marginBottom: "18px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", lineHeight: 1.2, margin: "0 0 5px", color: WINE }}>
              {sec.title}
            </h2>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 18px", maxWidth: "76ch" }}>
              {sec.intro}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: "18px" }}>
              {sec.fields.map((f: any, fIdx) => {
                const val = f.valueFixed !== undefined ? f.valueFixed : cfg[f.key] === null ? "No ceiling" : cfg[f.key];
                const isQuoted = f.quoted || !!QUOTED_PAGES[f.key];
                return (
                  <div key={fIdx}>
                    <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>
                      {f.label}
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                      {f.valueFixed ? (
                        <input
                          type="text"
                          defaultValue={val}
                          readOnly
                          style={{ flex: "1 1 auto", minWidth: 0, boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "rgba(57,41,42,0.04)" }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={val ?? ""}
                          onChange={(e) => handleFieldChange(f.key, f.parse(e.target.value))}
                          style={{ flex: "1 1 auto", minWidth: 0, boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }}
                        />
                      )}
                      {isQuoted && (
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#8a6220", border: "1px solid rgba(168,117,44,0.55)", borderRadius: "3px", padding: "4px 8px", whiteSpace: "nowrap" }}>
                          Quoted publicly
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", lineHeight: 1.55, color: "rgba(57,41,42,0.62)", marginTop: "6px" }}>
                      {f.help}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* 4. The Event Schedule Defaults */}
        <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(20px,2.6vw,26px)", marginBottom: "18px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", lineHeight: 1.2, margin: "0 0 5px", color: WINE }}>
            The event schedule
          </h2>
          <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 18px", maxWidth: "76ch" }}>
            Defaults for a new event. Each one can be overridden on the event itself when a partner will only hold a room until a different date.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,150px),1fr))", gap: "12px" }}>
            {[
              { label: "Booking opens", val: `T-${cfg.scheduleMembersFrom}`, note: "Announced in the chosen threads. Per-event members-first date applied on top." },
              { label: "Early warning", val: `T-${cfg.scheduleEarlyWarning}`, note: "Flagged if under half the minimum" },
              { label: "Decision point", val: `T-${cfg.scheduleDecisionPoint}`, note: "Confirm or cancel by this date" },
            ].map((t, tIdx) => (
              <div key={tIdx} style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "5px", padding: "12px 14px", background: "#fff" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", marginBottom: "6px" }}>
                  {t.label}
                </div>
                <input
                  type="text"
                  defaultValue={t.val}
                  readOnly
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "4px", padding: "8px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px", background: "#fff" }}
                />
                <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>
                  {t.note}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Save & Review Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", borderTop: "1px solid rgba(57,41,42,0.16)", paddingTop: "18px", marginBottom: "26px" }}>
          <div style={{ maxWidth: "52ch" }}>
            <div style={{ fontSize: "12.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.68)" }}>
              Saving shows you which pages and FAQ answers quote each changed figure, before anything goes live.
            </div>
            {flash && (
              <div style={{ fontSize: "12.5px", lineHeight: 1.6, color: WINE, marginTop: "6px", fontWeight: 500 }}>
                {flash}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={changedKeys.length === 0}
              style={{
                border: "1px solid rgba(57,41,42,0.3)",
                background: "transparent",
                color: "#39292a",
                borderRadius: "4px",
                padding: "11px 18px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "14px",
                cursor: changedKeys.length === 0 ? "not-allowed" : "pointer",
                opacity: changedKeys.length === 0 ? 0.45 : 1,
              }}
            >
              Discard changes
            </button>
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              disabled={changedKeys.length === 0}
              style={{
                border: `1px solid ${WINE}`,
                background: "transparent",
                color: WINE,
                borderRadius: "4px",
                padding: "11px 20px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "14px",
                cursor: changedKeys.length === 0 ? "not-allowed" : "pointer",
                opacity: changedKeys.length === 0 ? 0.45 : 1,
              }}
            >
              Review and save →
            </button>
          </div>
        </div>

        {/* 6. Informational comparison cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: "16px" }}>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>
              What changed from the current page
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
              <div><strong style={{ fontWeight: 600 }}>Joining fee read €58.</strong> It is €19. The helper text under it even said €19 while the field said 58 — the field is what charges the card.</div>
              <div><strong style={{ fontWeight: 600 }}>A rollover cap of 40 existed at all.</strong> We agreed credits have no ceiling; a cap silently destroys credits a member has paid for.</div>
              <div><strong style={{ fontWeight: 600 }}>Godmother bonus read 20 credits.</strong> It is one figure: 5 credits when the mother she referred becomes a member.</div>
              <div><strong style={{ fontWeight: 600 }}>Credit expiry was missing entirely</strong> — six months is the rule the whole ledger runs on.</div>
              <div><strong style={{ fontWeight: 600 }}>The quarterly rate, the pause allowance and the payment hold were missing.</strong> The Event Pass is retired — non-members pay a non-member credit price per event.</div>
              <div><strong style={{ fontWeight: 600 }}>Save was one filled button with no confirmation.</strong> These figures are quoted on live pages; saving now goes through a review step.</div>
            </div>
          </div>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>
              Rules this page holds
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
              <div>A figure marked <em>quoted publicly</em> appears in copy on the site. Changing it flags every page and FAQ answer that mentions it, and the change is not live until those are settled.</div>
              <div>A change never rewrites the past. Existing members keep the rate they joined on; credits keep the expiry they were granted with.</div>
              <div>No Event Pass. Members and non-members book the same events; only the credit price differs.</div>
              <div>There is one membership rate. The joining fee is waived for accounts opened before launch.</div>
              <div>Only the Owner can save this page, and every change is written to the audit log with the previous value.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(32,31,29,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", zIndex: 60 }}>
          <div role="dialog" aria-modal="true" aria-label="Review changes" style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "8px", maxWidth: "620px", width: "100%", maxHeight: "86vh", overflow: "auto", padding: "clamp(20px,2.6vw,28px)", boxShadow: "0 18px 48px rgba(32,31,29,0.22)" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: WINE, marginBottom: "8px" }}>
              Before this goes live
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "26px", lineHeight: 1.15, margin: "0 0 8px" }}>
              {changedKeys.length === 1 ? "One figure is about to change" : `${changedKeys.length} figures are about to change`}
            </h2>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 16px", maxWidth: "60ch" }}>
              Each figure below is quoted in copy on the pages named. Saving writes the change to the audit log with its previous value and flags those pages for rewriting.
            </p>
            {changedKeys.map((k) => (
              <div key={k} style={{ borderTop: "1px solid rgba(57,41,42,0.14)", padding: "11px 0" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px" }}>
                    {QUOTED_PAGES[k][0]}
                  </span>
                  <span style={{ fontSize: "14px", fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ color: "rgba(57,41,42,0.5)", textDecoration: "line-through" }}>
                      {fmtVal(snapshot[k])}
                    </span>{" "}
                    <span style={{ color: "rgba(57,41,42,0.4)" }}>→</span>{" "}
                    <strong style={{ fontWeight: 600, color: WINE }}>
                      {fmtVal(cfg[k])}
                    </strong>
                  </span>
                </div>
                <div style={{ fontSize: "12px", lineHeight: 1.55, color: "rgba(57,41,42,0.62)", marginTop: "4px" }}>
                  Quoted on {QUOTED_PAGES[k][1]}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end", borderTop: "1px solid rgba(57,41,42,0.14)", paddingTop: "16px", marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "10px 17px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSubmitting}
                style={{ border: `1px solid ${WINE}`, background: "transparent", color: WINE, borderRadius: "4px", padding: "10px 19px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
              >
                {isSubmitting ? "Saving..." : changedKeys.length === 1 ? "Save it and flag the pages" : "Save them and flag the pages"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
