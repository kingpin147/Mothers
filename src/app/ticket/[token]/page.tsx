"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getGuestTicketByToken, releaseGuestTicket } from "@/app/actions/ticket";

export default function GuestTicketPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [released, setReleased] = useState(false);
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    async function load() {
      if (!token) return;
      const res = await getGuestTicketByToken(token);
      setLoading(false);
      if (res.success && res.ticket) {
        setTicket(res.ticket);
        if (res.ticket.status === "released") {
          setReleased(true);
        }
      } else {
        setErrorMsg(res.error || "Ticket not found or expired.");
      }
    }
    load();
  }, [token]);

  const handleConfirmRelease = async () => {
    setReleasing(true);
    const res = await releaseGuestTicket(token);
    setReleasing(false);
    if (res.success) {
      setReleased(true);
      setShowReleaseConfirm(false);
    } else {
      alert(res.error || "Failed to release place.");
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "18px" }}>Loading your ticket...</p>
      </div>
    );
  }

  if (errorMsg || !ticket) {
    return (
      <div style={{ maxWidth: "540px", margin: "80px auto", padding: "32px", textAlign: "center" }}>
        <h2 style={{ fontSize: "26px", color: "var(--color-accent)", marginBottom: "12px" }}>Ticket Not Found</h2>
        <p style={{ fontSize: "14.5px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
          This ticket link may have expired or is invalid. Guest ticket tokens expire 48 hours after the event concludes.
        </p>
        <Link href="/" className="btn btn-secondary">
          Return to Homepage
        </Link>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "48px 24px 80px" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <div style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 600,
          fontSize: "12.5px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: released ? "var(--color-text-muted)" : "var(--color-accent-2)",
          marginBottom: "12px"
        }}>
          {released ? "Place Released" : "Guest Pass Confirmed"}
        </div>

        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "36px", margin: "0 0 10px" }}>
          {released ? "Your place has been released" : `Hello ${ticket.guestName}, you're in.`}
        </h1>

        <p style={{ fontSize: "15.5px", color: "var(--color-text-muted)", lineHeight: "1.6", marginBottom: "28px" }}>
          {released
            ? "Your place was released back to the circle. We hope to see you at another event soon."
            : "Save this link on your phone. It contains your meeting point and gives you access on the day."}
        </p>

        {/* Ticket Details Box */}
        <div className="card" style={{ backgroundColor: "#fff", padding: "28px", border: "1px solid var(--color-divider)", marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-accent)", fontWeight: 600, marginBottom: "6px" }}>
            Event Details
          </div>
          <h2 style={{ fontSize: "24px", margin: "0 0 16px" }}>{ticket.eventTitle}</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", borderTop: "1px solid var(--color-divider)", paddingTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--color-text-muted)" }}>Date & Time</span>
              <span style={{ fontWeight: 600 }}>{new Date(ticket.startsAt).toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--color-text-muted)" }}>Neighbourhood</span>
              <span style={{ fontWeight: 600 }}>{ticket.neighbourhood}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ color: "var(--color-text-muted)" }}>Meeting Point</span>
              <span style={{ fontWeight: 600, color: "var(--color-accent)", textAlign: "right", maxWidth: "260px" }}>
                {ticket.meetingPoint}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--color-text-muted)" }}>Pass Paid</span>
              <span style={{ fontWeight: 600 }}>€35.00</span>
            </div>
          </div>
        </div>

        {/* €35 Joining Credit Conversion Banner (§3.4, §20.4) */}
        {!released && (
          <div style={{
            border: "1px solid rgba(86, 139, 5, 0.4)",
            backgroundColor: "#f4f7ee",
            borderRadius: "6px",
            padding: "16px 20px",
            marginBottom: "24px",
            fontSize: "13.5px",
            lineHeight: "1.55"
          }}>
            <strong style={{ color: "var(--color-accent-2)" }}>€35 Credit toward Membership:</strong> If you apply and join within 30 days of this pass, your €35 comes off the joining fee (€23 instead of €58).
            <div style={{ marginTop: "8px" }}>
              <Link href="/membership" style={{ color: "var(--color-accent-2)", fontWeight: 600, textDecoration: "underline" }}>
                Explore Membership →
              </Link>
            </div>
          </div>
        )}

        {/* Release prompt */}
        {!released && (
          <div>
            {!showReleaseConfirm ? (
              <button
                type="button"
                onClick={() => setShowReleaseConfirm(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-accent)",
                  fontSize: "13px",
                  cursor: "pointer",
                  textDecoration: "underline"
                }}
              >
                Can't make it? Release your place
              </button>
            ) : (
              <div style={{ border: "1px solid rgba(153, 56, 66, 0.4)", backgroundColor: "#fdf9f2", borderRadius: "6px", padding: "18px", marginTop: "12px" }}>
                <h4 style={{ fontSize: "16px", color: "#993842", margin: "0 0 6px" }}>Release your place?</h4>
                <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: "0 0 16px" }}>
                  Releasing frees your seat for someone else on the waiting list. Guest passes are non-refundable on release.
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={handleConfirmRelease}
                    disabled={releasing}
                    className="btn btn-primary"
                    style={{ backgroundColor: "#993842", borderColor: "#993842", fontSize: "13px" }}
                  >
                    {releasing ? "Releasing..." : "Confirm & Release Seat"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReleaseConfirm(false)}
                    className="btn btn-secondary"
                    style={{ fontSize: "13px" }}
                  >
                    Keep My Place
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
