"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getAdminJournalPosts, saveJournalPost } from "@/app/actions/adminCms";

const WINE = '#7b1f2c', GREEN = '#3f6604';

export default function AdminJournalEditPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("Family life");
  const [audience, setAudience] = useState("public");
  const [standfirst, setStandfirst] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("Belén Costa");
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("draft");
  const [publishedAt, setPublishedAt] = useState<Date | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPost() {
      if (!id) return;
      setLoading(true);
      const res = await getAdminJournalPosts();
      setLoading(false);
      if (res.success && res.posts) {
        const found = res.posts.find((p: any) => p.id === id);
        if (found) {
          setTitle(found.title || "");
          setStandfirst(found.excerpt || "");
          setBody(found.body || "");
          setAuthor(found.author || "Belén Costa");
          setAudience(found.audience || "public");
          setSlug(found.slug || "");
          setStatus(found.status || "draft");
          setPublishedAt(found.publishedAt ? new Date(found.publishedAt) : null);
        } else {
          setError("Article not found.");
        }
      }
    }
    loadPost();
  }, [id]);

  const handleSave = async (publishNow: boolean) => {
    if (!title.trim()) {
      setError("It needs a title before it can be saved.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await saveJournalPost({
      id: String(id),
      title: title.trim(),
      excerpt: standfirst.trim() || "No standfirst yet.",
      body: body.trim() || "",
      author: author.trim() || "The Mothers Editorial",
      audience: audience,
      published: publishNow,
      publishedAt: publishNow ? (publishedAt || new Date()) : null,
    });
    setSaving(false);
    if (res.success) {
      router.push("/admin/journal");
    } else {
      setError(res.error || "Failed to update article.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 60px" }}>
        
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>
            <Link href="/admin/journal" style={{ color: "#7b1f2c" }}>← Journal</Link> · Edit article
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px, 4vw, 42px)", lineHeight: 1.1, margin: "0 0 9px" }}>
            Edit article
          </h1>
          <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0 }}>
            {status === "published" ? "This article is live on the journal." : "This article is currently in draft."}
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px" }}>Loading article...</div>
        ) : (
          <div style={{ border: "1px solid rgba(123,31,44,0.4)", borderRadius: "8px", background: "#fdf6f2", padding: "24px 28px", marginBottom: "20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "14px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="What is it called?" 
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff" }} 
                />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>Topic</label>
                <select 
                  value={topic} 
                  onChange={(e) => setTopic(e.target.value)} 
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff" }}
                >
                  <option value="Pregnancy">Pregnancy</option>
                  <option value="The early months">The early months</option>
                  <option value="Family life">Family life</option>
                  <option value="Barcelona">Barcelona</option>
                  <option value="From the members">From the members</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>Audience</label>
                <select 
                  value={audience} 
                  onChange={(e) => setAudience(e.target.value)} 
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff" }}
                >
                  <option value="public">Public — anyone can read it</option>
                  <option value="members_only">Members only</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>Standfirst</label>
              <input 
                type="text" 
                value={standfirst} 
                onChange={(e) => setStandfirst(e.target.value)} 
                placeholder="One line, so it can be told apart at a glance" 
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff" }} 
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>The article</label>
              <textarea 
                rows={10} 
                value={body} 
                onChange={(e) => setBody(e.target.value)} 
                placeholder="One paragraph per line. This is what members read on the Journal." 
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", lineHeight: 1.7, background: "#fff", resize: "vertical" }} 
              />
            </div>

            {slug && (
              <div style={{ fontSize: "12.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", marginBottom: "16px" }}>
                Slug: <strong style={{ fontWeight: 600 }}>/journal/{slug}</strong>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <button 
                type="button" 
                onClick={() => handleSave(false)} 
                disabled={saving}
                style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "10px 18px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
              >
                {saving ? "Saving..." : "Save as a draft"}
              </button>
              <button 
                type="button" 
                onClick={() => handleSave(true)} 
                disabled={saving}
                style={{ border: `1px solid ${GREEN}`, background: GREEN, color: "#fff", borderRadius: "4px", padding: "10px 18px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
              >
                {saving ? "Publishing..." : status === "published" ? "Save & keep published" : "Publish now"}
              </button>
              <Link 
                href="/admin/journal" 
                style={{ border: "1px solid rgba(57,41,42,0.28)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "10px 18px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", display: "inline-block" }}
              >
                Cancel
              </Link>
              {error && (
                <span style={{ fontSize: "12px", color: WINE, marginLeft: "8px" }}>
                  {error}
                </span>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
