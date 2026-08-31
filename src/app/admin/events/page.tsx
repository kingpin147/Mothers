"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MoreHorizontal, Trash2, Archive, Calendar, Users, CheckCircle, Ticket, Edit2, Copy, Printer, X } from "lucide-react";
import { getAdminEvents, createAdminEvent, confirmEventDecision, cancelEventDecision, duplicateAdminEvent, updateAdminEvent } from "@/app/actions/adminEvents";
import { getEventCategories, createEventCategory, deleteEventCategory, deleteEvent } from "@/app/actions/events";
import { getEventAttendees, adminMarkAttendance, adminIssueGuestPass, adminManualBookMember } from "@/app/actions/adminEventsControl";
import { getAdminMembers } from "@/app/actions/adminCms";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

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

  const [editForm, setEditForm] = useState({
    id: "",
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
    capacityGuestGathering: 2,
    minToConfirm: 4,
    isSignature: false,
    showEventPassCta: false,
    languages: ["English", "Spanish"],
    targetStages: [] as string[],
    description: "",
  });

  const handleOpenEdit = (ev: any) => {
    const formatLocalDatetime = (dStr: string) => {
      if (!dStr) return "";
      const d = new Date(dStr);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setEditForm({
      id: ev.id,
      title: ev.title,
      categoryId: ev.categoryId || "",
      venueName: ev.venueName,
      meetingPoint: ev.meetingPoint,
      neighbourhood: ev.neighbourhood,
      startsAt: formatLocalDatetime(ev.startsAt),
      endsAt: formatLocalDatetime(ev.endsAt),
      creditCost: ev.creditCost,
      capacityMember: ev.capacityMember,
      capacityGuest: ev.capacityGuest,
      capacityGuestGathering: ev.capacityGuestGathering || 2,
      minToConfirm: ev.minToConfirm || 4,
      isSignature: !!ev.isSignature,
      showEventPassCta: !!ev.showEventPassCta,
      languages: ev.languages || ["English", "Spanish"],
      targetStages: [] as string[],
      description: ev.description || "",
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.title || !editForm.venueName || !editForm.meetingPoint || !editForm.startsAt || !editForm.endsAt) {
      alert("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    const res = await updateAdminEvent(editForm.id, {
      ...editForm,
      startsAt: new Date(editForm.startsAt),
      endsAt: new Date(editForm.endsAt),
    });
    setLoading(false);

    if (res.success) {
      alert("Event updated successfully!");
      setShowEditModal(false);
      loadData();
    } else {
      alert(res.error || "Failed to update event");
    }
  };

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
    capacityGuestGathering: 2,
    minToConfirm: 4,
    isSignature: false,
    showEventPassCta: false,
    languages: ["English", "Spanish"],
    targetStages: [] as string[],
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

  const handleDuplicate = async (id: string, title: string) => {
    if (!confirm(`Duplicate "${title}"? A new draft event will be scheduled 7 days later.`)) return;
    setActionLoading(id);
    const res = await duplicateAdminEvent(id);
    setActionLoading(null);
    if (res.success) {
      alert("Event duplicated successfully!");
      loadData();
    } else {
      alert(res.error || "Failed to duplicate event.");
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the category "${name}"? Events in this category will become uncategorized.`)) return;
    const res = await deleteEventCategory(id);
    if (res.success) {
      alert("Category deleted!");
      loadData();
    } else {
      alert(res.error || "Failed to delete category");
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
            <Link
              href="/admin/events/create"
              className="btn btn-primary"
              style={{ fontSize: "13px", textDecoration: "none" }}
            >
              + Create Event
            </Link>
          </div>
        </div>

        {/* Existing Categories Summary */}
        <div className="card" style={{ backgroundColor: "#fff", padding: "18px 24px", marginBottom: "24px" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 600, marginBottom: "10px" }}>
            Active Categories in Calendar ({categories.length})
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span
              onClick={() => setCategoryFilter("all")}
              style={{
                backgroundColor: categoryFilter === "all" ? "var(--color-accent)" : "var(--color-surface)",
                color: categoryFilter === "all" ? "#fff" : "inherit",
                border: "1px solid var(--color-divider)",
                padding: "4px 12px",
                borderRadius: "999px",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              All
            </span>
            {categories.map((c) => (
              <span key={c.id} 
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  backgroundColor: categoryFilter === c.id ? "var(--color-accent)" : "var(--color-surface)",
                  color: categoryFilter === c.id ? "#fff" : "inherit",
                  border: "1px solid var(--color-divider)",
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer"
              }}>
                <span onClick={() => setCategoryFilter(c.id)}>{c.name}</span>
                <X size={14} style={{ opacity: 0.5, cursor: "pointer", marginLeft: "4px" }} onClick={(e) => { e.stopPropagation(); handleDeleteCategory(c.id, c.name); }} />
              </span>
            ))}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
          {["all", "draft", "published_pending", "confirmed", "completed", "cancelled"].map((status) => {
            const isActive = statusFilter === status;
            const label =
              status === "all" ? "All" :
              status === "published_pending" ? "Published-Gathering" :
              status === "completed" ? "Past" :
              status.charAt(0).toUpperCase() + status.slice(1);
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: "1px solid " + (isActive ? "var(--color-accent)" : "var(--color-divider)"),
                  backgroundColor: isActive ? "var(--color-accent)" : "#ffffff",
                  color: isActive ? "#ffffff" : "var(--color-text-main)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {label} ({status === "all" ? events.length : events.filter(e => e.status === status).length})
              </button>
            );
          })}
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
            <Link href="/admin/events/create" className="btn btn-primary" style={{ textDecoration: "none" }}>
              + Create First Event
            </Link>
          </div>
        ) : (() => {
          const filteredEvents = events.filter((ev) => {
            const statusMatch = statusFilter === "all" || ev.status === statusFilter;
            const categoryMatch = categoryFilter === "all" || ev.categoryId === categoryFilter;
            return statusMatch && categoryMatch;
          });

          if (filteredEvents.length === 0) {
            return (
              <div className="card" style={{ padding: "48px", textAlign: "center", backgroundColor: "#fff" }}>
                <h3 style={{ fontSize: "18px", color: "var(--color-text-muted)" }}>
                  No events found with status "{statusFilter === "published_pending" ? "Published-Gathering" : statusFilter === "completed" ? "Past" : statusFilter}"
                </h3>
              </div>
            );
          }

          return (
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
                  {filteredEvents.map((ev) => {
                    const starts = new Date(ev.startsAt);
                    const isPending = ev.status === "published_pending";
                    const isActionOpen = openActionMenuId === ev.id;
                    const bookingsCount = ev.bookingsCount || 0;

                    const now = new Date();
                    const daysUntil = Math.round((starts.getTime() - now.getTime()) / 86400000);
                    let tSchedule = "";
                    if (daysUntil > 0 && ev.status !== "cancelled" && ev.status !== "completed") {
                      if (daysUntil <= 2) tSchedule = "T-2";
                      else if (daysUntil <= 7) tSchedule = "T-7";
                      else if (daysUntil <= 10) tSchedule = "T-10";
                      else if (daysUntil <= 14) tSchedule = "T-14";
                      else if (daysUntil <= 28) tSchedule = "T-28";
                    }

                    return (
                      <tr key={ev.id} style={{ borderBottom: "1px solid var(--color-divider)", position: "relative" }}>
                        <td style={{ padding: "16px 18px", verticalAlign: "top" }}>
                          <div style={{ fontWeight: 600, color: "var(--color-text-main)", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                            {ev.title}
                            {tSchedule && (
                              <span style={{ fontSize: "10px", padding: "2px 6px", backgroundColor: "#39292a", color: "#fff", borderRadius: "10px", fontWeight: 700 }}>
                                {tSchedule}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>{ev.venueName}</div>
                          <div style={{ display: "flex", gap: "4px", marginTop: "6px", flexWrap: "wrap" }}>
                            {ev.isSignature && <span style={{ fontSize: "10px", backgroundColor: "#f5eee4", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>Members Only</span>}
                            {ev.showEventPassCta && <span style={{ fontSize: "10px", backgroundColor: "#eef8f0", color: "#1e6833", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>Pass Active</span>}
                          </div>
                        </td>
                        <td style={{ padding: "16px 18px", color: "var(--color-text-main)", verticalAlign: "top" }}>
                          <div style={{ fontWeight: 500 }}>{starts.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{starts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </td>
                        <td style={{ padding: "16px 18px", color: "var(--color-text-muted)", verticalAlign: "top" }}>{ev.neighbourhood}</td>
                        <td style={{ padding: "16px 18px", verticalAlign: "top" }}>
                          <div style={{ fontWeight: 600, color: "var(--color-text-main)" }}>
                            {bookingsCount} <span style={{ fontWeight: 400, color: "var(--color-text-muted)", fontSize: "12px" }}>/ {ev.minToConfirm} min</span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                            Cap: {ev.capacityMember}M {ev.capacityGuest > 0 && `+ ${ev.capacityGuest}G`}
                          </div>
                        </td>
                        <td style={{ padding: "16px 18px", fontWeight: 600, color: "var(--color-accent)", verticalAlign: "top" }}>
                          {ev.isFreeWalk ? (
                            <span style={{ color: "#285430", backgroundColor: "#eef8f0", padding: "3px 8px", borderRadius: "4px", fontSize: "12px" }}>Free</span>
                          ) : (
                            `${ev.creditCost} credits`
                          )}
                        </td>
                        <td style={{ padding: "16px 18px", verticalAlign: "top" }}>
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
                            {ev.status === "published_pending" ? "Published-Gathering" : ev.status === "completed" ? "Past" : ev.status}
                          </span>
                          {ev.status === "cancelled" && ev.cancelReason && (
                            <div style={{ fontSize: "11px", color: "#b91c1c", marginTop: "4px", maxWidth: "150px" }}>
                              {ev.cancelReason}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "16px 18px", textAlign: "right", verticalAlign: "top" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleConfirm(ev.id)}
                                disabled={actionLoading === ev.id}
                                className="btn btn-outline"
                                style={{ padding: "6px 12px", fontSize: "12px", borderColor: "#1e6833", color: "#1e6833" }}
                              >
                                Confirm
                              </button>
                            )}
                            <div style={{ position: "relative" }}>
                              <button
                                onClick={() => setOpenActionMenuId(isActionOpen ? null : ev.id)}
                                style={{
                                  background: "none",
                                  border: "1px solid var(--color-divider)",
                                  borderRadius: "4px",
                                  padding: "6px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "var(--color-text-main)",
                                }}
                              >
                                <MoreHorizontal size={16} />
                              </button>
                              
                              {isActionOpen && (
                                <div style={{
                                  position: "absolute",
                                  right: 0,
                                  top: "100%",
                                  marginTop: "4px",
                                  backgroundColor: "#fff",
                                  border: "1px solid var(--color-divider)",
                                  borderRadius: "6px",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                  zIndex: 50,
                                  minWidth: "160px",
                                  display: "flex",
                                  flexDirection: "column",
                                  overflow: "hidden"
                                }}>
                                  <button onClick={() => { openRosterModal(ev); setOpenActionMenuId(null); }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: "none", background: "none", width: "100%", textAlign: "left", cursor: "pointer", fontSize: "13px", color: "var(--color-text-main)", borderBottom: "1px solid var(--color-divider)" }}>
                                    <Users size={14} /> Ticketing Desk
                                  </button>
                                  <Link href={`/admin/events/${ev.id}/roster`} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", width: "100%", textDecoration: "none", fontSize: "13px", color: "var(--color-text-main)", borderBottom: "1px solid var(--color-divider)" }}>
                                    <Printer size={14} /> Print Sheet
                                  </Link>
                                  <button onClick={() => { handleOpenEdit(ev); setOpenActionMenuId(null); }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: "none", background: "none", width: "100%", textAlign: "left", cursor: "pointer", fontSize: "13px", color: "var(--color-text-main)", borderBottom: "1px solid var(--color-divider)" }}>
                                    <Edit2 size={14} /> Edit Event
                                  </button>
                                  <button onClick={() => { handleDuplicate(ev.id, ev.title); setOpenActionMenuId(null); }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: "none", background: "none", width: "100%", textAlign: "left", cursor: "pointer", fontSize: "13px", color: "var(--color-text-main)", borderBottom: "1px solid var(--color-divider)" }}>
                                    <Copy size={14} /> Duplicate
                                  </button>
                                  {ev.status !== "cancelled" && ev.status !== "completed" && (
                                    <button onClick={() => { handleCancel(ev.id); setOpenActionMenuId(null); }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: "none", background: "none", width: "100%", textAlign: "left", cursor: "pointer", fontSize: "13px", color: "var(--color-text-main)", borderBottom: "1px solid var(--color-divider)" }}>
                                      <X size={14} /> Cancel Event
                                    </button>
                                  )}
                                  {bookingsCount === 0 && ev.status !== "completed" && (
                                    <button onClick={() => { handleDelete(ev.id, ev.title); setOpenActionMenuId(null); }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: "none", background: "none", width: "100%", textAlign: "left", cursor: "pointer", fontSize: "13px", color: "#b91c1c" }}>
                                      <Archive size={14} /> Archive
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
            </table>
          </div>
          );
        })()}

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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
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
                      min={0}
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
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Guest (Gathering)</label>
                    <input
                      type="number"
                      className="input"
                      value={form.capacityGuestGathering}
                      onChange={(e) => setForm({ ...form, capacityGuestGathering: Number(e.target.value) })}
                      min={0}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Target Stages (e.g. 0-1yr)</label>
                    <input
                      type="text"
                      className="input"
                      value={form.targetStages.join(", ")}
                      onChange={(e) => setForm({ ...form, targetStages: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      placeholder="Comma separated"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Languages</label>
                    <input
                      type="text"
                      className="input"
                      value={form.languages.join(", ")}
                      onChange={(e) => setForm({ ...form, languages: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      placeholder="English, Spanish"
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", margin: "4px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="isSignature"
                      checked={form.isSignature}
                      onChange={(e) => setForm({ ...form, isSignature: e.target.checked })}
                    />
                    <label htmlFor="isSignature" style={{ fontWeight: 600, cursor: "pointer" }}>🔒 Members only / Signature event</label>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="showEventPassCta"
                      checked={form.showEventPassCta}
                      onChange={(e) => setForm({ ...form, showEventPassCta: e.target.checked })}
                    />
                    <label htmlFor="showEventPassCta" style={{ fontWeight: 600, cursor: "pointer" }}>🎟️ Enable €35 Event Pass CTA</label>
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

                {/* Stage Affinity removed */}

                <button type="submit" className="btn btn-primary" style={{ marginTop: "8px", padding: "10px" }}>
                  Create Category
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Event */}
        {showEditModal && (
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
                <h2 style={{ fontSize: "22px", margin: 0 }}>Edit Calendar Event</h2>
                <button onClick={() => setShowEditModal(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}>✕</button>
              </div>

              <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13.5px" }}>
                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Event Title *</label>
                  <input
                    type="text"
                    className="input"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    placeholder="e.g. Sensory Play & Coffee Meetup"
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Category</label>
                    <select
                      className="input"
                      value={editForm.categoryId}
                      onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
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
                      value={editForm.neighbourhood}
                      onChange={(e) => setEditForm({ ...editForm, neighbourhood: e.target.value })}
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
                      value={editForm.venueName}
                      onChange={(e) => setEditForm({ ...editForm, venueName: e.target.value })}
                      placeholder="e.g. Jardins de la Tamarita"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Private Meeting Point *</label>
                    <input
                      type="text"
                      className="input"
                      value={editForm.meetingPoint}
                      onChange={(e) => setEditForm({ ...editForm, meetingPoint: e.target.value })}
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
                      value={editForm.startsAt}
                      onChange={(e) => setEditForm({ ...editForm, startsAt: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>End Date & Time *</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={editForm.endsAt}
                      onChange={(e) => setEditForm({ ...editForm, endsAt: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Credit Cost</label>
                    <input
                      type="number"
                      className="input"
                      value={editForm.creditCost}
                      onChange={(e) => setEditForm({ ...editForm, creditCost: Number(e.target.value) })}
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Member Seats</label>
                    <input
                      type="number"
                      className="input"
                      value={editForm.capacityMember}
                      onChange={(e) => setEditForm({ ...editForm, capacityMember: Number(e.target.value) })}
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Guest Passes</label>
                    <input
                      type="number"
                      className="input"
                      value={editForm.capacityGuest}
                      onChange={(e) => setEditForm({ ...editForm, capacityGuest: Number(e.target.value) })}
                      min={0}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Guest (Gathering)</label>
                    <input
                      type="number"
                      className="input"
                      value={editForm.capacityGuestGathering}
                      onChange={(e) => setEditForm({ ...editForm, capacityGuestGathering: Number(e.target.value) })}
                      min={0}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Target Stages (e.g. 0-1yr)</label>
                    <input
                      type="text"
                      className="input"
                      value={editForm.targetStages.join(", ")}
                      onChange={(e) => setEditForm({ ...editForm, targetStages: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      placeholder="Comma separated"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Languages</label>
                    <input
                      type="text"
                      className="input"
                      value={editForm.languages.join(", ")}
                      onChange={(e) => setEditForm({ ...editForm, languages: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                      placeholder="English, Spanish"
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", margin: "4px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="editIsSignature"
                      checked={editForm.isSignature}
                      onChange={(e) => setEditForm({ ...editForm, isSignature: e.target.checked })}
                    />
                    <label htmlFor="editIsSignature" style={{ fontWeight: 600, cursor: "pointer" }}>🔒 Members only / Signature event</label>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="editShowEventPassCta"
                      checked={editForm.showEventPassCta}
                      onChange={(e) => setEditForm({ ...editForm, showEventPassCta: e.target.checked })}
                    />
                    <label htmlFor="editShowEventPassCta" style={{ fontWeight: 600, cursor: "pointer" }}>🎟️ Enable €35 Event Pass CTA</label>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>Description</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Short description of the event flow and atmosphere..."
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: "8px", padding: "12px" }}>
                  Update Event Details →
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
