"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getHomepageMedia, adminSaveHomepageSlot } from "@/app/actions/homepageCms";

export default function AdminHomepageCmsPage() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Record<string, any>>({});
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    getHomepageMedia().then((res) => {
      setSlots(res.media || {});
      setLoading(false);
    });
  }, []);

  const handleUpdate = async (id: string, patch: any) => {
    setSavingId(id);
    const current = slots[id] || {};
    const updated = { ...current, ...patch };
    setSlots((prev) => ({ ...prev, [id]: updated }));

    try {
      await adminSaveHomepageSlot({
        id,
        imageUrl: updated.imageUrl,
        focalPoint: updated.focalPoint,
        altText: updated.altText,
        parentConsentConfirmed: updated.parentConsentConfirmed,
        quoteText: updated.quoteText,
        quoteWho: updated.quoteWho,
      });
      setSavedNotice(`Saved ${id}`);
      setTimeout(() => setSavedNotice(null), 3000);
    } catch (err: any) {
      alert("Failed to save: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleFileUpload = async (id: string, file: File) => {
    try {
      setUploadingId(id);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "general");
      formData.append("altText", slots[id]?.altText || `The Mothers ${id}`);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }

      const data = await res.json();
      const imageUrl = data.url || data.publicUrl;

      if (imageUrl) {
        await handleUpdate(id, { imageUrl });
      }
    } catch (err: any) {
      alert("Image upload error: " + (err.message || "Could not upload file"));
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) {
    return <div style={{ padding: "40px", fontFamily: "'Lora', Georgia, serif" }}>Loading Homepage CMS...</div>;
  }

  const slotCard = (id: string, label: string, note?: string) => {
    const data = slots[id] || {};
    const isUploading = uploadingId === id;
    const isSaving = savingId === id;

    return (
      <div
        key={id}
        style={{
          border: "1px solid rgba(57, 41, 42, 0.16)",
          borderRadius: "8px",
          background: "#ffffff",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <strong style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "17px" }}>{label}</strong>
          {isSaving && <span style={{ fontSize: "11px", color: "#7b1f2c" }}>Saving...</span>}
          {isUploading && <span style={{ fontSize: "11px", color: "#3b5e04" }}>Uploading...</span>}
        </div>
        {note && <div style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.65)" }}>{note}</div>}

        {/* Image Preview or Placeholder */}
        {data.imageUrl ? (
          <div style={{ position: "relative", width: "100%", height: "140px", borderRadius: "6px", overflow: "hidden", background: "#f8f3ec" }}>
            <img src={data.imageUrl} alt={data.altText || label} style={{ width: "100%", height: "140px", objectFit: "cover" }} />
          </div>
        ) : (
          <div style={{ height: "100px", borderRadius: "6px", background: "#fdf8f2", border: "1px dashed rgba(57, 41, 42, 0.25)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "12px", color: "rgba(57, 41, 42, 0.55)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            No image set (displays soft placeholder)
          </div>
        )}

        {/* Upload Button & URL */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            ref={(el) => { fileInputRefs.current[id] = el; }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(id, file);
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRefs.current[id]?.click()}
            disabled={isUploading}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 600,
              background: "#7b1f2c",
              color: "#f8efe2",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {isUploading ? "Uploading..." : "Upload photo"}
          </button>
          {data.imageUrl && (
            <button
              type="button"
              onClick={() => handleUpdate(id, { imageUrl: null })}
              style={{
                padding: "6px 10px",
                fontSize: "11.5px",
                background: "transparent",
                color: "#7b1f2c",
                border: "1px solid rgba(123, 31, 44, 0.3)",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div>
          <label style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.6)" }}>Or paste Image URL</label>
          <input
            type="url"
            value={data.imageUrl || ""}
            placeholder="https://... image.jpg"
            onChange={(e) => setSlots((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), imageUrl: e.target.value } }))}
            onBlur={(e) => handleUpdate(id, { imageUrl: e.target.value })}
            style={{ width: "100%", padding: "7px 10px", fontSize: "13px", border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "4px", boxSizing: "border-box", marginTop: "3px" }}
          />
        </div>

        {/* Alt Text — Google SEO & Accessibility */}
        <div style={{ background: "rgba(123, 31, 44, 0.04)", padding: "10px", borderRadius: "5px", border: "1px solid rgba(123, 31, 44, 0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3px" }}>
            <label style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#7b1f2c", fontWeight: 600 }}>
              Alt text * (Google SEO & accessibility)
            </label>
          </div>
          <div style={{ fontSize: "11px", color: "rgba(57, 41, 42, 0.65)", marginBottom: "4px", lineHeight: 1.4 }}>
            Google uses this text to read and index your image for search results. Describe the scene clearly.
          </div>
          <input
            type="text"
            value={data.altText || ""}
            placeholder="e.g. Mothers smiling and chatting with babies in carrier in Poblenou"
            onChange={(e) => setSlots((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), altText: e.target.value } }))}
            onBlur={(e) => handleUpdate(id, { altText: e.target.value })}
            style={{ width: "100%", padding: "7px 10px", fontSize: "13px", border: "1px solid rgba(57, 41, 42, 0.25)", borderRadius: "4px", boxSizing: "border-box", background: "#ffffff" }}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(57, 41, 42, 0.8)", cursor: "pointer", marginTop: "2px" }}>
          <input
            type="checkbox"
            checked={Boolean(data.parentConsentConfirmed)}
            onChange={(e) => handleUpdate(id, { parentConsentConfirmed: e.target.checked })}
          />
          Parents agreed for recognisable people and children
        </label>
      </div>
    );
  };

  const quoteCard = (id: string, label: string) => {
    const data = slots[id] || {};
    return (
      <div key={id} style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", background: "#ffffff", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <strong>{label}</strong>
        <div>
          <label style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.6)" }}>Quote text</label>
          <textarea
            value={data.quoteText || ""}
            rows={2}
            placeholder="What a mother said..."
            onChange={(e) => setSlots((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), quoteText: e.target.value } }))}
            onBlur={(e) => handleUpdate(id, { quoteText: e.target.value })}
            style={{ width: "100%", padding: "7px 10px", fontSize: "13px", border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "4px", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.6)" }}>Attribution</label>
          <input
            type="text"
            value={data.quoteWho || ""}
            placeholder="e.g. Maria, Gràcia"
            onChange={(e) => setSlots((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), quoteWho: e.target.value } }))}
            onBlur={(e) => handleUpdate(id, { quoteWho: e.target.value })}
            style={{ width: "100%", padding: "7px 10px", fontSize: "13px", border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "4px", boxSizing: "border-box" }}
          />
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", padding: "clamp(24px, 4vw, 48px)" }}>
      <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "24px", borderBottom: "1px solid rgba(57, 41, 42, 0.16)", paddingBottom: "14px" }}>
          <div>
            <div style={{ fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "4px" }}>Admin · Content</div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", margin: 0, fontWeight: 400 }}>Homepage Photos & Quotes</h1>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {savedNotice && <span style={{ fontSize: "13px", color: "#3b5e04" }}>✓ {savedNotice}</span>}
            <Link href="/" target="_blank" style={{ fontSize: "13.5px", color: "#7b1f2c", textDecoration: "underline" }}>Open Homepage ↗</Link>
          </div>
        </div>

        {/* 1. Hero */}
        <section style={{ marginBottom: "36px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", marginBottom: "12px" }}>1. Hero Banner</h2>
          {slotCard("hero", "Hero Banner", "Wide landscape, at least 2000 px across. 'Welcome to The Mothers' sits on bottom third.")}
        </section>

        {/* 2. Three How to be part Cards */}
        <section style={{ marginBottom: "36px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", marginBottom: "12px" }}>2. 'How to be part of The Mothers' Cards</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            {slotCard("card_1", "Card 1 · Meet local mothers", "Photo of mothers chatting at a table or meetup")}
            {slotCard("card_2", "Card 2 · Talk in The Forum", "Photo representing community discussion and connection")}
            {slotCard("card_3", "Card 3 · Bring your community", "Photo representing workshop, studio, or community group")}
          </div>
        </section>

        {/* 3. Photo Band */}
        <section style={{ marginBottom: "36px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", marginBottom: "12px" }}>3. 'Not everything has to be about the baby' Photo Band</h2>
          {slotCard("band", "Photo Band", "Wide landscape band separating sections.")}
        </section>

        {/* 4. Moments From Our Events (Up to 12 Photos for Scrollable Gallery) */}
        <section style={{ marginBottom: "36px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", margin: 0 }}>4. Moments From Our Events (Scrollable Gallery)</h2>
            <span style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.65)" }}>Up to 12 photos · 6 visible at a time on homepage</span>
          </div>
          <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.7)", margin: "0 0 16px" }}>
            Mothers can scroll through these photos on the home page with mouse drag and left/right arrows. Always include alt text for Google SEO.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "14px" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) =>
              slotCard(`moment_${num}`, `Moment ${num}`)
            )}
          </div>
        </section>

        {/* 5. What Mothers Say */}
        <section style={{ marginBottom: "36px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", marginBottom: "12px" }}>5. What Mothers Say (3 Quotes)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            {quoteCard("quote_1", "Quote 1")}
            {quoteCard("quote_2", "Quote 2")}
            {quoteCard("quote_3", "Quote 3")}
          </div>
        </section>
      </div>
    </div>
  );
}
