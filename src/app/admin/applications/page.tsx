"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getApplicationsForAdmin, acceptApplication, declineApplication, extendApplicationPayment, releaseApplicationPlace } from "@/app/actions/admin";
import { BackArrow, ForwardArrow } from "@/components/Icons";

const WINE = '#7b1f2c', AMBER = '#a8752c', GREEN = '#3f6604', GREY = 'rgba(57,41,42,0.55)';

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState<"Waiting" | "Awaiting payment" | "Paid" | "Declined" | "All">("Waiting");
  const [viewMode, setViewMode] = useState<"reader" | "table">("reader");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmModal, setConfirmModal] = useState<{ type: "accept" | "decline"; app: any; declineReason?: string } | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    const res = await getApplicationsForAdmin('all');
    setLoading(false);
    if (res.success && res.applications) {
      setApps(res.applications);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const totalApps = apps.length;
  const waitingApps = apps.filter(a => a.status === 'submitted');
  const awaitingPaymentApps = apps.filter(a => a.status === 'accepted' && !a.isPaid);
  const paidApps = apps.filter(a => a.status === 'paid' || (a.status === 'accepted' && a.isPaid));
  const acceptedTotal = apps.filter(a => a.status === 'accepted' || a.status === 'paid');
  const declinedApps = apps.filter(a => a.status === 'declined');

  const placesOffered = 50;
  const placesRemaining = Math.max(0, placesOffered - (paidApps.length + awaitingPaymentApps.length));

  const safeIndex = waitingApps.length > 0 ? Math.min(currentIndex, waitingApps.length - 1) : 0;
  const currentApp = waitingApps[safeIndex];

  const handleNext = () => {
    if (waitingApps.length <= 1) return;
    if (safeIndex < waitingApps.length - 1) {
      setCurrentIndex(safeIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrev = () => {
    if (waitingApps.length <= 1) return;
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    } else {
      setCurrentIndex(waitingApps.length - 1);
    }
  };

  const handleExecuteAccept = async (appId: string) => {
    setActionLoading(appId);
    setConfirmModal(null);
    const res = await acceptApplication(appId);
    setActionLoading(null);
    if (res.success) {
      alert("Application accepted! 72-hour payment link sent.");
      fetchApps();
    } else {
      alert(res.error || "Failed to accept application");
    }
  };

  const handleExecuteDecline = async (appId: string, reason?: string) => {
    setActionLoading(appId);
    setConfirmModal(null);
    const res = await declineApplication(appId, reason || "CAPACITY_REACHED");
    setActionLoading(null);
    if (res.success) {
      alert("Application declined. Notification sent.");
      fetchApps();
    } else {
      alert(res.error || "Failed to decline application");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (filter !== "Waiting" || !currentApp || actionLoading || confirmModal) return;

      if (e.key.toLowerCase() === 'a') setConfirmModal({ type: "accept", app: currentApp });
      if (e.key.toLowerCase() === 'd') setConfirmModal({ type: "decline", app: currentApp, declineReason: "CAPACITY_REACHED" });
      if (e.key.toLowerCase() === 's' || e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filter, currentApp, actionLoading, confirmModal, currentIndex, waitingApps.length]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 60px" }}>
        
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "22px" }}>
          <div style={{ flex: "1 1 400px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>
              <Link href="/admin" style={{ color: "#7b1f2c", textDecoration: "none", display: "inline-flex", alignItems: "center" }}><BackArrow /> Dashboard</Link>
              <span>·</span>
              <span>Applications</span>
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px, 4vw, 42px)", lineHeight: 1.1, margin: "0 0 9px" }}>
              Reading the applications
            </h1>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "70ch", textWrap: "pretty" }}>
              Review submitted applications. Accept, decline or navigate through the queue using keyboard shortcuts (A, D, S, Left/Right arrows) or buttons.
            </p>
          </div>
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <Link href="/admin" style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              <BackArrow /> Dashboard
            </Link>
          </div>
        </div>

        {/* Stats Block */}
        <div style={{ border: "1px solid rgba(123,31,44,0.3)", borderRadius: "8px", background: "#fffdfa", padding: "20px 24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c" }}>
              WINDOW OPEN <span style={{ color: "rgba(123,31,44,0.7)", fontWeight: 400, textTransform: "none", letterSpacing: "normal", fontSize: "13px", marginLeft: "6px" }}>Opened 24 Aug · closes 14 Sep, or when the places are gone</span>
            </div>
            <div style={{ fontSize: "13px", color: "#7b1f2c" }}>
              <Link href="#" style={{ color: "#7b1f2c", textDecoration: "none" }}>Preview the announcement</Link>
              <span style={{ margin: "0 8px", color: "rgba(123,31,44,0.3)" }}>·</span>
              <Link href="#" style={{ color: "#7b1f2c", textDecoration: "none" }}>Close the window early</Link>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
            {[
              { val: placesOffered.toString(), label: "PLACES OFFERED" },
              { val: totalApps.toString(), label: "APPLICATIONS IN" },
              { val: acceptedTotal.length.toString(), label: "ACCEPTED" },
              { val: awaitingPaymentApps.length.toString(), label: "AWAITING PAYMENT" },
              { val: paidApps.length.toString(), label: "PAID" },
              { val: declinedApps.length.toString(), label: "DECLINED", muted: true },
              { val: placesRemaining.toString(), label: "PLACES REMAINING", highlight: true }
            ].map((s, i) => (
              <div key={i} style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "4px", padding: "12px 14px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "22px", lineHeight: 1, color: s.highlight ? WINE : s.muted ? "rgba(57,41,42,0.4)" : "#39292a", marginBottom: "6px" }}>{s.val}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: s.highlight ? WINE : s.muted ? "rgba(57,41,42,0.4)" : "rgba(57,41,42,0.6)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter & View Mode Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {(["Waiting", "Awaiting payment", "Paid", "Declined", "All"] as const).map((f) => {
              const on = filter === f;
              let count = "";
              if (f === "Waiting") count = ` (${waitingApps.length})`;
              if (f === "Awaiting payment") count = ` (${awaitingPaymentApps.length})`;
              if (f === "Paid") count = ` (${paidApps.length})`;
              if (f === "Declined") count = ` (${declinedApps.length})`;
              if (f === "All") count = ` (${totalApps})`;

              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    border: `1px solid ${on ? WINE : "rgba(57,41,42,0.25)"}`,
                    background: on ? "rgba(123,31,44,0.06)" : "transparent",
                    color: on ? WINE : "#39292a",
                    borderRadius: "20px",
                    padding: "8px 16px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "13.5px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s"
                  }}
                >
                  {f}{count}
                </button>
              )
            })}
          </div>

          {filter === "Waiting" && waitingApps.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#fffdfa", border: "1px solid rgba(57,41,42,0.15)", borderRadius: "6px", padding: "4px" }}>
              <button
                onClick={() => setViewMode("reader")}
                style={{
                  border: "none",
                  backgroundColor: viewMode === "reader" ? WINE : "transparent",
                  color: viewMode === "reader" ? "#fff" : "#39292a",
                  borderRadius: "4px",
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Lora', Georgia, serif"
                }}
              >
                📖 Reader Card
              </button>
              <button
                onClick={() => setViewMode("table")}
                style={{
                  border: "none",
                  backgroundColor: viewMode === "table" ? WINE : "transparent",
                  color: viewMode === "table" ? "#fff" : "#39292a",
                  borderRadius: "4px",
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Lora', Georgia, serif"
                }}
              >
                📋 Table View ({waitingApps.length})
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "rgba(57,41,42,0.6)" }}>Loading applications...</div>
        ) : filter === "Waiting" ? (
          waitingApps.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px" }}>
              No applications waiting for review!
            </div>
          ) : viewMode === "reader" ? (
            /* SINGLE APPLICATION VIEW (READER) */
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>
              <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "32px" }}>
                
                {/* Reader Header & Navigation */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)" }}>
                      READING {safeIndex + 1} OF {waitingApps.length} WAITING
                    </div>
                    {waitingApps.length > 1 && (
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          onClick={handlePrev}
                          title="Previous applicant (Arrow Left)"
                          style={{ border: "1px solid rgba(57,41,42,0.2)", backgroundColor: "#fff", borderRadius: "3px", padding: "2px 7px", fontSize: "11px", cursor: "pointer", color: "#39292a" }}
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={handleNext}
                          title="Next applicant (Arrow Right or S)"
                          style={{ border: "1px solid rgba(57,41,42,0.2)", backgroundColor: "#fff", borderRadius: "3px", padding: "2px 7px", fontSize: "11px", cursor: "pointer", color: "#39292a" }}
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", color: WINE, fontWeight: 500 }}>
                    {(() => {
                      const diff = new Date(currentApp.submittedAt).getTime() + 72 * 60 * 60 * 1000 - Date.now();
                      if (diff <= 0) return "Overdue on 72-hour promise";
                      return `${Math.floor(diff / (1000 * 60 * 60))}h left of our 72-hour promise`;
                    })()}
                  </div>
                </div>

                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "36px", margin: "0 0 6px", color: "#39292a" }}>
                  {currentApp.personName} {currentApp.personLastName}
                </h2>
                <div style={{ fontSize: "14px", color: "rgba(57,41,42,0.65)", marginBottom: "20px" }}>
                  {currentApp.personEmail} · {currentApp.answers?.phone || "+34 600 000 000"} · applied {new Date(currentApp.submittedAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px", borderTop: "1px solid rgba(57,41,42,0.1)", borderBottom: "1px solid rgba(57,41,42,0.1)", padding: "20px 0" }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "4px" }}>STAGE</div>
                    <div style={{ fontSize: "14px", color: "#39292a" }}>{currentApp.answers?.stage || "Pregnant - 31 weeks"}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "4px" }}>CHILDREN</div>
                    <div style={{ fontSize: "14px", color: "#39292a" }}>{currentApp.answers?.childrenAge || "First, due November"}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "4px" }}>NEIGHBOURHOOD</div>
                    <div style={{ fontSize: "14px", color: "#39292a" }}>{currentApp.answers?.neighbourhood || "Sant Gervasi"}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "4px" }}>LANGUAGES</div>
                    <div style={{ fontSize: "14px", color: "#39292a" }}>{currentApp.personLocale === "es" ? "Spanish" : "English"}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "4px" }}>FOUND US</div>
                    <div style={{ fontSize: "14px", color: "#39292a" }}>{currentApp.answers?.referralSource || "Website"}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "4px" }}>GODMOTHER CODE</div>
                    <div style={{ fontSize: "14px", color: "#39292a" }}>{currentApp.answers?.referralCode || "None"}</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "17px", color: WINE, marginBottom: "6px" }}>Why now? / Motivation</div>
                    <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                      {currentApp.answers?.motivation || "No specific note provided."}
                    </p>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "17px", color: WINE, marginBottom: "6px" }}>What are you hoping to find?</div>
                    <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                      {Array.isArray(currentApp.answers?.hopingToFind)
                        ? currentApp.answers.hopingToFind.join(", ")
                        : (currentApp.answers?.hopingToFind || "Friendships nearby, Community")}
                    </p>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "17px", color: WINE, marginBottom: "6px" }}>When are you usually free?</div>
                    <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                      {Array.isArray(currentApp.answers?.freeTimes)
                        ? currentApp.answers.freeTimes.join(", ")
                        : (currentApp.answers?.freeTimes || "Flexible")}
                    </p>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "17px", color: WINE, marginBottom: "6px" }}>Plan &amp; Preference</div>
                    <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                      {currentApp.answers?.billingPreference === "quarterly" ? "Quarterly Membership (€99 / 3 months)" : "Monthly Membership (€39 / month)"}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", position: "sticky", top: "24px" }}>
                <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "20px" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "12px" }}>
                    YOUR DECISION
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                    <button 
                      onClick={() => setConfirmModal({ type: "accept", app: currentApp })}
                      disabled={!!actionLoading}
                      style={{ background: "#f6faf3", border: `1px solid ${GREEN}`, borderRadius: "4px", padding: "12px", textAlign: "left", cursor: "pointer", color: GREEN, fontFamily: "'Lora', Georgia, serif", fontSize: "14px", fontWeight: 600 }}
                    >
                      Accept — A
                    </button>
                    <button 
                      onClick={() => setConfirmModal({ type: "decline", app: currentApp, declineReason: "CAPACITY_REACHED" })}
                      disabled={!!actionLoading}
                      style={{ background: "#fff8f8", border: "1px solid rgba(185,28,28,0.3)", borderRadius: "4px", padding: "12px", textAlign: "left", cursor: "pointer", color: "#b91c1c", fontFamily: "'Lora', Georgia, serif", fontSize: "14px" }}
                    >
                      Decline — D
                    </button>
                    <button 
                      onClick={handleNext}
                      disabled={!!actionLoading}
                      style={{ background: "transparent", border: "1px dashed rgba(57,41,42,0.25)", borderRadius: "4px", padding: "12px", textAlign: "left", cursor: "pointer", color: "rgba(57,41,42,0.7)", fontFamily: "'Lora', Georgia, serif", fontSize: "14px" }}
                    >
                      Skip for now — S
                    </button>
                  </div>
                  <p style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", margin: 0, textWrap: "pretty" }}>
                    Accepting sends the Accepted email with a payment link good for 72 hours and starts the countdown.
                  </p>
                </div>

                <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "20px" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "12px" }}>
                    PLACES LEFT IN THIS WINDOW
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "32px", color: WINE, lineHeight: 1, marginBottom: "8px" }}>
                    {placesRemaining}
                  </div>
                  <p style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", margin: 0, textWrap: "pretty" }}>
                    Of {placesOffered} offered, with {acceptedTotal.length} accepted.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* TABLE VIEW (ALL WAITING APPLICANTS) */
            <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#faf6f0", textAlign: "left", borderBottom: "1px solid rgba(57,41,42,0.15)" }}>
                    <th style={{ padding: "12px 16px" }}>Applicant</th>
                    <th style={{ padding: "12px 16px" }}>Stage &amp; Children</th>
                    <th style={{ padding: "12px 16px" }}>Neighbourhood</th>
                    <th style={{ padding: "12px 16px" }}>Applied</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingApps.map((a, idx) => (
                    <tr key={a.id || idx} style={{ borderBottom: "1px solid rgba(57,41,42,0.08)" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#39292a" }}>{a.personName} {a.personLastName}</div>
                        <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.6)" }}>{a.personEmail} · {a.answers?.phone || "+34 600 000 000"}</div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div>{a.answers?.stage || "Pregnant"}</div>
                        <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.6)" }}>{a.answers?.childrenAge || "None"}</div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {a.answers?.neighbourhood || "Barcelona"}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: "12.5px", color: "rgba(57,41,42,0.7)" }}>
                        {new Date(a.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px" }}>
                          <button
                            onClick={() => { setCurrentIndex(idx); setViewMode("reader"); }}
                            style={{ border: "1px solid rgba(57,41,42,0.25)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "5px 10px", fontSize: "12px", cursor: "pointer" }}
                          >
                            Read Full Card
                          </button>
                          <button
                            onClick={() => setConfirmModal({ type: "accept", app: a })}
                            disabled={!!actionLoading}
                            style={{ border: `1px solid ${GREEN}`, backgroundColor: "#f6faf3", color: GREEN, borderRadius: "4px", padding: "5px 11px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => setConfirmModal({ type: "decline", app: a, declineReason: "CAPACITY_REACHED" })}
                            disabled={!!actionLoading}
                            style={{ border: "1px solid rgba(185,28,28,0.3)", backgroundColor: "#fff8f8", color: "#b91c1c", borderRadius: "4px", padding: "5px 11px", fontSize: "12px", cursor: "pointer" }}
                          >
                            Decline
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filter === "Awaiting payment" ? (
          <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "24px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", margin: 0 }}>Accepted, waiting to pay</h2>
              <span style={{ fontSize: "13px", color: "rgba(57,41,42,0.5)" }}>Reminder at 48h - place released at 72h</span>
            </div>
            <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", margin: "0 0 24px", maxWidth: "60ch" }}>
              Extending is a deliberate act. Do nothing and the place goes back into the window, and you are told.
            </p>
            
            <div style={{ display: "flex", flexDirection: "column" }}>
              {awaitingPaymentApps.map((a, i) => {
                const diff = new Date(a.acceptExpiresAt || Date.now()).getTime() - Date.now();
                const hoursLeft = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
                const dateStr = `Accepted ${new Date(a.decidedAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
                
                return (
                  <div key={a.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid rgba(57,41,42,0.1)" }}>
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", color: "#39292a" }}>
                        {a.personName} {a.personLastName}
                      </div>
                      <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.6)", marginTop: "4px" }}>{dateStr}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ border: `1px solid ${WINE}`, color: WINE, borderRadius: "4px", padding: "4px 8px", fontSize: "11px", fontWeight: 600, fontFamily: "'Cormorant Garamond', serif" }}>
                        {hoursLeft}h left
                      </span>
                      <button onClick={async () => {
                        setActionLoading(a.id);
                        const res = await extendApplicationPayment(a.id);
                        setActionLoading(null);
                        if (res.success) {
                          alert("Payment window extended by 72 hours.");
                          fetchApps();
                        } else alert(res.error || "Failed to extend");
                      }} disabled={!!actionLoading} style={{ border: "1px solid rgba(57,41,42,0.35)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "4px 11px", fontSize: "12px", fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", cursor: "pointer", letterSpacing: "0.02em" }}>Extend +72h</button>
                      <span style={{ color: "rgba(57,41,42,0.3)" }}>·</span>
                      <button onClick={async () => {
                        if (!confirm("Are you sure you want to release this place and lapse the member?")) return;
                        setActionLoading(a.id);
                        const res = await releaseApplicationPlace(a.id);
                        setActionLoading(null);
                        if (res.success) {
                          alert("Place released.");
                          fetchApps();
                        } else alert(res.error || "Failed to release");
                      }} disabled={!!actionLoading} style={{ border: "none", background: "none", color: WINE, fontSize: "13px", cursor: "pointer", textDecoration: "underline", fontFamily: "'Lora', Georgia, serif" }}>Release the place</button>
                    </div>
                  </div>
                );
              })}
              {awaitingPaymentApps.length === 0 && (
                <div style={{ padding: "16px 0", color: "rgba(57,41,42,0.6)" }}>
                  No one is currently awaiting payment.
                </div>
              )}
            </div>
          </div>
        ) : filter === "Paid" ? (
          <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "24px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", margin: 0 }}>Paid & active memberships</h2>
            </div>
            <p style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.65)", margin: "0 0 20px" }}>
              Applicants who completed payment and are confirmed members with active credits.
            </p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {paidApps.map((a, i) => (
                <div key={a.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid rgba(57,41,42,0.1)", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", color: "#39292a" }}>
                      {a.personName} {a.personLastName}
                    </div>
                    <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.6)", marginTop: "4px" }}>
                      {a.personEmail} · Joined on {new Date(a.decidedAt || a.submittedAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ border: `1px solid ${GREEN}`, color: GREEN, backgroundColor: "#f4f7ee", borderRadius: "4px", padding: "4px 10px", fontSize: "11px", fontWeight: 600, fontFamily: "'Cormorant Garamond', serif" }}>
                      ✓ Paid & Active
                    </span>
                    <Link
                      href="/admin/members"
                      style={{ color: WINE, fontSize: "13px", textDecoration: "underline", fontFamily: "'Lora', Georgia, serif" }}
                    >
                      View in Members →
                    </Link>
                  </div>
                </div>
              ))}
              {paidApps.length === 0 && (
                <div style={{ padding: "16px 0", color: "rgba(57,41,42,0.6)" }}>
                  No paid applications recorded yet.
                </div>
              )}
            </div>
          </div>
        ) : filter === "Declined" ? (
          <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "24px 32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", margin: 0 }}>Declined applications</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {declinedApps.map((a, i) => (
                <div key={a.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid rgba(57,41,42,0.1)" }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", color: "#39292a" }}>
                      {a.personName} {a.personLastName}
                    </div>
                    <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.6)", marginTop: "4px" }}>
                      Declined on {new Date(a.decidedAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
              {declinedApps.length === 0 && (
                <div style={{ padding: "16px 0", color: "rgba(57,41,42,0.6)" }}>
                  No declined applications.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ALL APPLICATIONS TABLE */
          <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ backgroundColor: "#faf6f0", textAlign: "left", borderBottom: "1px solid rgba(57,41,42,0.15)" }}>
                  <th style={{ padding: "12px 16px" }}>Applicant</th>
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px" }}>Applied</th>
                  <th style={{ padding: "12px 16px" }}>Decided</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a, idx) => (
                  <tr key={a.id || idx} style={{ borderBottom: "1px solid rgba(57,41,42,0.08)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#39292a" }}>{a.personName} {a.personLastName}</div>
                      <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.6)" }}>{a.personEmail}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        backgroundColor: a.status === "paid" ? "#eef8f0" : a.status === "accepted" ? "#fbf2e6" : a.status === "declined" ? "#fef2f2" : "#f4ece2",
                        color: a.status === "paid" ? "#1e6833" : a.status === "accepted" ? AMBER : a.status === "declined" ? "#b91c1c" : WINE
                      }}>
                        {a.status === "submitted" ? "Waiting Review" : a.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "12.5px", color: "rgba(57,41,42,0.7)" }}>
                      {new Date(a.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "12.5px", color: "rgba(57,41,42,0.7)" }}>
                      {a.decidedAt ? new Date(a.decidedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DECISION CONFIRMATION MODAL */}
        {confirmModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "20px"
          }}>
            <div style={{
              backgroundColor: "#fffdfa",
              border: "1px solid rgba(57,41,42,0.2)",
              borderRadius: "8px",
              padding: "28px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
            }}>
              {confirmModal.type === "accept" ? (
                <>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", margin: "0 0 10px", color: GREEN }}>
                    Accept {confirmModal.app.personName} {confirmModal.app.personLastName}?
                  </h3>
                  <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "#39292a", margin: "0 0 20px" }}>
                    This will generate a 72-hour signed payment link and immediately send the acceptance welcome email.
                  </p>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button
                      onClick={() => setConfirmModal(null)}
                      style={{ border: "1px solid rgba(57,41,42,0.25)", background: "transparent", borderRadius: "4px", padding: "8px 14px", fontSize: "13px", cursor: "pointer", color: "#39292a" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleExecuteAccept(confirmModal.app.id)}
                      disabled={!!actionLoading}
                      style={{ backgroundColor: GREEN, color: "#fff", border: "none", borderRadius: "4px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                    >
                      {actionLoading ? "Accepting..." : "Confirm & Send Link"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", margin: "0 0 10px", color: "#b91c1c" }}>
                    Decline {confirmModal.app.personName} {confirmModal.app.personLastName}?
                  </h3>
                  <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "#39292a", margin: "0 0 16px" }}>
                    A polite notification will be sent letting them know their application could not be accommodated this time.
                  </p>
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px", color: "rgba(57,41,42,0.7)" }}>Reason code:</label>
                    <input
                      type="text"
                      value={confirmModal.declineReason || "CAPACITY_REACHED"}
                      onChange={(e) => setConfirmModal({ ...confirmModal, declineReason: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button
                      onClick={() => setConfirmModal(null)}
                      style={{ border: "1px solid rgba(57,41,42,0.25)", background: "transparent", borderRadius: "4px", padding: "8px 14px", fontSize: "13px", cursor: "pointer", color: "#39292a" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleExecuteDecline(confirmModal.app.id, confirmModal.declineReason)}
                      disabled={!!actionLoading}
                      style={{ backgroundColor: "#b91c1c", color: "#fff", border: "none", borderRadius: "4px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                    >
                      {actionLoading ? "Declining..." : "Confirm Decline"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
