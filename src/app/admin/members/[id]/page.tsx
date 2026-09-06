"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { getAdminMemberDetail, contactMember, pauseMember, resumeMember, cancelMember, adjustMemberCredits } from "@/app/actions/adminCms";

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

  const loadData = async () => {
    const res = await getAdminMemberDetail(resolvedParams.id);
    if (res.success && res.member) {
      setData(res);
      setDraftMessage(`${res.member.firstName} — no rush at all about the payment, it can wait. I noticed you have not been to anything since June and I wanted to check you are alright. If now is not the moment, we can pause your membership and everything waits for you. Belén`);
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

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#f8efe2", padding: "40px", textAlign: "center", color: GREY }}>Loading member record...</div>;
  }

  if (!data || !data.member) {
    return <div style={{ minHeight: "100vh", background: "#f8efe2", padding: "40px", textAlign: "center", color: GREY }}>Member not found.</div>;
  }

  const { member, ledgerEntries, totalBalance, godmotherStats, attendance, contactHistory } = data;

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

  const formatCredits = (entries: any[]) => {
    return entries.map(e => ({
      what: e.reason || e.type,
      when: new Date(e.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      amount: e.amount > 0 ? `+${e.amount}` : `${e.amount}`,
      color: e.amount > 0 ? GREEN : WINE
    }));
  };

  const formatAttendance = (bookings: any[]) => {
    return bookings.map(b => {
      let color = GREY;
      let note = "";
      const d = new Date(b.eventStartsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      if (b.status === 'attended') {
        note = `Attended ${d} · ${b.isFreeWalk ? 'free' : b.creditsCharged + ' credits'}`;
        color = GREY;
      } else if (b.status === 'released') {
        note = `Released her place ${new Date(b.releasedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
        color = AMBER;
      } else if (b.status === 'no_show') {
        note = `No show ${d}`;
        color = WINE;
      } else {
        note = `Booked for ${d}`;
        color = GREY;
      }
      return { title: b.eventTitle, note, color };
    });
  };

  const statusTitle = statusOpen === 'pause' ? 'Pause her membership' : 'End her membership';
  const statusBody = statusOpen === 'pause'
    ? 'Nothing expires while she is paused and nothing new arrives. Two months a year — she has used ' + (member.pauseMonthsUsedYear || 0) + ' of 2. She is told, and she can lift it herself.'
    : 'She stays a member to the end of the period already paid for and keeps every booking made. Credits do not carry past the end. This is reversible only by her rejoining in a window.';
  const statusConfirm = statusOpen === 'pause' ? 'Pause it' : 'End it';

  // Determine Godmother stats
  const godmotherCode = godmotherStats && godmotherStats.length > 0 ? godmotherStats[0].code : `${member.firstName.toUpperCase()}-${member.lastName.charAt(0).toUpperCase()}`;
  const friendsJoined = (godmotherStats || []).filter((g: any) => g.status === 'paid' || g.status === 'qualified').length;
  const bonusEarned = (godmotherStats || []).filter((g: any) => g.status === 'paid').length * 5;

  return (
    <div style={{ minHeight: "100vh", background: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", WebkitFontSmoothing: "antialiased" }}>
      <style dangerouslySetInnerHTML={{__html: `
        a { color:#7b1f2c; text-decoration:none; }
        a:hover { color:#5d1620; text-decoration:underline; }
        button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline:2px solid #7b1f2c; outline-offset:2px; }
      `}} />

      <div style={{ maxWidth: "1120px", margin: "0 auto", padding: "clamp(24px,3.4vw,36px) clamp(18px,3vw,30px) 60px" }}>
        
        {/* Top Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>
          <div style={{ flex: "1 1 380px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>
              <Link href="/admin/members">← Members</Link> · Record
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(28px,3.8vw,38px)", lineHeight: 1.12, margin: "0 0 8px" }}>
              {member.firstName} {member.lastName}
            </h1>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0 }}>
              {member.email} · {member.phone || "No phone"} · {member.neighbourhood || "No area"} · member since {new Date(member.joinedAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ border: `1px solid ${currentStatusConfig.color}`, color: currentStatusConfig.color, borderRadius: "4px", padding: "7px 13px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              {currentStatusConfig.label}
            </span>
            <button type="button" onClick={() => setWriteOpen(!writeOpen)} style={{ border: "1px solid #7b1f2c", backgroundColor: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap", cursor: "pointer" }}>
              Write to her
            </button>
            <Link href={`/account/statement?m=${member.id}`} style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap", textDecoration: "none" }}>
              Her statement
            </Link>
          </div>
        </div>

        {/* At-Risk Warning Box */}
        {!!member.atRiskSince && (
          <div style={{ border: "1px solid rgba(123,31,44,0.45)", borderRadius: "8px", background: "#fdf6f2", padding: "clamp(18px,2.4vw,22px)", marginBottom: "18px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "7px" }}>{member.firstName.toUpperCase()} NEEDS A WORD</div>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57,41,42,0.8)", margin: "0 0 14px", maxWidth: "74ch", textWrap: "pretty" }}>
              She has been flagged as at risk. A note from you, not a dunning email.
            </p>
            <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
              <button type="button" onClick={() => setWriteOpen(!writeOpen)} style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "10px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>Write to her</button>
              <button type="button" style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "10px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>Ask for a new card</button>
              <button type="button" onClick={() => setStatusOpen("pause")} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "10px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>Offer a pause</button>
            </div>
            {writeOpen && (
              <div style={{ marginTop: "14px", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "6px", background: "#fff", padding: "14px 16px" }}>
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
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "16px", marginBottom: "18px", alignItems: "start" }}>
          
          {/* Card: Her membership */}
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px 22px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 14px" }}>Her membership</h2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                { label: 'Stage', value: member.stage || "—" },
                { label: 'Children', value: member.children?.length ? `${member.children.length}` : "—" },
                { label: 'Plan', value: `€${(member.monthlyPriceCents/100).toFixed(0)} monthly` },
                { label: 'Rate held until', value: member.priceLockedUntil ? new Date(member.priceLockedUntil).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : "—" },
                { label: 'Renews', value: member.currentPeriodEnd ? new Date(member.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : "—" },
                { label: 'Pauses used', value: `${member.pauseMonthsUsedYear || 0} of 2` },
                { label: 'Languages', value: member.languages || "French, Spanish" },
                { label: 'WhatsApp circles', value: member.whatsappCircles || "Toddlers - Sarrià" },
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "14px", padding: "10px 0", borderBottom: "1px solid rgba(57,41,42,0.1)", fontSize: "13.5px", lineHeight: 1.5 }}>
                  <span style={{ color: "rgba(57,41,42,0.68)" }}>{f.label}</span>
                  <span style={{ textAlign: "right", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>{f.value}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons: Pause / Resume & Cancel */}
            <div style={{ display: "flex", gap: "9px", flexWrap: "wrap", marginTop: "16px" }}>
              {member.status === "paused" ? (
                <button type="button" onClick={handleResume} disabled={isSubmitting} style={{ border: `1px solid ${GREEN}`, background: "transparent", color: GREEN, borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                  {isSubmitting ? "Resuming..." : "Resume her membership"}
                </button>
              ) : (
                <button type="button" onClick={() => setStatusOpen("pause")} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                  Pause her membership
                </button>
              )}
              {member.status !== "cancelled_at_period_end" && member.status !== "lapsed" && (
                <button type="button" onClick={() => setStatusOpen("cancel")} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                  End her membership
                </button>
              )}
            </div>

            {/* Status Modal Box */}
            {statusOpen && (
              <div style={{ marginTop: "14px", border: "1px solid rgba(123,31,44,0.4)", borderRadius: "6px", background: "#fdf6f2", padding: "16px 18px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", color: "#7b1f2c", marginBottom: "8px" }}>
                  {statusTitle} — {member.firstName} {member.lastName}
                </div>
                
                {statusOpen === "cancel" ? (
                  <div style={{ marginBottom: "14px", background: "#fff", border: "1px solid rgba(57,41,42,0.14)", borderRadius: "6px", padding: "12px 14px", fontSize: "13px", lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 600, marginBottom: "4px", color: "#39292a" }}>Financial &amp; Booking Consequences:</div>
                    <ul style={{ margin: "0 0 10px 18px", padding: 0 }}>
                      <li><strong>Period End:</strong> Active until {member.currentPeriodEnd ? new Date(member.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : "end of current billing cycle"}.</li>
                      <li><strong>Remaining Credits:</strong> {totalBalance} credits remain available until period end, then lapse.</li>
                      <li><strong>Upcoming Bookings:</strong> Bookings inside the period are retained; any bookings scheduled after period end will be cancelled and refunded.</li>
                    </ul>
                    <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.7)", fontStyle: "italic", borderTop: "1px solid rgba(57,41,42,0.08)", paddingTop: "8px" }}>
                      &quot;Cancel {member.firstName}&apos;s membership at period end? Reversible only by re-applying in an open window.&quot;
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)", margin: "0 0 12px", textWrap: "pretty" }}>{statusBody}</p>
                )}

                <input 
                  type="text" 
                  placeholder="Reason — required, and recorded in audit log" 
                  value={statusReason} 
                  onChange={e => setStatusReason(e.target.value)} 
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px", background: "#fff", marginBottom: "11px" }} 
                />
                <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
                  <button type="button" onClick={handleStatusChange} disabled={isSubmitting} style={{ border: "1px solid #7b1f2c", background: "#7b1f2c", color: "#ffffff", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                    {isSubmitting ? 'Processing...' : statusConfirm}
                  </button>
                  <button type="button" onClick={() => setStatusOpen(null)} style={{ border: "1px solid rgba(57,41,42,0.28)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
                    Not now
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card: Her credits */}
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px 22px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 6px" }}>Her credits</h2>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "12px" }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "34px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{totalBalance}</span>
              <span style={{ fontSize: "13px", color: "rgba(57,41,42,0.68)" }}>available</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {formatCredits(ledgerEntries).slice(0, 5).map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "9px 0", borderBottom: "1px solid rgba(57,41,42,0.1)", fontSize: "13px", lineHeight: 1.55 }}>
                  <span>{c.what}<br /><span style={{ fontSize: "11.5px", color: "rgba(57,41,42,0.58)" }}>{c.when}</span></span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: c.color, whiteSpace: "nowrap" }}>{c.amount}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setAdjustOpen(!adjustOpen)} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer", marginTop: "14px" }}>Adjust her credits</button>
            {adjustOpen && (
              <div style={{ marginTop: "12px", border: "1px solid rgba(123,31,44,0.35)", borderRadius: "6px", background: "#fdf6f2", padding: "13px 15px" }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                  <input type="number" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value === "" ? "" : Number(e.target.value))} placeholder="±" style={{ width: "70px", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "9px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", background: "#fff" }} />
                  <input type="text" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Reason — she will see this" style={{ flex: "1 1 140px", minWidth: 0, boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "9px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", background: "#fff" }} />
                </div>
                <div style={{ fontSize: "12px", lineHeight: 1.55, color: "rgba(57,41,42,0.7)", marginBottom: "10px" }}>Appears in her own statement as an adjustment by the team. New credits carry a fresh six-month life.</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" onClick={handleAdjust} disabled={isSubmitting} style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "8px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>{isSubmitting ? "..." : "Apply"}</button>
                  <button type="button" onClick={() => setAdjustOpen(false)} style={{ border: "1px solid rgba(57,41,42,0.25)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "8px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Where she has been & What we said */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "16px", marginBottom: "18px", alignItems: "start" }}>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px 22px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 12px" }}>Where she has been</h2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {formatAttendance(attendance).length === 0 ? (
                <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)", padding: "8px 0" }}>Nothing in the last ninety days</div>
              ) : (
                formatAttendance(attendance).map((a, i) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(57,41,42,0.1)" }}>
                    <div style={{ fontSize: "13.5px", lineHeight: 1.5, marginBottom: "2px" }}>{a.title}</div>
                    <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: a.color }}>{a.note}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px 22px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 12px" }}>What we have said to her</h2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(contactHistory || []).length === 0 ? (
                <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)", padding: "8px 0" }}>No direct contact recorded yet</div>
              ) : (
                (contactHistory || []).map((c: any, i: number) => (
                  <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(57,41,42,0.1)" }}>
                    <div style={{ fontSize: "13.5px", lineHeight: 1.5, marginBottom: "2px" }}>{c.what}</div>
                    <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)" }}>{c.when}</div>
                  </div>
                ))
              )}
            </div>
            <p style={{ fontSize: "12px", lineHeight: 1.6, color: "rgba(57,41,42,0.64)", margin: "12px 0 0", textWrap: "pretty" }}>Every email the system sent and every note you wrote, in one place — so nobody writes to her twice about the same thing.</p>
          </div>
        </div>

        {/* Godmother Card */}
        <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px 22px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 6px" }}>Godmother</h2>
          <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 12px", maxWidth: "70ch", textWrap: "pretty" }}>Automatic, with a code derived from her name. Five credits when a friend joins, fifteen more at three months.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))", gap: "12px" }}>
            <div style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "5px", padding: "12px 14px", background: "#fff" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{godmotherCode}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", margin: "5px 0 0", lineHeight: 1.4 }}>Her code</div>
            </div>
            <div style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "5px", padding: "12px 14px", background: "#fff" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{friendsJoined}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", margin: "5px 0 0", lineHeight: 1.4 }}>{friendsJoined === 1 ? "Friend joined" : "Friends joined"}</div>
            </div>
            <div style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "5px", padding: "12px 14px", background: "#fff" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{bonusEarned}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", margin: "5px 0 0", lineHeight: 1.4 }}>Bonus credits earned</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
