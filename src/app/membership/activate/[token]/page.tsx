"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getActivationDetails, completeMembershipActivation } from "@/app/actions/activate";
import Link from "next/link";

export default function ActivateMembershipPage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    async function load() {
      if (!token) return;
      const res = await getActivationDetails(token);
      setLoading(false);
      if (res.success) {
        setDetails(res);
      } else {
        setErrorMsg(res.error || "Invalid or expired activation link.");
      }
    }
    load();
  }, [token]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    const res = await completeMembershipActivation(token, password);
    setSubmitting(false);

    if (res.success && res.url) {
      window.location.href = res.url;
    } else {
      setErrorMsg(res.error || "Activation failed.");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "18px" }}>Verifying your 72-hour activation link...</p>
      </div>
    );
  }

  if (activated) {
    return (
      <div style={{ maxWidth: "600px", margin: "80px auto", padding: "32px", textAlign: "center" }}>
        <div style={{
          backgroundColor: "var(--color-status-confirmed)",
          color: "#285430",
          display: "inline-block",
          padding: "6px 14px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: 600,
          textTransform: "uppercase",
          marginBottom: "16px"
        }}>
          Membership Activated
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "36px", marginBottom: "16px" }}>
          Welcome to The Mothers
        </h1>
        <p style={{ fontSize: "16px", color: "var(--color-text-muted)", lineHeight: "1.6", marginBottom: "32px" }}>
          Your account has been created, your founding rate of €29/month is locked for 12 months, and your initial 20 credits are in your ledger.
        </p>
        <Link href="/account/login" className="btn btn-primary" style={{ padding: "12px 28px" }}>
          Sign In with Your Email & Password →
        </Link>
      </div>
    );
  }

  if (errorMsg && !details) {
    return (
      <div style={{ maxWidth: "560px", margin: "80px auto", padding: "32px", textAlign: "center" }}>
        <h2 style={{ fontSize: "28px", color: "var(--color-accent)", marginBottom: "16px" }}>Link Expired or Invalid</h2>
        <p style={{ fontSize: "15px", color: "var(--color-text-muted)", marginBottom: "28px" }}>
          {errorMsg === "TOKEN_EXPIRED"
            ? "This 72-hour activation link has expired. The place has returned to the waitlist queue."
            : "This link is no longer valid or has already been activated."}
        </p>
        <Link href="/" className="btn btn-secondary">
          Return to Homepage
        </Link>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "80vh", padding: "60px 24px" }}>
      <div className="card" style={{ maxWidth: "540px", margin: "0 auto", backgroundColor: "#fdf9f2", padding: "36px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-accent)", fontWeight: 600, marginBottom: "6px" }}>
            Activation & Password Setup
          </div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "30px", margin: "0 0 8px" }}>
            Finalize Your Membership
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0 }}>
            Hello {details.person?.firstName}! Set your password to secure your account and activate your 20 monthly credits.
          </p>
        </div>

        {/* Plan Breakdown Card */}
        <div style={{
          backgroundColor: "#fff",
          border: "1px solid var(--color-divider)",
          borderRadius: "6px",
          padding: "16px 20px",
          marginBottom: "24px",
          fontSize: "13.5px",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)" }}>Membership Tier</span>
            <span style={{ fontWeight: 600 }}>Opening Circle (Founding Member)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)" }}>Monthly Dues</span>
            <span style={{ fontWeight: 600, color: "var(--color-accent)" }}>€29 / month (12-Month Lock)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--color-text-muted)" }}>Initial Credits</span>
            <span style={{ fontWeight: 600, color: "var(--color-accent-2)" }}>+20 Credits Granted Today</span>
          </div>
        </div>

        {errorMsg && (
          <div style={{ backgroundColor: "var(--color-status-cancelled)", color: "#993842", padding: "10px 14px", borderRadius: "4px", fontSize: "13.5px", marginBottom: "20px" }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleActivate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
              Email Address
            </label>
            <input
              type="email"
              className="input"
              value={details.person?.email || ""}
              disabled
              style={{ backgroundColor: "rgba(0,0,0,0.04)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
              Create Password (min. 8 characters)
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoFocus
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
              Confirm Password
            </label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", marginTop: "12px", fontSize: "15px" }}
          >
            {submitting ? "Activating Membership..." : "Complete Activation & Claim 20 Credits →"}
          </button>
        </form>
      </div>
    </div>
  );
}
