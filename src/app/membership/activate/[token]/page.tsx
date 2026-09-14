"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getActivationDetails, saveMemberPassword } from "@/app/actions/activate";
import Link from "next/link";
import { ForwardArrow, BackArrow } from "@/components/Icons";

const WINE = "#7b1f2c";
const GREEN = "#2e6930";
const MUTED = "rgba(57,41,42,0.65)";

function ActivateMembershipContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params?.token as string;
  const isCanceled = searchParams?.get("canceled") === "true";

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) return;
      const res = await getActivationDetails(token);

      if (res.success && res.member) {
        setDetails(res);
      } else {
        setErrorMsg(res.error || "Invalid or expired activation link.");
      }
      setLoading(false);
    }
    load();
  }, [token]);

  const hasSavedPassword = !!details?.hasPasswordSet;
  const isMinLength = password.length >= 8;
  const isMatching = password.length > 0 && password === confirmPassword;

  const handleProceedToStripe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // If password hasn't been set yet, or user explicitly opened the editor to change it
    if (!hasSavedPassword || isEditingPassword || password.length > 0) {
      if (!password) {
        setSubmitError("Please choose a login password (at least 8 characters).");
        return;
      }

      if (!isMinLength) {
        setSubmitError("Password is too short. Please use at least 8 characters.");
        return;
      }

      if (!confirmPassword) {
        setSubmitError("Please confirm your password.");
        return;
      }

      if (!isMatching) {
        setSubmitError("Passwords do not match. Please make sure both fields are identical.");
        return;
      }
    }

    setSubmitting(true);

    try {
      // 1. Save password if provided
      if (password.length > 0) {
        const saveRes = await saveMemberPassword(token, password);
        if (!saveRes.success) {
          setSubmitError(saveRes.error || "Failed to set password. Please try again.");
          setSubmitting(false);
          return;
        }
      }

      // 2. Initiate Stripe Hosted Checkout
      const checkoutRes = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "membership",
          memberId: details.member.id,
          token,
        }),
      });

      const data = await checkoutRes.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setSubmitError(data.error || "Failed to initialize Stripe checkout. Please try again.");
        setSubmitting(false);
      }
    } catch (err: any) {
      setSubmitError(err.message || "A network error occurred. Please check your connection.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", color: WINE }}>
          Loading your membership details...
        </p>
      </div>
    );
  }

  if (errorMsg || !details) {
    return (
      <div style={{ backgroundColor: "#f8efe2", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ maxWidth: "540px", margin: "0 auto", padding: "40px 32px", textAlign: "center", backgroundColor: "#fffdfa", borderRadius: "8px", border: "1px solid rgba(57,41,42,0.18)", boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "30px", color: WINE, marginBottom: "14px" }}>
            Link Expired or Invalid
          </h2>
          <p style={{ fontSize: "15px", color: "rgba(57,41,42,0.72)", marginBottom: "28px", lineHeight: 1.6 }}>
            {errorMsg === "TOKEN_EXPIRED"
              ? "This 72-hour activation link has expired. The place has returned to the queue."
              : "This link is no longer valid or has already been activated."}
          </p>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              border: `1px solid ${WINE}`,
              color: WINE,
              padding: "11px 22px",
              borderRadius: "4px",
              textDecoration: "none",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "14px",
              backgroundColor: "#fffdfa",
            }}
          >
            <BackArrow /> Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const isQuarterly = details.member?.billingFrequency === "quarterly";
  const planName = isQuarterly ? "Quarterly Membership" : "Monthly Membership";
  const priceDisplay = isQuarterly ? "€99 / 3 months" : "€39 / month";

  return (
    <div style={{ backgroundColor: "#f8efe2", minHeight: "100vh", padding: "clamp(24px, 4vw, 48px) 16px 80px", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      <div style={{ maxWidth: "620px", margin: "0 auto" }}>
        
        {/* Header Branding */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.18em", color: WINE, fontWeight: 600, marginBottom: "8px" }}>
            The Mothers · Barcelona
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(32px, 4.5vw, 44px)", lineHeight: 1.15, fontWeight: 400, margin: "0 0 10px" }}>
            Complete your membership
          </h1>
          <p style={{ fontSize: "15px", color: "rgba(57,41,42,0.72)", margin: 0, lineHeight: 1.6 }}>
            Hello <strong>{details.person?.firstName}</strong>, choose your login password below. You will then proceed to our secure Stripe checkout to activate your subscription.
          </p>
        </div>

        {isCanceled && (
          <div style={{ backgroundColor: "#fff8f8", border: "1px solid rgba(153,56,66,0.3)", borderRadius: "6px", padding: "14px 18px", marginBottom: "20px", fontSize: "13.5px", color: WINE }}>
            Checkout was canceled. Your place is still held within your 72-hour window. You can continue whenever you are ready.
          </div>
        )}

        {/* Form Card */}
        <div style={{ backgroundColor: "#fffdfa", border: "1px solid rgba(57,41,42,0.18)", borderRadius: "8px", padding: "clamp(24px, 4vw, 36px)", boxShadow: "0 8px 24px rgba(0,0,0,0.03)" }}>
          
          {/* Plan Summary Badge */}
          <div style={{ backgroundColor: "rgba(123,31,44,0.04)", border: "1px solid rgba(123,31,44,0.18)", borderRadius: "6px", padding: "18px 20px", marginBottom: "26px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: WINE, fontWeight: 600 }}>
                  Selected Plan
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 600, margin: "2px 0" }}>
                  {planName}
                </div>
                <div style={{ fontSize: "12.5px", color: MUTED }}>
                  Includes 20 event credits / month · Full member calendar access
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 600, color: WINE }}>
                  {priceDisplay}
                </div>
                <div style={{ fontSize: "11.5px", color: GREEN, fontWeight: 600 }}>
                  Cancel anytime
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleProceedToStripe} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Account Email (Read-only) */}
            <div>
              <label style={{ display: "block", fontSize: "12px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: "6px" }}>
                Account Email
              </label>
              <input
                type="email"
                value={details.person?.email || ""}
                disabled
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: "14px",
                  fontFamily: "'Lora', Georgia, serif",
                  backgroundColor: "rgba(57,41,42,0.05)",
                  border: "1px solid rgba(57,41,42,0.2)",
                  borderRadius: "4px",
                  color: "#39292a",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Password Fields */}
            {hasSavedPassword && !isEditingPassword ? (
              <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 600, color: GREEN, fontSize: "13.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>✓</span> Your login password is saved
                  </div>
                  <div style={{ fontSize: "12px", color: MUTED, marginTop: "2px" }}>
                    Your member account login is configured and ready.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingPassword(true)}
                  style={{ background: "none", border: "none", color: WINE, fontSize: "12.5px", textDecoration: "underline", cursor: "pointer", fontWeight: 600, padding: 0 }}
                >
                  Change password
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>
                    {hasSavedPassword ? "Update Password" : "Create Password"}
                  </label>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    {hasSavedPassword && (
                      <button
                        type="button"
                        onClick={() => { setIsEditingPassword(false); setPassword(""); setConfirmPassword(""); }}
                        style={{ background: "none", border: "none", color: MUTED, fontSize: "12px", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                      >
                        Keep saved password
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ background: "none", border: "none", color: WINE, fontSize: "12px", cursor: "pointer", padding: 0 }}
                    >
                      {showPassword ? "Hide password" : "Show password"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
                  <div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required={!hasSavedPassword}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        fontSize: "14px",
                        fontFamily: "'Lora', Georgia, serif",
                        backgroundColor: "#fff",
                        border: isMinLength ? `1px solid ${GREEN}` : "1px solid rgba(57,41,42,0.25)",
                        borderRadius: "4px",
                        color: "#39292a",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required={!hasSavedPassword}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        fontSize: "14px",
                        fontFamily: "'Lora', Georgia, serif",
                        backgroundColor: "#fff",
                        border: confirmPassword.length > 0 
                          ? (isMatching ? `1px solid ${GREEN}` : "1px solid #c2410c") 
                          : "1px solid rgba(57,41,42,0.25)",
                        borderRadius: "4px",
                        color: "#39292a",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Real-time Match & Validation Indicators */}
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "10px", fontSize: "12px" }}>
                  <span style={{ color: isMinLength ? GREEN : MUTED, display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: isMinLength ? 600 : 400 }}>
                    {isMinLength ? "✓" : "○"} At least 8 characters
                  </span>

                  {confirmPassword.length > 0 && (
                    <span style={{ color: isMatching ? GREEN : "#c2410c", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                      {isMatching ? "✓ Passwords match" : "✕ Passwords do not match"}
                    </span>
                  )}
                </div>
              </div>
            )}

            {submitError && (
              <div style={{ padding: "12px 14px", backgroundColor: "#fff8f8", border: "1px solid rgba(153,56,66,0.3)", borderRadius: "4px", fontSize: "13px", color: WINE }}>
                {submitError}
              </div>
            )}

            {/* Submit Button to Stripe Checkout */}
            <div style={{ marginTop: "12px" }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  backgroundColor: submitting ? "rgba(123,31,44,0.6)" : WINE,
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  cursor: submitting ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "background-color 0.2s",
                }}
              >
                {submitting ? (
                  "Connecting to Stripe Checkout..."
                ) : (
                  <>Continue to Secure Stripe Checkout <ForwardArrow /></>
                )}
              </button>

              <div style={{ textAlign: "center", marginTop: "12px", fontSize: "12px", color: MUTED }}>
                🔒 You will be redirected to Stripe's encrypted checkout for Apple Pay, Google Pay, or Card.
              </div>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
}

export default function ActivateMembershipPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", color: "#7b1f2c" }}>
          Loading your membership details...
        </p>
      </div>
    }>
      <ActivateMembershipContent />
    </Suspense>
  );
}

