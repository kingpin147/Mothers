"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { getAdminDashboardMetrics, runManualCron } from "@/app/actions/adminDashboard";
import { confirmEventDecision, cancelEventDecision } from "@/app/actions/adminEvents";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/account/login");
    }
  }, [status, router]);

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cronRunning, setCronRunning] = useState<string | null>(null);
  const [actionRunning, setActionRunning] = useState<string | null>(null);

  const fetchMetrics = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await getAdminDashboardMetrics();
      if (res.success) {
        setData(res);
        setErrorMsg(null);
      } else {
        setErrorMsg(res.error || "Failed to load metrics.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred while fetching metrics.");
    }
    if (!isBackground) setLoading(false);
  };

  useEffect(() => {
    fetchMetrics();

    // Background polling every 15 seconds
    const intervalId = setInterval(() => {
      fetchMetrics(true);
    }, 15000);

    return () => clearInterval(intervalId);
  }, []);

  const handleTriggerCron = async (jobKey: "threshold-decisions" | "expire-credits") => {
    setCronRunning(jobKey);
    const res = await runManualCron(jobKey);
    setCronRunning(null);
    if (res.success) {
      alert(`Job executed successfully! Processed: ${res.count ?? 0} records.`);
      fetchMetrics();
    } else {
      alert(res.error || "Failed to trigger job.");
    }
  };

  const handleQuickConfirm = async (eventId: string) => {
    if (!confirm("Confirm this event to run? All held member seats will be finalized.")) return;
    setActionRunning(eventId);
    const res = await confirmEventDecision(eventId);
    setActionRunning(null);
    if (res.success) {
      alert("Event confirmed!");
      fetchMetrics();
    }
  };

  const handleQuickCancel = async (eventId: string) => {
    const reason = prompt("Enter cancellation reason (credits returned automatically):", "Threshold not reached");
    if (!reason) {
      setActionRunning(null);
      return;
    }
    setActionRunning(eventId);
    const res = await cancelEventDecision(eventId, reason);
    setActionRunning(null);
    if (res.success) {
      alert("Event cancelled and credits refunded.");
      fetchMetrics();
    }
  };

  const roleLabel = `Role · ${data?.role ?? 'Owner'}`;
  const decisions = data?.decisions || [];
  const warnings = data?.warnings || [];
  const applications = data?.applications || [];
  const money = data?.money || [];
  const week = data?.week || [];
  
  const queues = [
    { kicker: 'Queue 01 · Membership', title: 'Applications & intake', body: 'Read one at a time, accept with the 72-hour payment link, or decline to the waitlist.', cta: 'Open the queue', href: '/admin/applications' },
    { kicker: 'Queue 02 · Events', title: 'Calendar & thresholds', body: 'Publish gatherings, set minimums and decision points, confirm or cancel with automatic refunds.', cta: 'Open the calendar', href: '/admin/events' },
    { kicker: 'Queue 03 · Member care', title: 'Directory & credit ledger', body: 'Search by name, stage or neighbourhood, spot at-risk accounts, adjust credits with a reason.', cta: 'Open the directory', href: '/admin/members' },
    { kicker: 'Queue 04 · Finance', title: 'Payments & revenue', body: 'Subscriptions, €35 Event Passes, €19 joining fees, refunds and shop orders.', cta: 'Open the ledger', href: '/admin/finance' }
  ];
  const cms = [
    { label: 'Partner directory & perk codes', href: '/admin/partners' },
    { label: 'FAQ — English & Spanish', href: '/admin/faq' },
    { label: 'Journal & editorial', href: '/admin/journal' },
    { label: 'Club & credit policy settings', href: '/admin/settings' }
  ];
  const jobs = [
    { label: 'T-7 threshold check', last: 'Automated job', key: 'threshold-decisions' },
    { label: 'Credit expiry, oldest first', last: 'Automated job', key: 'expire-credits' },
    { label: 'Godmother three-month milestones', last: 'Automated job', key: 'godmother' }
  ];
  
  const stats = data?.stats || [];
  const audit = data?.audit || [
    { who: 'System', did: 'loading / unavailable', change: 'Audit logs could not be loaded.', when: '-', where: '-' }
  ];

  return (
    <>
      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(26px,4vw,40px) clamp(18px,4vw,34px) 64px" }}>
        
        {/* TITLE ROW */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "28px" }}>
          <div style={{ flex: "1 1 420px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>The Mothers · Admin</div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(32px,4.4vw,44px)", lineHeight: 1.1, margin: "0 0 9px" }}>What needs you today</h1>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "64ch", textWrap: "pretty" }}>Sunday 30 August. Everything below has a deadline, a payment or a mother waiting behind it. The counts sit at the bottom.</p>
          </div>
          <div style={{ display: "flex", gap: "9px", alignItems: "center" }}>
            <span style={{ border: "1px solid rgba(123,31,44,0.5)", color: "#7b1f2c", borderRadius: "4px", padding: "7px 13px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{roleLabel}</span>
            <button onClick={() => signOut({ callbackUrl: "/account/login" })} style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", background: "transparent", borderRadius: "4px", padding: "7px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", whiteSpace: "nowrap", cursor: "pointer" }}>Sign out</button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ padding: "16px", background: "#fef2f2", color: "#991b1b", border: "1px solid #f87171", borderRadius: "6px", marginBottom: "24px" }}>
            <strong style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}>Dashboard Error:</strong> {errorMsg}
          </div>
        )}

        {/* DECISIONS DUE */}
        <div style={{ border: "1px solid rgba(123,31,44,0.45)", borderRadius: "8px", background: "#fdf6f2", padding: "clamp(18px,2.4vw,24px)", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", marginBottom: "5px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "11px" }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", color: "rgba(57,41,42,0.4)", fontVariantNumeric: "tabular-nums" }}>01</span>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "23px", lineHeight: 1.2, margin: 0, color: "#7b1f2c" }}>Decisions due — {decisions.length} events at T-7</h2>
            </div>
            <Link href="/admin/events" style={{ fontSize: "13.5px", color: "#7b1f2c", textDecoration: "none" }}>Manage all events →</Link>
          </div>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 16px", maxWidth: "72ch", textWrap: "pretty" }}>Starting within seven days and still unconfirmed. Confirming charges nothing new; cancelling returns every credit held, automatically.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
            {decisions.length === 0 && <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)" }}>Nothing waiting.</div>}
            {decisions.map((d: any, idx: number) => (
              <div key={idx} style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "6px", background: "#fffdfa", padding: "15px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "18px", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 300px" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px", marginBottom: "5px" }}>{d.title}</div>
                  <div style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)" }}>{d.meta}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "20px", fontVariantNumeric: "tabular-nums", color: d.countColor }}>{d.count}</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)" }}>Booked / minimum</div>
                  </div>
                  <div style={{ display: "flex", gap: "9px" }}>
                    <button type="button" onClick={() => handleQuickConfirm(d.id)} disabled={actionRunning === d.id} style={{ border: "1px solid #568b05", background: "transparent", color: "#3f6604", borderRadius: "4px", padding: "9px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>Confirm</button>
                    <button type="button" onClick={() => handleQuickCancel(d.id)} disabled={actionRunning === d.id} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>Cancel &amp; refund</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EARLY WARNINGS */}
        <div style={{ border: "1px solid rgba(182,130,53,0.5)", borderRadius: "8px", background: "#fffdf6", padding: "clamp(18px,2.4vw,24px)", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "11px", marginBottom: "5px" }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", color: "rgba(57,41,42,0.4)", fontVariantNumeric: "tabular-nums" }}>02</span>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "23px", lineHeight: 1.2, margin: 0 }}>Early warnings — {warnings.length} events at T-10</h2>
          </div>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 16px", maxWidth: "72ch", textWrap: "pretty" }}>Under half their minimum with ten days to go. Each one names the group most likely to want it, with a message ready for that thread.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
            {warnings.length === 0 && <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)" }}>Nothing waiting.</div>}
            {warnings.map((w: any, idx: number) => (
              <div key={idx} style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "6px", background: "#fffdfa", padding: "15px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "18px", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 300px" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16.5px", marginBottom: "4px" }}>{w.title}</div>
                  <div style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)" }}>{w.meta}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", color: "#39292a", border: "1px solid rgba(182,130,53,0.65)", borderRadius: "4px", padding: "5px 11px", whiteSpace: "nowrap" }}>{w.group}</span>
                  <Link href={`/admin/events/${w.id}`} style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "8px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer", whiteSpace: "nowrap", textDecoration: "none" }}>Draft the message →</Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2-COLUMN GRID (Applications / Money) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "18px", marginBottom: "18px" }}>
          
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px,2.4vw,24px)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "5px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "11px" }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", color: "rgba(57,41,42,0.4)", fontVariantNumeric: "tabular-nums" }}>03</span>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "21px", lineHeight: 1.2, margin: 0 }}>Applications waiting — {applications.length}</h2>
              </div>
              <Link href="/admin/applications" style={{ fontSize: "13.5px", color: "#7b1f2c", textDecoration: "none" }}>Review queue →</Link>
            </div>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 15px", textWrap: "pretty" }}>Oldest first, against our 72-hour promise. Amber past 48 hours, wine past 72.</p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {applications.length === 0 && <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)" }}>Nothing waiting.</div>}
              {applications.map((a: any, idx: number) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", padding: "12px 0", borderBottom: "1px solid rgba(57,41,42,0.1)" }}>
                  <div style={{ flex: "1 1 200px" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", marginBottom: "3px" }}>{a.name}</div>
                    <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57,41,42,0.65)" }}>{a.meta}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", color: a.color, border: `1px solid ${a.color}`, borderRadius: "4px", padding: "4px 10px", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{a.remaining}</span>
                    <Link href={`/admin/applications`} style={{ fontSize: "13px", whiteSpace: "nowrap", color: "#7b1f2c", textDecoration: "none" }}>Read →</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px,2.4vw,24px)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "5px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "11px" }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", color: "rgba(57,41,42,0.4)", fontVariantNumeric: "tabular-nums" }}>04</span>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "21px", lineHeight: 1.2, margin: 0 }}>Money needing attention</h2>
              </div>
              <Link href="/admin/members" style={{ fontSize: "13.5px", color: "#7b1f2c", textDecoration: "none" }}>Member records →</Link>
            </div>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 15px", textWrap: "pretty" }}>Failed renewals, cards about to expire, payment holds running out, partner agreements ending within thirty days.</p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {money.map((m: any, idx: number) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", padding: "12px 0", borderBottom: "1px solid rgba(57,41,42,0.1)" }}>
                  <div style={{ flex: "1 1 220px" }}>
                    <div style={{ fontSize: "14px", lineHeight: 1.5, marginBottom: "3px" }}><strong style={{ fontWeight: 600 }}>{m.who}</strong> — {m.what}</div>
                    <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57,41,42,0.62)" }}>{m.meta}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px", fontVariantNumeric: "tabular-nums", color: m.color, whiteSpace: "nowrap" }}>{m.amount}</span>
                    <Link href="/admin/members" style={{ fontSize: "13px", whiteSpace: "nowrap", color: "#7b1f2c", textDecoration: "none" }}>{m.action} →</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* THIS WEEK */}
        <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px,2.4vw,24px)", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", marginBottom: "5px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "11px" }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", color: "rgba(57,41,42,0.4)", fontVariantNumeric: "tabular-nums" }}>05</span>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "23px", lineHeight: 1.2, margin: 0 }}>This week</h2>
            </div>
            <Link href="/admin/events" style={{ fontSize: "13.5px", color: "#7b1f2c", textDecoration: "none" }}>Events calendar →</Link>
          </div>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 16px", maxWidth: "72ch", textWrap: "pretty" }}>The next seven days, with final headcounts, the meeting point, and a list you can print or send to the host.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,250px),1fr))", gap: "14px" }}>
            {week.length === 0 && <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)" }}>Nothing waiting.</div>}
            {week.map((e: any, idx: number) => (
              <div key={idx} style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "6px", padding: "16px 18px", background: "#fff", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#7b1f2c" }}>{e.when}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16.5px", lineHeight: 1.25 }}>{e.title}</div>
                <div style={{ fontSize: "12.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)" }}>{e.place}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", fontVariantNumeric: "tabular-nums" }}>{e.headcount}</span>
                  <span style={{ fontSize: "12px", color: "rgba(57,41,42,0.62)" }}>{e.headcountLabel}</span>
                </div>
                <Link href={`/admin/events/${e.id}/roster`} style={{ fontSize: "13px", marginTop: "auto", color: "#7b1f2c", textDecoration: "none" }}>Attendee list →</Link>
              </div>
            ))}
          </div>
        </div>

        {/* EMPTY STATE NOTE */}
        <div style={{ border: "1px dashed rgba(57,41,42,0.28)", borderRadius: "6px", padding: "12px 18px", marginBottom: "32px" }}>
          <p style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.68)", margin: 0, textWrap: "pretty" }}><strong style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "11px" }}>Empty-state rule</strong> — a section with nothing in it collapses to one quiet line, never a card with a zero in it: <em>“Nothing waiting — last answer sent three hours ago.”</em></p>
        </div>

        {/* QUEUES */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,230px),1fr))", gap: "16px", marginBottom: "18px" }}>
          {queues.map((q: any, idx: number) => (
            <div key={idx} style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px", display: "flex", flexDirection: "column", gap: "9px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)" }}>{q.kicker}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", lineHeight: 1.25 }}>{q.title}</div>
              <p style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 6px", textWrap: "pretty" }}>{q.body}</p>
              <Link href={q.href} style={{ marginTop: "auto", border: "1px solid #7b1f2c", color: "#7b1f2c", borderRadius: "4px", padding: "9px 14px", textAlign: "center", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", textDecoration: "none" }}>{q.cta} →</Link>
            </div>
          ))}
        </div>

        {/* CMS / JOBS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: "18px", marginBottom: "18px" }}>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px,2.4vw,24px)" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "21px", lineHeight: 1.2, margin: "0 0 14px" }}>Content &amp; partners</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {cms.map((c: any, idx: number) => (
                <Link key={idx} href={c.href} style={{ border: "1px solid rgba(57,41,42,0.18)", borderRadius: "5px", padding: "12px 15px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", fontSize: "14px", color: "#39292a", textDecoration: "none" }}>
                  <span>{c.label}</span><span style={{ color: "rgba(57,41,42,0.45)" }}>→</span>
                </Link>
              ))}
            </div>
          </div>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px,2.4vw,24px)" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "21px", lineHeight: 1.2, margin: "0 0 6px" }}>Scheduled jobs</h2>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 14px", textWrap: "pretty" }}>These run themselves every night. Running one by hand is logged like any other action.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {jobs.map((j: any, idx: number) => (
                <div key={idx} style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "5px", padding: "12px 15px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: "14px", lineHeight: 1.5 }}>{j.label}</div>
                    <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)" }}>{j.last}</div>
                  </div>
                  <button type="button" onClick={() => handleTriggerCron(j.key as any)} disabled={cronRunning === j.key} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "7px 13px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {cronRunning === j.key ? 'Running...' : 'Run now'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px,2.4vw,24px)", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "11px", marginBottom: "14px" }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", color: "rgba(57,41,42,0.4)", fontVariantNumeric: "tabular-nums" }}>06</span>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "21px", lineHeight: 1.2, margin: 0 }}>And then the numbers</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,170px),1fr))", gap: "12px" }}>
            {stats.map((s: any, idx: number) => (
              <div key={idx} style={{ background: "#fff", border: "1px solid rgba(57,41,42,0.14)", borderRadius: "6px", padding: "15px 17px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "24px", lineHeight: 1.1, marginBottom: "6px", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AUDIT LOG */}
        <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px,2.4vw,24px)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", marginBottom: "5px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "21px", lineHeight: 1.2, margin: 0 }}>Audit log</h2>
            <span style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.55)" }}>Append-only · full history exportable by the Owner</span>
          </div>
          <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 15px", maxWidth: "72ch", textWrap: "pretty" }}>Who, what, what it was before, what it is now, when, and from where.</p>
          <div>
            {audit.map((l: any, idx: number) => (
              <div key={idx} style={{ padding: "13px 0", borderBottom: "1px solid rgba(57,41,42,0.1)", display: "flex", gap: "16px", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 380px" }}>
                  <div style={{ fontSize: "14px", lineHeight: 1.55, marginBottom: "4px" }}><strong style={{ fontWeight: 600 }}>{l.who}</strong> {l.did}</div>
                  <div style={{ fontSize: "12.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.65)" }}>{l.change}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: "12px", lineHeight: 1.6, color: "rgba(57,41,42,0.55)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  <div>{l.when}</div>
                  <div>{l.where}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
