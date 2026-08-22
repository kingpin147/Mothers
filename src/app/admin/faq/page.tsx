"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminFaqs, saveFaq } from "@/app/actions/adminCms";

export default function AdminFaqPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    id: "",
    category: "General",
    questionEn: "",
    answerEn: "",
    questionEs: "",
    answerEs: "",
    sortOrder: 1,
  });

  const loadFaqs = async () => {
    setLoading(true);
    const res = await getAdminFaqs();
    setLoading(false);
    if (res.success && res.faqs) {
      setFaqs(res.faqs);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const handleOpenEdit = (f?: any) => {
    if (f) {
      setForm({
        id: f.id,
        category: f.category || "General",
        questionEn: f.questionEn,
        answerEn: f.answerEn,
        questionEs: f.questionEs,
        answerEs: f.answerEs,
        sortOrder: f.sortOrder || 1,
      });
    } else {
      setForm({
        id: "",
        category: "General",
        questionEn: "",
        answerEn: "",
        questionEs: "",
        answerEs: "",
        sortOrder: faqs.length + 1,
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.questionEn || !form.answerEn || !form.questionEs || !form.answerEs) {
      alert("Please fill in questions and answers in both English and Spanish.");
      return;
    }

    setSaving(true);
    const res = await saveFaq(form);
    setSaving(false);

    if (res.success) {
      setShowModal(false);
      loadFaqs();
    } else {
      alert(res.error || "Failed to save FAQ.");
    }
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "40px clamp(24px, 5vw, 64px) 80px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-accent)", fontWeight: 600 }}>
              Back Office · CMS
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "32px", margin: "4px 0 0" }}>
              Frequently Asked Questions (FAQ)
            </h1>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/admin" className="btn btn-secondary" style={{ fontSize: "13px" }}>
              ← Admin Dashboard
            </Link>
            <button onClick={() => handleOpenEdit()} className="btn btn-primary" style={{ fontSize: "13px" }}>
              + Add FAQ Question
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <p>Loading FAQ questions...</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden", backgroundColor: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ backgroundColor: "#faf6f0", borderBottom: "1px solid var(--color-divider)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Order</th>
                  <th style={{ padding: "12px 16px" }}>Question (EN)</th>
                  <th style={{ padding: "12px 16px" }}>Question (ES)</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {faqs.map((f) => (
                  <tr key={f.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                      #{f.sortOrder}
                    </td>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                      {f.questionEn}
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--color-text-muted)" }}>
                      {f.questionEs}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(f)}
                        className="btn btn-outline"
                        style={{ padding: "4px 10px", fontSize: "12px" }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(57, 41, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 100
          }}>
            <div className="card" style={{ maxWidth: "580px", width: "100%", maxHeight: "90vh", overflowY: "auto", backgroundColor: "#fff", padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "20px", margin: 0 }}>{form.id ? "Edit FAQ Item" : "New FAQ Item"}</h2>
                <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
              </div>

              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13.5px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Question in English *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.questionEn}
                    onChange={(e) => setForm({ ...form, questionEn: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Answer in English *</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={form.answerEn}
                    onChange={(e) => setForm({ ...form, answerEn: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Pregunta en Español *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.questionEs}
                    onChange={(e) => setForm({ ...form, questionEs: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Respuesta en Español *</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={form.answerEs}
                    onChange={(e) => setForm({ ...form, answerEs: e.target.value })}
                    required
                  />
                </div>

                <button type="submit" disabled={saving} className="btn btn-primary" style={{ marginTop: "8px", padding: "10px" }}>
                  {saving ? "Saving..." : "Save FAQ Question"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
