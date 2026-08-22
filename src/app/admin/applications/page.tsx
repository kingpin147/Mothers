"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getApplicationsForAdmin, acceptApplication, declineApplication } from "@/app/actions/admin";

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState<"submitted" | "accepted" | "declined" | "all">("submitted");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    const res = await getApplicationsForAdmin(filter);
    setLoading(false);
    if (res.success && res.applications) {
      setApps(res.applications);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [filter]);

  const handleAccept = async (appId: string) => {
    if (!confirm("Confirm acceptance? This will generate a 72-hour payment link and email the applicant.")) return;
    setActionLoading(appId);
    const res = await acceptApplication(appId);
    setActionLoading(null);
    if (res.success) {
      alert("Application accepted! 72-hour payment link sent.");
      fetchApps();
    } else {
      alert(res.error || "Failed to accept application");
    }
  };

  const handleDecline = async (appId: string) => {
    const reason = prompt("Enter optional decline reason code:", "CAPACITY_REACHED");
    if (reason === null) return;
    setActionLoading(appId);
    const res = await declineApplication(appId, reason);
    setActionLoading(null);
    if (res.success) {
      alert("Application declined. Waitlist notification sent.");
      fetchApps();
    } else {
      alert(res.error || "Failed to decline application");
    }
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "40px clamp(24px, 5vw, 64px)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-accent)", fontWeight: 600 }}>
              Back Office · Review Queue
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "32px", margin: "4px 0 0" }}>
              Membership Applications
            </h1>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Link href="/admin" className="btn btn-secondary" style={{ fontSize: "13px" }}>
              ← Admin Dashboard
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
          {(["submitted", "accepted", "declined", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px",
                borderRadius: "4px",
                border: filter === f ? "1px solid var(--color-accent)" : "1px solid var(--color-divider)",
                backgroundColor: filter === f ? "var(--color-accent)" : "#fff",
                color: filter === f ? "#fff" : "var(--color-text)",
                fontFamily: "inherit",
                fontSize: "13px",
                cursor: "pointer",
                textTransform: "capitalize"
              }}
            >
              {f === "submitted" ? "Pending Review" : f}
            </button>
          ))}
        </div>

        {/* Applications Table */}
        {loading ? (
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <p>Loading review queue...</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="card" style={{ padding: "48px", textAlign: "center", backgroundColor: "#fff" }}>
            <h3 style={{ fontSize: "20px", color: "var(--color-accent)" }}>No applications in this queue</h3>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
              All submitted applications for this filter have been processed.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: selectedApp ? "1fr 420px" : "1fr", gap: "24px" }}>
            {/* List */}
            <div className="card" style={{ padding: "0", overflow: "hidden", backgroundColor: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#faf6f0", borderBottom: "1px solid var(--color-divider)", textAlign: "left" }}>
                    <th style={{ padding: "12px 16px" }}>Applicant</th>
                    <th style={{ padding: "12px 16px" }}>Stage & Neighbourhood</th>
                    <th style={{ padding: "12px 16px" }}>Submitted</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app) => {
                    const answers = app.answers || {};
                    const isSelected = selectedApp?.id === app.id;
                    return (
                      <tr
                        key={app.id}
                        style={{
                          borderBottom: "1px solid var(--color-divider)",
                          backgroundColor: isSelected ? "#f4ece2" : "transparent"
                        }}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 600 }}>{app.personName} {app.personLastName}</div>
                          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{app.personEmail}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div>{answers.stage || "—"}</div>
                          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{answers.neighbourhood || "—"}</div>
                        </td>
                        <td style={{ padding: "14px 16px", color: "var(--color-text-muted)", fontSize: "12.5px" }}>
                          {new Date(app.submittedAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            padding: "3px 8px",
                            borderRadius: "3px",
                            fontSize: "11px",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            backgroundColor:
                              app.status === "accepted" ? "var(--color-status-confirmed)" :
                              app.status === "declined" ? "var(--color-status-cancelled)" :
                              "var(--color-status-pending)",
                            color:
                              app.status === "accepted" ? "#285430" :
                              app.status === "declined" ? "#993842" : "#8a5800"
                          }}>
                            {app.status}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedApp(app)}
                            style={{
                              background: "transparent",
                              border: "1px solid var(--color-divider)",
                              borderRadius: "4px",
                              padding: "5px 10px",
                              fontSize: "12px",
                              marginRight: "6px",
                              cursor: "pointer"
                            }}
                          >
                            Review
                          </button>
                          {app.status === "submitted" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAccept(app.id)}
                                disabled={actionLoading === app.id}
                                style={{
                                  backgroundColor: "var(--color-accent-2)",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "4px",
                                  padding: "5px 10px",
                                  fontSize: "12px",
                                  marginRight: "4px",
                                  cursor: "pointer"
                                }}
                              >
                                Accept (72h)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecline(app.id)}
                                disabled={actionLoading === app.id}
                                style={{
                                  backgroundColor: "transparent",
                                  color: "var(--color-accent)",
                                  border: "1px solid var(--color-accent)",
                                  borderRadius: "4px",
                                  padding: "5px 10px",
                                  fontSize: "12px",
                                  cursor: "pointer"
                                }}
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Inspect Drawer */}
            {selectedApp && (
              <div className="card" style={{ padding: "24px", backgroundColor: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "18px", margin: 0 }}>Application Details</h3>
                  <button onClick={() => setSelectedApp(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}>✕</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                  <div><strong>Name:</strong> {selectedApp.personName} {selectedApp.personLastName}</div>
                  <div><strong>Email:</strong> {selectedApp.personEmail}</div>
                  <div><strong>Stage:</strong> {selectedApp.answers?.stage}</div>
                  <div><strong>Children Age:</strong> {selectedApp.answers?.childrenAge || "None"}</div>
                  <div><strong>Neighbourhood:</strong> {selectedApp.answers?.neighbourhood}</div>
                  <div><strong>Hoping to Find:</strong> {selectedApp.answers?.hopingToFind?.join(", ")}</div>
                  <div><strong>Free Times:</strong> {selectedApp.answers?.freeTimes?.join(", ")}</div>
                  <div><strong>Source:</strong> {selectedApp.answers?.referralSource}</div>
                  {selectedApp.answers?.socialHandle && (
                    <div><strong>Social:</strong> {selectedApp.answers?.socialPlatform} {selectedApp.answers?.socialHandle}</div>
                  )}
                  {selectedApp.answers?.motivation && (
                    <div style={{ backgroundColor: "#fdf9f2", padding: "10px", borderRadius: "4px", border: "1px solid var(--color-divider)" }}>
                      <strong>Motivation:</strong>
                      <p style={{ margin: "4px 0 0", fontStyle: "italic" }}>"{selectedApp.answers?.motivation}"</p>
                    </div>
                  )}
                  {selectedApp.paymentLinkToken && (
                    <div style={{ backgroundColor: "var(--color-status-confirmed)", padding: "10px", borderRadius: "4px", marginTop: "8px" }}>
                      <strong>72h Link Token:</strong>
                      <div style={{ fontSize: "11px", wordBreak: "break-all", fontFamily: "monospace", marginTop: "4px" }}>
                        {selectedApp.paymentLinkToken}
                      </div>
                      <div style={{ fontSize: "11px", color: "#285430", marginTop: "4px" }}>
                        Expires: {selectedApp.acceptExpiresAt ? new Date(selectedApp.acceptExpiresAt).toLocaleString() : "—"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
