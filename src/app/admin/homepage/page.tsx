"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getHomepageMedia, adminSaveHomepageSlot } from "@/app/actions/homepageCms";

export default function AdminHomepageCmsPage() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Record<string, any>>({});
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

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

  if (loading) {
    return <div style={{ padding: "40px", fontFamily: "'Lora', Georgia, serif" }}>Loading Homepage CMS...</div>;
  }

  const slotCard = (id: string, label: string, note?: string) => {
    const data = slots[id] || {};
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
          {savingId === id && <span style={{ fontSize: "11px", color: "#7b1f2c" }}>Saving...</span>}
        </div>
        {note && <div style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.65)" }}>{note}</div>}

        {data.imageUrl ? (
          <div style={{ position: "relative", width: "100%", height: "140px", borderRadius: "6px", overflow: "hidden", background: "#f8f3ec" }}>
            <img src={data.imageUrl} alt={data.altText || label} style={{ width: "100%", height: "140px", objectFit: "cover" }} />
          </div>
        ) : (
          <div style={{ height: "80px", borderRadius: "6px", background: "#fdf8f2", border: "1px dashed rgba(57, 41, 42, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12.5px", color: "rgba(57, 41, 42, 0.5)" }}>
            Empty slot (cream background)
          </div>
        )}

        <div>
          <label style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.6)" }}>Image URL</label>
          <input
            type="url"
            value={data.imageUrl || ""}
            placeholder="https://... image.jpg"
            onChange={(e) => setSlots((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), imageUrl: e.target.value } }))}
            onBlur={(e) => handleUpdate(id, { imageUrl: e.target.value })}
            style={{ width: "100%", padding: "7px 10px", fontSize: "13px", border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "4px", boxSizing: "border-box", marginTop: "3px" }}
          />
        </div>

        <div>
          <label style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.6)" }}>Alt text * (accessibility)</label>
          <input
            type="text"
            value={data.altText || ""}
            placeholder="Descriptive text for screen readers"
            onChange={(e) => setSlots((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), altText: e.target.value } }))}
            onBlur={(e) => handleUpdate(id, { altText: e.target.value })}
            style={{ width: "100%", padding: "7px 10px", fontSize: "13px", border: "1px solid rgba(57, 41, 42, 0.2)", borderRadius: "4px", boxSizing: "border-box", marginTop: "3px" }}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(57, 41, 42, 0.8)", cursor: "pointer", marginTop: "4px" }}>
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

        <section style={{ marginBottom: "36px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", marginBottom: "12px" }}>1. Hero Banner</h2>
          {slotCard("hero", "Hero Banner", "Wide landscape, at least 2000 px across. 'Welcome to The Mothers' sits on bottom third.")}
        </section>

        <section style={{ marginBottom: "36px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", marginBottom: "12px" }}>2. 'How to be part of The Mothers' Cards</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
            {slotCard("card_1", "Card 1 · Meet local mothers")}
            {slotCard("card_2", "Card 2 · Talk in The Forum")}
            {slotCard("card_3", "Card 3 · Bring your community")}
          </div>
        </section>

        <section style={{ marginBottom: "36px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", marginBottom: "12px" }}>3. 'Not everything has to be about the baby' Photo Band</h2>
          {slotCard("band", "Photo Band", "Wide landscape band separating sections.")}
        </section>

        <section style={{ marginBottom: "36px" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", marginBottom: "12px" }}>4. Moments From Our Events (6 Photos)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px" }}>
            {slotCard("moment_1", "Moment 1")}
            {slotCard("moment_2", "Moment 2")}
            {slotCard("moment_3", "Moment 3")}
            {slotCard("moment_4", "Moment 4")}
            {slotCard("moment_5", "Moment 5")}
            {slotCard("moment_6", "Moment 6")}
          </div>
        </section>

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
