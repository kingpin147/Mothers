"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveJournalPost } from "@/app/actions/adminCms";

const WINE = '#7b1f2c', GREEN = '#3f6604';

export default function AdminJournalCreatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("Family life");
  const [audience, setAudience] = useState("public");
  const [standfirst, setStandfirst] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("Belén Costa");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (publishNow: boolean) => {
    if (!title.trim()) {
      setError("It needs a title before it can be saved.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await saveJournalPost({
      title: title.trim(),
      excerpt: standfirst.trim() || "No standfirst yet.",
      body: body.trim() || "",
      author: author.trim() || "The Mothers Editorial",
      audience: audience,
      published: publishNow,
      publishedAt: publishNow ? new Date() : null,
    });
    setSaving(false);
    if (res.success) {
      router.push("/admin/journal");
    } else {
      setError(res.error || "Failed to save article.");
    }
  };

  const slug = title.trim()
    ? `/journal/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`
    : "/journal/…";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 60px" }}>
        
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>
            <Link href="/admin/journal" style={{ color: "#7b1f2c" }}>← Journal</Link> · New article
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px, 4vw, 42px)", lineHeight: 1.1, margin: "0 0 9px" }}>
            Write an article
          </h1>
          <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0 }}>
            An article can be for everyone or for members only — and that is the one setting worth being certain about.
          </p>
        </div>

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
            <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>
              A draft can be saved without body text. Publishing without it puts an empty page on the site, so we ask for it here.
            </div>
          </div>

          <div style={{ fontSize: "12.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", marginBottom: "16px" }}>
            Slug, from the title: <strong style={{ fontWeight: 600 }}>{slug}</strong> — set once, and never changed after publishing.
          </div>

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
              {saving ? "Publishing..." : "Publish now"}
            </button>
            <Link 
              href="/admin/journal" 
              style={{ border: "1px solid rgba(57,41,42,0.28)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "10px 18px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", display: "inline-block" }}
            >
              Cancel
            </Link>
            <span style={{ fontSize: "12px", color: error ? WINE : "rgba(57,41,42,0.62)", marginLeft: "8px" }}>
              {error || "Nothing is published by saving as draft — it joins the list as a draft."}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
