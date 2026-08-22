"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminPartners, savePartner } from "@/app/actions/adminCms";

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    id: "",
    name: "",
    umbrella: "Expert Care & Support",
    specialty: "",
    description: "",
    offerForMembers: "",
    exclusive: true,
  });

  const loadPartners = async () => {
    setLoading(true);
    const res = await getAdminPartners();
    setLoading(false);
    if (res.success && res.partners) {
      setPartners(res.partners);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const handleOpenEdit = (p?: any) => {
    if (p) {
      setForm({
        id: p.id,
        name: p.name,
        umbrella: p.umbrella,
        specialty: p.specialty,
        description: p.description,
        offerForMembers: p.offerForMembers,
        exclusive: p.exclusive ?? true,
      });
    } else {
      setForm({
        id: "",
        name: "",
        umbrella: "Expert Care & Support",
        specialty: "",
        description: "",
        offerForMembers: "",
        exclusive: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.specialty || !form.offerForMembers) {
      alert("Please fill in all required partner fields.");
      return;
    }

    setSaving(true);
    const res = await savePartner(form);
    setSaving(false);

    if (res.success) {
      setShowModal(false);
      loadPartners();
    } else {
      alert(res.error || "Failed to save partner.");
    }
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "40px clamp(24px, 5vw, 64px) 80px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-accent-2)", fontWeight: 600 }}>
              Back Office · CMS
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "32px", margin: "4px 0 0" }}>
              Partner Directory & Exclusivity
            </h1>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/admin" className="btn btn-secondary" style={{ fontSize: "13px" }}>
              ← Admin Dashboard
            </Link>
            <button onClick={() => handleOpenEdit()} className="btn btn-primary" style={{ fontSize: "13px" }}>
              + Add New Partner
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <p>Loading partner directory...</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden", backgroundColor: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ backgroundColor: "#faf6f0", borderBottom: "1px solid var(--color-divider)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Partner</th>
                  <th style={{ padding: "12px 16px" }}>Umbrella & Specialty</th>
                  <th style={{ padding: "12px 16px" }}>Member Offer</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                      {p.name}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div>{p.specialty}</div>
                      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{p.umbrella}</div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--color-accent-2)", fontWeight: 600 }}>
                      {p.offerForMembers}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ backgroundColor: "var(--color-status-confirmed)", color: "#285430", padding: "3px 8px", borderRadius: "3px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase" }}>
                        Active · Exclusive
                      </span>
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
            <div className="card" style={{ maxWidth: "520px", width: "100%", backgroundColor: "#fff", padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "20px", margin: 0 }}>{form.id ? "Edit Partner" : "Add Partner"}</h2>
                <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
              </div>

              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13.5px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Partner Brand / Practice Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Umbrella Category</label>
                    <select
                      className="input"
                      value={form.umbrella}
                      onChange={(e) => setForm({ ...form, umbrella: e.target.value })}
                    >
                      <option value="Expert Care & Support">Expert Care & Support</option>
                      <option value="Wellness & Movement">Wellness & Movement</option>
                      <option value="Spaces & Hospitality">Spaces & Hospitality</option>
                      <option value="Family Services">Family Services</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Specialty Domain *</label>
                    <input
                      type="text"
                      className="input"
                      value={form.specialty}
                      onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                      placeholder="e.g. Infant Sleep"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Short Description *</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Exclusive Member Offer *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.offerForMembers}
                    onChange={(e) => setForm({ ...form, offerForMembers: e.target.value })}
                    placeholder="e.g. 15% off consultations & priority WhatsApp"
                    required
                  />
                </div>

                <button type="submit" disabled={saving} className="btn btn-primary" style={{ marginTop: "8px", padding: "10px" }}>
                  {saving ? "Saving..." : "Save Partner"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
