"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getAdminCommunitiesAction,
  approveCommunityAction,
  rejectCommunityAction,
  updateCommunityCommissionAction,
} from "@/app/actions/adminCommunities";

export default function AdminCommunitiesPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"requests" | "active">("requests");
  const [commissionInputs, setCommissionInputs] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getAdminCommunitiesAction();
      setRequests(res.requests);
      setApproved(res.approved);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (c: any) => {
    try {
      setActionLoading(c.id);
      const rawInput = commissionInputs[c.id];
      const parsed = rawInput && rawInput.trim() !== "" ? parseFloat(rawInput) : undefined;
      await approveCommunityAction({
        communityId: c.id,
        commissionRatePercent: parsed,
      });
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (c: any) => {
    if (!confirm(`Are you sure you want to decline ${c.name}?`)) return;
    try {
      setActionLoading(c.id);
      await rejectCommunityAction({ communityId: c.id });
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to decline");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9f8f6", padding: "30px 24px" }}>
      <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7b1f2c", fontWeight: 600 }}>
              Admin Desk
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", color: "#39292a", margin: "4px 0 0 0" }}>
              Communities & Workshops
            </h1>
          </div>
          <Link
            href="/admin"
            style={{
              fontSize: "13px",
              color: "rgba(57, 41, 42, 0.7)",
              textDecoration: "underline",
            }}
          >
            ← Back to Admin
          </Link>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid rgba(57, 41, 42, 0.15)", marginBottom: "24px" }}>
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            style={{
              border: "none",
              backgroundColor: "transparent",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              color: activeTab === "requests" ? "#7b1f2c" : "rgba(57, 41, 42, 0.6)",
              borderBottom: activeTab === "requests" ? "2px solid #7b1f2c" : "none",
            }}
          >
            Requests ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            style={{
              border: "none",
              backgroundColor: "transparent",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              color: activeTab === "active" ? "#7b1f2c" : "rgba(57, 41, 42, 0.6)",
              borderBottom: activeTab === "active" ? "2px solid #7b1f2c" : "none",
            }}
          >
            Active Communities ({approved.length})
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "rgba(57, 41, 42, 0.6)" }}>
            Loading communities...
          </div>
        ) : activeTab === "requests" ? (
          <div>
            {requests.length === 0 ? (
              <div style={{ backgroundColor: "#ffffff", padding: "40px", borderRadius: "8px", textAlign: "center", color: "rgba(57, 41, 42, 0.6)" }}>
                No pending community or workshop applications.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {requests.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      border: "1px solid rgba(57, 41, 42, 0.15)",
                      padding: "20px 24px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 600, color: "#39292a" }}>
                            {c.name}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              textTransform: "uppercase",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              backgroundColor: c.type === "workshop" ? "rgba(180, 83, 9, 0.1)" : "rgba(123, 31, 44, 0.1)",
                              color: c.type === "workshop" ? "#b45309" : "#7b1f2c",
                              fontWeight: 600,
                            }}
                          >
                            {c.type === "workshop" ? "Workshop" : "Community"}
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.7)", marginTop: "4px" }}>
                          Contact: <strong>{c.contactEmail}</strong> {c.contactPhone ? `· ${c.contactPhone}` : ""}
                        </div>
                      </div>

                      <div style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.5)" }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {c.description && (
                      <div style={{ fontSize: "14px", color: "#39292a", lineHeight: 1.5, backgroundColor: "#fcf8f5", padding: "10px 14px", borderRadius: "6px" }}>
                        {c.description}
                      </div>
                    )}

                    {/* Legal & Tax Information (CM-02) */}
                    <div
                      style={{
                        fontSize: "12.5px",
                        backgroundColor: "#fafafa",
                        border: "1px solid rgba(57, 41, 42, 0.08)",
                        borderRadius: "6px",
                        padding: "10px 14px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <span style={{ color: "rgba(57, 41, 42, 0.6)" }}>Legal name: </span>
                        <strong>{c.legalName || "—"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "rgba(57, 41, 42, 0.6)" }}>Tax ID / NIF: </span>
                        <strong>{c.taxId || "—"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "rgba(57, 41, 42, 0.6)" }}>Insurance: </span>
                        <strong>{c.hasInsurance ? "✓ Covered" : "No"}</strong>
                      </div>
                    </div>

                    {/* Action Bar (CM-03) */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(57, 41, 42, 0.08)", paddingTop: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <label style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.8)" }}>
                          Commission % (leave empty for default: {c.type === "workshop" ? "20%" : "15%"}):
                        </label>
                        <input
                          type="number"
                          placeholder={c.type === "workshop" ? "20" : "15"}
                          value={commissionInputs[c.id] ?? ""}
                          onChange={(e) => setCommissionInputs({ ...commissionInputs, [c.id]: e.target.value })}
                          style={{
                            width: "70px",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            border: "1px solid rgba(57, 41, 42, 0.2)",
                            fontSize: "13px",
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          type="button"
                          disabled={actionLoading === c.id}
                          onClick={() => handleReject(c)}
                          style={{
                            border: "1px solid rgba(161, 44, 44, 0.3)",
                            backgroundColor: "#ffffff",
                            color: "#a12c2c",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === c.id}
                          onClick={() => handleApprove(c)}
                          style={{
                            border: "none",
                            backgroundColor: "#7b1f2c",
                            color: "#ffffff",
                            padding: "8px 18px",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Approve request
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {approved.length === 0 ? (
              <div style={{ backgroundColor: "#ffffff", padding: "40px", borderRadius: "8px", textAlign: "center", color: "rgba(57, 41, 42, 0.6)" }}>
                No active communities yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {approved.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "8px",
                      border: "1px solid rgba(57, 41, 42, 0.15)",
                      padding: "18px 22px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "19px", fontWeight: 600, color: "#39292a" }}>
                          {c.name}
                        </span>
                        <span
                          style={{
                            fontSize: "11px",
                            textTransform: "uppercase",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            backgroundColor: c.type === "workshop" ? "rgba(180, 83, 9, 0.1)" : "rgba(123, 31, 44, 0.1)",
                            color: c.type === "workshop" ? "#b45309" : "#7b1f2c",
                            fontWeight: 600,
                          }}
                        >
                          {c.type === "workshop" ? "Workshop" : "Community"}
                        </span>
                      </div>
                      <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.7)", marginTop: "4px" }}>
                        Invite link: <strong>themothers.cc/join/{c.inviteCode}</strong> · Contact: {c.contactEmail}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#39292a" }}>
                          Commission: {c.commissionRatePercent}%
                        </div>
                        <div style={{ fontSize: "11.5px", color: "rgba(57, 41, 42, 0.6)" }}>
                          Free events this month: {c.freeEventsThisMonth}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: "11px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          backgroundColor: c.stripeAccountId ? "rgba(59, 94, 4, 0.1)" : "rgba(180, 83, 9, 0.1)",
                          color: c.stripeAccountId ? "#3b5e04" : "#b45309",
                          fontWeight: 500,
                        }}
                      >
                        {c.stripeAccountId ? "Stripe Connected" : "Stripe Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
