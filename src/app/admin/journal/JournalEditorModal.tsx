"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { JOURNAL_CATEGORIES, getCategoryLabel } from "@/lib/journalCategories";
import { saveJournalPost, deleteJournalPost } from "@/app/actions/adminCms";

const WINE = "#7b1f2c";
const GREEN = "#3f6604";
const AMBER = "#a8752c";
const GREY = "rgba(57, 41, 42, 0.55)";

export interface JournalPostData {
  id?: string;
  title: string;
  titleEs?: string | null;
  slug?: string;
  category: string;
  excerpt: string;
  excerptEs?: string | null;
  body: string;
  bodyEs?: string | null;
  quoteEn?: string | null;
  quoteEs?: string | null;
  author: string;
  authorRoleEn?: string | null;
  authorRoleEs?: string | null;
  bylineEn?: string | null;
  bylineEs?: string | null;
  reviewedNoteEn?: string | null;
  reviewedNoteEs?: string | null;
  heroImageId?: string | null;
  heroImageUrl?: string | null;
  heroImageAlt?: string | null;
  audience: string; // 'public' | 'members_only'
  status: string; // 'published' | 'scheduled' | 'draft' | 'unpublished'
  publishedAt?: Date | string | null;
  seoTitle?: string | null;
  seoTitleEs?: string | null;
  seoDescription?: string | null;
  seoDescriptionEs?: string | null;
}

interface JournalEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: JournalPostData | null;
  onSaved: () => void;
}

export default function JournalEditorModal({
  isOpen,
  onClose,
  post,
  onSaved,
}: JournalEditorModalProps) {
  const [activeLang, setActiveLang] = useState<"en" | "es">("en");
  
  // English fields
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [quoteEn, setQuoteEn] = useState("");
  const [authorRoleEn, setAuthorRoleEn] = useState("");
  const [bylineEn, setBylineEn] = useState("");
  const [reviewedNoteEn, setReviewedNoteEn] = useState("General information, not medical or legal advice.");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  // Spanish fields
  const [titleEs, setTitleEs] = useState("");
  const [excerptEs, setExcerptEs] = useState("");
  const [bodyEs, setBodyEs] = useState("");
  const [quoteEs, setQuoteEs] = useState("");
  const [authorRoleEs, setAuthorRoleEs] = useState("");
  const [bylineEs, setBylineEs] = useState("");
  const [reviewedNoteEs, setReviewedNoteEs] = useState("Información general, no consejo médico ni legal.");
  const [seoTitleEs, setSeoTitleEs] = useState("");
  const [seoDescriptionEs, setSeoDescriptionEs] = useState("");

  // Shared metadata
  const [category, setCategory] = useState("postpartum");
  const [author, setAuthor] = useState("The Mothers");
  const [audience, setAudience] = useState("public");
  const [status, setStatus] = useState("draft");
  const [scheduleDate, setScheduleDate] = useState("");
  const [slug, setSlug] = useState("");

  // Image upload
  const [heroImageId, setHeroImageId] = useState<string | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [heroImageAlt, setHeroImageAlt] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form handling
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [showSeo, setShowSeo] = useState(false);

  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setTitleEs(post.titleEs || "");
      setExcerpt(post.excerpt || "");
      setExcerptEs(post.excerptEs || "");
      setBody(post.body || "");
      setBodyEs(post.bodyEs || "");
      setQuoteEn(post.quoteEn || "");
      setQuoteEs(post.quoteEs || "");
      setAuthor(post.author || "The Mothers");
      setAuthorRoleEn(post.authorRoleEn || "");
      setAuthorRoleEs(post.authorRoleEs || "");
      setBylineEn(post.bylineEn || "");
      setBylineEs(post.bylineEs || "");
      setReviewedNoteEn(post.reviewedNoteEn || "General information, not medical or legal advice.");
      setReviewedNoteEs(post.reviewedNoteEs || "Información general, no consejo médico ni legal.");
      setCategory(post.category || "postpartum");
      setAudience(post.audience || "public");
      setStatus(post.status || "draft");
      setSlug(post.slug || "");
      setHeroImageId(post.heroImageId || null);
      setHeroImageUrl(post.heroImageUrl || null);
      setHeroImageAlt(post.heroImageAlt || "");
      setSeoTitle(post.seoTitle || "");
      setSeoTitleEs(post.seoTitleEs || "");
      setSeoDescription(post.seoDescription || "");
      setSeoDescriptionEs(post.seoDescriptionEs || "");

      if (post.publishedAt) {
        const d = new Date(post.publishedAt);
        // Format for datetime-local: YYYY-MM-DDTHH:mm
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setScheduleDate(iso);
      } else {
        setScheduleDate("");
      }
    } else {
      // Reset for new post
      setTitle("");
      setTitleEs("");
      setExcerpt("");
      setExcerptEs("");
      setBody("");
      setBodyEs("");
      setQuoteEn("");
      setQuoteEs("");
      setAuthor("The Mothers");
      setAuthorRoleEn("");
      setAuthorRoleEs("");
      setBylineEn("");
      setBylineEs("");
      setReviewedNoteEn("General information, not medical or legal advice.");
      setReviewedNoteEs("Información general, no consejo médico ni legal.");
      setCategory("postpartum");
      setAudience("public");
      setStatus("draft");
      setSlug("");
      setHeroImageId(null);
      setHeroImageUrl(null);
      setHeroImageAlt("");
      setScheduleDate("");
      setSeoTitle("");
      setSeoTitleEs("");
      setSeoDescription("");
      setSeoDescriptionEs("");
    }
    setFormError("");
    setImageError("");
    setActiveLang("en");
  }, [post, isOpen]);

  if (!isOpen) return null;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please upload an image file (JPEG, PNG, WebP, AVIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image is larger than 5MB. Please upload a smaller image.");
      return;
    }

    setImageError("");
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "journal");
      formData.append("altText", heroImageAlt.trim() || title.trim() || "Journal article cover");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload image");
      }

      setHeroImageId(data.asset.id);
      setHeroImageUrl(data.asset.publicUrl);
    } catch (err: any) {
      setImageError(err.message || "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setHeroImageId(null);
    setHeroImageUrl(null);
    setHeroImageAlt("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async (targetPublishMode: "draft" | "publish" | "schedule") => {
    if (!title.trim()) {
      setFormError("English Title is required.");
      setActiveLang("en");
      return;
    }

    if (!excerpt.trim()) {
      setFormError("English Standfirst / Excerpt is required.");
      setActiveLang("en");
      return;
    }

    if (targetPublishMode === "publish" && !body.trim()) {
      setFormError("Article body is required to publish.");
      setActiveLang("en");
      return;
    }

    setSaving(true);
    setFormError("");

    let targetStatus = "draft";
    let targetPublishedAt: Date | null = null;

    if (targetPublishMode === "publish") {
      targetStatus = "published";
      targetPublishedAt = new Date();
    } else if (targetPublishMode === "schedule") {
      if (!scheduleDate) {
        setFormError("Please select a date and time for scheduled publishing.");
        setSaving(false);
        return;
      }
      targetPublishedAt = new Date(scheduleDate);
      if (targetPublishedAt <= new Date()) {
        targetStatus = "published";
      } else {
        targetStatus = "scheduled";
      }
    } else {
      targetStatus = "draft";
      targetPublishedAt = null;
    }

    const res = await saveJournalPost({
      id: post?.id,
      title: title.trim(),
      titleEs: titleEs.trim() || undefined,
      slug: slug.trim() || undefined,
      category,
      excerpt: excerpt.trim(),
      excerptEs: excerptEs.trim() || undefined,
      body: body.trim(),
      bodyEs: bodyEs.trim() || undefined,
      quoteEn: quoteEn.trim() || undefined,
      quoteEs: quoteEs.trim() || undefined,
      author: author.trim() || "The Mothers",
      authorRoleEn: authorRoleEn.trim() || undefined,
      authorRoleEs: authorRoleEs.trim() || undefined,
      bylineEn: bylineEn.trim() || undefined,
      bylineEs: bylineEs.trim() || undefined,
      reviewedNoteEn: reviewedNoteEn.trim() || undefined,
      reviewedNoteEs: reviewedNoteEs.trim() || undefined,
      heroImageId,
      audience,
      status: targetStatus,
      publishedAt: targetPublishedAt,
      seoTitle: seoTitle.trim() || undefined,
      seoTitleEs: seoTitleEs.trim() || undefined,
      seoDescription: seoDescription.trim() || undefined,
      seoDescriptionEs: seoDescriptionEs.trim() || undefined,
    });

    setSaving(false);

    if (res.success) {
      onSaved();
      onClose();
    } else {
      setFormError(res.error || "Failed to save article.");
    }
  };

  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!post?.id) return;
    if (!confirm(`Are you sure you want to delete "${post.title || title}"? This action cannot be undone.`)) return;
    setDeleting(true);
    const res = await deleteJournalPost(post.id);
    setDeleting(false);
    if (res.success) {
      onSaved();
      onClose();
    } else {
      setFormError(res.error || "Failed to delete article.");
    }
  };

  const previewSlug = (slug || title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(57, 41, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(12px, 2vw, 24px)",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "#fdf8f2",
          border: "1px solid rgba(57, 41, 42, 0.2)",
          borderRadius: "10px",
          width: "100%",
          maxWidth: "1000px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
          color: "#39292a",
          fontFamily: "'Lora', Georgia, serif",
          overflow: "hidden",
        }}
      >
        {/* ─── Modal Header ────────────────────────────────────────── */}
        <div
          style={{
            padding: "20px 28px",
            borderBottom: "1px solid rgba(57, 41, 42, 0.16)",
            backgroundColor: "#fffdfa",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "12px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: WINE,
                marginBottom: "4px",
              }}
            >
              {post ? "Edit Journal Article" : "Write a New Journal Article"}
            </div>
            <h2
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 500,
                fontSize: "24px",
                margin: 0,
              }}
            >
              {title || "Untitled Article"}
            </h2>
            <div style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.6)", marginTop: "3px" }}>
              Slug: <strong style={{ color: "#39292a" }}>/journal/{previewSlug || "…"}</strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Language Switcher Tabs */}
            <div
              style={{
                display: "flex",
                backgroundColor: "rgba(57, 41, 42, 0.08)",
                borderRadius: "6px",
                padding: "3px",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveLang("en")}
                style={{
                  border: "none",
                  backgroundColor: activeLang === "en" ? "#fff" : "transparent",
                  color: activeLang === "en" ? WINE : "#39292a",
                  fontWeight: activeLang === "en" ? 600 : 400,
                  padding: "6px 14px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontFamily: "'Cormorant Garamond', serif",
                  boxShadow: activeLang === "en" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🇬🇧 English</span>
                {title && <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: GREEN }} />}
              </button>

              <button
                type="button"
                onClick={() => setActiveLang("es")}
                style={{
                  border: "none",
                  backgroundColor: activeLang === "es" ? "#fff" : "transparent",
                  color: activeLang === "es" ? WINE : "#39292a",
                  fontWeight: activeLang === "es" ? 600 : 400,
                  padding: "6px 14px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontFamily: "'Cormorant Garamond', serif",
                  boxShadow: activeLang === "es" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🇪🇸 Spanish</span>
                {titleEs && <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: GREEN }} />}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                border: "none",
                background: "transparent",
                fontSize: "24px",
                cursor: "pointer",
                color: "rgba(57, 41, 42, 0.6)",
                padding: "4px 8px",
              }}
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* ─── Modal Scrollable Body ───────────────────────────────── */}
        <div
          style={{
            padding: "24px 28px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {formError && (
            <div
              style={{
                border: `1px solid ${WINE}`,
                backgroundColor: "rgba(123, 31, 44, 0.08)",
                color: WINE,
                padding: "12px 16px",
                borderRadius: "6px",
                fontSize: "13.5px",
              }}
            >
              ⚠️ {formError}
            </div>
          )}

          {/* ─── Top Metadata Grid ──────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              backgroundColor: "#fffdfa",
              border: "1px solid rgba(57, 41, 42, 0.14)",
              borderRadius: "8px",
              padding: "18px 20px",
            }}
          >
            <div>
              <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                Category / Topic
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(57, 41, 42, 0.25)",
                  backgroundColor: "#fff",
                  fontSize: "14px",
                  fontFamily: "'Lora', Georgia, serif",
                }}
              >
                {JOURNAL_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.labelEn} / {c.labelEs}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                Audience Access
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(57, 41, 42, 0.25)",
                  backgroundColor: "#fff",
                  fontSize: "14px",
                  fontFamily: "'Lora', Georgia, serif",
                }}
              >
                <option value="public">Public — Anyone can read</option>
                <option value="members_only">Members only (Private club)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Belén Costa or Partner Name"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(57, 41, 42, 0.25)",
                  backgroundColor: "#fff",
                  fontSize: "14px",
                  fontFamily: "'Lora', Georgia, serif",
                }}
              />
            </div>
          </div>

          {/* ─── Hero Image Upload Section ──────────────────────── */}
          <div
            style={{
              backgroundColor: "#fffdfa",
              border: "1px solid rgba(57, 41, 42, 0.14)",
              borderRadius: "8px",
              padding: "18px 20px",
            }}
          >
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", marginBottom: "10px", color: WINE }}>
              Article Hero Image
            </div>

            <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" }}>
              {heroImageUrl ? (
                <div style={{ position: "relative", width: "160px", height: "110px", borderRadius: "6px", overflow: "hidden", border: "1px solid rgba(57, 41, 42, 0.2)", flexShrink: 0 }}>
                  <img
                    src={heroImageUrl}
                    alt={heroImageAlt || "Hero preview"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      backgroundColor: "rgba(0,0,0,0.7)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: "22px",
                      height: "22px",
                      cursor: "pointer",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    width: "160px",
                    height: "110px",
                    borderRadius: "6px",
                    border: "2px dashed rgba(57, 41, 42, 0.25)",
                    backgroundColor: "rgba(57, 41, 42, 0.02)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span style={{ fontSize: "22px", color: WINE }}>📷</span>
                  <span style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.6)" }}>
                    {uploadingImage ? "Uploading..." : "Upload Cover"}
                  </span>
                </div>
              )}

              <div style={{ flex: 1, minWidth: "260px" }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleImageSelect}
                  style={{ display: "none" }}
                />

                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px" }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    style={{
                      border: "1px solid rgba(57, 41, 42, 0.3)",
                      backgroundColor: "#fff",
                      color: "#39292a",
                      padding: "8px 14px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    {uploadingImage ? "Uploading image..." : heroImageUrl ? "Change image" : "Select image from file"}
                  </button>
                  <span style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.6)" }}>
                    Max 5MB (JPG, PNG, WebP)
                  </span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "rgba(57, 41, 42, 0.7)", marginBottom: "4px" }}>
                    Image Alt Text (Accessibility & SEO)
                  </label>
                  <input
                    type="text"
                    value={heroImageAlt}
                    onChange={(e) => setHeroImageAlt(e.target.value)}
                    placeholder="Describe what is seen in the image"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "8px 10px",
                      borderRadius: "4px",
                      border: "1px solid rgba(57, 41, 42, 0.25)",
                      backgroundColor: "#fff",
                      fontSize: "13px",
                      fontFamily: "'Lora', Georgia, serif",
                    }}
                  />
                </div>

                {imageError && (
                  <div style={{ color: WINE, fontSize: "12px", marginTop: "6px" }}>{imageError}</div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Language Specific Content Form ─────────────────── */}
          {activeLang === "en" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ borderBottom: "1px solid rgba(123,31,44,0.2)", paddingBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", color: WINE }}>
                  English Content (Primary)
                </span>
                <span style={{ fontSize: "12px", color: "rgba(57,41,42,0.6)" }}>Visible on /journal</span>
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>
                  Title (English) *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Finding a postpartum doula in Barcelona"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 13px",
                    borderRadius: "4px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    backgroundColor: "#fff",
                    fontSize: "15px",
                    fontFamily: "'Lora', Georgia, serif",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>
                  Standfirst / Dek (English) *
                </label>
                <input
                  type="text"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="One or two compelling lines summarising the article."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    borderRadius: "4px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    backgroundColor: "#fff",
                    fontSize: "14px",
                    fontFamily: "'Lora', Georgia, serif",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>
                  Featured Pull Quote (English)
                </label>
                <input
                  type="text"
                  value={quoteEn}
                  onChange={(e) => setQuoteEn(e.target.value)}
                  placeholder="e.g. Ask her what she does when a mother cries. The answer tells you more than any certificate."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    borderRadius: "4px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    backgroundColor: "#fff",
                    fontSize: "14px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontStyle: "italic",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>
                  Article Body (English) *
                </label>
                <textarea
                  rows={9}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write the full article text here. Separate paragraphs with a blank line."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px 14px",
                    borderRadius: "4px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    backgroundColor: "#fff",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    fontFamily: "'Lora', Georgia, serif",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                    Author Role / Affiliation (English)
                  </label>
                  <input
                    type="text"
                    value={authorRoleEn}
                    onChange={(e) => setAuthorRoleEn(e.target.value)}
                    placeholder="e.g. postpartum doula, Eixample"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "9px 11px",
                      borderRadius: "4px",
                      border: "1px solid rgba(57, 41, 42, 0.25)",
                      backgroundColor: "#fff",
                      fontSize: "13.5px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                    Review / Medical Note (English)
                  </label>
                  <input
                    type="text"
                    value={reviewedNoteEn}
                    onChange={(e) => setReviewedNoteEn(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "9px 11px",
                      borderRadius: "4px",
                      border: "1px solid rgba(57, 41, 42, 0.25)",
                      backgroundColor: "#fff",
                      fontSize: "13.5px",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ borderBottom: "1px solid rgba(123,31,44,0.2)", paddingBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", color: WINE }}>
                  Spanish Content / Contenido en Español
                </span>
                <span style={{ fontSize: "12px", color: "rgba(57,41,42,0.6)" }}>Visible al cambiar idioma a Español</span>
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>
                  Título en Español
                </label>
                <input
                  type="text"
                  value={titleEs}
                  onChange={(e) => setTitleEs(e.target.value)}
                  placeholder="e.g. Encontrar una doula posparto en Barcelona"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px 13px",
                    borderRadius: "4px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    backgroundColor: "#fff",
                    fontSize: "15px",
                    fontFamily: "'Lora', Georgia, serif",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>
                  Subtítulo / Dek en Español
                </label>
                <input
                  type="text"
                  value={excerptEs}
                  onChange={(e) => setExcerptEs(e.target.value)}
                  placeholder="Una o dos frases resumiendo el artículo."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    borderRadius: "4px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    backgroundColor: "#fff",
                    fontSize: "14px",
                    fontFamily: "'Lora', Georgia, serif",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>
                  Cita Destacada (Pull Quote en Español)
                </label>
                <input
                  type="text"
                  value={quoteEs}
                  onChange={(e) => setQuoteEs(e.target.value)}
                  placeholder="e.g. Pregúntale qué hace cuando una madre llora. La respuesta dice más que cualquier certificado."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    borderRadius: "4px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    backgroundColor: "#fff",
                    fontSize: "14px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontStyle: "italic",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>
                  Cuerpo del Artículo en Español
                </label>
                <textarea
                  rows={9}
                  value={bodyEs}
                  onChange={(e) => setBodyEs(e.target.value)}
                  placeholder="Escribe el artículo completo en español. Separa párrafos con líneas en blanco."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px 14px",
                    borderRadius: "4px",
                    border: "1px solid rgba(57, 41, 42, 0.25)",
                    backgroundColor: "#fff",
                    fontSize: "14px",
                    lineHeight: 1.7,
                    fontFamily: "'Lora', Georgia, serif",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                    Rol / Especialidad en Español
                  </label>
                  <input
                    type="text"
                    value={authorRoleEs}
                    onChange={(e) => setAuthorRoleEs(e.target.value)}
                    placeholder="e.g. doula posparto, Eixample"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "9px 11px",
                      borderRadius: "4px",
                      border: "1px solid rgba(57, 41, 42, 0.25)",
                      backgroundColor: "#fff",
                      fontSize: "13.5px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>
                    Nota de Revisión en Español
                  </label>
                  <input
                    type="text"
                    value={reviewedNoteEs}
                    onChange={(e) => setReviewedNoteEs(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "9px 11px",
                      borderRadius: "4px",
                      border: "1px solid rgba(57, 41, 42, 0.25)",
                      backgroundColor: "#fff",
                      fontSize: "13.5px",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── SEO Accordion ──────────────────────────────────── */}
          <div
            style={{
              border: "1px solid rgba(57, 41, 42, 0.16)",
              borderRadius: "6px",
              backgroundColor: "#fffdfa",
              overflow: "hidden",
            }}
          >
            <button
              type="button"
              onClick={() => setShowSeo(!showSeo)}
              style={{
                width: "100%",
                padding: "12px 18px",
                border: "none",
                background: "transparent",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "14px",
                color: "#39292a",
              }}
            >
              <span>🌐 Search Engine Optimization (SEO Meta Tags)</span>
              <span>{showSeo ? "▲" : "▼"}</span>
            </button>

            {showSeo && (
              <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>SEO Title (EN)</label>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="Title for Google search"
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.25)", fontSize: "13px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>SEO Title (ES)</label>
                    <input
                      type="text"
                      value={seoTitleEs}
                      onChange={(e) => setSeoTitleEs(e.target.value)}
                      placeholder="Título para Google"
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.25)", fontSize: "13px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>SEO Description (EN)</label>
                    <textarea
                      rows={2}
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="Meta description for search snippets"
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.25)", fontSize: "13px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>SEO Description (ES)</label>
                    <textarea
                      rows={2}
                      value={seoDescriptionEs}
                      onChange={(e) => setSeoDescriptionEs(e.target.value)}
                      placeholder="Meta descripción en español"
                      style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.25)", fontSize: "13px" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Modal Footer / Action Bar ──────────────────────────── */}
        <div
          style={{
            padding: "18px 28px",
            borderTop: "1px solid rgba(57, 41, 42, 0.16)",
            backgroundColor: "#fffdfa",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          {/* Scheduling date input */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>
              Schedule date:
            </span>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: "4px",
                border: "1px solid rgba(57, 41, 42, 0.25)",
                fontSize: "13px",
                fontFamily: "'Lora', Georgia, serif",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
            {post?.id && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                style={{
                  border: "1px solid rgba(153, 56, 66, 0.4)",
                  backgroundColor: "#fdf2f2",
                  color: "#993842",
                  borderRadius: "4px",
                  padding: "10px 16px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: deleting ? "wait" : "pointer",
                  marginRight: "auto",
                }}
              >
                {deleting ? "Deleting..." : "✕ Delete Article"}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              style={{
                border: "1px solid rgba(57, 41, 42, 0.25)",
                backgroundColor: "transparent",
                color: "#39292a",
                borderRadius: "4px",
                padding: "10px 18px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={saving}
              style={{
                border: `1px solid ${WINE}`,
                backgroundColor: "transparent",
                color: WINE,
                borderRadius: "4px",
                padding: "10px 18px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              {saving ? "Saving..." : "Save as Draft"}
            </button>

            {scheduleDate && (
              <button
                type="button"
                onClick={() => handleSave("schedule")}
                disabled={saving}
                style={{
                  border: `1px solid ${AMBER}`,
                  backgroundColor: AMBER,
                  color: "#fff",
                  borderRadius: "4px",
                  padding: "10px 18px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                {saving ? "Scheduling..." : "Schedule Publication"}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave("publish")}
              disabled={saving}
              style={{
                border: `1px solid ${GREEN}`,
                backgroundColor: GREEN,
                color: "#fff",
                borderRadius: "4px",
                padding: "10px 22px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(63, 102, 4, 0.2)",
              }}
            >
              {saving ? "Publishing..." : "Publish Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
