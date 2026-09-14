"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  getAdminJournalPosts,
  duplicateJournalPost,
  updateJournalPostSlug,
  toggleJournalPostStatus,
} from "@/app/actions/adminCms";
import { JOURNAL_CATEGORIES, getCategoryLabel } from "@/lib/journalCategories";
import JournalEditorModal, { JournalPostData } from "./JournalEditorModal";

const WINE = "#7b1f2c";
const AMBER = "#a8752c";
const GREEN = "#3f6604";
const GREY = "rgba(57,41,42,0.55)";

export default function AdminJournalPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("newest");

  // Modal editor
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<JournalPostData | null>(null);

  // Menu & slug prompts
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [slugPromptId, setSlugPromptId] = useState<string | null>(null);
  const [slugVal, setSlugVal] = useState("");

  const fetchPosts = async () => {
    setLoading(true);
    const res = await getAdminJournalPosts();
    setLoading(false);
    if (res.success && res.posts) {
      setPosts(res.posts);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const now = new Date();

  // Statistics calculation
  const liveCount = posts.filter(
    (p) => p.status === "published" && (!p.publishedAt || new Date(p.publishedAt) <= now)
  ).length;

  const liveMembersOnly = posts.filter(
    (p) =>
      p.status === "published" &&
      (!p.publishedAt || new Date(p.publishedAt) <= now) &&
      p.audience === "members_only"
  ).length;

  const scheduledPosts = posts.filter(
    (p) =>
      p.status === "scheduled" ||
      (p.status === "published" && p.publishedAt && new Date(p.publishedAt) > now)
  );
  const scheduledCount = scheduledPosts.length;
  const nextScheduled = scheduledPosts.sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  )[0];

  const draftPosts = posts.filter((p) => p.status === "draft");
  const draftCount = draftPosts.length;
  const staleDrafts = draftPosts.filter(
    (p) => now.getTime() - new Date(p.updatedAt).getTime() > 30 * 24 * 60 * 60 * 1000
  ).length;

  const totalReads = posts.reduce((sum, p) => sum + (p.views || 0), 0);
  const memberReads = posts
    .filter((p) => p.audience === "members_only")
    .reduce((sum, p) => sum + (p.views || 0), 0);

  // Filtering
  const q = query.trim().toLowerCase();

  let filtered = posts.filter((p) => {
    const isScheduled =
      p.status === "scheduled" ||
      (p.status === "published" && p.publishedAt && new Date(p.publishedAt) > now);
    const isLive =
      p.status === "published" && (!p.publishedAt || new Date(p.publishedAt) <= now);
    const isDraft = p.status === "draft";
    const isUnpublished = p.status === "unpublished";

    let statusMatched = true;
    if (statusFilter === "published") statusMatched = isLive;
    if (statusFilter === "scheduled") statusMatched = isScheduled;
    if (statusFilter === "draft") statusMatched = isDraft;
    if (statusFilter === "unpublished") statusMatched = isUnpublished;

    let audienceMatched = true;
    if (audienceFilter === "public") audienceMatched = p.audience === "public";
    if (audienceFilter === "members_only") audienceMatched = p.audience === "members_only";

    let categoryMatched = true;
    if (categoryFilter !== "all") {
      categoryMatched = (p.category || "").toLowerCase() === categoryFilter.toLowerCase();
    }

    const textMatched =
      !q ||
      `${p.title || ""} ${p.titleEs || ""} ${p.author || ""} ${p.slug || ""}`
        .toLowerCase()
        .includes(q);

    return statusMatched && audienceMatched && categoryMatched && textMatched;
  });

  // Sorting
  if (sortFilter === "newest") {
    filtered = filtered
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sortFilter === "oldest") {
    filtered = filtered
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (sortFilter === "read") {
    filtered = filtered.slice().sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (sortFilter === "stale") {
    filtered = filtered
      .slice()
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
  }

  // Action handlers
  const handleOpenCreateModal = () => {
    setSelectedPost(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: any) => {
    setSelectedPost(p);
    setModalOpen(true);
    setMenuOpenId(null);
  };

  const handleTogglePublish = async (p: any) => {
    let action: "publish" | "unpublish" | "restore" | "draft" = "publish";
    if (p.status === "published" || p.status === "scheduled") {
      action = "unpublish";
    } else if (p.status === "unpublished") {
      action = "restore";
    } else {
      action = "publish";
    }

    await toggleJournalPostStatus(p.id, action);
    fetchPosts();
  };

  const handleDuplicate = async (id: string) => {
    setMenuOpenId(null);
    const res = await duplicateJournalPost(id);
    if (res.success) {
      fetchPosts();
    } else {
      alert(res.error || "Failed to duplicate article.");
    }
  };

  const handleSaveSlug = async (id: string) => {
    if (!slugVal.trim()) return;
    const res = await updateJournalPostSlug(id, slugVal.trim());
    if (res.success) {
      setSlugPromptId(null);
      setMenuOpenId(null);
      fetchPosts();
    } else {
      alert(res.error || "Failed to update slug.");
    }
  };

  const formatDateLabel = (p: any) => {
    const isScheduled =
      p.status === "scheduled" ||
      (p.status === "published" && p.publishedAt && new Date(p.publishedAt) > now);

    if (isScheduled && p.publishedAt) {
      return {
        date: new Date(p.publishedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        note: `goes live ${new Date(p.publishedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      };
    }

    if (p.status === "published" && p.publishedAt) {
      return {
        date: new Date(p.publishedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        note: "published",
      };
    }

    if (p.status === "unpublished") {
      return {
        date: new Date(p.updatedAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        note: "taken down",
      };
    }

    const daysSince = Math.floor(
      (now.getTime() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      date: `Edited ${new Date(p.updatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })}`,
      note: daysSince > 30 ? `untouched ${daysSince} days` : "in progress",
    };
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8efe2",
        color: "#39292a",
        fontFamily: "'Lora', Georgia, serif",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 60px",
        }}
      >
        {/* ─── Header ────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "22px",
          }}
        >
          <div style={{ flex: "1 1 400px" }}>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "12px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: WINE,
                marginBottom: "9px",
              }}
            >
              <Link href="/admin" style={{ color: WINE }}>
                ← Dashboard
              </Link>{" "}
              · Content · Journal
            </div>
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: "clamp(30px, 4vw, 42px)",
                lineHeight: 1.1,
                margin: "0 0 9px",
              }}
            >
              The journal
            </h1>
            <p
              style={{
                fontSize: "14.5px",
                lineHeight: 1.6,
                color: "rgba(57,41,42,0.72)",
                margin: 0,
                maxWidth: "70ch",
                textWrap: "pretty",
              }}
            >
              What we have written, what is still being written, and what is scheduled. An
              article can be for everyone or for members only — and that is the one setting worth
              being certain about.
            </p>
          </div>

          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap", alignItems: "center" }}>
            <Link
              href="/journal"
              target="_blank"
              style={{
                border: "1px solid rgba(57,41,42,0.3)",
                color: "#39292a",
                borderRadius: "4px",
                padding: "9px 15px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "13.5px",
                whiteSpace: "nowrap",
                textDecoration: "none",
              }}
            >
              View the journal ↗
            </Link>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              style={{
                border: `1px solid ${WINE}`,
                background: WINE,
                color: "#f8efe2",
                borderRadius: "4px",
                padding: "9px 18px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "13.5px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 4px rgba(123,31,44,0.15)",
              }}
            >
              + Write an article
            </button>
          </div>
        </div>

        {/* ─── Metric Stat Cards ─────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "6px",
              background: "#fffdfa",
              padding: "15px 17px",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "24px",
                lineHeight: 1.1,
                color: "#39292a",
              }}
            >
              {posts.length}
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "10.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(57,41,42,0.55)",
                marginTop: "6px",
              }}
            >
              Articles
            </div>
            <div style={{ fontSize: "11.5px", color: "rgba(57,41,42,0.6)", marginTop: "5px" }}>
              across {JOURNAL_CATEGORIES.length} categories
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "6px",
              background: "#fffdfa",
              padding: "15px 17px",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "24px",
                lineHeight: 1.1,
                color: GREEN,
              }}
            >
              {liveCount}
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "10.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(57,41,42,0.55)",
                marginTop: "6px",
              }}
            >
              Live on the journal
            </div>
            <div style={{ fontSize: "11.5px", color: "rgba(57,41,42,0.6)", marginTop: "5px" }}>
              {liveMembersOnly} members only
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "6px",
              background: "#fffdfa",
              padding: "15px 17px",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "24px",
                lineHeight: 1.1,
                color: AMBER,
              }}
            >
              {scheduledCount}
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "10.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(57,41,42,0.55)",
                marginTop: "6px",
              }}
            >
              Scheduled
            </div>
            <div style={{ fontSize: "11.5px", color: "rgba(57,41,42,0.6)", marginTop: "5px" }}>
              {nextScheduled
                ? `next on ${new Date(nextScheduled.publishedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}`
                : "nothing queued"}
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "6px",
              background: "#fffdfa",
              padding: "15px 17px",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "24px",
                lineHeight: 1.1,
                color: GREY,
              }}
            >
              {draftCount}
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "10.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(57,41,42,0.55)",
                marginTop: "6px",
              }}
            >
              In draft
            </div>
            <div style={{ fontSize: "11.5px", color: "rgba(57,41,42,0.6)", marginTop: "5px" }}>
              {staleDrafts > 0 ? `${staleDrafts} untouched over a month` : "all recently edited"}
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "6px",
              background: "#fffdfa",
              padding: "15px 17px",
            }}
          >
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "24px",
                lineHeight: 1.1,
                color: "#39292a",
              }}
            >
              {totalReads.toLocaleString()}
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "10.5px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(57,41,42,0.55)",
                marginTop: "6px",
              }}
            >
              Reads on live articles
            </div>
            <div style={{ fontSize: "11.5px", color: "rgba(57,41,42,0.6)", marginTop: "5px" }}>
              {memberReads.toLocaleString()} on members-only
            </div>
          </div>
        </div>

        {/* ─── Search & Filters Bar ──────────────────────────── */}
        <div
          style={{
            border: "1px solid rgba(57,41,42,0.16)",
            borderRadius: "8px",
            background: "#fffdfa",
            padding: "16px 18px",
            marginBottom: "16px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, author or slug..."
            style={{
              flex: "1 1 230px",
              border: "1px solid rgba(57,41,42,0.25)",
              borderRadius: "4px",
              padding: "10px 13px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "14px",
              color: "#39292a",
              background: "#fff",
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              border: "1px solid rgba(57,41,42,0.25)",
              borderRadius: "4px",
              padding: "10px 12px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "14px",
              color: "#39292a",
              background: "#fff",
            }}
          >
            <option value="all">Any status</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
            <option value="unpublished">Unpublished</option>
          </select>

          <select
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value)}
            style={{
              border: "1px solid rgba(57,41,42,0.25)",
              borderRadius: "4px",
              padding: "10px 12px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "14px",
              color: "#39292a",
              background: "#fff",
            }}
          >
            <option value="all">Any audience</option>
            <option value="public">Public</option>
            <option value="members_only">Members only</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              border: "1px solid rgba(57,41,42,0.25)",
              borderRadius: "4px",
              padding: "10px 12px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "14px",
              color: "#39292a",
              background: "#fff",
            }}
          >
            <option value="all">Every category</option>
            {JOURNAL_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.labelEn} ({c.labelEs})
              </option>
            ))}
          </select>

          <select
            value={sortFilter}
            onChange={(e) => setSortFilter(e.target.value)}
            style={{
              border: "1px solid rgba(57,41,42,0.25)",
              borderRadius: "4px",
              padding: "10px 12px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "14px",
              color: "#39292a",
              background: "#fff",
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="read">Most read</option>
            <option value="stale">Longest unedited</option>
          </select>
        </div>

        {/* ─── Articles Table ────────────────────────────────── */}
        <div
          style={{
            border: "1px solid rgba(57,41,42,0.16)",
            borderRadius: "8px",
            background: "#fffdfa",
            overflowX: "auto",
            marginBottom: "24px",
          }}
        >
          <div style={{ minWidth: "1100px" }}>
            {/* Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2.5fr 1.2fr 1fr 1.1fr 0.8fr 1.4fr",
                gap: "14px",
                padding: "14px 18px",
                borderBottom: "1px solid rgba(57,41,42,0.18)",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "11px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(57,41,42,0.55)",
              }}
            >
              <div>Article</div>
              <div>Category &amp; Author</div>
              <div>Audience</div>
              <div>Date</div>
              <div>Reads</div>
              <div>Status &amp; Actions</div>
            </div>

            {/* Loading / Empty */}
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "rgba(57,41,42,0.6)" }}>
                Loading journal articles...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "32px 18px", textAlign: "center", color: "rgba(57,41,42,0.6)" }}>
                No article matches your filters. Try widening the filters or{" "}
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: WINE,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  write a new article
                </button>
                .
              </div>
            ) : (
              filtered.map((p) => {
                const isScheduled =
                  p.status === "scheduled" ||
                  (p.status === "published" && p.publishedAt && new Date(p.publishedAt) > now);
                const isLive =
                  p.status === "published" && (!p.publishedAt || new Date(p.publishedAt) <= now);
                const isDraft = p.status === "draft";
                const isUnpublished = p.status === "unpublished";

                const dateInfo = formatDateLabel(p);

                const statusColor = isLive
                  ? GREEN
                  : isScheduled
                  ? AMBER
                  : isDraft
                  ? GREY
                  : "rgba(57,41,42,0.4)";

                const displayStatus = isLive
                  ? "Published"
                  : isScheduled
                  ? "Scheduled"
                  : isDraft
                  ? "Draft"
                  : "Unpublished";

                return (
                  <div
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2.5fr 1.2fr 1fr 1.1fr 0.8fr 1.4fr",
                      gap: "14px",
                      padding: "16px 18px",
                      borderBottom: "1px solid rgba(57,41,42,0.1)",
                      alignItems: "start",
                      backgroundColor:
                        isDraft || isUnpublished
                          ? "rgba(57,41,42,0.02)"
                          : isScheduled
                          ? "rgba(168,117,44,0.04)"
                          : "transparent",
                    }}
                  >
                    {/* Article info */}
                    <div style={{ minWidth: 0, display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      {p.heroImageUrl && (
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "4px",
                            overflow: "hidden",
                            flexShrink: 0,
                            border: "1px solid rgba(57,41,42,0.15)",
                          }}
                        >
                          <img
                            src={p.heroImageUrl}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                      )}

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontWeight: 600,
                            fontSize: "16px",
                            lineHeight: 1.3,
                            marginBottom: "4px",
                            color: "#39292a",
                          }}
                        >
                          {p.title}
                        </div>

                        {p.titleEs && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "rgba(57,41,42,0.65)",
                              fontStyle: "italic",
                              marginBottom: "4px",
                            }}
                          >
                            🇪🇸 {p.titleEs}
                          </div>
                        )}

                        <div
                          style={{
                            fontSize: "12.5px",
                            lineHeight: 1.5,
                            color: "rgba(57,41,42,0.68)",
                            marginBottom: "5px",
                          }}
                        >
                          {p.excerpt}
                        </div>

                        <div
                          style={{
                            fontSize: "11.5px",
                            color: "rgba(57,41,42,0.5)",
                            fontFamily: "'Cormorant Garamond', serif",
                          }}
                        >
                          /journal/{p.slug}
                        </div>

                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                          {p.titleEs && (
                            <span
                              style={{
                                border: "1px solid rgba(63,102,4,0.4)",
                                color: GREEN,
                                borderRadius: "3px",
                                padding: "2px 6px",
                                fontSize: "10.5px",
                                fontFamily: "'Cormorant Garamond', serif",
                                fontWeight: 600,
                              }}
                            >
                              Bilingual (EN + ES)
                            </span>
                          )}
                          {isDraft && dateInfo.note.includes("untouched") && (
                            <span
                              style={{
                                border: `1px solid ${AMBER}`,
                                color: AMBER,
                                borderRadius: "3px",
                                padding: "2px 6px",
                                fontSize: "10.5px",
                                fontFamily: "'Cormorant Garamond', serif",
                                fontWeight: 600,
                              }}
                            >
                              Stale draft
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Category & Author */}
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500 }}>
                        {getCategoryLabel(p.category, "en")}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "rgba(57,41,42,0.65)",
                          marginTop: "3px",
                        }}
                      >
                        {p.author}
                        {p.authorRoleEn ? ` · ${p.authorRoleEn}` : ""}
                      </div>
                    </div>

                    {/* Audience */}
                    <div>
                      <span
                        style={{
                          display: "inline-block",
                          border: `1px solid ${
                            p.audience === "members_only" ? WINE : GREEN
                          }`,
                          color: p.audience === "members_only" ? WINE : GREEN,
                          borderRadius: "3px",
                          padding: "3px 8px",
                          fontFamily: "'Cormorant Garamond', serif",
                          fontWeight: 600,
                          fontSize: "11.5px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.audience === "members_only" ? "Members only" : "Public"}
                      </span>
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: "rgba(57,41,42,0.6)",
                          marginTop: "4px",
                        }}
                      >
                        {p.audience === "members_only"
                          ? "invisible to non-members"
                          : "anyone can read"}
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <div style={{ fontSize: "13px", fontVariantNumeric: "tabular-nums" }}>
                        {dateInfo.date}
                      </div>
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: "rgba(57,41,42,0.6)",
                          marginTop: "3px",
                        }}
                      >
                        {dateInfo.note}
                      </div>
                    </div>

                    {/* Reads */}
                    <div>
                      <div
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontWeight: 600,
                          fontSize: "17px",
                          color: (p.views || 0) > 0 ? "#39292a" : GREY,
                        }}
                      >
                        {(p.views || 0) > 0 ? (p.views || 0).toLocaleString() : "—"}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          border: `1px solid ${statusColor}`,
                          color: statusColor,
                          borderRadius: "3px",
                          padding: "3px 8px",
                          fontFamily: "'Cormorant Garamond', serif",
                          fontWeight: 600,
                          fontSize: "11.5px",
                          letterSpacing: "0.04em",
                          width: "fit-content",
                        }}
                      >
                        {displayStatus}
                      </span>

                      <div
                        style={{
                          display: "flex",
                          gap: "7px",
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(p)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: WINE,
                            fontSize: "13px",
                            cursor: "pointer",
                            padding: 0,
                            textDecoration: "underline",
                          }}
                        >
                          Edit
                        </button>
                        <span style={{ color: "rgba(57,41,42,0.3)" }}>·</span>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(p)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: WINE,
                            fontSize: "13px",
                            cursor: "pointer",
                            padding: 0,
                            textDecoration: "underline",
                          }}
                        >
                          {isLive ? "Unpublish" : isScheduled ? "Publish now" : isUnpublished ? "Restore" : "Publish"}
                        </button>
                        <span style={{ color: "rgba(57,41,42,0.3)" }}>·</span>

                        <div style={{ position: "relative" }}>
                          <button
                            type="button"
                            onClick={() =>
                              setMenuOpenId(menuOpenId === p.id ? null : p.id)
                            }
                            style={{
                              border: "none",
                              background: "transparent",
                              color: WINE,
                              fontSize: "13px",
                              cursor: "pointer",
                              padding: 0,
                              textDecoration: "underline",
                            }}
                          >
                            More
                          </button>

                          {menuOpenId === p.id && (
                            <div
                              style={{
                                position: "absolute",
                                right: 0,
                                top: "100%",
                                zIndex: 100,
                                border: "1px solid rgba(57,41,42,0.2)",
                                borderRadius: "6px",
                                background: "#fff",
                                padding: "6px 0",
                                minWidth: "190px",
                                boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleDuplicate(p.id)}
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "7px 14px",
                                  border: "none",
                                  background: "transparent",
                                  fontSize: "13px",
                                  color: "#39292a",
                                  cursor: "pointer",
                                }}
                              >
                                📋 Duplicate as draft
                              </button>

                              <Link
                                href={`/journal/${p.slug}`}
                                target="_blank"
                                style={{
                                  display: "block",
                                  padding: "7px 14px",
                                  fontSize: "13px",
                                  color: "#39292a",
                                  textDecoration: "none",
                                }}
                              >
                                🔗 View on live site ↗
                              </Link>

                              {!isLive && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSlugPromptId(p.id);
                                    setSlugVal(p.slug);
                                    setMenuOpenId(null);
                                  }}
                                  style={{
                                    width: "100%",
                                    textAlign: "left",
                                    padding: "7px 14px",
                                    border: "none",
                                    background: "transparent",
                                    fontSize: "13px",
                                    color: "#39292a",
                                    cursor: "pointer",
                                  }}
                                >
                                  ✏️ Change slug
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {slugPromptId === p.id && (
                        <div
                          style={{
                            marginTop: "6px",
                            display: "flex",
                            gap: "6px",
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="text"
                            value={slugVal}
                            onChange={(e) => setSlugVal(e.target.value)}
                            style={{
                              padding: "4px 8px",
                              fontSize: "12px",
                              borderRadius: "4px",
                              border: "1px solid rgba(57,41,42,0.25)",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveSlug(p.id)}
                            style={{
                              padding: "4px 8px",
                              fontSize: "12px",
                              backgroundColor: WINE,
                              color: "#fff",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setSlugPromptId(null)}
                            style={{
                              padding: "4px 8px",
                              fontSize: "12px",
                              border: "1px solid rgba(57,41,42,0.25)",
                              backgroundColor: "transparent",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── Bottom Reference & Guidelines Cards ───────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: "16px",
          }}
        >
          <div
            style={{
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "8px",
              background: "#fffdfa",
              padding: "18px 20px",
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "19px",
                margin: "0 0 10px",
              }}
            >
              Editorial Standards
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "13px",
                lineHeight: 1.6,
                color: "rgba(57,41,42,0.75)",
              }}
            >
              <div>
                <strong style={{ fontWeight: 600 }}>Bilingual parity:</strong> Ensure English and
                Spanish versions maintain consistent depth, tone, and practical advice.
              </div>
              <div>
                <strong style={{ fontWeight: 600 }}>Accessible imagery:</strong> Always provide
                descriptive alt text for every uploaded hero cover image.
              </div>
              <div>
                <strong style={{ fontWeight: 600 }}>Pull Quotes:</strong> Highlight the most
                salient sentence to guide reader skimming.
              </div>
            </div>
          </div>

          <div
            style={{
              border: "1px solid rgba(57,41,42,0.16)",
              borderRadius: "8px",
              background: "#fffdfa",
              padding: "18px 20px",
            }}
          >
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "19px",
                margin: "0 0 10px",
              }}
            >
              Rules this page holds
            </h2>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "13px",
                lineHeight: 1.6,
                color: "rgba(57,41,42,0.75)",
              }}
            >
              <div>
                A slug is set once and preserved after publishing — old links must keep working.
              </div>
              <div>
                Members-only articles are invisible to non-members: omitted from public feeds and
                protected by access checks.
              </div>
              <div>
                There is no hard delete. Unpublishing removes an article from the live journal while
                preserving all historical records and read analytics.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Full Bilingual Journal Editor Modal ─────────────── */}
      <JournalEditorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        post={selectedPost}
        onSaved={fetchPosts}
      />
    </div>
  );
}
