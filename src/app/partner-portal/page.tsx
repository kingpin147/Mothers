"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCommunityPortalDataAction,
  createCommunityEventAction,
  connectStripeAccountAction,
} from "@/app/actions/partnerPortal";

export default function PartnerPortalPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ community: any; events: any[] } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  // New Event Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [capacity, setCapacity] = useState(12);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [priceEuros, setPriceEuros] = useState<string>("0");
  const [isCommunityOnly, setIsCommunityOnly] = useState(false);
  const [bookingCutoffHours, setBookingCutoffHours] = useState(3);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getCommunityPortalDataAction();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyInviteLink = async () => {
    if (!data?.community?.inviteCode) return;
    const url = `https://themothers.cc/join/${data.community.inviteCode}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleConnectStripe = async () => {
    try {
      await connectStripeAccountAction();
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to connect Stripe");
    }
  };

  // Commission Calculation (§14 / CM-06)
  const numericPrice = parseFloat(priceEuros) || 0;
  const commissionRate = data?.community?.commissionRatePercent ?? (data?.community?.type === "workshop" ? 20 : 15);
  let commissionEuros = 0;
  if (numericPrice > 0) {
    const rawComm = (numericPrice * commissionRate) / 100;
    commissionEuros = Math.max(1.0, Math.round(rawComm * 100) / 100); // Minimum €1
  }
  const payoutEuros = Math.max(0, numericPrice - commissionEuros);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const priceCents = Math.round((parseFloat(priceEuros) || 0) * 100);
      const res = await createCommunityEventAction({
        title,
        description,
        startsAt,
        durationMinutes,
        capacity,
        locationName,
        locationAddress,
        priceCents,
        isCommunityOnly,
        bookingCutoffHours,
      });

      if (!res.success) {
        if (res.error === "STRIPE_ACCOUNT_REQUIRED") {
          setFormError("A connected Stripe account is required to publish paid events. Please connect your Stripe account below.");
        } else if (res.error === "WORKSHOPS_CANNOT_BE_COMMUNITY_ONLY") {
          setFormError("Workshops cannot be marked as community-only.");
        } else if (res.error === "CARD_ON_FILE_REQUIRED") {
          setFormError("A payment card on file is required to publish free events past your monthly allowance.");
        } else {
          setFormError(res.error || "Failed to create event.");
        }
      } else {
        setFormSuccess(true);
        setShowEventForm(false);
        await loadData();
      }
    } catch (err: any) {
      setFormError(err?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(57, 41, 42, 0.6)" }}>
        Loading community space...
      </div>
    );
  }

  if (!data?.community) {
    return (
      <div style={{ maxWidth: "600px", margin: "60px auto", padding: "30px", backgroundColor: "#ffffff", borderRadius: "8px", textAlign: "center", border: "1px solid rgba(57, 41, 42, 0.15)" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "26px", color: "#39292a" }}>
          Community Space
        </h2>
        <p style={{ color: "rgba(57, 41, 42, 0.75)", fontSize: "14px", lineHeight: 1.6, margin: "14px 0 24px" }}>
          You do not have an approved community or workshop registered yet. Apply to bring your group to The Mothers.
        </p>
        <Link
          href="/partner-apply"
          style={{
            backgroundColor: "#7b1f2c",
            color: "#ffffff",
            padding: "10px 20px",
            borderRadius: "20px",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "14px",
          }}
        >
          Apply to bring your community
        </Link>
      </div>
    );
  }

  const { community: comm, events } = data;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9f8f6", padding: "40px 20px" }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", color: "#7b1f2c", fontWeight: 600 }}>
              {comm.type === "workshop" ? "Workshop Space" : "Community Space"}
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", color: "#39292a", margin: "4px 0 0 0" }}>
              {comm.name}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setShowEventForm(!showEventForm)}
            style={{
              backgroundColor: "#7b1f2c",
              color: "#ffffff",
              border: "none",
              padding: "10px 20px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {showEventForm ? "Close event form" : "+ Create new event"}
          </button>
        </div>

        {/* Overview Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {/* Invite Link Card */}
          <div style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "8px", border: "1px solid rgba(57, 41, 42, 0.12)" }}>
            <div style={{ fontSize: "12px", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.6)", marginBottom: "6px" }}>
              Your invite link
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, color: "#39292a", marginBottom: "12px" }}>
              themothers.cc/join/{comm.inviteCode}
            </div>
            <button
              type="button"
              onClick={handleCopyInviteLink}
              style={{
                border: "1px solid rgba(57, 41, 42, 0.2)",
                backgroundColor: copiedLink ? "rgba(59, 94, 4, 0.08)" : "#fdfbf8",
                color: copiedLink ? "#3b5e04" : "#7b1f2c",
                padding: "6px 14px",
                borderRadius: "16px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {copiedLink ? "✓ Link copied!" : "Copy invite link"}
            </button>
          </div>

          {/* Stripe Account Card (CM-05) */}
          <div style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "8px", border: "1px solid rgba(57, 41, 42, 0.12)" }}>
            <div style={{ fontSize: "12px", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.6)", marginBottom: "6px" }}>
              Stripe Direct Payouts
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: comm.stripeAccountId ? "#3b5e04" : "#b45309", marginBottom: "12px" }}>
              {comm.stripeAccountId ? `✓ Connected (${comm.stripeAccountId})` : "Not connected (paid events blocked)"}
            </div>
            {!comm.stripeAccountId && (
              <button
                type="button"
                onClick={handleConnectStripe}
                style={{
                  backgroundColor: "#635bff",
                  color: "#ffffff",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: "16px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Connect with Stripe
              </button>
            )}
          </div>

          {/* Free Events Allowance Card (FF-01, FF-02) */}
          <div style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "8px", border: "1px solid rgba(57, 41, 42, 0.12)" }}>
            <div style={{ fontSize: "12px", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.6)", marginBottom: "6px" }}>
              Free Events Allowance
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#39292a", marginBottom: "4px" }}>
              {comm.freeEventsThisMonth} free event(s) this month
            </div>
            <div style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.7)", lineHeight: 1.4 }}>
              {comm.type === "community"
                ? comm.freeEventsThisMonth < 2
                  ? "1st and 2nd free events included; 3rd+ charged €1 per attendee (max €15)."
                  : "Allowance used: €1 per attendee (max €15)."
                : "Charged €2 per attendee (no free allowance for workshops)."}
            </div>
          </div>
        </div>

        {/* New Event Form Modal / Drawer */}
        {showEventForm && (
          <div style={{ backgroundColor: "#ffffff", padding: "28px", borderRadius: "8px", border: "1px solid rgba(123, 31, 44, 0.25)", boxShadow: "0 4px 20px rgba(57, 41, 42, 0.08)" }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", color: "#39292a", margin: "0 0 16px 0" }}>
              Create an event for {comm.name}
            </h3>

            <form onSubmit={handleCreateEvent} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Event title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Saturday Stroller Walk & Coffee"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.2)", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Description *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.2)", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.2)", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Duration (mins)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.2)", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Capacity</label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value, 10))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.2)", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Location name</label>
                  <input
                    type="text"
                    required
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Parc de la Ciutadella"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.2)", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Address / Meeting Point</label>
                  <input
                    type="text"
                    required
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="e.g. By the main fountain"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.2)", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* Price in € & Commission Breakdown (§14 / CM-06) */}
              <div style={{ backgroundColor: "#fcf8f5", padding: "14px", borderRadius: "6px", border: "1px solid rgba(123, 31, 44, 0.15)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Price per attendee (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={priceEuros}
                      onChange={(e) => setPriceEuros(e.target.value)}
                      placeholder="0 for free"
                      style={{ width: "120px", padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.2)" }}
                    />
                  </div>

                  <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.8)", lineHeight: 1.4 }}>
                    {numericPrice === 0 ? (
                      <span>Free event · No attendee ticket charges.</span>
                    ) : (
                      <span>
                        Platform commission ({commissionRate}%): <strong>€{commissionEuros.toFixed(2)}</strong> (min €1.00) · Net payout to you: <strong>€{payoutEuros.toFixed(2)}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Community-Only Option (CM-07) */}
              {comm.type === "community" && (
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isCommunityOnly}
                    onChange={(e) => setIsCommunityOnly(e.target.checked)}
                    style={{ accentColor: "#7b1f2c" }}
                  />
                  <span style={{ fontSize: "13px", color: "#39292a" }}>
                    Only for members of {comm.name} (hidden from public calendar unless joined via link)
                  </span>
                </label>
              )}

              {/* Same-day Booking Cut-Off (§11 / CO-01) */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                  Booking cut-off before start
                </label>
                <select
                  value={bookingCutoffHours}
                  onChange={(e) => setBookingCutoffHours(parseInt(e.target.value, 10))}
                  style={{ padding: "8px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.2)", fontSize: "13px" }}
                >
                  <option value={0}>0 hours (at start time)</option>
                  <option value={1}>1 hour before</option>
                  <option value={3}>3 hours before (default)</option>
                  <option value={6}>6 hours before</option>
                  <option value={12}>12 hours before</option>
                  <option value={24}>24 hours before</option>
                </select>
              </div>

              {formError && (
                <div style={{ backgroundColor: "rgba(161, 44, 44, 0.08)", border: "1px solid rgba(161, 44, 44, 0.3)", padding: "10px", borderRadius: "4px", color: "#a12c2c", fontSize: "13px" }}>
                  {formError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowEventForm(false)}
                  style={{ border: "1px solid rgba(57, 41, 42, 0.2)", backgroundColor: "#ffffff", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ backgroundColor: "#7b1f2c", color: "#ffffff", border: "none", padding: "8px 20px", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}
                >
                  {submitting ? "Publishing..." : "Publish Event"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Community Events List */}
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", color: "#39292a", marginBottom: "16px" }}>
            Your events ({events.length})
          </h2>

          {events.length === 0 ? (
            <div style={{ backgroundColor: "#ffffff", padding: "40px", borderRadius: "8px", textAlign: "center", color: "rgba(57, 41, 42, 0.6)" }}>
              No events scheduled yet. Click "+ Create new event" above to organise your first gathering.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {events.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid rgba(57, 41, 42, 0.12)",
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 600, fontSize: "16px", color: "#39292a" }}>{ev.title}</span>
                      {ev.isCommunityOnly && (
                        <span style={{ fontSize: "11px", backgroundColor: "rgba(123, 31, 44, 0.08)", color: "#7b1f2c", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                          Community only
                        </span>
                      )}
                      <span style={{ fontSize: "11px", backgroundColor: "#f0f0f0", color: "#555", padding: "2px 6px", borderRadius: "4px" }}>
                        {ev.priceCents > 0 ? `€${(ev.priceCents / 100).toFixed(2)}` : "Free"}
                      </span>
                    </div>
                    <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.65)", marginTop: "4px" }}>
                      {new Date(ev.startsAt).toLocaleString()} · {ev.locationName} · Cut-off: {ev.bookingCutoffHours || 3}h
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      backgroundColor: ev.status === "published" ? "rgba(59, 94, 4, 0.1)" : "rgba(180, 83, 9, 0.1)",
                      color: ev.status === "published" ? "#3b5e04" : "#b45309",
                      fontWeight: 600,
                    }}
                  >
                    {ev.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
