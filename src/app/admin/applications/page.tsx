"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getApplicationsForAdmin, acceptApplication, declineApplication, extendApplicationPayment, releaseApplicationPlace } from "@/app/actions/admin";

const WINE = '#7b1f2c', AMBER = '#a8752c', GREEN = '#3f6604', GREY = 'rgba(57,41,42,0.55)';

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<any[]>([]);
  const [filter, setFilter] = useState<"Waiting" | "Awaiting payment" | "Declined" | "All">("Waiting");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchApps = async () => {
    setLoading(true);
    // Note: getApplicationsForAdmin is called with 'all' so we can sort them client-side
    const res = await getApplicationsForAdmin('all');
    setLoading(false);
    if (res.success && res.applications) {
      setApps(res.applications);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const waitingApps = apps.filter(a => a.status === 'submitted');
  const awaitingPaymentApps = apps.filter(a => a.status === 'accepted' && !a.isPaid); // Mock logic for awaiting payment
  const declinedApps = apps.filter(a => a.status === 'declined');

  const currentApp = waitingApps[currentIndex];

  const handleSkip = () => {
    if (currentIndex < waitingApps.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      if (filter !== "Waiting" || !currentApp || actionLoading) return;

      if (e.key.toLowerCase() === 'a') handleAccept(currentApp.id);
      if (e.key.toLowerCase() === 'd') handleDecline(currentApp.id);
      if (e.key.toLowerCase() === 's') handleSkip();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filter, currentApp, actionLoading, currentIndex, waitingApps.length]);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 60px" }}>
        
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "22px" }}>
          <div style={{ flex: "1 1 400px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>
              <Link href="/admin" style={{ color: "#7b1f2c" }}>← Dashboard</Link> · Applications
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px, 4vw, 42px)", lineHeight: 1.1, margin: "0 0 9px" }}>
              Reading the applications
            </h1>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "70ch", textWrap: "pretty" }}>
              One at a time, in full, oldest first. Accept, decline or skip with the keyboard — A, D, S.
            </p>
          </div>
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <Link href="/admin" style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap" }}>
              ← Dashboard
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
              { val: "50", label: "PLACES OFFERED" },
              { val: "20", label: "APPLICATIONS IN" },
              { val: "11", label: "ACCEPTED" },
              { val: "2", label: "AWAITING PAYMENT" },
              { val: "9", label: "PAID" },
              { val: "6", label: "DECLINED", muted: true },
              { val: "39", label: "PLACES REMAINING", highlight: true }
            ].map((s, i) => (
              <div key={i} style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "4px", padding: "12px 14px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "22px", lineHeight: 1, color: s.highlight ? WINE : s.muted ? "rgba(57,41,42,0.4)" : "#39292a", marginBottom: "6px" }}>{s.val}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: s.highlight ? WINE : s.muted ? "rgba(57,41,42,0.4)" : "rgba(57,41,42,0.6)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
          {(["Waiting", "Awaiting payment", "Declined", "All"] as const).map((f) => {
            const on = filter === f;
            let count = "";
            if (f === "Waiting") count = ` (${waitingApps.length})`;
            if (f === "Awaiting payment") count = ` (${awaitingPaymentApps.length})`;
            if (f === "Declined") count = ` (${declinedApps.length})`;

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

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "rgba(57,41,42,0.6)" }}>Loading applications...</div>
        ) : filter === "Waiting" ? (
          /* SINGLE APPLICATION VIEW */
          currentApp ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>
              <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "32px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)" }}>
                    READING {currentIndex + 1} OF {waitingApps.length} WAITING
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

                <div style={{ display: "flex", gap: "10px", marginBottom: "28px" }}>
                  <span style={{ border: "1px solid rgba(63,102,4,0.4)", color: GREEN, borderRadius: "4px", padding: "5px 10px", fontSize: "12px", fontWeight: 500 }}>
                    Came to an event on a pass - June
                  </span>
                  <span style={{ border: "1px solid rgba(168,117,44,0.4)", color: AMBER, borderRadius: "4px", padding: "5px 10px", fontSize: "12px", fontWeight: 500 }}>
                    Phone already known — waitlist, Feb
                  </span>
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
                    <div style={{ fontSize: "14px", color: "#39292a" }}>Spanish, English</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "4px" }}>FOUND US</div>
                    <div style={{ fontSize: "14px", color: "#39292a" }}>{currentApp.answers?.referralSource || "A friend who is already a member"}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "4px" }}>GODMOTHER CODE</div>
                    <div style={{ fontSize: "14px", color: "#39292a" }}>ANDREA-M - Andrea Vidal</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "17px", color: WINE, marginBottom: "6px" }}>Why now?</div>
                    <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                      {currentApp.answers?.motivation || "I moved back to Barcelona in March and everyone I knew here has scattered. I would rather find people before the baby comes than try to do it with a newborn in my arms."}
                    </p>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "17px", color: WINE, marginBottom: "6px" }}>What would you like from us?</div>
                    <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                      A small group of women at the same point. I have plenty of advice and no company.
                    </p>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "17px", color: WINE, marginBottom: "6px" }}>What kind of gatherings suit you?</div>
                    <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                      Walks, the pregnancy workshops, and dinners once I can manage a late evening again.
                    </p>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "17px", color: WINE, marginBottom: "6px" }}>Anything we should know?</div>
                    <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#39292a", margin: 0 }}>
                      A caesarean is planned, so from November I will be slow for a while.
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
                      onClick={() => handleAccept(currentApp.id)}
                      disabled={!!actionLoading}
                      style={{ background: "transparent", border: `1px solid ${GREEN}`, borderRadius: "4px", padding: "12px", textAlign: "left", cursor: "pointer", color: GREEN, fontFamily: "'Lora', Georgia, serif", fontSize: "14px" }}
                    >
                      Accept — A
                    </button>
                    <button 
                      onClick={() => handleDecline(currentApp.id)}
                      disabled={!!actionLoading}
                      style={{ background: "transparent", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "4px", padding: "12px", textAlign: "left", cursor: "pointer", color: "rgba(57,41,42,0.6)", fontFamily: "'Lora', Georgia, serif", fontSize: "14px" }}
                    >
                      Decline — D
                    </button>
                    <button 
                      onClick={handleSkip}
                      disabled={!!actionLoading}
                      style={{ background: "transparent", border: "1px dashed rgba(57,41,42,0.2)", borderRadius: "4px", padding: "12px", textAlign: "left", cursor: "pointer", color: "rgba(57,41,42,0.6)", fontFamily: "'Lora', Georgia, serif", fontSize: "14px" }}
                    >
                      Skip for now — S
                    </button>
                  </div>
                  <p style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", margin: 0, textWrap: "pretty" }}>
                    Accepting sends the Accepted email with a payment link good for 72 hours and starts the countdown. A reminder goes at 48 hours. At 72 the place returns to the window — nothing is ever extended on its own.
                  </p>
                </div>

                <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "20px" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "12px" }}>
                    PLACES LEFT IN THIS WINDOW
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "32px", color: WINE, lineHeight: 1, marginBottom: "8px" }}>
                    39
                  </div>
                  <p style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", margin: 0, textWrap: "pretty" }}>
                    Of 50 offered, with 11 accepted. Accepting holds a place for 72 hours; it returns here if she does not pay.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px" }}>
              No applications waiting for review!
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
                      }} disabled={!!actionLoading} style={{ border: "none", background: "none", color: "#39292a", fontSize: "13px", cursor: "pointer", fontFamily: "'Lora', Georgia, serif" }}>Extend</button>
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
        ) : (
          <div style={{ padding: "40px", textAlign: "center", background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px" }}>
            List of {filter.toLowerCase()} applications would appear here.
          </div>
        )}

        {/* Audit Footer */}
        {filter === "Waiting" && (
          <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "20px 32px", marginTop: "24px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "12px" }}>
              DECIDED IN THIS SITTING
            </div>
            <div style={{ fontSize: "14px", color: "rgba(57,41,42,0.65)" }}>
              Nothing yet. Everything you decide here is written to the audit log with your name on it.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
