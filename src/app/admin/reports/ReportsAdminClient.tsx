"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ReportItem,
  updateReportStatus,
  moderatePost,
  togglePauseAuthorAccount,
} from "@/app/actions/adminReports";

export function ReportsAdminClient({ initialReports }: { initialReports: ReportItem[] }) {
  const [reports, setReports] = useState<ReportItem[]>(initialReports);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleHide = async (reportId: string, postId: string) => {
    setLoadingId(reportId);
    try {
      await moderatePost(postId, "hide");
      await updateReportStatus(reportId, "resolved_hidden");
      setReports((prev) =>
        prev.map((r) => {
          if (r.id === reportId) {
            return {
              ...r,
              status: "resolved_hidden",
              post: r.post ? { ...r.post, status: "hidden" } : null,
            };
          }
          return r;
        })
      );
    } catch {
      alert("Failed to hide post.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleRestore = async (reportId: string, postId: string) => {
    setLoadingId(reportId);
    try {
      await moderatePost(postId, "restore");
      await updateReportStatus(reportId, "resolved_dismissed");
      setReports((prev) =>
        prev.map((r) => {
          if (r.id === reportId) {
            return {
              ...r,
              status: "resolved_dismissed",
              post: r.post ? { ...r.post, status: "visible" } : null,
            };
          }
          return r;
        })
      );
    } catch {
      alert("Failed to restore post.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleTogglePause = async (reportId: string, authorId: string, currentlyPaused: boolean) => {
    const confirmMsg = currentlyPaused
      ? "Unpause this member's account?"
      : "Pause this member's account? They will not be able to post, reply, or make new bookings.";

    if (!window.confirm(confirmMsg)) return;

    setLoadingId(reportId);
    try {
      await togglePauseAuthorAccount(authorId, !currentlyPaused);
      setReports((prev) =>
        prev.map((r) => {
          if (r.post && r.post.authorId === authorId) {
            return {
              ...r,
              post: { ...r.post, isPaused: !currentlyPaused },
            };
          }
          return r;
        })
      );
    } catch {
      alert("Failed to update account pause status.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1200px", margin: "0 auto", fontFamily: "'Lora', Georgia, serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "4px" }}>
            Moderation Queue
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 400, margin: 0 }}>
            The Circle Reports
          </h1>
        </div>
        <Link
          href="/admin"
          style={{
            border: "1px solid rgba(57,41,42,0.24)",
            padding: "8px 16px",
            borderRadius: "4px",
            fontSize: "14px",
            color: "#39292a",
            textDecoration: "none",
          }}
        >
          ← Back to Admin
        </Link>
      </div>

      {reports.length === 0 ? (
        <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57,41,42,0.18)", borderRadius: "8px", padding: "48px", textAlign: "center", color: "rgba(57,41,42,0.65)" }}>
          ✓ No reports pending review. The Circle is in good health.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {reports.map((r) => {
            const isLoading = loadingId === r.id;
            return (
              <div
                key={r.id}
                style={{
                  backgroundColor: "#ffffff",
                  border: r.status === "pending" ? "1px solid rgba(153,56,66,0.4)" : "1px solid rgba(57,41,42,0.18)",
                  borderRadius: "8px",
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        backgroundColor: r.status === "pending" ? "rgba(153,56,66,0.1)" : "rgba(86,139,5,0.1)",
                        color: r.status === "pending" ? "#993842" : "#3b5e04",
                      }}
                    >
                      {r.status === "pending" ? "Pending review" : r.status.replace("_", " ")}
                    </span>
                    <span style={{ fontSize: "13px", color: "rgba(57,41,42,0.7)" }}>
                      Reason: <strong style={{ color: "#39292a" }}>{r.reason}</strong>
                    </span>
                  </div>
                  <span style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.6)" }}>
                    Reported by {r.reporter.name} ({r.reporter.email}) · {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Reported post content */}
                {r.post ? (
                  <div style={{ backgroundColor: "#fdf8f2", border: "1px solid rgba(57,41,42,0.14)", borderRadius: "6px", padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "rgba(57,41,42,0.75)", marginBottom: "6px" }}>
                      <span>
                        Author: <strong>{r.post.authorName}</strong> ({r.post.authorEmail})
                      </span>
                      <span>
                        Status: <strong>{r.post.status}</strong> · {r.post.reportsCount} report(s)
                      </span>
                    </div>
                    <p style={{ fontSize: "15px", lineHeight: 1.6, color: "#39292a", margin: 0, whiteSpace: "pre-wrap" }}>
                      {r.post.body}
                    </p>
                  </div>
                ) : (
                  <div style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.6)" }}>Post already deleted.</div>
                )}

                {/* Actions */}
                {r.post && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", paddingTop: "6px" }}>
                    {r.post.status === "visible" ? (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleHide(r.id, r.post!.id)}
                        style={{
                          backgroundColor: "#993842",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "8px 16px",
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontWeight: 600,
                          fontSize: "14px",
                          cursor: "pointer",
                        }}
                      >
                        Hide post
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleRestore(r.id, r.post!.id)}
                        style={{
                          backgroundColor: "#568b05",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "8px 16px",
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontWeight: 600,
                          fontSize: "14px",
                          cursor: "pointer",
                        }}
                      >
                        Restore post
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleTogglePause(r.id, r.post!.authorId, r.post!.isPaused)}
                      style={{
                        backgroundColor: "transparent",
                        color: r.post.isPaused ? "#3b5e04" : "#993842",
                        border: r.post.isPaused ? "1px solid #3b5e04" : "1px solid #993842",
                        borderRadius: "4px",
                        padding: "8px 16px",
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      {r.post.isPaused ? "Unpause author account" : "Pause author account"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
