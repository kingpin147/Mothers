"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminFinance } from "@/app/actions/adminCms";

export default function AdminFinancePage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getAdminFinance();
      setLoading(false);
      if (res.success && res.payments) {
        setPayments(res.payments);
      }
    }
    load();
  }, []);

  const totalRevenueCents = payments.reduce((sum, p) => p.status === "succeeded" ? sum + p.amountCents : sum, 0);

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "40px clamp(24px, 5vw, 64px) 80px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-accent)", fontWeight: 600 }}>
              Back Office · Financial Accounting
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "32px", margin: "4px 0 0" }}>
              Revenue & Payments Ledger
            </h1>
          </div>
          <Link href="/admin" className="btn btn-secondary" style={{ fontSize: "13px" }}>
            ← Admin Dashboard
          </Link>
        </div>

        {/* Summary Card */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "28px" }}>
          <div className="card" style={{ backgroundColor: "#fff", padding: "24px" }}>
            <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "4px" }}>
              Total Processed Volume
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "32px", fontWeight: 600, color: "var(--color-accent)" }}>
              €{(totalRevenueCents / 100).toFixed(2)}
            </div>
          </div>
          <div className="card" style={{ backgroundColor: "#fff", padding: "24px" }}>
            <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-text-muted)", marginBottom: "4px" }}>
              Total Transactions
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "32px", fontWeight: 600, color: "var(--color-accent-2)" }}>
              {payments.length}
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <p>Loading financial transactions...</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden", backgroundColor: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ backgroundColor: "#faf6f0", borderBottom: "1px solid var(--color-divider)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px" }}>Payer</th>
                  <th style={{ padding: "12px 16px" }}>Purpose</th>
                  <th style={{ padding: "12px 16px" }}>Date</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600 }}>{p.personName}</div>
                      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{p.personEmail}</div>
                    </td>
                    <td style={{ padding: "14px 16px", textTransform: "capitalize" }}>
                      {p.purpose.replace(/_/g, " ")}
                    </td>
                    <td style={{ padding: "14px 16px", color: "var(--color-text-muted)" }}>
                      {new Date(p.occurredAt).toLocaleDateString()} {new Date(p.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{
                        padding: "3px 8px",
                        borderRadius: "3px",
                        fontSize: "11px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        backgroundColor: p.status === "succeeded" ? "var(--color-status-confirmed)" : "var(--color-status-cancelled)",
                        color: p.status === "succeeded" ? "#285430" : "#993842"
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 600, color: "var(--color-accent)" }}>
                      €{(p.amountCents / 100).toFixed(2)} {p.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
