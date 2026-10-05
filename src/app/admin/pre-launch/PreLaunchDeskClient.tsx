"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { decideHostRequest, markEventAsRun } from "@/app/actions/host";
import { updateReportStatus, moderatePost } from "@/app/actions/adminReports";
import { saveGazetteTopics } from "@/app/actions/adminPreLaunch";

interface PreLaunchDeskProps {
  initialData: any;
  defaultTab?: "hosts" | "attendance" | "circle" | "accounts";
}

export function PreLaunchDeskClient({ initialData, defaultTab }: PreLaunchDeskProps) {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as any;
  
  const [activeTab, setActiveTab] = useState<"hosts" | "attendance" | "circle" | "accounts">(
    urlTab && ["hosts", "attendance", "circle", "accounts"].includes(urlTab)
      ? urlTab
      : (defaultTab || "hosts")
  );

  useEffect(() => {
    if (urlTab && ["hosts", "attendance", "circle", "accounts"].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  const [hostTab, setHostTab] = useState<"pending" | "confirmed" | "declined">("pending");

  const [hostRequests, setHostRequests] = useState<any[]>(initialData.hostRequests || []);
  const [attendanceEvents, setAttendanceEvents] = useState<any[]>(initialData.attendanceEvents || []);
  const [circleReports, setCircleReports] = useState<any[]>(initialData.circleReports || []);

  const [tagPinned, setTagPinned] = useState<string>(initialData.topics?.pinned || "");
  const [tagBlocked, setTagBlocked] = useState<string>(
    Array.isArray(initialData.topics?.blocked) ? initialData.topics.blocked.join(", ") : (initialData.topics?.blocked || "")
  );
  const [tagSaved, setTagSaved] = useState<string>("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // 1. Host Request Decisions
  const handleHostDecision = async (requestId: string, decision: "accept" | "decline") => {
    setActionLoading(`host-${requestId}`);
    try {
      const res = await decideHostRequest({ requestId, decision });
      if (res.success) {
        setHostRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: decision === "accept" ? "confirmed" : "declined" } : r))
        );
        showToast(decision === "accept" ? "Host request accepted and confirmation email sent!" : "Host request declined.");
      } else {
        alert(res.error || "Failed to update host request.");
      }
    } catch (err: any) {
      alert(err.message || "Error processing request.");
    } finally {
      setActionLoading(null);
    }
  };

  // 2. Attendance No-Show Toggles
  const handleToggleNoShow = (eventId: string, personId: string) => {
    setAttendanceEvents((prev) =>
      prev.map((ev) => {
        if (ev.id !== eventId) return ev;
        return {
          ...ev,
          people: ev.people.map((p: any) => (p.personId === personId ? { ...p, noShow: !p.noShow } : p)),
        };
      })
    );
  };

  // 3. Mark Event As Run
  const handleMarkAsRun = async (ev: any) => {
    if (!confirm(`Mark "${ev.title}" as run? The confirmed host gets +2 credits plus 50% refund, and thank-you email is sent.`)) return;

    setActionLoading(`run-${ev.id}`);
    try {
      const noShowPersonIds = ev.people.filter((p: any) => p.noShow).map((p: any) => p.personId);

      const res = await markEventAsRun({
        eventId: ev.id,
        noShowPersonIds,
      });
      if (res.success) {
        setAttendanceEvents((prev) =>
          prev.map((e) => (e.id === ev.id ? { ...e, isRan: true, ranAt: new Date().toLocaleDateString("en-GB") } : e))
        );
        showToast("Event marked as run! Host rewarded and attendance updated.");
      } else {
        alert(res.error || "Failed to mark event as run.");
      }
    } catch (err: any) {
      alert(err.message || "Error marking event as run.");
    } finally {
      setActionLoading(null);
    }
  };

  // 4. Circle Moderation Actions
  const handleCircleModerate = async (reportId: string, postId: string, action: "keep" | "hide" | "restore") => {
    setActionLoading(`rep-${reportId}`);
    try {
      if (action === "keep") {
        await updateReportStatus(reportId, "resolved_dismissed");
        setCircleReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: "resolved_dismissed" } : r))
        );
        showToast("Report cleared.");
      } else if (action === "hide") {
        await moderatePost(postId, "hide");
        await updateReportStatus(reportId, "resolved_hidden");
        setCircleReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: "resolved_hidden", postStatus: "hidden" } : r))
        );
        showToast("Post hidden from everyone.");
      } else if (action === "restore") {
        await moderatePost(postId, "restore");
        await updateReportStatus(reportId, "open");
        setCircleReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: "open", postStatus: "visible" } : r))
        );
        showToast("Post restored.");
      }
    } catch (err: any) {
      alert(err.message || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  // 5. Save Gazette Topics
  const handleSaveTopics = async () => {
    const blockedArr = tagBlocked
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await saveGazetteTopics({ pinned: tagPinned.trim(), blocked: blockedArr });
    if (res.success) {
      setTagSaved("Saved — live on La Gazette.");
      showToast("Gazette topics updated.");
    } else {
      alert(res.error || "Failed to save topics.");
    }
  };

  // Derived metrics matching Claude exactly
  const pendingHostsCount = hostRequests.filter((r) => (r.status || "pending") === "pending").length;
  const openReportsCount = circleReports.filter((r) => r.status === "open" || r.status === "pending").length;
  const toMarkCount = attendanceEvents.filter((e) => !e.isRan).length;
  const accountsCount = initialData.preLaunchAccounts?.length || 0;

  const statsList = [
    {
      label: "Host requests to review",
      value: String(pendingHostsCount),
      color: pendingHostsCount > 0 ? "#7a5612" : "#39292a",
      tab: "hosts",
    },
    {
      label: "Gazette reports open",
      value: String(openReportsCount),
      color: openReportsCount > 0 ? "#993842" : "#39292a",
      tab: "circle",
    },
    {
      label: "Past events to mark",
      value: String(toMarkCount),
      color: toMarkCount > 0 ? "#7a5612" : "#39292a",
      tab: "attendance",
    },
    {
      label: "Accounts before launch",
      value: String(accountsCount),
      color: "#3b5e04",
      tab: "accounts",
    },
  ];

  const filteredHostRequests = hostRequests.filter((r) => (r.status || "confirmed") === hostTab);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "#7b1f2c",
            color: "#ffffff",
            padding: "14px 22px",
            borderRadius: "6px",
            boxShadow: "0 6px 20px rgba(57, 41, 42, 0.25)",
            zIndex: 99999,
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 600,
            fontSize: "16px",
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Main Container matching Claude Reference */}
      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "clamp(26px, 4vw, 40px) clamp(18px, 4vw, 34px) 64px" }}>
        
        {/* Breadcrumb */}
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>
          <Link href="/admin" style={{ color: "#7b1f2c", textDecoration: "none" }}>
            The Mothers · Admin
          </Link>{" "}
          › Pre-launch desk
        </div>

        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(32px, 4.4vw, 44px)", lineHeight: 1.1, margin: "0 0 9px" }}>
          Pre-launch desk
        </h1>
        <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: "0 0 22px", maxWidth: "64ch" }}>
          The part of Admin that runs until you switch membership on. Membership tools stay on the{" "}
          <Link href="/admin" style={{ color: "#7b1f2c", textDecoration: "none" }}>
            Dashboard
          </Link>
          , ready for launch.
        </p>

        {/* ─── 4 STAT BOXES (Exact Claude Order & Layout) ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: "12px", marginBottom: "26px" }}>
          {statsList.map((s, idx) => {
            const isTabActive = activeTab === s.tab;
            return (
              <div
                key={idx}
                onClick={() => setActiveTab(s.tab as any)}
                style={{
                  border: isTabActive ? "1.5px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.16)",
                  borderRadius: "8px",
                  background: isTabActive ? "rgba(123, 31, 44, 0.04)" : "#fffdfa",
                  padding: "14px 16px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "30px", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: s.color }}>
                  {s.value}
                </div>
                <div style={{ fontSize: "12.5px", color: isTabActive ? "#7b1f2c" : "rgba(57, 41, 42, 0.72)", marginTop: "6px", fontWeight: isTabActive ? 600 : 400 }}>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── 4 TABS ROW ─── */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderBottom: "1px solid rgba(57, 41, 42, 0.16)", paddingBottom: "12px", marginBottom: "20px" }}>
          {[
            { id: "hosts", label: `Host requests (${pendingHostsCount})` },
            { id: "attendance", label: "Attendance & host credits" },
            { id: "circle", label: `La Gazette (${openReportsCount})` },
            { id: "accounts", label: "Accounts & list" },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  border: isActive ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.25)",
                  background: isActive ? "rgba(123, 31, 44, 0.08)" : "transparent",
                  color: isActive ? "#7b1f2c" : "#39292a",
                  borderRadius: "16px",
                  padding: "8px 16px",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "13.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontWeight: isActive ? 600 : 400,
                  transition: "all 0.15s ease",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: HOST REQUESTS ─── */}
        {activeTab === "hosts" && (
          <div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
              {[
                { key: "pending", label: "To review" },
                { key: "confirmed", label: "Accepted" },
                { key: "declined", label: "Declined" },
              ].map((sub) => {
                const count = hostRequests.filter((r) => (r.status || "confirmed") === sub.key).length;
                const isSubActive = hostTab === sub.key;
                return (
                  <button
                    key={sub.key}
                    type="button"
                    onClick={() => setHostTab(sub.key as any)}
                    style={{
                      border: "none",
                      borderBottom: isSubActive ? "2px solid #7b1f2c" : "2px solid transparent",
                      background: "transparent",
                      color: isSubActive ? "#7b1f2c" : "rgba(57, 41, 42, 0.72)",
                      padding: "6px 4px",
                      marginRight: "10px",
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: "13.5px",
                      cursor: "pointer",
                      fontWeight: isSubActive ? 600 : 400,
                    }}
                  >
                    {sub.label} ({count})
                  </button>
                );
              })}
            </div>

            {filteredHostRequests.length === 0 ? (
              <p style={{ fontSize: "14.5px", color: "rgba(57, 41, 42, 0.72)", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px", margin: 0 }}>
                Nothing here.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filteredHostRequests.map((r) => {
                  const isPending = (r.status || "pending") === "pending";
                  const isConfirmed = r.status === "confirmed" || r.status === "accepted";
                  return (
                    <div
                      key={r.id}
                      style={{
                        border: "1px solid rgba(57, 41, 42, 0.16)",
                        borderRadius: "8px",
                        background: "#fffdfa",
                        padding: "16px 18px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px 24px",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px" }}>
                          {r.name}{" "}
                          <span style={{ fontFamily: "'Lora', Georgia, serif", fontWeight: 400, fontSize: "12.5px", color: "rgba(57, 41, 42, 0.66)" }}>
                            · {r.email} · {r.at}
                          </span>
                        </div>
                        <div style={{ fontSize: "14px", marginTop: "4px" }}>
                          {r.event}
                        </div>
                        <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.7)" }}>
                          {r.when}
                        </div>
                      </div>

                      {isPending ? (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            disabled={actionLoading === `host-${r.id}`}
                            onClick={() => handleHostDecision(r.id, "decline")}
                            style={{
                              border: "1px solid rgba(57, 41, 42, 0.28)",
                              background: "transparent",
                              color: "#39292a",
                              borderRadius: "4px",
                              padding: "9px 16px",
                              fontFamily: "'Cormorant Garamond', serif",
                              fontWeight: 600,
                              fontSize: "14px",
                              cursor: "pointer",
                            }}
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading === `host-${r.id}`}
                            onClick={() => handleHostDecision(r.id, "accept")}
                            style={{
                              border: "1px solid #568b05",
                              background: "#568b05",
                              color: "#ffffff",
                              borderRadius: "4px",
                              padding: "9px 16px",
                              fontFamily: "'Cormorant Garamond', serif",
                              fontWeight: 600,
                              fontSize: "14px",
                              cursor: "pointer",
                            }}
                          >
                            Accept & send email
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.72)", maxWidth: "34ch" }}>
                          {isConfirmed
                            ? (r.creditsAwarded ? `Event ran · +${r.creditsAwarded} credits added · thank-you email sent` : "Confirmation email sent")
                            : "Decline email sent · event reopened"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: ATTENDANCE & HOST CREDITS ─── */}
        {activeTab === "attendance" && (
          <div>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: "0 0 14px", maxWidth: "72ch" }}>
              After each event: mark who didn't come (blocks hosting for 90 days, doesn't count as attended), then mark the event as run — the confirmed host gets +2 credits plus 50% of her place back, and a thank-you email.
            </p>

            {attendanceEvents.length === 0 ? (
              <p style={{ fontSize: "14.5px", color: "rgba(57, 41, 42, 0.72)", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px", margin: 0 }}>
                No past events with bookings yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {attendanceEvents.map((e) => (
                  <div key={e.id} style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 18px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 20px", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px" }}>
                          {e.title}
                        </div>
                        <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.7)" }}>
                          {e.meta}
                        </div>
                      </div>

                      {!e.isRan ? (
                        <button
                          type="button"
                          disabled={actionLoading === `run-${e.id}`}
                          onClick={() => handleMarkAsRun(e)}
                          style={{
                            border: "1px solid #7b1f2c",
                            background: "transparent",
                            color: "#7b1f2c",
                            borderRadius: "4px",
                            padding: "8px 14px",
                            fontFamily: "'Cormorant Garamond', serif",
                            fontWeight: 600,
                            fontSize: "13.5px",
                            cursor: "pointer",
                          }}
                        >
                          {actionLoading === `run-${e.id}` ? "..." : "Mark as run"}
                        </button>
                      ) : (
                        <span style={{ fontSize: "12.5px", color: "#3b5e04" }}>
                          Marked as run {e.hostName && `· host credits to ${e.hostName}`}
                        </span>
                      )}
                    </div>

                    {e.people.map((p: any) => (
                      <div
                        key={p.bookingId}
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px 16px",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 0",
                          borderTop: "1px solid rgba(57, 41, 42, 0.1)",
                          fontSize: "13.5px",
                        }}
                      >
                        <span>{p.email}</span>
                        <button
                          type="button"
                          disabled={e.isRan}
                          onClick={() => handleToggleNoShow(e.id, p.personId)}
                          style={{
                            border: p.noShow ? "1px solid #993842" : "1px solid rgba(57, 41, 42, 0.28)",
                            background: "transparent",
                            color: p.noShow ? "#993842" : "#39292a",
                            borderRadius: "4px",
                            padding: "5px 12px",
                            fontFamily: "'Lora', Georgia, serif",
                            fontSize: "12.5px",
                            cursor: e.isRan ? "default" : "pointer",
                          }}
                        >
                          {p.noShow ? "No-show · undo" : "Came  ·  mark no-show"}
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: LA GAZETTE (Exact Match to Claude Reference) ─── */}
        {activeTab === "circle" && (
          <div>
            {/* "Talked about this week" Card */}
            <div style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 18px", marginBottom: "18px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", margin: "0 0 4px" }}>
                “Talked about this week”
              </div>
              <p style={{ fontSize: "13px", lineHeight: 1.55, color: "rgba(57, 41, 42, 0.7)", margin: "0 0 12px", maxWidth: "72ch" }}>
                Topics are ranked automatically from the last 7 days. Pin one to show it first, and block any you never want listed.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: "12px 18px", alignItems: "end" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px", color: "rgba(57, 41, 42, 0.72)" }}>
                  Pinned topic (leave empty for none)
                  <input
                    type="text"
                    value={tagPinned}
                    onChange={(e) => {
                      setTagPinned(e.target.value);
                      setTagSaved("");
                    }}
                    placeholder="e.g. Winter walks"
                    style={{
                      border: "1px solid rgba(57, 41, 42, 0.24)",
                      borderRadius: "4px",
                      background: "#ffffff",
                      padding: "9px 12px",
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: "14px",
                      color: "#39292a",
                    }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px", color: "rgba(57, 41, 42, 0.72)" }}>
                  Blocked topics (comma-separated)
                  <input
                    type="text"
                    value={tagBlocked}
                    onChange={(e) => {
                      setTagBlocked(e.target.value);
                      setTagSaved("");
                    }}
                    placeholder="e.g. Selling, Politics"
                    style={{
                      border: "1px solid rgba(57, 41, 42, 0.24)",
                      borderRadius: "4px",
                      background: "#ffffff",
                      padding: "9px 12px",
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: "14px",
                      color: "#39292a",
                    }}
                  />
                </label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={handleSaveTopics}
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
                    Save topics
                  </button>
                  {tagSaved && <span style={{ fontSize: "12.5px", color: "#3b5e04" }}>{tagSaved}</span>}
                </div>
              </div>
            </div>

            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: "0 0 14px", maxWidth: "72ch" }}>
              Reported posts are hidden from the reporter straight away. Hide removes the post for everyone; Keep clears the report.
            </p>

            {circleReports.length === 0 ? (
              <p style={{ fontSize: "14.5px", color: "rgba(57, 41, 42, 0.72)", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px", margin: 0 }}>
                No reports.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {circleReports.map((r) => {
                  const isHidden = r.postStatus === "hidden" || r.status === "resolved_hidden";
                  const isResolvedKept = r.status === "resolved_dismissed" || r.status === "kept";
                  const statusLabel = isHidden ? "HIDDEN" : isResolvedKept ? "KEPT" : "OPEN";
                  const statusColor = statusLabel === "OPEN" ? "#993842" : "rgba(57,41,42,0.66)";

                  return (
                    <div
                      key={r.id}
                      style={{
                        border: "1px solid rgba(57, 41, 42, 0.16)",
                        borderRadius: "8px",
                        background: "#fffdfa",
                        padding: "16px 18px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px 24px",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ flex: "1 1 360px", minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "11.5px",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: statusColor,
                            marginBottom: "5px",
                            fontWeight: 600,
                          }}
                        >
                          {statusLabel} · {r.reason || "Reported"} · {r.at}
                        </div>
                        <div style={{ fontSize: "14px", lineHeight: 1.55, color: isHidden ? "rgba(57,41,42,0.6)" : "#39292a" }}>
                          {r.body}
                        </div>
                        <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.66)", margin: "4px 0 0" }}>
                          {r.author}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {!isResolvedKept && !isHidden && (
                          <button
                            type="button"
                            disabled={actionLoading === `rep-${r.id}`}
                            onClick={() => handleCircleModerate(r.id, r.postId, "keep")}
                            style={{
                              border: "1px solid rgba(57, 41, 42, 0.28)",
                              background: "transparent",
                              color: "#39292a",
                              borderRadius: "4px",
                              padding: "8px 14px",
                              fontFamily: "'Cormorant Garamond', serif",
                              fontWeight: 600,
                              fontSize: "13.5px",
                              cursor: "pointer",
                            }}
                          >
                            Keep
                          </button>
                        )}

                        {!isHidden ? (
                          <button
                            type="button"
                            disabled={actionLoading === `rep-${r.id}`}
                            onClick={() => handleCircleModerate(r.id, r.postId, "hide")}
                            style={{
                              border: "1px solid #7b1f2c",
                              background: "transparent",
                              color: "#7b1f2c",
                              borderRadius: "4px",
                              padding: "8px 14px",
                              fontFamily: "'Cormorant Garamond', serif",
                              fontWeight: 600,
                              fontSize: "13.5px",
                              cursor: "pointer",
                            }}
                          >
                            Hide post
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoading === `rep-${r.id}`}
                            onClick={() => handleCircleModerate(r.id, r.postId, "restore")}
                            style={{
                              border: "1px solid rgba(57, 41, 42, 0.28)",
                              background: "transparent",
                              color: "#39292a",
                              borderRadius: "4px",
                              padding: "8px 14px",
                              fontFamily: "'Cormorant Garamond', serif",
                              fontWeight: 600,
                              fontSize: "13.5px",
                              cursor: "pointer",
                            }}
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: ACCOUNTS & LIST ─── */}
        {activeTab === "accounts" && (
          <div>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: "0 0 14px", maxWidth: "72ch" }}>
              Accounts created before launch have the joining fee waived when they subscribe. The list is everyone who asked to hear when membership opens.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", gap: "16px", alignItems: "start" }}>
              {/* Accounts - fee waived */}
              <div style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 18px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", marginBottom: "8px" }}>
                  Accounts · fee waived
                </div>
                {initialData.preLaunchAccounts?.length === 0 ? (
                  <p style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)", margin: 0 }}>No accounts yet.</p>
                ) : (
                  initialData.preLaunchAccounts?.map((a: any) => (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px 14px",
                        justifyContent: "space-between",
                        padding: "9px 0",
                        borderTop: "1px solid rgba(57, 41, 42, 0.1)",
                        fontSize: "13.5px",
                      }}
                    >
                      <span>
                        <strong style={{ fontWeight: 600 }}>{a.name}</strong> · {a.email}
                      </span>
                      <span style={{ color: "rgba(57, 41, 42, 0.7)" }}>
                        since {a.joinedAt}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* The list */}
              <div style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 18px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", marginBottom: "8px" }}>
                  The list
                </div>
                {initialData.subscribers?.length === 0 ? (
                  <p style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)", margin: 0 }}>No sign-ups yet.</p>
                ) : (
                  initialData.subscribers?.map((n: any) => (
                    <div
                      key={n.id}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px 14px",
                        justifyContent: "space-between",
                        padding: "9px 0",
                        borderTop: "1px solid rgba(57, 41, 42, 0.1)",
                        fontSize: "13.5px",
                      }}
                    >
                      <span>{n.email}</span>
                      <span style={{ color: "rgba(57, 41, 42, 0.7)" }}>
                        {n.source} · {n.createdAt}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
