"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ReportItem,
  updateReportStatus,
  moderatePost,
  togglePauseAuthorAccount,
  deleteGazettePostAdmin,
  deleteGazetteCommentAdmin,
  getAllGazettePublicationsAdmin,
} from "@/app/actions/adminReports";

export function ReportsAdminClient({ initialReports }: { initialReports: ReportItem[] }) {
  const [activeTab, setActiveTab] = useState<"reports" | "publications">("reports");
  const [reports, setReports] = useState<ReportItem[]>(initialReports);
  const [publications, setPublications] = useState<{ posts: any[]; replies: any[] } | null>(null);
  const [pubLoading, setPubLoading] = useState(false);
  const [pubSearch, setPubSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fetchPublications = async () => {
    setPubLoading(true);
    try {
      const data = await getAllGazettePublicationsAdmin();
      setPublications(data);
    } catch {
      alert("Failed to load publications.");
    } finally {
      setPubLoading(false);
    }
  };

  const handleTabChange = (tab: "reports" | "publications") => {
    setActiveTab(tab);
    if (tab === "publications" && !publications) {
      fetchPublications();
    }
  };

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

  const handleDeletePost = async (postId: string, reportId?: string) => {
    if (!window.confirm("Permanently delete this post and all its replies? This action cannot be undone and will be recorded in the audit log.")) return;
    setLoadingId(postId);
    try {
      await deleteGazettePostAdmin(postId);
      if (reportId) {
        setReports((prev) => prev.filter((r) => r.post?.id !== postId));
      }
      if (publications) {
        setPublications((prev) =>
          prev
            ? {
                posts: prev.posts.filter((p) => p.id !== postId),
                replies: prev.replies.filter((r) => r.postId !== postId),
              }
            : null
        );
      }
      alert("Post permanently deleted.");
    } catch {
      alert("Failed to delete post.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteComment = async (replyId: string) => {
    if (!window.confirm("Permanently delete this comment? This action cannot be undone.")) return;
    setLoadingId(replyId);
    try {
      await deleteGazetteCommentAdmin(replyId);
      if (publications) {
        setPublications((prev) =>
          prev
            ? {
                ...prev,
                replies: prev.replies.filter((r) => r.id !== replyId),
              }
            : null
        );
      }
      alert("Comment permanently deleted.");
    } catch {
      alert("Failed to delete comment.");
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

  const filteredPosts = publications?.posts.filter(
    (p) =>
      !pubSearch ||
      p.body?.toLowerCase().includes(pubSearch.toLowerCase()) ||
      p.author?.toLowerCase().includes(pubSearch.toLowerCase()) ||
      p.topic?.toLowerCase().includes(pubSearch.toLowerCase())
  ) || [];

  const filteredReplies = publications?.replies.filter(
    (r) =>
      !pubSearch ||
      r.body?.toLowerCase().includes(pubSearch.toLowerCase()) ||
      r.author?.toLowerCase().includes(pubSearch.toLowerCase())
  ) || [];

  return (
    <div style={{ padding: "32px 40px", maxWidth: "1200px", margin: "0 auto", fontFamily: "'Lora', Georgia, serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "4px" }}>
            Moderation & Publications
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 400, margin: 0 }}>
            La Gazette Management
          </h1>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link
            href="/gazette"
            target="_blank"
            style={{
              border: "1px solid rgba(57,41,42,0.24)",
              padding: "8px 16px",
              borderRadius: "4px",
              fontSize: "14px",
              color: "#39292a",
              textDecoration: "none",
            }}
          >
            View La Gazette ↗
          </Link>
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
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid rgba(57,41,42,0.18)", marginBottom: "24px" }}>
        <button
          type="button"
          onClick={() => handleTabChange("reports")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "reports" ? "2px solid #7b1f2c" : "2px solid transparent",
            color: activeTab === "reports" ? "#7b1f2c" : "rgba(57,41,42,0.65)",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "17px",
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          Reported Posts ({reports.filter((r) => r.status === "pending" || r.status === "open").length})
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("publications")}
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "publications" ? "2px solid #7b1f2c" : "2px solid transparent",
            color: activeTab === "publications" ? "#7b1f2c" : "rgba(57,41,42,0.65)",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: "17px",
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          All Publications & Comments
        </button>
      </div>

      {/* ─── TAB 1: REPORTED POSTS ─── */}
      {activeTab === "reports" && (
        <>
          {reports.length === 0 ? (
            <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57,41,42,0.18)", borderRadius: "8px", padding: "48px", textAlign: "center", color: "rgba(57,41,42,0.65)" }}>
              ✓ No reports pending review. La Gazette is in good health.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {reports.map((r) => {
                const isLoading = Boolean(loadingId === r.id || (r.post && loadingId === r.post.id));
                return (
                  <div
                    key={r.id}
                    style={{
                      backgroundColor: "#ffffff",
                      border: r.status === "pending" || r.status === "open" ? "1px solid rgba(153,56,66,0.4)" : "1px solid rgba(57,41,42,0.18)",
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
                            backgroundColor: r.status === "pending" || r.status === "open" ? "rgba(153,56,66,0.1)" : "rgba(86,139,5,0.1)",
                            color: r.status === "pending" || r.status === "open" ? "#993842" : "#3b5e04",
                          }}
                        >
                          {r.status === "pending" || r.status === "open" ? "Pending review" : r.status.replace("_", " ")}
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
                          onClick={() => handleDeletePost(r.post!.id, r.id)}
                          style={{
                            backgroundColor: "transparent",
                            color: "#7b1f2c",
                            border: "1px solid #7b1f2c",
                            borderRadius: "4px",
                            padding: "8px 16px",
                            fontFamily: "'Cormorant Garamond', Georgia, serif",
                            fontWeight: 600,
                            fontSize: "14px",
                            cursor: "pointer",
                          }}
                        >
                          Delete permanently
                        </button>

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
        </>
      )}

      {/* ─── TAB 2: ALL PUBLICATIONS & COMMENTS (Tests C-19 to C-21) ─── */}
      {activeTab === "publications" && (
        <div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "18px" }}>
            <input
              type="text"
              placeholder="Search posts or comments by content or author..."
              value={pubSearch}
              onChange={(e) => setPubSearch(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "4px",
                border: "1px solid rgba(57,41,42,0.25)",
                fontSize: "14px",
                fontFamily: "'Lora', Georgia, serif",
              }}
            />
            <button
              type="button"
              onClick={fetchPublications}
              disabled={pubLoading}
              style={{
                border: "1px solid rgba(57,41,42,0.25)",
                background: "#ffffff",
                padding: "10px 18px",
                borderRadius: "4px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {pubLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {pubLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "rgba(57,41,42,0.6)" }}>Loading publications...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
              {/* Posts list */}
              <div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", marginBottom: "12px" }}>
                  Posts ({filteredPosts.length})
                </h3>
                {filteredPosts.length === 0 ? (
                  <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57,41,42,0.18)", borderRadius: "8px", padding: "24px", color: "rgba(57,41,42,0.6)" }}>
                    No posts found.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {filteredPosts.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid rgba(57,41,42,0.18)",
                          borderRadius: "6px",
                          padding: "14px 18px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "14px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "12.5px", color: "rgba(57,41,42,0.65)", marginBottom: "4px" }}>
                            <span><strong>{p.author}</strong> ({p.authorEmail})</span>
                            <span>·</span>
                            <span style={{ textTransform: "capitalize", color: "#7b1f2c", fontWeight: 600 }}>{p.topic}</span>
                            <span>·</span>
                            <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                            <span>·</span>
                            <span>{p.status}</span>
                            {p.reportsCount > 0 && <span style={{ color: "#993842", fontWeight: 600 }}>· {p.reportsCount} report(s)</span>}
                          </div>
                          <p style={{ fontSize: "14px", margin: 0, whiteSpace: "pre-wrap", color: "#39292a" }}>
                            {p.body}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePost(p.id)}
                          disabled={loadingId === p.id}
                          style={{
                            backgroundColor: "transparent",
                            color: "#7b1f2c",
                            border: "1px solid #7b1f2c",
                            borderRadius: "4px",
                            padding: "6px 14px",
                            fontFamily: "'Cormorant Garamond', Georgia, serif",
                            fontWeight: 600,
                            fontSize: "13px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            flex: "none",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comments list */}
              <div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", marginBottom: "12px" }}>
                  Comments & Replies ({filteredReplies.length})
                </h3>
                {filteredReplies.length === 0 ? (
                  <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57,41,42,0.18)", borderRadius: "8px", padding: "24px", color: "rgba(57,41,42,0.6)" }}>
                    No comments found.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {filteredReplies.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid rgba(57,41,42,0.18)",
                          borderRadius: "6px",
                          padding: "14px 18px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "14px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "12.5px", color: "rgba(57,41,42,0.65)", marginBottom: "4px" }}>
                            <span><strong>{r.author}</strong> ({r.authorEmail})</span>
                            <span>·</span>
                            <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                            <span>·</span>
                            <span>{r.status}</span>
                          </div>
                          <p style={{ fontSize: "14px", margin: 0, whiteSpace: "pre-wrap", color: "#39292a" }}>
                            {r.body}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(r.id)}
                          disabled={loadingId === r.id}
                          style={{
                            backgroundColor: "transparent",
                            color: "#7b1f2c",
                            border: "1px solid #7b1f2c",
                            borderRadius: "4px",
                            padding: "6px 14px",
                            fontFamily: "'Cormorant Garamond', Georgia, serif",
                            fontWeight: 600,
                            fontSize: "13px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            flex: "none",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
