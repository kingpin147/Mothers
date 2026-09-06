"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getGodmotherLeaderboard, payoutGodmotherReward } from "@/app/actions/adminCms";

export default function AdminGodmothersPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");
  const [payingId, setPayingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await getGodmotherLeaderboard();
    if (res.success && res.referrals) {
      setReferrals(res.referrals);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePayout = async (referralId: string) => {
    setPayingId(referralId);
    const res = await payoutGodmotherReward(referralId);
    setPayingId(null);
    if (res.success) {
      loadData();
    } else {
      alert(res.error || "Failed to issue payout");
    }
  };

  const filtered = referrals.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const pendingCount = referrals.filter((r) => r.status === "pending" || r.status === "qualified").length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 60px" }}>
      <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "6px" }}>
              <Link href="/admin" style={{ color: "#7b1f2c", textDecoration: "none" }}>← Back to Dashboard</Link>
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(28px, 3.8vw, 38px)", lineHeight: 1.1, margin: "0 0 6px" }}>
              Godmother Referrals & Rewards
            </h1>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0 }}>
              Automatic referral program (§13). 5 credits on friend join, 15 credits at 3-month milestone. 1-click reward ledger grant.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setFilter("all")}
              style={{ border: filter === "all" ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.2)", background: filter === "all" ? "rgba(123,31,44,0.08)" : "#fff", color: filter === "all" ? "#7b1f2c" : "#39292a", borderRadius: "4px", padding: "7px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              All ({referrals.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("pending")}
              style={{ border: filter === "pending" ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.2)", background: filter === "pending" ? "rgba(123,31,44,0.08)" : "#fff", color: filter === "pending" ? "#7b1f2c" : "#39292a", borderRadius: "4px", padding: "7px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              Pending Payout ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("paid")}
              style={{ border: filter === "paid" ? "1px solid #7b1f2c" : "1px solid rgba(57,41,42,0.2)", background: filter === "paid" ? "rgba(123,31,44,0.08)" : "#fff", color: filter === "paid" ? "#7b1f2c" : "#39292a", borderRadius: "4px", padding: "7px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              Paid
            </button>
          </div>
        </div>

        {/* Referrals List Table */}
        <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 1.5fr 1fr 1fr 1fr", gap: "12px", padding: "12px 18px", borderBottom: "1px solid rgba(57,41,42,0.12)", background: "rgba(57,41,42,0.03)", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)" }}>
            <div>Godmother (Referrer)</div>
            <div>Code</div>
            <div>Friend Referred</div>
            <div>Status</div>
            <div>Date</div>
            <div style={{ textAlign: "right" }}>Action</div>
          </div>

          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "rgba(57,41,42,0.6)" }}>Loading referrals...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "rgba(57,41,42,0.6)" }}>No referrals match this filter.</div>
          ) : (
            filtered.map((r) => (
              <div key={r.referralId} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 1.5fr 1fr 1fr 1fr", gap: "12px", padding: "14px 18px", borderBottom: "1px solid rgba(57,41,42,0.08)", alignItems: "center", fontSize: "13px" }}>
                <div>
                  <div style={{ fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", fontSize: "15px" }}>{r.referrerName}</div>
                  <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.6)" }}>{r.referrerEmail}</div>
                </div>
                <div style={{ fontFamily: "monospace", color: "#7b1f2c", fontWeight: 600 }}>{r.code}</div>
                <div>{r.referredPersonName || "Pending join"}</div>
                <div>
                  <span style={{ display: "inline-block", border: `1px solid ${r.status === "paid" ? "#3f6604" : "#a8752c"}`, color: r.status === "paid" ? "#3f6604" : "#a8752c", borderRadius: "3px", padding: "3px 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", textTransform: "capitalize" }}>
                    {r.status}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.6)" }}>
                  {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <div style={{ textAlign: "right" }}>
                  {r.status === "paid" ? (
                    <span style={{ fontSize: "12px", color: "#3f6604" }}>Granted (+5) ✓</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePayout(r.referralId)}
                      disabled={payingId === r.referralId}
                      style={{ border: "1px solid #7b1f2c", background: "#7b1f2c", color: "#fff", borderRadius: "4px", padding: "6px 12px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
                    >
                      {payingId === r.referralId ? "..." : "Grant 5 credits"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
