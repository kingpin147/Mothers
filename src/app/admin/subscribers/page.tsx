"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getSubscribersList, createSubscriber } from "@/app/actions/adminCms";

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listType, setListType] = useState<string>("letter");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newSource, setNewSource] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exportNotice, setExportNotice] = useState(false);

  const loadSubscribers = async () => {
    setLoading(true);
    const res = await getSubscribersList(listType);
    if (res.success && res.subscribers) {
      setSubscribers(res.subscribers);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSubscribers();
  }, [listType]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setIsSubmitting(true);
    const res = await createSubscriber({
      name: newName.trim() || undefined,
      email: newEmail.trim(),
      list: listType,
      source: newSource.trim() || "admin_manual",
    });
    setIsSubmitting(false);
    if (res.success) {
      setShowAddModal(false);
      setNewName("");
      setNewEmail("");
      setNewSource("");
      loadSubscribers();
    } else {
      alert(res.error || "Failed to add subscriber");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "List", "Source", "Marketing Consent", "Consent Timestamp", "Subscribed At"];
    const rows = filteredSubscribers.map((s) => [
      s.name || "",
      s.email,
      s.list,
      s.source || "web",
      s.marketingConsent ? "Yes" : "No",
      new Date(s.marketingConsentAt).toISOString(),
      new Date(s.createdAt).toISOString(),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `the-letter-subscribers-${listType}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  const filteredSubscribers = subscribers.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (s.name || "").toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 60px" }}>
      <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "6px" }}>
              <Link href="/admin" style={{ color: "#7b1f2c", textDecoration: "none" }}>← Back to Dashboard</Link>
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(28px, 3.8vw, 38px)", lineHeight: 1.1, margin: "0 0 6px" }}>
              The Letter & Subscribers
            </h1>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0 }}>
              Dedicated marketing newsletter list with timestamped opt-in consent (§13). Kept strictly separate from the membership waitlist.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleExportCSV}
              style={{ border: "1px solid rgba(57,41,42,0.25)", background: "#fff", color: "#39292a", borderRadius: "4px", padding: "9px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              {exportNotice ? "Exported ✓" : "Export CSV"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              style={{ border: "1px solid #7b1f2c", background: "#7b1f2c", color: "#fff", borderRadius: "4px", padding: "9px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              + Add Subscriber
            </button>
          </div>
        </div>

        {/* Tab Controls & Search */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setListType("letter")}
              style={{ border: listType === "letter" ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.2)", background: listType === "letter" ? "rgba(123,31,44,0.08)" : "#fff", color: listType === "letter" ? "#7b1f2c" : "#39292a", borderRadius: "4px", padding: "7px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              The Letter ({subscribers.length})
            </button>
            <button
              type="button"
              onClick={() => setListType("waitlist")}
              style={{ border: listType === "waitlist" ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.2)", background: listType === "waitlist" ? "rgba(123,31,44,0.08)" : "#fff", color: listType === "waitlist" ? "#7b1f2c" : "#39292a", borderRadius: "4px", padding: "7px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              Waitlist Subscribers
            </button>
          </div>

          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "260px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "8px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", background: "#fff" }}
          />
        </div>

        {/* Subscribers Table */}
        <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1.2fr 1.2fr", gap: "12px", padding: "12px 18px", borderBottom: "1px solid rgba(57,41,42,0.12)", background: "rgba(57,41,42,0.03)", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)" }}>
            <div>Name</div>
            <div>Email</div>
            <div>Source</div>
            <div>Consent Timestamp</div>
            <div>Joined</div>
          </div>

          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "rgba(57,41,42,0.6)" }}>Loading subscribers...</div>
          ) : filteredSubscribers.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "rgba(57,41,42,0.6)" }}>No subscribers found on this list.</div>
          ) : (
            filteredSubscribers.map((s) => (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1.2fr 1.2fr", gap: "12px", padding: "14px 18px", borderBottom: "1px solid rgba(57,41,42,0.08)", alignItems: "center", fontSize: "13px" }}>
                <div style={{ fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", fontSize: "15px" }}>{s.name || "—"}</div>
                <div style={{ color: "#7b1f2c" }}>{s.email}</div>
                <div style={{ color: "rgba(57,41,42,0.7)" }}>{s.source || "website"}</div>
                <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.6)" }}>
                  {s.marketingConsentAt ? new Date(s.marketingConsentAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.6)" }}>
                  {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal for manual adding */}
        {showAddModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(57,41,42,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
            <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "8px", maxWidth: "460px", width: "100%", padding: "24px", boxSizing: "border-box" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", margin: "0 0 12px", color: "#7b1f2c" }}>
                Add to {listType === "letter" ? "The Letter" : "Waitlist"}
              </h2>
              <form onSubmit={handleCreate}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12.5px", marginBottom: "4px", color: "rgba(57,41,42,0.8)" }}>Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Marta Gomez"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "8px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px" }}
                  />
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ display: "block", fontSize: "12.5px", marginBottom: "4px", color: "rgba(57,41,42,0.8)" }}>Email (required)</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. marta@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "8px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px" }}
                  />
                </div>
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ display: "block", fontSize: "12.5px", marginBottom: "4px", color: "rgba(57,41,42,0.8)" }}>Source</label>
                  <input
                    type="text"
                    placeholder="e.g. event_walk, instagram"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "8px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{ border: "1px solid rgba(57,41,42,0.25)", background: "#fff", color: "#39292a", borderRadius: "4px", padding: "8px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ border: "1px solid #7b1f2c", background: "#7b1f2c", color: "#fff", borderRadius: "4px", padding: "8px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                  >
                    {isSubmitting ? "Adding..." : "Add Subscriber"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
