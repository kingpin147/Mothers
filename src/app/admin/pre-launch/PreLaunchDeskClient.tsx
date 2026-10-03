"use client";

import React, { useState } from "react";
import Link from "next/link";
import { decideHostRequest, markEventAsRun } from "@/app/actions/host";
import { updateReportStatus, moderatePost } from "@/app/actions/adminReports";

interface PreLaunchDeskProps {
  initialData: any;
}

export function PreLaunchDeskClient({ initialData }: PreLaunchDeskProps) {
  const [activeTab, setActiveTab] = useState<"hosts" | "attendance" | "circle" | "accounts">("hosts");
  const [hostFilter, setHostFilter] = useState<"pending" | "accepted" | "declined">("pending");

  const [hostRequests, setHostRequests] = useState<any[]>(initialData.hostRequests || []);
  const [attendanceEvents, setAttendanceEvents] = useState<any[]>(initialData.attendanceEvents || []);
  const [circleReports, setCircleReports] = useState<any[]>(initialData.circleReports || []);
  const [stats, setStats] = useState<any[]>(initialData.stats || []);

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
          prev.map((r) => (r.id === requestId ? { ...r, status: decision === "accept" ? "accepted" : "declined" } : r))
        );
        showToast(decision === "accept" ? "Host request accepted and email sent!" : "Host request declined.");
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
    if (!confirm(`Mark "${ev.title}" as run? Host will be awarded +2 credits and refunded 50% of place.`)) return;

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
        showToast("Event marked as run! Host rewarded and attendee records updated.");
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
        setCircleReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: "resolved_dismissed" } : r)));
        showToast("Report cleared.");
      } else if (action === "hide") {
        await moderatePost(postId, "hide");
        await updateReportStatus(reportId, "resolved_hidden");
        setCircleReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status: "resolved_hidden", postStatus: "hidden" } : r))
        );
        showToast("Post hidden from all members.");
      } else if (action === "restore") {
        await moderatePost(postId, "restore");
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

  const filteredHostRequests = hostRequests.filter((r) => r.status === hostFilter);

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

      {/* Main Container */}
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
          The operations desk running until membership opens. Manage host requests, mark event attendance, moderate La Gazette posts, and audit pre-launch accounts.
        </p>

        {/* ─── STAT CARDS ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: "12px", marginBottom: "26px" }}>
          {stats.map((s, idx) => (
            <div key={idx} style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#fffdfa", padding: "14px 16px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "30px", lineHeight: 1, fontFeatureSettings: "'tnum'", color: s.color }}>
                {s.value}
              </div>
              <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.72)", marginTop: "6px" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ─── TAB NAVIGATION ─── */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderBottom: "1px solid rgba(57, 41, 42, 0.16)", paddingBottom: "12px", marginBottom: "20px" }}>
          {[
            { id: "hosts", label: "Host requests" },
            { id: "attendance", label: 'Attendance & "Mark as run"' },
            { id: "circle", label: "La Gazette reports" },
            { id: "accounts", label: "Accounts & list" },
          ].map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  border: isActive ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.2)",
                  backgroundColor: isActive ? "#7b1f2c" : "#fffdfa",
                  color: isActive ? "#ffffff" : "#39292a",
                  borderRadius: "16px",
                  padding: "8px 18px",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "13.5px",
                  cursor: "pointer",
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
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", borderBottom: "1px solid rgba(57, 41, 42, 0.1)", paddingBottom: "8px" }}>
              {(["pending", "accepted", "declined"] as const).map((filter) => {
                const isActive = hostFilter === filter;
                return (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setHostFilter(filter)}
                    style={{
                      border: "none",
                      borderBottom: isActive ? "2px solid #7b1f2c" : "2px solid transparent",
                      backgroundColor: "transparent",
                      color: isActive ? "#7b1f2c" : "rgba(57, 41, 42, 0.7)",
                      fontWeight: isActive ? 600 : 400,
                      padding: "6px 4px",
                      fontFamily: "'Lora', Georgia, serif",
                      fontSize: "13.5px",
                      textTransform: "capitalize",
                      cursor: "pointer",
                    }}
                  >
                    {filter} ({hostRequests.filter((r) => r.status === filter).length})
                  </button>
                );
              })}
            </div>

            {filteredHostRequests.length === 0 ? (
              <p style={{ fontSize: "14.5px", color: "rgba(57, 41, 42, 0.72)", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#fffdfa", padding: "20px", margin: 0 }}>
                No {hostFilter} host requests.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {filteredHostRequests.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid rgba(57, 41, 42, 0.16)",
                      borderRadius: "8px",
                      backgroundColor: "#fffdfa",
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
                      <div style={{ fontSize: "14px", marginTop: "4px", fontWeight: 500 }}>
                        {r.event}
                      </div>
                      <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.7)" }}>
                        {r.when}
                      </div>
                    </div>

                    {r.status === "pending" ? (
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          disabled={actionLoading === `host-${r.id}`}
                          onClick={() => handleHostDecision(r.id, "decline")}
                          style={{
                            border: "1px solid rgba(57, 41, 42, 0.28)",
                            backgroundColor: "transparent",
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
                            backgroundColor: "#568b05",
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
                      <div style={{ fontSize: "12.5px", color: r.status === "accepted" ? "#3b5e04" : "#993842", fontWeight: 600, textTransform: "capitalize" }}>
                        {r.status} {r.status === "accepted" && "(+2 credits pending event run)"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: ATTENDANCE & MARK AS RUN ─── */}
        {activeTab === "attendance" && (
          <div>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: "0 0 14px", maxWidth: "72ch" }}>
              After each event: toggle attendees who did not show up (blocks hosting for 90 days), then click "Mark as run" — the confirmed host receives +2 credits plus 50% credit refund, and a thank-you email is sent.
            </p>

            {attendanceEvents.length === 0 ? (
              <p style={{ fontSize: "14.5px", color: "rgba(57, 41, 42, 0.72)", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#fffdfa", padding: "20px", margin: 0 }}>
                No past events with bookings yet.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {attendanceEvents.map((e) => (
                  <div key={e.id} style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#fffdfa", padding: "18px 20px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 20px", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div>
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", color: "#39292a" }}>
                          {e.title}
                        </div>
                        <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.72)", marginTop: "2px" }}>
                          {e.meta} {e.hostName && `· Host: ${e.hostName}`}
                        </div>
                      </div>

                      {!e.isRan ? (
                        <button
                          type="button"
                          disabled={actionLoading === `run-${e.id}`}
                          onClick={() => handleMarkAsRun(e)}
                          style={{
                            border: "1px solid #7b1f2c",
                            backgroundColor: "#7b1f2c",
                            color: "#ffffff",
                            borderRadius: "4px",
                            padding: "8px 18px",
                            fontFamily: "'Cormorant Garamond', serif",
                            fontWeight: 600,
                            fontSize: "14px",
                            cursor: "pointer",
                          }}
                        >
                          {actionLoading === `run-${e.id}` ? "..." : "Mark as run"}
                        </button>
                      ) : (
                        <span style={{ fontSize: "13px", color: "#3b5e04", fontWeight: 600 }}>
                          ✓ Marked as run ({e.ranAt})
                        </span>
                      )}
                    </div>

                    {e.people.length === 0 ? (
                      <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.6)", paddingTop: "8px", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
                        No attendee bookings on this event.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {e.people.map((p: any) => (
                          <div
                            key={p.bookingId}
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "8px 16px",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 0",
                              borderTop: "1px solid rgba(57, 41, 42, 0.1)",
                              fontSize: "13.5px",
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 600 }}>{p.name}</span>
                              <span style={{ color: "rgba(57, 41, 42, 0.65)", marginLeft: "8px" }}>({p.email})</span>
                            </div>

                            <button
                              type="button"
                              disabled={e.isRan}
                              onClick={() => handleToggleNoShow(e.id, p.personId)}
                              style={{
                                border: p.noShow ? "1px solid #993842" : "1px solid #568b05",
                                backgroundColor: p.noShow ? "rgba(153, 56, 66, 0.08)" : "rgba(86, 139, 5, 0.08)",
                                color: p.noShow ? "#993842" : "#3b5e04",
                                borderRadius: "4px",
                                padding: "4px 12px",
                                fontFamily: "'Lora', Georgia, serif",
                                fontSize: "12px",
                                cursor: e.isRan ? "default" : "pointer",
                              }}
                            >
                              {p.noShow ? "✕ No-show (Did not come)" : "✓ Attended"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: CIRCLE REPORTS ─── */}
        {activeTab === "circle" && (
          <div>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: "0 0 14px", maxWidth: "72ch" }}>
              Reported posts are reviewed here. "Hide post" removes the post from all members; "Keep" clears the report and keeps the post visible.
            </p>

            {circleReports.length === 0 ? (
              <p style={{ fontSize: "14.5px", color: "rgba(57, 41, 42, 0.72)", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#fffdfa", padding: "20px", margin: 0 }}>
                No active La Gazette reports.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {circleReports.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      border: "1px solid rgba(57, 41, 42, 0.16)",
                      borderRadius: "8px",
                      backgroundColor: "#fffdfa",
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
                          color: r.status === "open" ? "#7b1f2c" : "#3b5e04",
                          marginBottom: "5px",
                          fontWeight: 600,
                        }}
                      >
                        {r.status} · Reason: {r.reason} · {r.at}
                      </div>
                      <div style={{ fontSize: "14px", lineHeight: 1.55, fontStyle: r.postStatus === "hidden" ? "italic" : "normal", color: r.postStatus === "hidden" ? "rgba(57, 41, 42, 0.5)" : "#39292a" }}>
                        "{r.body}"
                      </div>
                      <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.66)", marginTop: "4px" }}>
                        Author: {r.author}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {r.status === "open" && (
                        <button
                          type="button"
                          disabled={actionLoading === `rep-${r.id}`}
                          onClick={() => handleCircleModerate(r.id, r.postId, "keep")}
                          style={{
                            border: "1px solid rgba(57, 41, 42, 0.28)",
                            backgroundColor: "transparent",
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

                      {r.postStatus !== "hidden" ? (
                        <button
                          type="button"
                          disabled={actionLoading === `rep-${r.id}`}
                          onClick={() => handleCircleModerate(r.id, r.postId, "hide")}
                          style={{
                            border: "1px solid #7b1f2c",
                            backgroundColor: "#7b1f2c",
                            color: "#ffffff",
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
                            backgroundColor: "transparent",
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
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: ACCOUNTS & LIST ─── */}
        {activeTab === "accounts" && (
          <div>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.72)", margin: "0 0 14px", maxWidth: "72ch" }}>
              Accounts created before launch have no joining fee. The list contains mothers subscribed to hear first when membership opens.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 480px), 1fr))", gap: "20px", alignItems: "start" }}>
              {/* Pre-launch Accounts */}
              <div style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#fffdfa", padding: "18px 20px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "20px", marginBottom: "12px", color: "#39292a" }}>
                  Registered Accounts ({initialData.preLaunchAccounts?.length || 0})
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {initialData.preLaunchAccounts?.map((a: any) => (
                    <div
                      key={a.id}
                      style={{
                        padding: "10px 0",
                        borderTop: "1px solid rgba(57, 41, 42, 0.1)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "14px" }}>
                          <Link href={`/admin/members/${a.id}`} style={{ color: "#7b1f2c", textDecoration: "none" }}>
                            {a.name}
                          </Link>
                          {a.createdBeforeLaunch && (
                            <span style={{ fontSize: "11px", backgroundColor: "rgba(86, 139, 5, 0.12)", color: "#3b5e04", border: "1px solid rgba(86, 139, 5, 0.3)", borderRadius: "10px", padding: "1px 8px", marginLeft: "8px" }}>
                              Pre-launch account
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.65)" }}>
                          {a.email} · {a.phone} · Joined {a.joinedAt}
                        </div>
                      </div>

                      {a.isSuspended && (
                        <span style={{ fontSize: "11px", color: "#993842", fontWeight: 600 }}>
                          Suspended
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* The Letter / Waitlist Leads */}
              <div style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#fffdfa", padding: "18px 20px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "20px", marginBottom: "12px", color: "#39292a" }}>
                  The Letter / Waitlist Leads ({initialData.subscribers?.length || 0})
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {initialData.subscribers?.map((s: any) => (
                    <div
                      key={s.id}
                      style={{
                        padding: "10px 0",
                        borderTop: "1px solid rgba(57, 41, 42, 0.1)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "13.5px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.email}</div>
                        <div style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.6)" }}>
                          Source: {s.source} · {s.createdAt}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
