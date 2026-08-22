"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminMembers, adjustMemberCredits } from "@/app/actions/adminCms";
import { getMemberLedgerDetails, adminUpdateMemberStatus } from "@/app/actions/adminEventsControl";
import { adminUpdateMemberProfile } from "@/app/actions/adminSettings";

export default function AdminMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Credit Adjustment State
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(10);
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [adjusting, setAdjusting] = useState(false);

  // Full Ledger History Modal State
  const [activeLedgerMember, setActiveLedgerMember] = useState<any | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);

  // Edit Profile Modal State
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [profileForm, setProfileForm] = useState({
    stage: "Postpartum (0–12 months)",
    neighbourhood: "Eixample",
    phone: "",
    notesInternal: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    const res = await getAdminMembers();
    setLoading(false);
    if (res.success && res.members) {
      setMembers(res.members);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const openLedgerModal = async (m: any) => {
    setActiveLedgerMember(m);
    setLedgerLoading(true);
    const res = await getMemberLedgerDetails(m.id);
    setLedgerLoading(false);
    if (res.success) {
      setLedgerEntries(res.entries || []);
      setTotalBalance(res.totalBalance || 0);
    }
  };

  const openEditProfile = (m: any) => {
    setEditingMember(m);
    setProfileForm({
      stage: m.stage || "Postpartum (0–12 months)",
      neighbourhood: m.neighbourhood || "Eixample",
      phone: m.phone || "",
      notesInternal: m.notesInternal || "",
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setSavingProfile(true);
    const res = await adminUpdateMemberProfile({
      memberId: editingMember.id,
      ...profileForm,
    });
    setSavingProfile(false);
    if (res.success) {
      alert("Member profile updated!");
      setEditingMember(null);
      fetchMembers();
    } else {
      alert("Failed to update profile.");
    }
  };

  const handleStatusChange = async (memberId: string, newStatus: any) => {
    if (!confirm(`Change member status to "${newStatus}"?`)) return;
    const res = await adminUpdateMemberStatus(memberId, newStatus);
    if (res.success) {
      alert("Member status updated!");
      fetchMembers();
    } else {
      alert("Failed to update status.");
    }
  };

  const handleAdjustCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !adjustmentReason.trim()) {
      alert("A valid explanation/reason is strictly required for ledger adjustments.");
      return;
    }

    setAdjusting(true);
    const res = await adjustMemberCredits({
      memberId: selectedMember.id,
      amount: adjustmentAmount,
      reason: adjustmentReason,
    });
    setAdjusting(false);

    if (res.success) {
      alert("Credit adjustment recorded in ledger!");
      setSelectedMember(null);
      setAdjustmentReason("");
      fetchMembers();
    } else {
      alert(res.error || "Adjustment failed.");
    }
  };

  const handleExportCSV = () => {
    const headers = ["ID", "First Name", "Last Name", "Email", "Status", "Stage", "Neighbourhood", "Monthly Rate", "Joined At"];
    const rows = filteredMembers.map((m) => [
      m.id,
      `"${m.firstName}"`,
      `"${m.lastName}"`,
      `"${m.email}"`,
      m.status,
      `"${m.stage || ""}"`,
      `"${m.neighbourhood || ""}"`,
      `€${(m.monthlyPriceCents / 100).toFixed(2)}`,
      new Date(m.joinedAt).toISOString(),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `themothers_members_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredMembers = members.filter((m) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      m.firstName.toLowerCase().includes(query) ||
      m.lastName.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query) ||
      (m.neighbourhood && m.neighbourhood.toLowerCase().includes(query));

    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "at_risk") return !!m.atRiskSince;
    return m.status === statusFilter;
  });

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "40px clamp(24px, 5vw, 64px) 80px" }}>
      <div style={{ maxWidth: "1250px", margin: "0 auto" }}>
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-accent-2)", fontWeight: 600 }}>
              Back Office · Queue 03
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "32px", margin: "4px 0 0" }}>
              Member Care, Credit Ledgers & Directory
            </h1>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href="/admin" className="btn btn-secondary" style={{ fontSize: "13px" }}>
              ← Admin Dashboard
            </Link>
            <button onClick={handleExportCSV} className="btn btn-outline" style={{ fontSize: "13px" }}>
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="card" style={{ backgroundColor: "#fff", padding: "16px 20px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <input
              type="text"
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search member name, email, neighbourhood..."
            />
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {["all", "active", "at_risk", "paused", "past_due"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`btn ${statusFilter === tab ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "6px 14px", fontSize: "12.5px", textTransform: "capitalize" }}
              >
                {tab === "at_risk" ? "At-Risk (60d)" : tab}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <p>Loading member directory...</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: selectedMember ? "1fr 400px" : "1fr", gap: "24px" }}>
            {/* Members Table */}
            <div className="card" style={{ padding: 0, overflowX: "auto", backgroundColor: "#fff", border: "1px solid var(--color-divider)", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <table style={{ width: "100%", minWidth: "1050px", borderCollapse: "collapse", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#fbf8f3", borderBottom: "1px solid var(--color-divider)", textAlign: "left" }}>
                    <th style={{ padding: "14px 18px", fontWeight: 600 }}>Member</th>
                    <th style={{ padding: "14px 18px", fontWeight: 600 }}>Stage & Area</th>
                    <th style={{ padding: "14px 18px", fontWeight: 600 }}>Plan & Rate</th>
                    <th style={{ padding: "14px 18px", fontWeight: 600 }}>Status</th>
                    <th style={{ padding: "14px 18px", textAlign: "right", fontWeight: 600 }}>Controls & Ledger</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid var(--color-divider)", backgroundColor: selectedMember?.id === m.id ? "#f4ece2" : "transparent" }}>
                      <td style={{ padding: "16px 18px" }}>
                        <div style={{ fontWeight: 600, fontSize: "14px" }}>{m.firstName} {m.lastName}</div>
                        <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{m.email}</div>
                      </td>
                      <td style={{ padding: "16px 18px" }}>
                        <div>{m.stage || "—"}</div>
                        <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{m.neighbourhood || "—"}</div>
                      </td>
                      <td style={{ padding: "16px 18px", fontWeight: 600, color: "var(--color-accent)" }}>
                        €{(m.monthlyPriceCents / 100).toFixed(0)}/mo
                      </td>
                      <td style={{ padding: "16px 18px" }}>
                        <select
                          value={m.status}
                          onChange={(e) => handleStatusChange(m.id, e.target.value)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "11.5px",
                            fontWeight: 600,
                            border: "1px solid var(--color-divider)",
                            backgroundColor:
                              m.status === "active" ? "#eef8f0" :
                              m.status === "past_due" ? "#fef2f2" :
                              "#faf7f2",
                            color:
                              m.status === "active" ? "#1e6833" :
                              m.status === "past_due" ? "#b91c1c" : "#8a5800"
                          }}
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="past_due">Past Due</option>
                          <option value="cancelled_at_period_end">Cancelled at Period End</option>
                          <option value="lapsed">Lapsed</option>
                        </select>
                        {m.atRiskSince && (
                          <span style={{ display: "block", marginTop: "4px", backgroundColor: "#fff3e4", color: "#8a5800", padding: "2px 6px", borderRadius: "3px", fontSize: "10.5px", fontWeight: 600, width: "fit-content" }}>
                            At-Risk (60d)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "16px 18px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px", justifyContent: "flex-end" }}>
                          {/* Edit Profile Button */}
                          <button
                            type="button"
                            onClick={() => openEditProfile(m)}
                            style={{
                              backgroundColor: "#fff",
                              color: "var(--color-text-main)",
                              border: "1px solid var(--color-divider)",
                              borderRadius: "5px",
                              padding: "6px 10px",
                              fontSize: "12px",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            ✏️ Edit
                          </button>

                          {/* Ledger History Button */}
                          <button
                            type="button"
                            onClick={() => openLedgerModal(m)}
                            style={{
                              backgroundColor: "#f4ede4",
                              color: "var(--color-text-main)",
                              border: "1px solid var(--color-divider)",
                              borderRadius: "5px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            📜 Ledger
                          </button>

                          {/* Adjust Credits Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedMember(m)}
                            style={{
                              backgroundColor: "var(--color-accent)",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "5px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            + / - Credits
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Adjust Credits Drawer */}
            {selectedMember && (
              <div className="card" style={{ padding: "24px", backgroundColor: "#fff", border: "1px solid var(--color-divider)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "18px", margin: 0 }}>Adjust Credit Ledger</h3>
                  <button onClick={() => setSelectedMember(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>✕</button>
                </div>

                <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
                  Adjust balance for <strong>{selectedMember.firstName} {selectedMember.lastName}</strong>. Changes are appended to the immutable audit log (§5).
                </p>

                <form onSubmit={handleAdjustCredits} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "4px" }}>
                      Credit Delta (+ to grant / - to debit)
                    </label>
                    <input
                      type="number"
                      className="input"
                      value={adjustmentAmount}
                      onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, marginBottom: "4px" }}>
                      Reason / Reference Note (Mandatory)
                    </label>
                    <textarea
                      className="input"
                      rows={3}
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="e.g. Courtesy compensation for rain reschedule, Godmother bonus, offline workshop credit..."
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={adjusting}
                    className="btn btn-primary"
                    style={{ width: "100%", padding: "10px", fontSize: "14px" }}
                  >
                    {adjusting ? "Recording..." : "Apply Adjustment →"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ─── MODAL: FULL MEMBER CREDIT LEDGER HISTORY ─── */}
        {activeLedgerMember && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(57, 41, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 110,
          }}>
            <div className="card" style={{ maxWidth: "780px", width: "100%", maxHeight: "90vh", overflowY: "auto", backgroundColor: "#fff", padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "1px solid var(--color-divider)", paddingBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600 }}>
                    Member Credit Ledger Audit
                  </div>
                  <h2 style={{ fontSize: "24px", margin: "4px 0 2px" }}>{activeLedgerMember.firstName} {activeLedgerMember.lastName}</h2>
                  <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                    Account: {activeLedgerMember.email} · Total Current Balance: <strong style={{ color: "var(--color-accent)", fontSize: "15px" }}>{totalBalance} credits</strong>
                  </div>
                </div>
                <button onClick={() => setActiveLedgerMember(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
              </div>

              {ledgerLoading ? (
                <p style={{ textAlign: "center", padding: "32px" }}>Loading credit ledger...</p>
              ) : ledgerEntries.length === 0 ? (
                <p style={{ fontSize: "13.5px", color: "var(--color-text-muted)", padding: "20px", textAlign: "center" }}>
                  No credit movements recorded for this member.
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#faf6f0", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px" }}>Date</th>
                      <th style={{ padding: "10px 12px" }}>Movement Type</th>
                      <th style={{ padding: "10px 12px" }}>Reason / Notes</th>
                      <th style={{ padding: "10px 12px", textAlign: "right" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((e) => (
                      <tr key={e.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                        <td style={{ padding: "10px 12px", color: "var(--color-text-muted)" }}>
                          {new Date(e.createdAt).toLocaleDateString()} {new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            padding: "2px 6px",
                            borderRadius: "3px",
                            fontSize: "11px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            backgroundColor: e.amount > 0 ? "#eef8f0" : "#fef2f2",
                            color: e.amount > 0 ? "#1e6833" : "#b91c1c"
                          }}>
                            {e.type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "10px 10px", color: "var(--color-text-main)" }}>
                          {e.reason || "—"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: e.amount > 0 ? "#1e6833" : "#b91c1c" }}>
                          {e.amount > 0 ? `+${e.amount}` : e.amount} cr
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ─── MODAL: EDIT MEMBER PROFILE ─── */}
        {editingMember && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(57, 41, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 110,
          }}>
            <div className="card" style={{ maxWidth: "520px", width: "100%", backgroundColor: "#fff", padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "20px", margin: 0 }}>Edit Member: {editingMember.firstName} {editingMember.lastName}</h2>
                <button onClick={() => setEditingMember(null)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13.5px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Motherhood Stage</label>
                  <select
                    className="input"
                    value={profileForm.stage}
                    onChange={(e) => setProfileForm({ ...profileForm, stage: e.target.value })}
                  >
                    <option value="Pregnant">Pregnant</option>
                    <option value="Postpartum (0–12 months)">Postpartum (0–12 months)</option>
                    <option value="Toddler (1–3 years)">Toddler (1–3 years)</option>
                    <option value="School Age (3+ years)">School Age (3+ years)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Neighbourhood Circle</label>
                  <select
                    className="input"
                    value={profileForm.neighbourhood}
                    onChange={(e) => setProfileForm({ ...profileForm, neighbourhood: e.target.value })}
                  >
                    <option value="Eixample">Eixample</option>
                    <option value="Gràcia">Gràcia</option>
                    <option value="Sarrià-Sant Gervasi">Sarrià-Sant Gervasi</option>
                    <option value="Les Corts">Les Corts</option>
                    <option value="Poblenou">Poblenou</option>
                    <option value="Ciutat Vella">Ciutat Vella</option>
                    <option value="Outside Barcelona">Outside Barcelona</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Phone / WhatsApp (E.164)</label>
                  <input
                    type="tel"
                    className="input"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="+34 600 000 000"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Internal Care & Operator Notes</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={profileForm.notesInternal}
                    onChange={(e) => setProfileForm({ ...profileForm, notesInternal: e.target.value })}
                    placeholder="Private notes for club operators..."
                  />
                </div>

                <button type="submit" disabled={savingProfile} className="btn btn-primary" style={{ marginTop: "8px", padding: "10px" }}>
                  {savingProfile ? "Saving..." : "Save Member Details"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
