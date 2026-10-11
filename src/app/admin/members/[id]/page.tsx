"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  getAdminMemberDetail,
  contactMember,
  pauseMember,
  resumeMember,
  cancelMember,
  adjustMemberCredits,
  toggleSuspendAccount,
  adminDeleteAccountGDPR,
} from "@/app/actions/adminCms";
import { BackArrow } from "@/components/Icons";

const WINE = "#7b1f2c";
const AMBER = "#a8752c";
const GREEN = "#3f6604";
const GREY = "rgba(57,41,42,0.55)";

export default function MemberRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // UI States
  const [writeOpen, setWriteOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");

  const [statusOpen, setStatusOpen] = useState<"pause" | "cancel" | null>(null);
  const [statusReason, setStatusReason] = useState("");

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<number | "">("");
  const [adjustReason, setAdjustReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadData = async () => {
    const res = await getAdminMemberDetail(resolvedParams.id);
    if (res.success && res.member) {
      setData(res);
      setDraftMessage(
        `${res.member.firstName} — no rush at all about the payment, it can wait. I noticed you have not been to anything since June and I wanted to check you are alright. If now is not the moment, we can pause your membership and everything waits for you. Belén`
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [resolvedParams.id]);

  const handleAdjust = async () => {
    if (!adjustReason.trim() || adjustAmount === "") {
      alert("A reason and amount are required.");
      return;
    }
    setIsSubmitting(true);
    const res = await adjustMemberCredits({
      memberId: resolvedParams.id,
      amount: Number(adjustAmount),
      reason: adjustReason,
    });
    setIsSubmitting(false);
    if (res.success) {
      setAdjustOpen(false);
      setAdjustAmount("");
      setAdjustReason("");
      loadData();
    } else {
      alert(res.error || "Failed to adjust credits");
    }
  };

  const handleContact = async () => {
    if (!draftMessage.trim()) return;
    setIsSubmitting(true);
    const res = await contactMember(resolvedParams.id, draftMessage);
    setIsSubmitting(false);
    if (res.success) {
      setWriteOpen(false);
      loadData();
    } else {
      alert(res.error || "Failed to send message.");
    }
  };

  const handleStatusChange = async () => {
    if (!statusReason.trim()) {
      alert("A reason is required.");
      return;
    }
    setIsSubmitting(true);
    let res;
    if (statusOpen === "pause") {
      res = await pauseMember(resolvedParams.id, statusReason);
    } else {
      res = await cancelMember(resolvedParams.id, statusReason);
    }
    setIsSubmitting(false);
    if (res?.success) {
      setStatusOpen(null);
      setStatusReason("");
      loadData();
    } else {
      alert(res?.error || "Failed to update status.");
    }
  };

  const handleResume = async () => {
    if (!confirm(`Resume ${data?.member?.firstName}'s membership immediately?`)) return;
    setIsSubmitting(true);
    const res = await resumeMember(resolvedParams.id, "Admin resumed membership");
    setIsSubmitting(false);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || "Failed to resume membership.");
    }
  };

  const handleSuspendToggle = async () => {
    const isCurrentlySuspended = !!data?.member?.isSuspended;
    const reasonPrompt = !isCurrentlySuspended ? prompt("Reason for suspension:") : "";
    if (!isCurrentlySuspended && reasonPrompt === null) return;
    setIsSubmitting(true);
    await toggleSuspendAccount(data.member.personId || data.member.id, !isCurrentlySuspended, reasonPrompt || undefined);
    setIsSubmitting(false);
    loadData();
  };

  const handleDeleteAccount = async () => {
    setIsSubmitting(true);
    await adminDeleteAccountGDPR(data.member.personId || data.member.id);
    setIsSubmitting(false);
    alert("Account permanently deleted and personal data erased.");
    window.location.href = "/admin/members";
  };

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#f8efe2", padding: "40px", textAlign: "center", color: GREY }}>Loading record...</div>;
  }

  if (!data || !data.member) {
    return <div style={{ minHeight: "100vh", background: "#f8efe2", padding: "40px", textAlign: "center", color: GREY }}>Record not found.</div>;
  }

  const { member, ledgerEntries, totalBalance, godmotherStats, attendance, contactHistory, hostRequests, referredByName, earliestExpiry } = data;

  // Determine whether this account has an active paid membership subscription or is a pre-launch/standard account
  const isPaidMember = (member.status === "active" || member.status === "paused" || member.status === "past_due" || member.status === "cancelled_at_period_end") && Boolean(member.stripeSubscriptionId);

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: "Active", color: GREEN },
    paused: { label: "Paused", color: AMBER },
    cancelled_at_period_end: { label: "Ending", color: WINE },
    past_due: { label: "Past due", color: WINE },
    lapsed: { label: "Lapsed", color: WINE },
    banned: { label: "Banned", color: WINE },
    applicant: { label: "Applicant", color: GREY },
  };
  const currentStatusConfig = STATUS_CONFIG[member.status] || { label: member.status, color: GREY };

  // Calculate attendance statistics
  const nowMs = Date.now();
  const pastEvents = (attendance || []).filter((b: any) => b.status !== "cancelled" && b.status !== "released" && new Date(b.eventStartsAt).getTime() < nowMs);
  const upcomingEvents = (attendance || []).filter((b: any) => b.status !== "cancelled" && b.status !== "released" && new Date(b.eventStartsAt).getTime() >= nowMs);
  const noShowsCount = (attendance || []).filter((b: any) => b.noShow || b.status === "no_show").length;
  const attendedCount = pastEvents.filter((b: any) => !b.noShow && b.status !== "no_show").length;

  const canHost = attendedCount >= 2 && noShowsCount === 0;

  const profile = member.profileData || {};
  const hasProfile = Boolean(
    (profile.stages && profile.stages.length) ||
    profile.neighbourhood ||
    (profile.hoping && profile.hoping.length) ||
    (profile.free && profile.free.length) ||
    profile.heard ||
    profile.social ||
    profile.why
  );

  const formatCredits = (entries: any[]) => {
    return (entries || []).map(e => ({
      what: e.reason || e.type,
      when: new Date(e.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      amount: e.amount > 0 ? `+${e.amount}` : `${e.amount}`,
      color: e.amount > 0 ? GREEN : WINE
    }));
  };

  const formatAttendance = (bookings: any[]) => {
    return (bookings || []).map(b => {
      let color = GREY;
      let state = "Booked";
      const d = new Date(b.eventStartsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      const isPast = new Date(b.eventStartsAt).getTime() < Date.now();
      const creditNote = (b.creditsCharged !== null && b.creditsCharged !== undefined)
        ? `${b.creditsCharged} credits`
        : "0 credits";
      if (b.status === 'attended') {
        state = 'Attended';
        color = GREEN;
      } else if (b.status === 'released') {
        state = 'Released';
        color = AMBER;
      } else if (b.status === 'no_show' || b.noShow) {
        state = 'No-show';
        color = WINE;
      } else if (b.status === 'cancelled') {
        state = 'Cancelled';
        color = GREY;
      } else if (isPast) {
        state = 'Attended';
        color = GREEN;
      } else {
        state = 'Upcoming';
        color = '#39292a';
      }
      return { title: b.eventTitle, date: d, state, creditNote, color };
    });
  };

  const formatContactHistory = (entries: any[]) => {
    return (entries || []).map(e => {
      const what = e.payload?.message ? `Note: "${e.payload.message}"` : (e.templateKey ? e.templateKey.replace(/_/g, ' ') : "Email sent");
      const dateVal = e.sentAt || e.createdAt;
      const when = dateVal 
        ? new Date(dateVal).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : "Recent";
      return { what, when, status: e.status };
    });
  };

  const statusTitle = statusOpen === 'pause' ? 'Pause her membership' : 'End her membership';
  const statusBody = statusOpen === 'pause'
    ? 'Nothing expires while she is paused and nothing new arrives. Two months a year — she has used ' + (member.pauseMonthsUsedYear || 0) + ' of 2. She is told, and she can lift it herself.'
    : 'She stays a member to the end of the period already paid for and keeps every booking made. Credits do not carry past the end. She can subscribe again from My Account at any time.';
  const statusConfirm = statusOpen === 'pause' ? 'Pause it' : 'End it';

  const dateRaw = member.createdAt || member.joinedAt;
  const dateFormatted = dateRaw && !isNaN(new Date(dateRaw).getTime())
    ? new Date(dateRaw).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'recently';

  return (
    <div style={{ minHeight: "100vh", background: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", WebkitFontSmoothing: "antialiased" }}>
      <style dangerouslySetInnerHTML={{__html: `
        a { color:#7b1f2c; text-decoration:none; }
        a:hover { color:#5d1620; text-decoration:underline; }
        button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline:2px solid #7b1f2c; outline-offset:2px; }
      `}} />

      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "clamp(24px,3.4vw,36px) clamp(18px,3vw,30px) 60px" }}>
        
        {/* Top Breadcrumb & Header */}
        <div style={{ marginBottom: "16px" }}>
          <Link href="/admin/members" style={{ fontSize: "13px", color: "#7b1f2c", textDecoration: "none" }}>
            ← All members &amp; accounts
          </Link>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px 24px", flexWrap: "wrap", marginBottom: "22px" }}>
          <div style={{ flex: "1 1 380px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "8px" }}>
              {isPaidMember ? "Member Record" : "Pre-launch account · no membership yet"}
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px, 4vw, 40px)", lineHeight: 1.1, margin: "0 0 6px" }}>
              {member.firstName} {member.lastName}
            </h1>
            <div style={{ fontSize: "14px", color: "rgba(57,41,42,0.72)" }}>
              {member.email} · {member.phone || "No phone"} · {isPaidMember ? `member since ${dateFormatted}` : `account since ${dateFormatted}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {isPaidMember ? (
              <span style={{ border: `1px solid ${currentStatusConfig.color}`, color: currentStatusConfig.color, borderRadius: "4px", padding: "6px 12px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {currentStatusConfig.label}
              </span>
            ) : (
              <span style={{ border: `1px solid ${member.isSuspended ? '#993842' : '#3b5e04'}`, color: member.isSuspended ? '#993842' : '#3b5e04', borderRadius: "4px", padding: "6px 12px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {member.isSuspended ? "Suspended" : "Account"}
              </span>
            )}
            <button type="button" onClick={() => setWriteOpen(!writeOpen)} style={{ border: "1px solid #7b1f2c", backgroundColor: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "8px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap", cursor: "pointer" }}>
              Write to her
            </button>
            <Link href={`/account/statement?m=${member.id}`} style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", borderRadius: "4px", padding: "8px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap", textDecoration: "none" }}>
              Her statement
            </Link>
          </div>
        </div>

        {/* Note if Suspended or No-Shows */}
        {member.isSuspended && (
          <div style={{ border: "1px solid rgba(153,56,66,0.45)", borderRadius: "6px", background: "rgba(153,56,66,0.05)", padding: "12px 16px", marginBottom: "18px", fontSize: "14px", lineHeight: 1.55, color: "#39292a" }}>
            Suspended for house rules — she can sign in and see her bookings, but cannot book or post. Credits and bookings are frozen, not refunded.
          </div>
        )}

        {noShowsCount > 0 && !member.isSuspended && (
          <div style={{ border: "1px solid rgba(153,56,66,0.45)", borderRadius: "6px", background: "rgba(153,56,66,0.05)", padding: "12px 16px", marginBottom: "18px", fontSize: "14px", lineHeight: 1.55, color: "#39292a" }}>
            {noShowsCount} {noShowsCount > 1 ? "no-shows" : "no-show"} recorded — hosting is blocked for 90 days after each.
          </div>
        )}

        {/* At-Risk Warning Box */}
        {!!member.atRiskSince && !member.isSuspended && (
          <div style={{ border: "1px solid rgba(123,31,44,0.45)", borderRadius: "8px", background: "#fdf6f2", padding: "clamp(18px,2.4vw,22px)", marginBottom: "18px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "7px" }}>{member.firstName.toUpperCase()} NEEDS A WORD</div>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57,41,42,0.8)", margin: "0 0 14px", maxWidth: "74ch", textWrap: "pretty" }}>
              She has been flagged as at risk. A note from you, not a dunning email.
            </p>
            <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setWriteOpen(!writeOpen)} style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "10px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>Write to her</button>
              {isPaidMember && (
                <>
                  <button type="button" style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "10px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>Ask for a new card</button>
                  <button type="button" onClick={() => setStatusOpen("pause")} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "10px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>Offer a pause</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Message composer */}
        {writeOpen && (
          <div style={{ marginBottom: "18px", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "6px", background: "#fff", padding: "14px 16px" }}>
            <textarea 
              rows={4} 
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px", lineHeight: 1.65, background: "#fff", resize: "vertical", marginBottom: "10px" }}
            />
            <div style={{ display: "flex", gap: "9px", flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" onClick={handleContact} disabled={isSubmitting} style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>{isSubmitting ? 'Sending...' : 'Send it'}</button>
              <button type="button" onClick={() => setWriteOpen(false)} style={{ border: "1px solid rgba(57,41,42,0.28)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Not now</button>
              <span style={{ fontSize: "12px", color: "rgba(57,41,42,0.62)" }}>Sent from hello@themothers.cc and recorded below.</span>
            </div>
          </div>
        )}

        {/* Top 4 Stat Tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: "12px", marginBottom: "18px" }}>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "14px 16px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: "#39292a" }}>{totalBalance || 0}</div>
            <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.72)", marginTop: "6px" }}>
              Credits{earliestExpiry ? ` · first expiry ${new Date(earliestExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
            </div>
          </div>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "14px 16px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: "#39292a" }}>{attendedCount}</div>
            <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.72)", marginTop: "6px" }}>Events attended</div>
          </div>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "14px 16px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: "#39292a" }}>{upcomingEvents.length}</div>
            <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.72)", marginTop: "6px" }}>Upcoming bookings</div>
          </div>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "14px 16px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: noShowsCount > 0 ? WINE : "#39292a" }}>{noShowsCount}</div>
            <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.72)", marginTop: "6px" }}>No-shows</div>
          </div>
        </div>

        {/* ═══════════════════ MAIN CONTENT CARDS ═══════════════════ */}
        {!isPaidMember ? (
          /* ── PRE-LAUNCH ACCOUNT · NO MEMBERSHIP YET (Matching Image 2 & DC design) ── */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 440px), 1fr))", gap: "16px", alignItems: "start" }}>
            
            {/* 1. Her account */}
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px, 2.4vw, 24px)" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 12px" }}>Her account</h2>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  { k: "Plan", v: "None yet — pays per event in credits", color: "rgba(57,41,42,0.72)" },
                  { k: "Joining fee at launch", v: member.createdBeforeLaunch !== false ? "Waived (opened before launch)" : "Standard", color: member.createdBeforeLaunch !== false ? GREEN : "rgba(57,41,42,0.72)" },
                  { k: "Newsletter", v: member.marketingOptIn ? "On the list" : "Not subscribed", color: "rgba(57,41,42,0.72)" },
                  { k: "Membership", v: "Can join from January 2027", color: "rgba(57,41,42,0.72)" },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0", borderTop: i > 0 ? "1px solid rgba(57,41,42,0.1)" : "none", fontSize: "13.5px" }}>
                    <span>{r.k}</span>
                    <span style={{ color: r.color, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Bookings */}
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px, 2.4vw, 24px)" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 12px" }}>Bookings</h2>
              {(!attendance || attendance.length === 0) ? (
                <p style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)", margin: 0 }}>No bookings.</p>
              ) : (
                formatAttendance(attendance).map((r, i) => (
                  <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0", borderTop: i > 0 ? "1px solid rgba(57,41,42,0.1)" : "none", fontSize: "13.5px" }}>
                    <span>
                      {r.title}
                      <br />
                      <span style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.66)" }}>{r.date}</span>
                    </span>
                    <span style={{ color: r.color, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.state}</span>
                  </div>
                ))
              )}
            </div>

            {/* 3. Credit ledger */}
            <div id="ledger" style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px, 2.4vw, 24px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: 0 }}>Credit ledger</h2>
                <button type="button" onClick={() => setAdjustOpen(!adjustOpen)} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "5px 10px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                  Adjust credits
                </button>
              </div>

              {adjustOpen && (
                <div style={{ marginBottom: "12px", border: "1px solid rgba(123,31,44,0.35)", borderRadius: "6px", background: "#fdf6f2", padding: "13px 15px" }}>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                    <input 
                      type="number" 
                      placeholder="±" 
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value ? Number(e.target.value) : "")}
                      style={{ width: "70px", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "9px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", background: "#fff" }} 
                    />
                    <input 
                      type="text" 
                      placeholder="Reason — she will see this" 
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      style={{ flex: "1 1 140px", minWidth: 0, boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "9px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", background: "#fff" }} 
                    />
                  </div>
                  <div style={{ fontSize: "12px", lineHeight: 1.55, color: "rgba(57,41,42,0.7)", marginBottom: "10px" }}>
                    Appears in her statement as an adjustment by the team. New credits carry a fresh six-month life.
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" onClick={handleAdjust} disabled={isSubmitting} style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "8px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>{isSubmitting ? '...' : 'Apply'}</button>
                    <button type="button" onClick={() => setAdjustOpen(false)} style={{ border: "1px solid rgba(57,41,42,0.25)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "8px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}

              {(!ledgerEntries || ledgerEntries.length === 0) ? (
                <p style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)", margin: 0 }}>No credit movements.</p>
              ) : (
                formatCredits(ledgerEntries).slice(0, 8).map((r, i) => (
                  <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0", borderTop: i > 0 ? "1px solid rgba(57,41,42,0.1)" : "none", fontSize: "13.5px" }}>
                    <span>
                      {r.what}
                      <br />
                      <span style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.66)" }}>{r.when}</span>
                    </span>
                    <span style={{ color: r.color, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontWeight: 600 }}>{r.amount}</span>
                  </div>
                ))
              )}
            </div>

            {/* 4. Her profile */}
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px, 2.4vw, 24px)" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 12px" }}>Her profile</h2>
              {!hasProfile ? (
                <p style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)", margin: 0 }}>Not answered yet — she&apos;ll be asked on her next visit.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {[
                    { k: "Stage", v: Array.isArray(profile.stages) ? profile.stages.join(", ") : (member.stage || "—") },
                    { k: "Neighbourhood", v: profile.neighbourhood || member.neighbourhood || "—" },
                    { k: "Hoping to find", v: Array.isArray(profile.hoping) ? profile.hoping.join(", ") : "—" },
                    { k: "Usually free", v: Array.isArray(profile.free) ? profile.free.join(", ") : "—" },
                    { k: "Heard via", v: (profile.heard || "—") + (profile.referralCode ? ` · ${profile.referralCode}` : "") },
                    { k: "Social", v: profile.social?.handle ? `${profile.social.platform || ""} ${profile.social.handle}` : "—" },
                    { k: "Why she came", v: profile.why || "—" },
                  ].map((r, i) => (
                    <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0", borderTop: i > 0 ? "1px solid rgba(57,41,42,0.1)" : "none", fontSize: "13.5px" }}>
                      <span style={{ flex: "none" }}>{r.k}</span>
                      <span style={{ color: "rgba(57,41,42,0.78)", textAlign: "right", flex: "1 1 200px" }}>{r.v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Hosting & Godmother */}
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px, 2.4vw, 24px)" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 12px" }}>Hosting &amp; Godmother</h2>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  { k: "Can host", v: canHost ? "Yes" : `Not yet — ${noShowsCount > 0 ? "recent no-show" : `${attendedCount} of 2 events`}` },
                  { k: "Host requests", v: (hostRequests && hostRequests.length) ? hostRequests.map((h: any) => `${h.eventTitle || h.format} · ${h.status}`).join("; ") : "None" },
                  { k: "Godmother code", v: member.godmotherCode || "—" },
                  { k: "Referred by", v: referredByName || "—" },
                  { k: "Mothers invited", v: (godmotherStats && godmotherStats.length) ? godmotherStats.map((g: any) => `${g.referredPersonId?.slice(0, 6) || "Friend"} · ${g.status === 'paid' ? '+5 credited' : 'pending'}`).join("; ") : "None" },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0", borderTop: i > 0 ? "1px solid rgba(57,41,42,0.1)" : "none", fontSize: "13.5px" }}>
                    <span>{r.k}</span>
                    <span style={{ color: "rgba(57,41,42,0.72)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Actions */}
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px, 2.4vw, 24px)" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 12px" }}>Actions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <button 
                    type="button" 
                    onClick={handleSuspendToggle}
                    disabled={isSubmitting}
                    style={{ border: `1px solid ${member.isSuspended ? '#568b05' : 'rgba(57,41,42,0.3)'}`, background: "transparent", color: member.isSuspended ? '#3b5e04' : '#39292a', borderRadius: "4px", padding: "9px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
                  >
                    {member.isSuspended ? "Reinstate account" : "Suspend account"}
                  </button>
                  <p style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57,41,42,0.7)", margin: "6px 0 0" }}>
                    {member.isSuspended ? "She can book and post again straight away." : "For breaking house rules. Blocks booking and posting; bookings and credits are frozen, not refunded. She gets an email."}
                  </p>
                </div>

                <div style={{ borderTop: "1px solid rgba(57,41,42,0.1)", paddingTop: "14px" }}>
                  {!showDeleteConfirm ? (
                    <button 
                      type="button" 
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "9px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
                    >
                      Delete account (GDPR)
                    </button>
                  ) : (
                    <div>
                      <p style={{ fontSize: "13.5px", lineHeight: 1.55, margin: "0 0 10px" }}>
                        Deletes her account and personal data. Future bookings are cancelled, remaining credits are forfeited, and her Gazette posts stay as “A mother in Barcelona”. Payment records are kept for tax.
                      </p>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button type="button" onClick={() => setShowDeleteConfirm(false)} style={{ border: "1px solid rgba(57,41,42,0.28)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                          Keep account
                        </button>
                        <button type="button" onClick={handleDeleteAccount} disabled={isSubmitting} style={{ border: "1px solid #7b1f2c", background: "#7b1f2c", color: "#ffffff", borderRadius: "4px", padding: "9px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                          Delete permanently
                        </button>
                      </div>
                    </div>
                  )}
                  <p style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57,41,42,0.7)", margin: "6px 0 0" }}>
                    Card, renewal and pause tools apply once she becomes a member.
                  </p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* ── ACTIVE MEMBER VIEW (Subscriptions, renewals, pauses) ── */
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "16px", marginBottom: "18px", alignItems: "start" }}>
            
            {/* Card: Her membership */}
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px 22px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 14px" }}>Her membership</h2>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {(() => {
                  const stageStr = member.stage || "—";
                  const stageLower = stageStr.toLowerCase();
                  const circles = ["General — La Gazette"];
                  if (stageLower.includes("preg") || stageLower.includes("expect")) circles.push("Pregnant");
                  if (stageLower.includes("baby") || stageLower.includes("babies")) circles.push("Babies");
                  if (stageLower.includes("toddler") || stageLower.includes("peque")) circles.push("Toddlers");
                  if (stageLower.includes("child") && !stageLower.includes("big") && !stageLower.includes("610")) circles.push("Children");
                  if (stageLower.includes("big") || stageLower.includes("610") || stageLower.includes("6-10")) circles.push("Big kids");

                  const langMap: Record<string, string> = {
                    en: "English",
                    es: "Spanish",
                    fr: "French",
                    ca: "Catalan",
                  };
                  const langDisplay = member.languages
                    ? (langMap[member.languages.toLowerCase()] || member.languages)
                    : "English, Spanish";

                  const planName = member.billingFrequency === 'quarterly' ? 'Quarterly' : 'Monthly';
                  return [
                    { label: 'Stage', value: stageStr },
                    { label: 'Children', value: member.children?.length ? `${member.children.length}` : "—" },
                    { label: 'Plan', value: `${planName} · €${(member.monthlyPriceCents/100).toFixed(0)} / month` },
                    { label: 'Rate held until', value: member.priceLockedUntil ? new Date(member.priceLockedUntil).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : "—" },
                    { label: 'Renews', value: member.currentPeriodEnd ? new Date(member.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : (member.joinedAt ? new Date(new Date(member.joinedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : "—") },
                    { label: 'Pauses used', value: `${member.pauseMonthsUsedYear || 0} of 2` },
                    { label: 'Languages', value: langDisplay },
                    { label: 'WhatsApp circles', value: circles.join(", ") },
                  ].map((f, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "14px", padding: "10px 0", borderBottom: "1px solid rgba(57,41,42,0.1)", fontSize: "13.5px", lineHeight: 1.5 }}>
                      <span style={{ color: "rgba(57,41,42,0.68)" }}>{f.label}</span>
                      <span style={{ textAlign: "right", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>{f.value}</span>
                    </div>
                  ));
                })()}
              </div>

              {/* Action Buttons: Pause / Resume / Reactivate & Cancel */}
              <div style={{ display: "flex", gap: "9px", flexWrap: "wrap", marginTop: "16px" }}>
                {(member.status === "paused" || member.status === "cancelled_at_period_end" || member.status === "lapsed" || member.cancelAtPeriodEnd) ? (
                  <button type="button" onClick={handleResume} disabled={isSubmitting} style={{ border: `1px solid ${GREEN}`, background: "transparent", color: GREEN, borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                    {isSubmitting ? "Processing..." : (member.status === "paused" ? "Resume her membership" : "Reactivate her membership")}
                  </button>
                ) : (
                  <button type="button" onClick={() => setStatusOpen("pause")} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                    Pause her membership
                  </button>
                )}
                {member.status !== "cancelled_at_period_end" && member.status !== "lapsed" && !member.cancelAtPeriodEnd && (
                  <button type="button" onClick={() => setStatusOpen("cancel")} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                    End her membership
                  </button>
                )}
              </div>

              {/* Status Modal Box */}
              {statusOpen && (
                <div style={{ marginTop: "14px", border: "1px solid rgba(123,31,44,0.4)", borderRadius: "6px", background: "#fdf6f2", padding: "14px 16px" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px", marginBottom: "6px" }}>{statusTitle}</div>
                  <p style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)", margin: "0 0 12px", textWrap: "pretty" }}>{statusBody}</p>
                  <input 
                    type="text" 
                    value={statusReason} 
                    onChange={(e) => setStatusReason(e.target.value)} 
                    placeholder="Reason — required, and kept for our record" 
                    style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px", background: "#fff", marginBottom: "11px" }} 
                  />
                  <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
                    <button type="button" onClick={handleStatusChange} disabled={isSubmitting} style={{ border: "1px solid #7b1f2c", background: "#7b1f2c", color: "#f8efe2", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                      {isSubmitting ? "Updating..." : statusConfirm}
                    </button>
                    <button type="button" onClick={() => setStatusOpen(null)} style={{ border: "1px solid rgba(57,41,42,0.28)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                      Not now
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Card: Her credits */}
            <div id="ledger" style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px 22px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 6px" }}>Her credits</h2>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "12px" }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "34px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{totalBalance || 0}</span>
                <span style={{ fontSize: "13px", color: "rgba(57,41,42,0.68)" }}>
                  available{earliestExpiry ? ` · expires ${new Date(earliestExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                </span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column" }}>
                {formatCredits(ledgerEntries).slice(0, 5).map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "9px 0", borderBottom: "1px solid rgba(57,41,42,0.1)", fontSize: "13px", lineHeight: 1.55 }}>
                    <span>{c.what}<br /><span style={{ fontSize: "11.5px", color: "rgba(57,41,42,0.58)" }}>{c.when}</span></span>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: c.color, whiteSpace: "nowrap" }}>{c.amount}</span>
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => setAdjustOpen(!adjustOpen)} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer", marginTop: "14px" }}>
                Adjust her credits
              </button>

              {adjustOpen && (
                <div style={{ marginTop: "12px", border: "1px solid rgba(123,31,44,0.35)", borderRadius: "6px", background: "#fdf6f2", padding: "13px 15px" }}>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                    <input 
                      type="number" 
                      placeholder="±" 
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(e.target.value ? Number(e.target.value) : "")}
                      style={{ width: "70px", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "9px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", background: "#fff" }} 
                    />
                    <input 
                      type="text" 
                      placeholder="Reason — she will see this" 
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      style={{ flex: "1 1 140px", minWidth: 0, boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "9px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", background: "#fff" }} 
                    />
                  </div>
                  <div style={{ fontSize: "12px", lineHeight: 1.55, color: "rgba(57,41,42,0.7)", marginBottom: "10px" }}>
                    Appears in her own statement as an adjustment by the team. New credits carry a fresh six-month life.
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button type="button" onClick={handleAdjust} disabled={isSubmitting} style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "8px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>{isSubmitting ? '...' : 'Apply'}</button>
                    <button type="button" onClick={() => setAdjustOpen(false)} style={{ border: "1px solid rgba(57,41,42,0.25)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "8px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* Card: Attendance History */}
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px 22px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 14px" }}>Attendance</h2>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {attendance?.length === 0 ? (
                  <div style={{ fontSize: "13px", color: GREY, padding: "10px 0" }}>Nothing in the last ninety days</div>
                ) : (
                  formatAttendance(attendance).slice(0, 5).map((a, i) => (
                    <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(57,41,42,0.1)", fontSize: "13px", lineHeight: 1.55 }}>
                      <div style={{ fontWeight: 600 }}>{a.title}</div>
                      <div style={{ color: a.color, fontSize: "12px" }}>{a.state} · {a.date}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Card: Contact History */}
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px 22px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 14px" }}>Contact history</h2>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {contactHistory?.length === 0 ? (
                  <div style={{ fontSize: "13px", color: GREY, padding: "10px 0" }}>No recorded emails or messages.</div>
                ) : (
                  formatContactHistory(contactHistory).slice(0, 5).map((c, i) => (
                    <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(57,41,42,0.1)" }}>
                      <div style={{ fontSize: "13.5px", lineHeight: 1.5, marginBottom: "2px" }}>{c.what}</div>
                      <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)" }}>{c.when}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Card: Account Controls */}
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px 22px", gridColumn: "1 / -1" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 8px" }}>Account controls</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(57,41,42,0.1)", paddingTop: "14px" }}>
                <div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSuspendToggle}
                    style={{
                      border: member.isSuspended ? "1px solid #568b05" : "1px solid #993842",
                      background: "transparent",
                      color: member.isSuspended ? "#3b5e04" : "#993842",
                      borderRadius: "4px",
                      padding: "9px 16px",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    {member.isSuspended ? "Lift suspension (Reactivate)" : "Suspend account"}
                  </button>
                  <p style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.7)", margin: "6px 0 0" }}>
                    {member.isSuspended ? `Suspended: "${member.suspendedReason || 'House rules'}"` : "Blocks booking and La Gazette posting; freezes credits."}
                  </p>
                </div>

                <div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      if (!confirm(`Permanently delete ${member.firstName}'s account under GDPR? Personal data will be erased, active bookings cancelled, and La Gazette posts anonymized.`)) return;
                      handleDeleteAccount();
                    }}
                    style={{
                      border: "1px solid #7b1f2c",
                      background: "transparent",
                      color: "#7b1f2c",
                      borderRadius: "4px",
                      padding: "9px 16px",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Delete account (GDPR)
                  </button>
                  <p style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.7)", margin: "6px 0 0" }}>
                    Permanent erasure of personal data under GDPR Article 17.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
