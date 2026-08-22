"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminJournalPosts, saveJournalPost } from "@/app/actions/adminCms";

export default function AdminJournalPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    id: "",
    title: "",
    excerpt: "",
    body: "",
    author: "The Mothers Editorial",
    published: true,
  });

  const loadPosts = async () => {
    setLoading(true);
    const res = await getAdminJournalPosts();
    setLoading(false);
    if (res.success && res.posts) {
      setPosts(res.posts);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleOpenEdit = (p?: any) => {
    if (p) {
      setForm({
        id: p.id,
        title: p.title,
        excerpt: p.excerpt || "",
        body: p.body || "",
        author: p.author || "The Mothers Editorial",
        published: p.status === "published",
      });
    } else {
      setForm({
        id: "",
        title: "",
        excerpt: "",
        body: "",
        author: "The Mothers Editorial",
        published: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.body || !form.excerpt) {
      alert("Please fill in article title, summary excerpt, and content.");
      return;
    }

    setSaving(true);
    const res = await saveJournalPost(form);
    setSaving(false);

    if (res.success) {
      setShowModal(false);
      loadPosts();
    } else {
      alert(res.error || "Failed to save article.");
    }
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "40px clamp(24px, 5vw, 64px) 80px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-accent)", fontWeight: 600 }}>
              Back Office · Editorial CMS
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "32px", margin: "4px 0 0" }}>
              Journal Articles & Editorial
            </h1>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/admin" className="btn btn-secondary" style={{ fontSize: "13px" }}>
              ← Admin Dashboard
            </Link>
            <button onClick={() => handleOpenEdit()} className="btn btn-primary" style={{ fontSize: "13px" }}>
              + Write New Article
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <p>Loading journal articles...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="card" style={{ padding: "48px", textAlign: "center", backgroundColor: "#fff" }}>
            <h3 style={{ fontSize: "20px", color: "var(--color-accent)" }}>No articles published yet</h3>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
              Create your first editorial post for Barcelona mothers.
            </p>
            <button onClick={() => handleOpenEdit()} className="btn btn-primary">
              + Write Article
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden", backgroundColor: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ backgroundColor: "#faf6f0", borderBottom: "1px solid var(--color-divider)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Article Title</th>
                  <th style={{ padding: "12px 16px" }}>Slug</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px" }}>Date</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                      {p.title}
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--color-text-muted)", fontFamily: "monospace", fontSize: "12px" }}>
                      /journal/{p.slug}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "3px",
                        fontSize: "11px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        backgroundColor: p.status === "published" ? "var(--color-status-confirmed)" : "var(--color-status-pending)",
                        color: p.status === "published" ? "#285430" : "#8a5800"
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--color-text-muted)", fontSize: "12.5px" }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(p)}
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
            <div className="card" style={{ maxWidth: "680px", width: "100%", maxHeight: "90vh", overflowY: "auto", backgroundColor: "#fff", padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "20px", margin: 0 }}>{form.id ? "Edit Article" : "Write Article"}</h2>
                <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
              </div>

              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13.5px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Title *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Excerpt / Short Summary *</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={form.excerpt}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Article Body Content *</label>
                  <textarea
                    className="input"
                    rows={6}
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    id="pub"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  />
                  <label htmlFor="pub" style={{ fontWeight: 600, cursor: "pointer" }}>
                    Publish immediately to /journal
                  </label>
                </div>

                <button type="submit" disabled={saving} className="btn btn-primary" style={{ marginTop: "8px", padding: "10px" }}>
                  {saving ? "Saving..." : "Save & Publish Article"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
