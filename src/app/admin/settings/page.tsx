"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getClubSettings, updateClubSettings, getMembershipWindows, createMembershipWindow, setMembershipWindowStatus } from "@/app/actions/adminSettings";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [windows, setWindows] = useState<any[]>([]);
  const [windowForm, setWindowForm] = useState({
    opensAt: "",
    closesAt: "",
    placesOffered: 50,
    openingMonthlyPriceCents: 2900,
    openingQuarterlyPriceCents: 7900,
    standardMonthlyPriceCents: 3900,
    standardQuarterlyPriceCents: 9900,
  });
  const [form, setForm] = useState({
    monthlyGrantCredits: 20,
    rolloverCapCredits: 40,
    referralBonusCredits: 20,
    guestPassPriceCents: 3500,
    maxLifetimeGuestPasses: 2,
    placesOffered: 50,
    monthlyPriceCents: 2900,
    joiningFeeCents: 1900,
  });

  const loadSettings = async () => {
    setLoading(true);
    const res = await getClubSettings();
    const windowsRes = await getMembershipWindows();
    if (windowsRes.success) setWindows(windowsRes.windows || []);
    setLoading(false);
    if (res.success && res.settings) {
      setForm({
        monthlyGrantCredits: res.settings.monthlyGrantCredits,
        rolloverCapCredits: res.settings.rolloverCapCredits,
        referralBonusCredits: res.settings.referralBonusCredits,
        guestPassPriceCents: res.settings.guestPassPriceCents,
        maxLifetimeGuestPasses: res.settings.maxLifetimeGuestPasses,
        placesOffered: res.currentWindow?.placesOffered || 50,
        monthlyPriceCents: res.currentWindow?.monthlyPriceCents || 2900,
        joiningFeeCents: res.currentWindow?.joiningFeeCents || 5800,
      });
    }
  };

  const handleCreateWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createMembershipWindow(windowForm);
    if (!res.success) {
      alert(res.error || "Failed to create window.");
      return;
    }
    alert("Membership window created as draft.");
    setWindowForm({ ...windowForm, opensAt: "", closesAt: "" });
    const refreshed = await getMembershipWindows();
    if (refreshed.success) setWindows(refreshed.windows || []);
  };

  const handleWindowStatus = async (id: string, status: "open" | "closed") => {
    const res = await setMembershipWindowStatus(id, status);
    if (!res.success) alert(res.error || "Failed to update window.");
    const refreshed = await getMembershipWindows();
    if (refreshed.success) setWindows(refreshed.windows || []);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateClubSettings(form);
    setSaving(false);
    if (res.success) {
      alert("Club settings updated successfully!");
      loadSettings();
    } else {
      alert("Failed to save settings.");
    }
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "40px clamp(24px, 5vw, 64px) 80px" }}>
      <div style={{ maxWidth: "880px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-accent)", fontWeight: 600 }}>
              Back Office · Configuration
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "32px", margin: "4px 0 0" }}>
              Global Club & Credit Policy Settings
            </h1>
          </div>
          <Link href="/admin" className="btn btn-secondary" style={{ fontSize: "13px" }}>
            ← Admin Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="card" style={{ padding: "40px", textAlign: "center", backgroundColor: "#fff" }}>
            <p>Loading club configuration...</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="card" style={{ backgroundColor: "#fff", padding: "28px", border: "1px solid var(--color-divider)" }}>
              <h3 style={{ fontSize: "18px", margin: "0 0 16px", color: "var(--color-accent)" }}>Membership Windows</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                {windows.map((membershipWindow) => (
                  <div key={membershipWindow.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", padding: "12px", border: "1px solid var(--color-divider)", flexWrap: "wrap" }}>
                    <span>{new Date(membershipWindow.opensAt).toLocaleDateString()} - {new Date(membershipWindow.closesAt).toLocaleDateString()} · {membershipWindow.placesOffered} places · {membershipWindow.status}</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {membershipWindow.status !== "open" && <button type="button" className="btn btn-secondary" onClick={() => handleWindowStatus(membershipWindow.id, "open")}>Open</button>}
                      {membershipWindow.status === "open" && <button type="button" className="btn btn-secondary" onClick={() => handleWindowStatus(membershipWindow.id, "closed")}>Close</button>}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleCreateWindow} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <input className="input" type="datetime-local" value={windowForm.opensAt} onChange={(e) => setWindowForm({ ...windowForm, opensAt: e.target.value })} required />
                <input className="input" type="datetime-local" value={windowForm.closesAt} onChange={(e) => setWindowForm({ ...windowForm, closesAt: e.target.value })} required />
                <input className="input" type="number" min={1} value={windowForm.placesOffered} onChange={(e) => setWindowForm({ ...windowForm, placesOffered: Number(e.target.value) })} required />
                <button className="btn btn-primary" type="submit">Create Draft Window</button>
              </form>
            </div>
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* 1. Credit Ledger Rules */}
            <div className="card" style={{ backgroundColor: "#fff", padding: "28px", border: "1px solid var(--color-divider)" }}>
              <h3 style={{ fontSize: "18px", margin: "0 0 16px", color: "var(--color-accent)" }}>Credit Ledger Policies</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", fontSize: "13.5px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
                    Monthly Member Credit Grant
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={form.monthlyGrantCredits}
                    onChange={(e) => setForm({ ...form, monthlyGrantCredits: Number(e.target.value) })}
                    min={0}
                    required
                  />
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                    Deposited on each successful recurring invoice (Default: 20).
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
                    Rollover Cap (Maximum Storable Balance)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={form.rolloverCapCredits}
                    onChange={(e) => setForm({ ...form, rolloverCapCredits: Number(e.target.value) })}
                    min={0}
                    required
                  />
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                    Caps unused subscription credits (Default: 40).
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
                    Godmother Referral Bonus Credits
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={form.referralBonusCredits}
                    onChange={(e) => setForm({ ...form, referralBonusCredits: Number(e.target.value) })}
                    min={0}
                    required
                  />
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                    Bonus granted per joined friend (Exempt from 40 cap).
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
                    Max Lifetime Guest Passes per Mother
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={form.maxLifetimeGuestPasses}
                    onChange={(e) => setForm({ ...form, maxLifetimeGuestPasses: Number(e.target.value) })}
                    min={0}
                    required
                  />
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                    Maximum passes a non-member can buy before applying (Default: 2).
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Membership Intake & Launch Window */}
            <div className="card" style={{ backgroundColor: "#fff", padding: "28px", border: "1px solid var(--color-divider)" }}>
              <h3 style={{ fontSize: "18px", margin: "0 0 16px", color: "var(--color-accent)" }}>Founding Window & Pricing</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "18px", fontSize: "13.5px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
                    Opening Circle Places Quota
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={form.placesOffered}
                    onChange={(e) => setForm({ ...form, placesOffered: Number(e.target.value) })}
                    min={1}
                    required
                  />
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                    Target founding cohort size (Default: 50).
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
                    Founding Monthly Dues (€)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={form.monthlyPriceCents / 100}
                    onChange={(e) => setForm({ ...form, monthlyPriceCents: Number(e.target.value) * 100 })}
                    min={0}
                    required
                  />
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                    Rate locked for 12 months (€29/mo).
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
                    Joining Fee (€)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={form.joiningFeeCents / 100}
                    onChange={(e) => setForm({ ...form, joiningFeeCents: Number(e.target.value) * 100 })}
                    min={0}
                    required
                  />
                  <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                    One-off joining fee charged with 1st invoice (€19).
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ padding: "14px", fontSize: "15px" }}
            >
              {saving ? "Saving Changes..." : "Save Global Club Policies →"}
            </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
