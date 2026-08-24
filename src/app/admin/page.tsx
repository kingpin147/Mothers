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

  const role = (session?.user as any)?.role || "manager";

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [cronRunning, setCronRunning] = useState<string | null>(null);
  const [actionRunning, setActionRunning] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    const res = await getAdminDashboardMetrics();
    setLoading(false);
    if (res.success) {
      setData(res);
    }
  };

  useEffect(() => {
    fetchMetrics();
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
    if (!reason) return;
    setActionRunning(eventId);
    const res = await cancelEventDecision(eventId, reason);
    setActionRunning(null);
    if (res.success) {
      alert("Event cancelled and credits refunded.");
      fetchMetrics();
    }
  };

  const metrics = data?.metrics || {
    activeMembersCount: 0,
    atRiskCount: 0,
    pendingAppsCount: 0,
    t7EventsCount: 0,
    revenueCents: 0,
    placesOffered: 50,
    windowLockMonths: 12,
  };

  const alerts = data?.alerts || { t7Events: [] };
  const recentActivity = data?.recentActivity || [];

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "40px clamp(24px, 5vw, 64px) 96px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-accent)",
              marginBottom: "4px"
            }}>
              The Mothers · Operator Command Center
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "36px", margin: "0 0 6px" }}>
              Operational Care & Control Suite
            </h1>
            <p style={{ fontSize: "14.5px", color: "var(--color-text-muted)", margin: 0 }}>
              Real-time monitoring across membership queues, event thresholds, credit ledgers, and editorial CMS.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{
              backgroundColor: "#fff",
              border: "1px solid var(--color-divider)",
              borderRadius: "5px",
              padding: "7px 14px",
              fontSize: "12.5px",
              fontWeight: 600,
              color: "var(--color-accent)"
            }}>
              Role: {role.toUpperCase()}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/account/login" })}
              className="btn btn-secondary"
              style={{ padding: "7px 14px", fontSize: "12.5px" }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* ─── 1. REAL-TIME OPERATIONAL KPIS ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "18px", marginBottom: "28px" }}>
          {/* Active Members & Quota */}
          <div className="card" style={{ backgroundColor: "#fff", padding: "20px", border: "1px solid var(--color-divider)" }}>
            <div style={{ fontSize: "11.5px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 600, marginBottom: "4px" }}>
              Founding Circle Quota
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "30px", fontWeight: 600, color: "var(--color-accent)" }}>
                {metrics.activeMembersCount}
              </span>
              <span style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
                / {metrics.placesOffered} places
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#285430", fontWeight: 500, marginTop: "4px" }}>
              Rate locked @ €29/mo ({metrics.windowLockMonths}m)
            </div>
          </div>

          {/* Pending Applications */}
          <div className="card" style={{ backgroundColor: "#fff", padding: "20px", border: "1px solid var(--color-divider)" }}>
            <div style={{ fontSize: "11.5px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 600, marginBottom: "4px" }}>
              Pending Applications
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "30px", fontWeight: 600, color: metrics.pendingAppsCount > 0 ? "#b45309" : "var(--color-text-main)" }}>
              {metrics.pendingAppsCount}
            </div>
            <Link href="/admin/applications" style={{ fontSize: "12px", color: "var(--color-accent)", fontWeight: 600, marginTop: "4px", display: "inline-block" }}>
              Open Review Queue →
            </Link>
          </div>

          {/* T-7 Threshold Events */}
          <div className="card" style={{ backgroundColor: "#fff", padding: "20px", border: "1px solid var(--color-divider)" }}>
            <div style={{ fontSize: "11.5px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 600, marginBottom: "4px" }}>
              T-7 Decisions Pending
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "30px", fontWeight: 600, color: metrics.t7EventsCount > 0 ? "var(--color-accent)" : "#285430" }}>
              {metrics.t7EventsCount}
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
              Events starting within 7 days
            </div>
          </div>

          {/* At-Risk Members */}
          <div className="card" style={{ backgroundColor: "#fff", padding: "20px", border: "1px solid var(--color-divider)" }}>
            <div style={{ fontSize: "11.5px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 600, marginBottom: "4px" }}>
              At-Risk Inactive Members
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "30px", fontWeight: 600, color: metrics.atRiskCount > 0 ? "#b91c1c" : "#285430" }}>
              {metrics.atRiskCount}
            </div>
            <Link href="/admin/members" style={{ fontSize: "12px", color: "var(--color-accent-2)", fontWeight: 600, marginTop: "4px", display: "inline-block" }}>
              Inspect Member Care →
            </Link>
          </div>

          {/* Processed Volume */}
          <div className="card" style={{ backgroundColor: "#fff", padding: "20px", border: "1px solid var(--color-divider)" }}>
            <div style={{ fontSize: "11.5px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 600, marginBottom: "4px" }}>
              Total Processed Volume
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "30px", fontWeight: 600, color: "var(--color-accent)" }}>
              €{(metrics.revenueCents / 100).toFixed(0)}
            </div>
            <Link href="/admin/finance" style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px", display: "inline-block" }}>
              View Financial Ledger →
            </Link>
          </div>
        </div>

        {/* ─── 2. TIME-BOUND T-7 ACTION ALERTS ─── */}
        {alerts.t7Events.length > 0 && (
          <div style={{
            backgroundColor: "#fff9eb",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            padding: "20px 24px",
            marginBottom: "28px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ fontWeight: 600, color: "#92400e", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                ⚠️ <strong>Urgent T-7 Threshold Decisions ({alerts.t7Events.length})</strong> — Events starting within 7 days needing confirmation:
              </div>
              <Link href="/admin/events" style={{ fontSize: "12.5px", color: "#92400e", fontWeight: 600 }}>
                Manage All Events →
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {alerts.t7Events.map((ev: any) => (
                <div key={ev.id} style={{
                  backgroundColor: "#fff",
                  padding: "12px 16px",
                  borderRadius: "6px",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px"
                }}>
                  <div>
                    <strong style={{ fontSize: "14px" }}>{ev.title}</strong>
                    <div style={{ fontSize: "12.5px", color: "var(--color-text-muted)" }}>
                      Starts: {new Date(ev.startsAt).toLocaleDateString()} at {new Date(ev.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Min. required: {ev.minToConfirm}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleQuickConfirm(ev.id)}
                      disabled={actionRunning === ev.id}
                      className="btn btn-primary"
                      style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#1e6833" }}
                    >
                      ✓ Confirm Run
                    </button>
                    <button
                      onClick={() => handleQuickCancel(ev.id)}
                      disabled={actionRunning === ev.id}
                      className="btn btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                    >
                      Cancel & Auto Refund
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── 3. CORE 4 OPERATIONAL QUEUES ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px", marginBottom: "32px" }}>
          {/* Queue 1: Who gets in */}
          <div className="card" style={{ backgroundColor: "#fff", padding: "24px", border: "1px solid var(--color-divider)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "11.5px", textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600, marginBottom: "8px" }}>
                Queue 01 · Membership
              </div>
              <h3 style={{ fontSize: "20px", margin: "0 0 8px" }}>Applications & Intake</h3>
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "18px", lineHeight: 1.5 }}>
                Review 11-step applicant submissions, issue 72h countdown payment links, or decline with waitlist.
              </p>
            </div>
            <Link href="/admin/applications" className="btn btn-primary" style={{ width: "100%", textAlign: "center", fontSize: "13px" }}>
              Open Applications Queue →
            </Link>
          </div>

          {/* Queue 2: Does this event run */}
          <div className="card" style={{ backgroundColor: "#fff", padding: "24px", border: "1px solid var(--color-divider)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "11.5px", textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600, marginBottom: "8px" }}>
                Queue 02 · Events & Seats
              </div>
              <h3 style={{ fontSize: "20px", margin: "0 0 8px" }}>Thresholds & Categories</h3>
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "18px", lineHeight: 1.5 }}>
                Publish gatherings, manage dynamic categories, evaluate T-7 attendance, and execute auto-refunds.
              </p>
            </div>
            <Link href="/admin/events" className="btn btn-primary" style={{ width: "100%", textAlign: "center", fontSize: "13px" }}>
              Manage Events Calendar →
            </Link>
          </div>

          {/* Queue 3: Member care & At Risk */}
          <div className="card" style={{ backgroundColor: "#fff", padding: "24px", border: "1px solid var(--color-divider)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "11.5px", textTransform: "uppercase", color: "var(--color-accent-2)", fontWeight: 600, marginBottom: "8px" }}>
                Queue 03 · Member Care
              </div>
              <h3 style={{ fontSize: "20px", margin: "0 0 8px" }}>Directory & Credit Ledger</h3>
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "18px", lineHeight: 1.5 }}>
                Inspect members, identify 60-day at-risk accounts, and perform manual ledger credit adjustments.
              </p>
            </div>
            <Link href="/admin/members" className="btn btn-secondary" style={{ width: "100%", textAlign: "center", fontSize: "13px" }}>
              Open Member Directory →
            </Link>
          </div>

          {/* Queue 4: Finance & Accounting */}
          <div className="card" style={{ backgroundColor: "#fff", padding: "24px", border: "1px solid var(--color-divider)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "11.5px", textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600, marginBottom: "8px" }}>
                Queue 04 · Financial Ledger
              </div>
              <h3 style={{ fontSize: "20px", margin: "0 0 8px" }}>Finance & Revenue</h3>
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "18px", lineHeight: 1.5 }}>
                Track Stripe recurring subscriptions, €35 guest tickets, and mirrored physical shop orders.
              </p>
            </div>
            <Link href="/admin/finance" className="btn btn-secondary" style={{ width: "100%", textAlign: "center", fontSize: "13px" }}>
              Open Financial Ledger →
            </Link>
          </div>
        </div>

        {/* ─── 4. CMS & SYSTEM DISPATCHERS ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
          {/* CMS Controls */}
          <div className="card" style={{ backgroundColor: "#fff", padding: "24px", border: "1px solid var(--color-divider)" }}>
            <h3 style={{ fontSize: "18px", margin: "0 0 16px" }}>Editorial & Content CMS</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link href="/admin/partners" className="btn btn-outline" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", fontSize: "13px" }}>
                <span>Partner Directory & Exclusivity</span>
                <span>→</span>
              </Link>
              <Link href="/admin/faq" className="btn btn-outline" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", fontSize: "13px" }}>
                <span>FAQ Questions (English & Spanish)</span>
                <span>→</span>
              </Link>
              <Link href="/admin/journal" className="btn btn-outline" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", fontSize: "13px" }}>
                <span>Journal Articles & Editorial</span>
                <span>→</span>
              </Link>
              <Link href="/admin/settings" className="btn btn-outline" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", fontSize: "13px", backgroundColor: "#faf7f2" }}>
                <span style={{ fontWeight: 600, color: "var(--color-accent)" }}>⚙️ Global Club & Credit Policy Settings</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Manual Background Engine Dispatchers */}
          <div className="card" style={{ backgroundColor: "#fff", padding: "24px", border: "1px solid var(--color-divider)" }}>
            <h3 style={{ fontSize: "18px", margin: "0 0 6px" }}>Engine Triggers & Jobs</h3>
            <p style={{ fontSize: "12.5px", color: "var(--color-text-muted)", marginBottom: "16px" }}>
              Background cron jobs run daily automatically. You can also trigger immediate runs on demand:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={() => handleTriggerCron("threshold-decisions")}
                disabled={cronRunning === "threshold-decisions"}
                className="btn btn-secondary"
                style={{ textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", fontSize: "12.5px" }}
              >
                <span>⚡ Run T-7 Threshold Auto-Confirmation Job</span>
                <span>{cronRunning === "threshold-decisions" ? "Executing..." : "Run Now"}</span>
              </button>
              <button
                onClick={() => handleTriggerCron("expire-credits")}
                disabled={cronRunning === "expire-credits"}
                className="btn btn-secondary"
                style={{ textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", fontSize: "12.5px" }}
              >
                <span>⚡ Run 6-Month FIFO Credit Expiry Worker</span>
                <span>{cronRunning === "expire-credits" ? "Executing..." : "Run Now"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── 5. LIVE AUDIT LOG STREAM ─── */}
        <div className="card" style={{ backgroundColor: "#fff", padding: "24px", border: "1px solid var(--color-divider)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", margin: 0 }}>Live System Audit Activity</h3>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Immutable Log (§5)</span>
          </div>

          {recentActivity.length === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>No audit actions recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recentActivity.map((log: any) => (
                <div key={log.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "13px",
                  padding: "8px 12px",
                  backgroundColor: "#faf7f2",
                  borderRadius: "4px",
                  border: "1px solid var(--color-divider)"
                }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontSize: "10.5px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      backgroundColor: "var(--color-surface)",
                      border: "1px solid var(--color-divider)"
                    }}>
                      {log.actorType}
                    </span>
                    <strong style={{ color: "var(--color-accent)" }}>{log.action.replace(/_/g, " ")}</strong>
                    <span style={{ color: "var(--color-text-muted)" }}>({log.entity})</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                    {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
