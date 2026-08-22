"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminEvents, createAdminEvent, confirmEventDecision, cancelEventDecision } from "@/app/actions/adminEvents";
import { getEventCategories, createEventCategory, deleteEvent } from "@/app/actions/events";
import { getEventAttendees, adminMarkAttendance, adminIssueGuestPass, adminManualBookMember } from "@/app/actions/adminEventsControl";
import { getAdminMembers } from "@/app/actions/adminCms";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Attendees & Ticketing Modal State
  const [activeEventRoster, setActiveEventRoster] = useState<any | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [memberBookings, setMemberBookings] = useState<any[]>([]);
  const [guestPasses, setGuestPasses] = useState<any[]>([]);

  // Guest Pass Form in Modal
  const [guestForm, setGuestForm] = useState({ firstName: "", lastName: "", email: "" });
  const [issuingPass, setIssuingPass] = useState(false);
  const [generatedTicketUrl, setGeneratedTicketUrl] = useState<string | null>(null);

  // Manual Member Booking Form in Modal
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [deductCredits, setDeductCredits] = useState(true);
  const [bookingMember, setBookingMember] = useState(false);

  const [newCatName, setNewCatName] = useState("");
  const [newCatStage, setNewCatStage] = useState("All Stages");

  const [form, setForm] = useState({
    title: "",
    categoryId: "",
    venueName: "",
    meetingPoint: "",
    neighbourhood: "Eixample",
    startsAt: "",
    endsAt: "",
    creditCost: 18,
    capacityMember: 10,
    capacityGuest: 2,
    minToConfirm: 4,
    isSignature: false,
    description: "",
  });

  const loadData = async () => {
    setLoading(true);
    const [eventsRes, catsRes, membersRes] = await Promise.all([
      getAdminEvents(),
      getEventCategories(),
      getAdminMembers(),
    ]);
    setLoading(false);

    if (eventsRes.success && eventsRes.events) {
      setEvents(eventsRes.events);
    }
    if (catsRes.success && catsRes.categories) {
      setCategories(catsRes.categories);
      if (catsRes.categories.length > 0 && !form.categoryId) {
        setForm((prev) => ({ ...prev, categoryId: catsRes.categories[0].id }));
      }
    }
    if (membersRes.success && membersRes.members) {
      setAllMembers(membersRes.members);
      if (membersRes.members.length > 0) {
        setSelectedMemberId(membersRes.members[0].id);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openRosterModal = async (ev: any) => {
    setActiveEventRoster(ev);
    setRosterLoading(true);
    setGeneratedTicketUrl(null);
    const res = await getEventAttendees(ev.id);
    setRosterLoading(false);
    if (res.success) {
      setMemberBookings(res.memberBookings || []);
      setGuestPasses(res.guestPasses || []);
    }
  };

  const handleMarkAttendance = async (type: "member" | "guest", id: string, status: "attended" | "no_show" | "confirmed" | "released") => {
    const res = await adminMarkAttendance(type, id, status);
    if (res.success && activeEventRoster) {
      const refreshed = await getEventAttendees(activeEventRoster.id);
      if (refreshed.success) {
        setMemberBookings(refreshed.memberBookings || []);
        setGuestPasses(refreshed.guestPasses || []);
      }
    }
  };

  const handleIssueGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestForm.firstName || !guestForm.email || !activeEventRoster) return;
    setIssuingPass(true);
    const res = await adminIssueGuestPass({
      eventId: activeEventRoster.id,
      firstName: guestForm.firstName,
      lastName: guestForm.lastName,
      email: guestForm.email,
    });
    setIssuingPass(false);
    if (res.success) {
      setGeneratedTicketUrl(res.ticketUrl || null);
      setGuestForm({ firstName: "", lastName: "", email: "" });
      const refreshed = await getEventAttendees(activeEventRoster.id);
      if (refreshed.success) {
        setGuestPasses(refreshed.guestPasses || []);
      }
    } else {
      alert("Failed to issue guest pass.");
    }
  };

  const handleManualMemberBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !activeEventRoster) return;
    setBookingMember(true);
    const res = await adminManualBookMember({
      eventId: activeEventRoster.id,
      memberId: selectedMemberId,
      deductCredits,
    });
    setBookingMember(false);
    if (res.success) {
      alert("Member booked to event successfully!");
      const refreshed = await getEventAttendees(activeEventRoster.id);
      if (refreshed.success) {
        setMemberBookings(refreshed.memberBookings || []);
      }
    } else {
      alert(res.error || "Failed to book member.");
    }
  };

  const handleConfirm = async (id: string) => {
    if (!confirm("Confirm this event? All held member bookings will be marked confirmed.")) return;
    setActionLoading(id);
    const res = await confirmEventDecision(id);
    setActionLoading(null);
    if (res.success) {
      alert("Event confirmed!");
      loadData();
    } else {
      alert(res.error || "Failed to confirm event");
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt("Enter cancellation note (credits will be returned automatically):", "Weather conditions");
    if (reason === null) return;
    setActionLoading(id);
    const res = await cancelEventDecision(id, reason);
    setActionLoading(null);
    if (res.success) {
      alert("Event cancelled and credits refunded.");
      loadData();
    } else {
      alert(res.error || "Failed to cancel event");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to completely delete "${title}"?`)) return;
    setActionLoading(id);
    const res = await deleteEvent(id);
    setActionLoading(null);
    if (res.success) {
      alert("Event deleted successfully.");
      loadData();
    } else {
      alert(res.error || "Failed to delete event.");
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const res = await createEventCategory({
      name: newCatName.trim(),
      stageAffinity: newCatStage,
    });

    if (res.success) {
      alert("Category created!");
      setShowCategoryModal(false);
      setNewCatName("");
      loadData();
    } else {
      alert(res.error || "Failed to create category");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.venueName || !form.meetingPoint || !form.startsAt || !form.endsAt) {
      alert("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    const res = await createAdminEvent({
      ...form,
      startsAt: new Date(form.startsAt),
      endsAt: new Date(form.endsAt),
    });
    setLoading(false);

    if (res.success) {
      alert("Event created successfully! It is now live on the events calendar.");
      setShowCreateModal(false);
      loadData();
    } else {
      alert(res.error || "Failed to create event");
    }
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "40px clamp(24px, 5vw, 64px) 80px" }}>
      <div style={{ maxWidth: "1250px", margin: "0 auto" }}>
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-accent)", fontWeight: 600 }}>
              Back Office · Queue 02
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "32px", margin: "4px 0 0" }}>
              Events, Attendee Rosters & Ticketing
            </h1>
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href="/admin" className="btn btn-secondary" style={{ fontSize: "13px" }}>
              ← Admin Dashboard
            </Link>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="btn btn-outline"
              style={{ fontSize: "13px" }}
            >
              + Add Category
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
              style={{ fontSize: "13px" }}
            >
              + Create Event
            </button>
          </div>
        </div>

        {/* Existing Categories Summary */}
        <div className="card" style={{ backgroundColor: "#fff", padding: "18px 24px", marginBottom: "24px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 600, marginBottom: "10px" }}>
            Active Categories in Calendar ({categories.length})
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {categories.map((c) => (
              <span key={c.id} style={{
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-divider)",
                padding: "4px 12px",
                borderRadius: "999px",
                fontSize: "12.5px",
                fontWeight: 600
              }}>
                {c.name} · <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>{c.stageAffinity || "All"}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Events Table */}
        {loading ? (
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <p>Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="card" style={{ padding: "48px", textAlign: "center", backgroundColor: "#fff" }}>
            <h3 style={{ fontSize: "20px", color: "var(--color-accent)" }}>No events created yet</h3>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
              Click "+ Create Event" to schedule your first gathering.
            </p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              + Create First Event
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: "auto", backgroundColor: "#fff", border: "1px solid var(--color-divider)", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <table style={{ width: "100%", minWidth: "1000px", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ backgroundColor: "#fbf8f3", borderBottom: "1px solid var(--color-divider)", textAlign: "left" }}>
                  <th style={{ padding: "14px 18px", fontWeight: 600, color: "var(--color-text-main)" }}>Event Title</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600, color: "var(--color-text-main)" }}>Date & Time</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600, color: "var(--color-text-main)" }}>Neighbourhood</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600, color: "var(--color-text-main)" }}>Capacity</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600, color: "var(--color-text-main)" }}>Credits</th>
                  <th style={{ padding: "14px 18px", fontWeight: 600, color: "var(--color-text-main)" }}>Status</th>
                  <th style={{ padding: "14px 18px", textAlign: "right", fontWeight: 600, color: "var(--color-text-main)" }}>Actions & Roster</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const starts = new Date(ev.startsAt);
                  const isPending = ev.status === "published_pending";

                  return (
                    <tr key={ev.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                      <td style={{ padding: "16px 18px" }}>
                        <div style={{ fontWeight: 600, color: "var(--color-text-main)", fontSize: "14px" }}>{ev.title}</div>
                        <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>{ev.venueName}</div>
                      </td>
                      <td style={{ padding: "16px 18px", color: "var(--color-text-main)" }}>
                        <div style={{ fontWeight: 500 }}>{starts.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                        <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{starts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </td>
                      <td style={{ padding: "16px 18px", color: "var(--color-text-muted)" }}>{ev.neighbourhood}</td>
                      <td style={{ padding: "16px 18px" }}>
                        <span style={{ fontWeight: 600, color: "var(--color-text-main)" }}>{ev.capacityMember}</span> members
                        {ev.capacityGuest > 0 && (
                          <span style={{ fontSize: "12px", color: "var(--color-text-muted)", display: "block" }}>
                            + {ev.capacityGuest} guests
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "16px 18px", fontWeight: 600, color: "var(--color-accent)" }}>
                        {ev.isFreeWalk ? (
                          <span style={{ color: "#285430", backgroundColor: "#eef8f0", padding: "3px 8px", borderRadius: "4px", fontSize: "12px" }}>Free</span>
                        ) : (
                          `${ev.creditCost} credits`
                        )}
                      </td>
                      <td style={{ padding: "16px 18px" }}>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          backgroundColor:
                            ev.status === "confirmed" ? "#eef8f0" :
                            ev.status === "cancelled" ? "#fef2f2" :
                            "#fff9eb",
                          color:
                            ev.status === "confirmed" ? "#1e6833" :
                            ev.status === "cancelled" ? "#b91c1c" : "#b45309",
                          border: `1px solid ${
                            ev.status === "confirmed" ? "#bbf7d0" :
                            ev.status === "cancelled" ? "#fecdd3" : "#fde68a"
                          }`
                        }}>
                          {ev.status === "published_pending" ? "Pending Min." : ev.status}
                        </span>
                      </td>
                      <td style={{ padding: "16px 18px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }}>
                          {/* Attendees Roster Button */}
                          <button
                            type="button"
                            onClick={() => openRosterModal(ev)}
                            style={{
                              backgroundColor: "#f5eee4",
                              color: "var(--color-accent)",
                              border: "1px solid rgba(123, 31, 44, 0.3)",
                              borderRadius: "5px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            👥 Roster & Tickets
                          </button>

                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleConfirm(ev.id)}
                              disabled={actionLoading === ev.id}
                              style={{
                                backgroundColor: "#1e6833",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "5px",
                                padding: "6px 12px",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              ✓ Confirm
                            </button>
                          )}
                          {ev.status !== "cancelled" && (
                            <button
                              type="button"
                              onClick={() => handleCancel(ev.id)}
                              disabled={actionLoading === ev.id}
                              style={{
                                backgroundColor: "#f4ede4",
                                color: "var(--color-text-main)",
                                border: "1px solid var(--color-divider)",
                                borderRadius: "5px",
                                padding: "6px 12px",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(ev.id, ev.title)}
                            disabled={actionLoading === ev.id}
                            style={{
                              backgroundColor: "#fff1f2",
                              color: "#b91c1c",
                              border: "1px solid #fecdd3",
                              borderRadius: "5px",
                              padding: "6px 12px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── MODAL: EVENT ATTENDEES & TICKETING ROSTER ─── */}
        {activeEventRoster && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(57, 41, 42, 0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 110,
          }}>
            <div className="card" style={{ maxWidth: "880px", width: "100%", maxHeight: "90vh", overflowY: "auto", backgroundColor: "#fff", padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "1px solid var(--color-divider)", paddingBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600 }}>
                    Event Attendee Roster & Ticketing Desk
                  </div>
                  <h2 style={{ fontSize: "24px", margin: "4px 0 2px" }}>{activeEventRoster.title}</h2>
                  <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                    📍 Meeting Point: <strong>{activeEventRoster.meetingPoint}</strong>
                  </div>
                </div>
                <button onClick={() => setActiveEventRoster(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer" }}>✕</button>
              </div>

              {rosterLoading ? (
                <p style={{ textAlign: "center", padding: "32px" }}>Loading attendees...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* 1. Confirmed Members List */}
                  <div>
                    <h3 style={{ fontSize: "16px", marginBottom: "12px", display: "flex", justifyContent: "space-between" }}>
                      <span>Confirmed Members ({memberBookings.length})</span>
                      <span style={{ fontSize: "13px", color: "var(--color-text-muted)", fontWeight: 400 }}>Capacity: {activeEventRoster.capacityMember}</span>
                    </h3>

                    {memberBookings.length === 0 ? (
                      <p style={{ fontSize: "13px", color: "var(--color-text-muted)", padding: "12px", backgroundColor: "#faf7f2", borderRadius: "4px" }}>
                        No members booked yet.
                      </p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#faf6f0", textAlign: "left" }}>
                            <th style={{ padding: "8px 12px" }}>Member</th>
                            <th style={{ padding: "8px 12px" }}>Credits</th>
                            <th style={{ padding: "8px 12px" }}>Status</th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Attendance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {memberBookings.map((b) => (
                            <tr key={b.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                              <td style={{ padding: "10px 12px" }}>
                                <div style={{ fontWeight: 600 }}>{b.firstName} {b.lastName}</div>
                                <div style={{ fontSize: "11.5px", color: "var(--color-text-muted)" }}>{b.email}</div>
                              </td>
                              <td style={{ padding: "10px 12px", fontWeight: 600 }}>{b.creditsCharged} cr</td>
                              <td style={{ padding: "10px 12px" }}>
                                <span style={{
                                  padding: "2px 6px",
                                  borderRadius: "3px",
                                  fontSize: "10.5px",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  backgroundColor: b.status === "attended" ? "#eef8f0" : b.status === "no_show" ? "#fef2f2" : "#f4ece2",
                                  color: b.status === "attended" ? "#1e6833" : b.status === "no_show" ? "#b91c1c" : "var(--color-accent)"
                                }}>
                                  {b.status}
                                </span>
                              </td>
                              <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: "6px" }}>
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAttendance("member", b.id, "attended")}
                                    style={{ backgroundColor: "#eef8f0", color: "#1e6833", border: "1px solid #bbf7d0", borderRadius: "3px", padding: "3px 8px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                                  >
                                    ✓ Check-In
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAttendance("member", b.id, "no_show")}
                                    style={{ backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fecdd3", borderRadius: "3px", padding: "3px 8px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                                  >
                                    ✕ No-Show
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* 2. Guest Passes List */}
                  <div>
                    <h3 style={{ fontSize: "16px", marginBottom: "12px", display: "flex", justifyContent: "space-between" }}>
                      <span>Guest Passes ({guestPasses.length})</span>
                      <span style={{ fontSize: "13px", color: "var(--color-text-muted)", fontWeight: 400 }}>Pass Capacity: {activeEventRoster.capacityGuest}</span>
                    </h3>

                    {guestPasses.length === 0 ? (
                      <p style={{ fontSize: "13px", color: "var(--color-text-muted)", padding: "12px", backgroundColor: "#faf7f2", borderRadius: "4px" }}>
                        No guest passes issued yet.
                      </p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                        <thead>
                          <tr style={{ backgroundColor: "#faf6f0", textAlign: "left" }}>
                            <th style={{ padding: "8px 12px" }}>Guest</th>
                            <th style={{ padding: "8px 12px" }}>Price</th>
                            <th style={{ padding: "8px 12px" }}>Ticket Portal Link</th>
                            <th style={{ padding: "8px 12px", textAlign: "right" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {guestPasses.map((gp) => (
                            <tr key={gp.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                              <td style={{ padding: "10px 12px" }}>
                                <div style={{ fontWeight: 600 }}>{gp.firstName} {gp.lastName}</div>
                                <div style={{ fontSize: "11.5px", color: "var(--color-text-muted)" }}>{gp.email}</div>
                              </td>
                              <td style={{ padding: "10px 12px", fontWeight: 600 }}>€{(gp.pricePaidCents / 100).toFixed(2)}</td>
                              <td style={{ padding: "10px 12px" }}>
                                <a
                                  href={`/ticket/${gp.ticketToken}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: "var(--color-accent)", fontSize: "12px", textDecoration: "underline" }}
                                >
                                  Open Guest Ticket →
                                </a>
                              </td>
                              <td style={{ padding: "10px 12px", textAlign: "right" }}>
                                <span style={{ padding: "2px 6px", borderRadius: "3px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", backgroundColor: "#eef8f0", color: "#1e6833" }}>
                                  {gp.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* 3. Operator Desk: Manual Booking & Direct Pass Issue */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "12px", borderTop: "1px solid var(--color-divider)", paddingTop: "20px" }}>
                    {/* Manual Member Seat Booking */}
                    <div style={{ backgroundColor: "#faf7f2", padding: "18px", borderRadius: "6px", border: "1px solid var(--color-divider)" }}>
                      <h4 style={{ fontSize: "14px", margin: "0 0 10px", color: "var(--color-accent)" }}>+ Manually Book Member to Event</h4>
                      <form onSubmit={handleManualMemberBook} style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px" }}>
                        <select
                          className="input"
                          value={selectedMemberId}
                          onChange={(e) => setSelectedMemberId(e.target.value)}
                        >
                          {allMembers.map((m) => (
                            <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.email})</option>
                          ))}
                        </select>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="checkbox"
                            id="deduct"
                            checked={deductCredits}
                            onChange={(e) => setDeductCredits(e.target.checked)}
                          />
                          <label htmlFor="deduct">Deduct {activeEventRoster.creditCost} credits (Uncheck for complimentary)</label>
                        </div>
                        <button type="submit" disabled={bookingMember} className="btn btn-primary" style={{ padding: "8px", fontSize: "12px" }}>
                          {bookingMember ? "Booking..." : "Confirm Member Seat"}
                        </button>
                      </form>
                    </div>

                    {/* Direct Guest Pass Issue */}
                    <div style={{ backgroundColor: "#faf7f2", padding: "18px", borderRadius: "6px", border: "1px solid var(--color-divider)" }}>
                      <h4 style={{ fontSize: "14px", margin: "0 0 10px", color: "var(--color-accent)" }}>+ Issue €35 Guest Ticket Pass</h4>
                      <form onSubmit={handleIssueGuest} style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                          <input
                            type="text"
                            className="input"
                            placeholder="First Name"
                            value={guestForm.firstName}
                            onChange={(e) => setGuestForm({ ...guestForm, firstName: e.target.value })}
                            required
                          />
                          <input
                            type="text"
                            className="input"
                            placeholder="Last Name"
                            value={guestForm.lastName}
                            onChange={(e) => setGuestForm({ ...guestForm, lastName: e.target.value })}
                          />
                        </div>
                        <input
                          type="email"
                          className="input"
                          placeholder="guest@example.com"
                          value={guestForm.email}
                          onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                          required
                        />
                        <button type="submit" disabled={issuingPass} className="btn btn-secondary" style={{ padding: "8px", fontSize: "12px" }}>
                          {issuingPass ? "Generating..." : "Generate Guest Ticket →"}
                        </button>
                      </form>

                      {generatedTicketUrl && (
                        <div style={{ marginTop: "10px", padding: "8px 12px", backgroundColor: "#eef8f0", border: "1px solid #bbf7d0", borderRadius: "4px", fontSize: "12px" }}>
                          ✓ Ticket Created! <a href={generatedTicketUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 600, color: "#1e6833", textDecoration: "underline" }}>View Ticket Link</a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Create Event */}
        {showCreateModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(57, 41, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 100,
          }}>
            <div className="card" style={{ maxWidth: "620px", width: "100%", maxHeight: "90vh", overflowY: "auto", backgroundColor: "#fff", padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "22px", margin: 0 }}>Create New Calendar Event</h2>
                <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
              </div>

              <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13.5px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Event Title *</label>
                  <input
                    type="text"
                    className="input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Sensory Play & Coffee Meetup"
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Category</label>
                    <select
                      className="input"
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Neighbourhood *</label>
                    <select
                      className="input"
                      value={form.neighbourhood}
                      onChange={(e) => setForm({ ...form, neighbourhood: e.target.value })}
                    >
                      <option value="Eixample">Eixample</option>
                      <option value="Gràcia">Gràcia</option>
                      <option value="Sarrià-Sant Gervasi">Sarrià-Sant Gervasi</option>
                      <option value="Les Corts">Les Corts</option>
                      <option value="Poblenou">Poblenou</option>
                      <option value="Ciutat Vella">Ciutat Vella</option>
                      <option value="Outside Barcelona">Outside Barcelona</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Venue Public Name *</label>
                    <input
                      type="text"
                      className="input"
                      value={form.venueName}
                      onChange={(e) => setForm({ ...form, venueName: e.target.value })}
                      placeholder="e.g. Jardins de la Tamarita"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Private Meeting Point *</label>
                    <input
                      type="text"
                      className="input"
                      value={form.meetingPoint}
                      onChange={(e) => setForm({ ...form, meetingPoint: e.target.value })}
                      placeholder="Released only to confirmed attendees"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={form.startsAt}
                      onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>End Date & Time *</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={form.endsAt}
                      onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Credit Cost</label>
                    <input
                      type="number"
                      className="input"
                      value={form.creditCost}
                      onChange={(e) => setForm({ ...form, creditCost: Number(e.target.value) })}
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Member Seats</label>
                    <input
                      type="number"
                      className="input"
                      value={form.capacityMember}
                      onChange={(e) => setForm({ ...form, capacityMember: Number(e.target.value) })}
                      min={1}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Guest Passes</label>
                    <input
                      type="number"
                      className="input"
                      value={form.capacityGuest}
                      onChange={(e) => setForm({ ...form, capacityGuest: Number(e.target.value) })}
                      min={0}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Description</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Short description of the event flow and atmosphere..."
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: "8px", padding: "12px" }}>
                  Publish Event to Calendar →
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Category */}
        {showCategoryModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(57, 41, 42, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            zIndex: 100,
          }}>
            <div className="card" style={{ maxWidth: "440px", width: "100%", backgroundColor: "#fff", padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "20px", margin: 0 }}>Add Event Category</h2>
                <button onClick={() => setShowCategoryModal(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
              </div>

              <form onSubmit={handleAddCategory} style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13.5px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Category Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Masterclasses & Talks"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Stage Affinity</label>
                  <input
                    type="text"
                    className="input"
                    value={newCatStage}
                    onChange={(e) => setNewCatStage(e.target.value)}
                    placeholder="e.g. All Stages, Pregnancy, 0–3 years"
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: "8px", padding: "10px" }}>
                  Create Category
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
