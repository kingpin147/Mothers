"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MoreHorizontal, Users, CheckCircle, Edit2, Copy, Printer, X, Eye } from "lucide-react";
import { getAdminEvents, confirmEventDecision, cancelEventDecision, duplicateAdminEvent, publishAdminEvent } from "@/app/actions/adminEvents";
import { deleteEvent } from "@/app/actions/events";
import { getEventAttendees, adminMarkAttendance, adminIssueGuestPass, adminManualBookMember } from "@/app/actions/adminEventsControl";
import { getAdminMembers } from "@/app/actions/adminCms";

const WINE = "#7b1f2c";
const AMBER = "#a8752c";
const GREEN = "#3f6604";
const MUTED = "rgba(57,41,42,0.55)";

const STATUS_COLORS: Record<string, string> = {
  draft: MUTED,
  published_pending: AMBER,
  gathering: AMBER,
  confirmed: GREEN,
  completed: MUTED,
  past: MUTED,
  cancelled: WINE,
};

const PREDEFINED_CATEGORIES = [
  "Walks & park socials",
  "Play dates",
  "MoM's dates",
  "Learn & grow",
  "Signature moments",
];

const PREDEFINED_STAGES = [
  "Pregnant",
  "Babies",
  "Toddlers",
  "Children",
  "Big kids",
];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters & Sorting
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("soonest");

  // Inline Cancellation Dialog State
  const [cancelEventId, setCancelEventId] = useState<string | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState("");
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

  const loadData = async () => {
    setLoading(true);
    const [eventsRes, membersRes] = await Promise.all([
      getAdminEvents(),
      getAdminMembers(),
    ]);
    setLoading(false);

    if (eventsRes.success && eventsRes.events) {
      setEvents(eventsRes.events);
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
      loadData();
    } else {
      alert(res.error || "Failed to book member.");
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm("Publish this draft event to the calendar?")) return;
    setActionLoading(id);
    const res = await publishAdminEvent(id);
    setActionLoading(null);
    if (res.success) {
      alert(`Event published successfully as ${res.status === "confirmed" ? "Confirmed" : "To be confirmed"}!`);
      loadData();
    } else {
      alert(res.error || "Failed to publish event");
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

  const handleOpenCancel = (ev: any) => {
    setCancelEventId(ev.id);
    setCancelReasonText("Too few of us this time — we will run it again soon.");
  };

  const handleExecuteCancel = async (id: string) => {
    const reason = cancelReasonText.trim() || "Cancelled.";
    setActionLoading(id);
    const res = await cancelEventDecision(id, reason);
    setActionLoading(null);
    setCancelEventId(null);
    if (res.success) {
      alert("Event cancelled and credits refunded.");
      loadData();
    } else {
      alert(res.error || "Failed to cancel event");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to archive "${title}"?`)) return;
    setActionLoading(id);
    const res = await deleteEvent(id);
    setActionLoading(null);
    if (res.success) {
      alert("Event archived successfully.");
      loadData();
    } else {
      alert(res.error || "Failed to archive event.");
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

  // Helper to compute T-schedule badge and status colors
  const processEventRow = (ev: any) => {
    const starts = new Date(ev.startsAt);
    const now = new Date();
    const daysUntil = Math.ceil((starts.getTime() - now.getTime()) / 86400000);
    const min = ev.minToConfirm || 0;
    const booked = ev.bookingsCount || 0;
    const memberBooked = ev.memberBookingsCount || 0;
    const guestBooked = ev.guestBookingsCount || 0;
    const capGathering = ev.capacityGuestGathering;
    const isGathering = ev.status === "published_pending" || ev.status === "gathering";
    const capInForce = isGathering && capGathering ? capGathering : ev.capacityGuest;

    let tMarker = "";
    let tColor = MUTED;

    if (ev.status === "draft") {
      tMarker = "Not published";
      tColor = MUTED;
    } else if (ev.status === "cancelled") {
      tMarker = daysUntil >= 7 ? "Cancelled at T-7" : "Cancelled";
      tColor = MUTED;
    } else if (ev.status === "completed" || daysUntil < 0) {
      tMarker = "Past";
      tColor = MUTED;
    } else if (daysUntil === 0) {
      tMarker = "Today";
      tColor = GREEN;
    } else if (daysUntil === 1) {
      tMarker = "Tomorrow";
      tColor = MUTED;
    } else if (daysUntil <= 2) {
      tMarker = `T-${daysUntil} · guests closed`;
      tColor = MUTED;
    } else if (daysUntil <= 7) {
      tMarker = `T-7 · ${booked >= min ? "minimum met" : "decide today"}`;
      tColor = booked >= min ? GREEN : WINE;
    } else if (daysUntil <= 10) {
      tMarker = `T-10 · ${booked * 2 < min ? "early warning" : "on track"}`;
      tColor = booked * 2 < min ? AMBER : GREEN;
    } else {
      tMarker = `T-${daysUntil} · open`;
      tColor = MUTED;
    }

    const fillRatio = min > 0 ? booked / min : 1;
    const fillColor = fillRatio >= 1 ? GREEN : fillRatio < 0.5 ? WINE : AMBER;

    const passActive = ev.showEventPassCta && !ev.isSignature && daysUntil > 2 && ev.status !== "cancelled" && ev.status !== "completed";
    const passLabel = ev.isSignature
      ? "No pass — members only"
      : passActive
      ? "Pass button on"
      : daysUntil <= 2 && ev.status === "confirmed"
      ? "Pass button off — guests closed"
      : ev.isFreeWalk
      ? "No pass needed"
      : "Pass button off";

    const passColor = passActive ? GREEN : MUTED;

    const displayCategory = ev.categoryName || ev.category || (ev.isSignature ? "Signature moments" : "Play dates");
    const displayStage = ev.targetStages && ev.targetStages.length > 0 ? ev.targetStages.join(", ") : "All stages";

    const displayState =
      ev.status === "published_pending" ? "gathering" :
      ev.status === "completed" ? "past" :
      ev.status;

    const displayStatusLabel =
      ev.status === "published_pending" ? "To be confirmed" :
      ev.status === "completed" ? "Past" :
      ev.status.charAt(0).toUpperCase() + ev.status.slice(1);

    let statusNote = "";
    if (ev.status === "draft") {
      statusNote = "Invisible publicly · publishing starts the schedule";
    } else if (ev.status === "cancelled") {
      statusNote = ev.cancelReason ? `“${ev.cancelReason}”` : "Cancelled · every credit returned";
    } else if (ev.status === "confirmed") {
      statusNote = booked >= (ev.capacityMember || 10) ? "Full · places taken" : "Confirmed · live on the public calendar";
    } else if (isGathering) {
      statusNote = booked >= min && min > 0 ? "Above minimum · confirm to open it up" : daysUntil <= 7 ? "Decision point today · escalated on the dashboard" : daysUntil <= 10 && booked * 2 < min ? "Under half · push in stage thread" : "Live on the public calendar · to be confirmed";
    } else {
      statusNote = "Roster and attendance recorded";
    }

    return {
      ...ev,
      starts,
      displayCategory,
      displayStage,
      displayState,
      displayStatusLabel,
      daysUntil,
      tMarker,
      tColor,
      fillRatio,
      fillColor,
      passLabel,
      passColor,
      statusNote,
      memberBooked,
      guestBooked,
      capInForce,
      isGathering,
      showDecision: isGathering,
      statusColor: STATUS_COLORS[ev.status] || MUTED,
    };
  };

  const processedEvents = events.map(processEventRow);

  // Status Counts
  const counts = {
    all: processedEvents.length,
    draft: processedEvents.filter(e => e.displayState === "draft").length,
    gathering: processedEvents.filter(e => e.displayState === "gathering").length,
    confirmed: processedEvents.filter(e => e.displayState === "confirmed").length,
    past: processedEvents.filter(e => e.displayState === "past").length,
    cancelled: processedEvents.filter(e => e.displayState === "cancelled").length,
  };

  const statusFilterTabs = [
    { id: "all", label: `All (${counts.all})` },
    { id: "draft", label: `Draft (${counts.draft})` },
    { id: "gathering", label: `To be confirmed (${counts.gathering})` },
    { id: "confirmed", label: `Confirmed (${counts.confirmed})` },
    { id: "past", label: `Past (${counts.past})` },
    { id: "cancelled", label: `Cancelled (${counts.cancelled})` },
  ];

  // Filtering & Sorting
  const filteredEvents = processedEvents.filter((e) => {
    const matchesStatus = statusFilter === "all" || e.displayState === statusFilter;
    const matchesCategory = categoryFilter === "all" || e.displayCategory.toLowerCase() === categoryFilter.toLowerCase();
    const matchesStage = stageFilter === "all" || e.displayStage.toLowerCase().includes(stageFilter.toLowerCase()) || e.displayStage === "All stages";
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || (e.title + " " + e.venueName + " " + (e.neighbourhood || "")).toLowerCase().includes(q);
    return matchesStatus && matchesCategory && matchesStage && matchesQuery;
  }).sort((a, b) => {
    if (sortOrder === "soonest") return a.starts.getTime() - b.starts.getTime();
    if (sortOrder === "emptiest") return a.fillRatio - b.fillRatio;
    if (sortOrder === "decision") return (b.showDecision ? 1 : 0) - (a.showDecision ? 1 : 0);
    return 0;
  });

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      {/* Top Breadcrumbs & Page Header */}
      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 60px" }}>
        
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "24px" }}>
          <div style={{ flex: "1 1 400px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: WINE, marginBottom: "9px" }}>
              <Link href="/admin" style={{ color: WINE, textDecoration: "none" }}>← Dashboard</Link> · Events · <Link href="/admin/members" style={{ color: WINE, textDecoration: "none" }}>Members</Link>
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px, 4vw, 42px)", lineHeight: 1.1, margin: "0 0 9px" }}>
              The calendar
            </h1>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "70ch" }}>
              Every event, where it sits in its schedule, and how full it is. Bookings against the minimum is the number that matters — everything else is context.
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <Link
              href="/admin/settings"
              style={{
                border: "1px solid rgba(57,41,42,0.3)",
                color: "#39292a",
                borderRadius: "4px",
                padding: "9px 15px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "13.5px",
                whiteSpace: "nowrap",
                textDecoration: "none",
                display: "inline-block",
                backgroundColor: "#fffdfa",
              }}
            >
              Policy &amp; categories
            </Link>
            <Link
              href="/admin/events/create"
              style={{
                border: `1px solid ${WINE}`,
                color: WINE,
                borderRadius: "4px",
                padding: "9px 15px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 600,
                fontSize: "13.5px",
                whiteSpace: "nowrap",
                textDecoration: "none",
                display: "inline-block",
                backgroundColor: "#fffdfa",
              }}
            >
              Create an event
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{
          border: "1px solid rgba(57,41,42,0.16)",
          borderRadius: "8px",
          backgroundColor: "#fffdfa",
          padding: "16px 18px",
          marginBottom: "16px",
          display: "flex",
          gap: "14px",
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, venue or host"
            style={{
              flex: "1 1 260px",
              border: "1px solid rgba(57,41,42,0.25)",
              borderRadius: "4px",
              padding: "10px 13px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "14px",
              color: "#39292a",
              backgroundColor: "#fff",
            }}
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              border: "1px solid rgba(57,41,42,0.25)",
              borderRadius: "4px",
              padding: "10px 12px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "14px",
              color: "#39292a",
              backgroundColor: "#fff",
            }}
          >
            <option value="all">All categories</option>
            {PREDEFINED_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            style={{
              border: "1px solid rgba(57,41,42,0.25)",
              borderRadius: "4px",
              padding: "10px 12px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "14px",
              color: "#39292a",
              backgroundColor: "#fff",
            }}
          >
            <option value="all">All stages</option>
            {PREDEFINED_STAGES.map((stg) => (
              <option key={stg} value={stg}>{stg}</option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              border: "1px solid rgba(57,41,42,0.25)",
              borderRadius: "4px",
              padding: "10px 12px",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "14px",
              color: "#39292a",
              backgroundColor: "#fff",
            }}
          >
            <option value="soonest">Soonest first</option>
            <option value="decision">Decision point first</option>
            <option value="emptiest">Emptiest first</option>
          </select>
        </div>

        {/* Status Filter Tabs (Pills) */}
        <div style={{ display: "flex", gap: "9px", flexWrap: "wrap", marginBottom: "18px" }}>
          {statusFilterTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  border: isActive ? `1px solid ${WINE}` : "1px solid rgba(57,41,42,0.25)",
                  backgroundColor: isActive ? "rgba(123,31,44,0.08)" : "transparent",
                  color: isActive ? WINE : "#39292a",
                  borderRadius: "20px",
                  padding: "8px 16px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Events Table Container */}
        <div style={{
          border: "1px solid rgba(57,41,42,0.16)",
          borderRadius: "8px",
          backgroundColor: "#fffdfa",
          overflowX: "auto",
          marginBottom: "18px",
        }}>
          <div style={{ minWidth: "1180px" }}>
            {/* Table Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "2.3fr 1fr 0.9fr 1fr 0.7fr 1.1fr 1.5fr",
              gap: "14px",
              padding: "14px 18px",
              borderBottom: "1px solid rgba(57,41,42,0.18)",
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 600,
              fontSize: "10.5px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(57,41,42,0.55)",
            }}>
              <div>Event</div>
              <div>When · schedule</div>
              <div>Booked / min</div>
              <div>Guests · pass</div>
              <div>Credits</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            {/* Loading / Empty / Rows */}
            {loading ? (
              <div style={{ padding: "40px 18px", textAlign: "center", color: MUTED, fontSize: "14px" }}>
                Loading events from calendar...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div style={{ padding: "32px 18px", fontSize: "14px", color: "rgba(57,41,42,0.65)" }}>
                Nothing here. Widen the filters, or create an event.
              </div>
            ) : (
              filteredEvents.map((r) => {
                const dateShort = r.starts.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
                const timeStr = r.starts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const isCancelOpen = cancelEventId === r.id;
                const isMenuOpen = openActionMenuId === r.id;

                const rowBg =
                  r.displayState === "cancelled" ? "rgba(123,31,44,0.03)" :
                  r.displayState === "draft" ? "rgba(57,41,42,0.03)" :
                  "transparent";

                return (
                  <div
                    key={r.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2.3fr 1fr 0.9fr 1fr 0.7fr 1.1fr 1.5fr",
                      gap: "14px",
                      padding: "16px 18px",
                      borderBottom: "1px solid rgba(57,41,42,0.1)",
                      alignItems: "start",
                      backgroundColor: rowBg,
                    }}
                  >
                    {/* Column 1: Event Info */}
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", lineHeight: 1.3, marginBottom: "4px" }}>
                        {r.title}
                      </div>
                      <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57,41,42,0.68)" }}>
                        {r.venueName} · {r.neighbourhood}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "7px" }}>
                        <span style={{ border: "1px solid rgba(57,41,42,0.2)", borderRadius: "3px", padding: "3px 8px", fontSize: "11px", color: "rgba(57,41,42,0.7)" }}>
                          {r.displayCategory}
                        </span>
                        <span style={{ border: "1px solid rgba(182,130,53,0.55)", borderRadius: "3px", padding: "3px 8px", fontSize: "11px", color: "#8a6220" }}>
                          {r.displayStage}
                        </span>
                        {(r.isSignature || r.capacityGuest === 0) && (
                          <span style={{ border: "1px solid rgba(123,31,44,0.45)", borderRadius: "3px", padding: "3px 8px", fontSize: "11px", color: WINE }}>
                            Members only
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Column 2: When · Schedule */}
                    <div>
                      <div style={{ fontSize: "13.5px", lineHeight: 1.5, fontWeight: 600 }}>{dateShort}</div>
                      <div style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.68)" }}>{timeStr}</div>
                      <div style={{ marginTop: "6px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.06em", color: r.tColor }}>
                        {r.tMarker}
                      </div>
                    </div>

                    {/* Column 3: Booked / Min */}
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", color: r.fillColor }}>
                        {r.displayState === "draft" ? "—" : r.minToConfirm > 0 ? `${r.bookingsCount} / ${r.minToConfirm}` : String(r.bookingsCount)}
                      </div>
                      <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "3px" }}>
                        {r.displayState === "draft" ? "minimum not set" : r.minToConfirm > 0 ? (r.bookingsCount === 0 ? "nothing yet" : `${r.memberBooked} members, ${r.guestBooked} guest`) : "no minimum · RSVP list"}
                      </div>
                    </div>

                    {/* Column 4: Guests · Pass */}
                    <div>
                      <div style={{ fontSize: "13px", lineHeight: 1.5, fontVariantNumeric: "tabular-nums" }}>
                        {r.isSignature || r.capacityGuest === 0 ? "None — members only" : `${r.guestBooked} of ${r.capInForce}`}
                      </div>
                      <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.65)", marginTop: "3px" }}>
                        {r.isSignature ? "closed to guests" : r.capInForce !== r.capacityGuest ? `to be confirmed cap ${r.capInForce} in force` : "standing cap"}
                      </div>
                      <div style={{ marginTop: "6px", fontSize: "11.5px", lineHeight: 1.4, color: r.passColor }}>
                        {r.passLabel}
                      </div>
                    </div>

                    {/* Column 5: Credits */}
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px", fontVariantNumeric: "tabular-nums", color: r.creditCost === 0 ? "#39292a" : "#39292a" }}>
                        {r.isFreeWalk ? "Free" : r.creditCost > 0 ? String(r.creditCost) : "Not set"}
                      </div>
                      <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "3px" }}>
                        {r.isFreeWalk ? "included" : r.status === "confirmed" ? "locked on confirm" : "set by hand"}
                      </div>
                    </div>

                    {/* Column 6: Status */}
                    <div>
                      <span style={{
                        display: "inline-block",
                        border: `1px solid ${r.statusColor}`,
                        color: r.statusColor,
                        borderRadius: "3px",
                        padding: "4px 9px",
                        fontFamily: "'Cormorant Garamond', serif",
                        fontWeight: 600,
                        fontSize: "11.5px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}>
                        {r.displayStatusLabel}
                      </span>
                      <div style={{ fontSize: "11.5px", lineHeight: 1.55, color: "rgba(57,41,42,0.65)", marginTop: "7px" }}>
                        {r.statusNote}
                      </div>
                    </div>

                    {/* Column 7: Actions */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start", width: "100%" }}>
                      {/* Confirm & Cancel action pair for To be confirmed events */}
                      {r.showDecision && (
                        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => handleConfirm(r.id)}
                            disabled={actionLoading === r.id}
                            style={{
                              border: `1px solid ${GREEN}`,
                              background: "transparent",
                              color: GREEN,
                              borderRadius: "4px",
                              padding: "7px 13px",
                              fontFamily: "'Cormorant Garamond', serif",
                              fontWeight: 600,
                              fontSize: "12.5px",
                              cursor: "pointer",
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenCancel(r)}
                            style={{
                              border: "1px solid rgba(57,41,42,0.3)",
                              background: "transparent",
                              color: "#39292a",
                              borderRadius: "4px",
                              padding: "7px 13px",
                              fontFamily: "'Cormorant Garamond', serif",
                              fontWeight: 600,
                              fontSize: "12.5px",
                              cursor: "pointer",
                            }}
                          >
                            Cancel &amp; refund
                          </button>
                        </div>
                      )}

                      {/* Inline Cancel Reason Box */}
                      {isCancelOpen && (
                        <div style={{
                          border: "1px solid rgba(123,31,44,0.4)",
                          backgroundColor: "rgba(123,31,44,0.04)",
                          borderRadius: "5px",
                          padding: "11px 12px",
                          width: "100%",
                          boxSizing: "border-box",
                        }}>
                          <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.75)", marginBottom: "7px" }}>
                            {r.bookingsCount > 0
                              ? `Cancelling returns every credit held by ${r.bookingsCount} booking${r.bookingsCount === 1 ? "" : "s"}, keeps their original expiry, and refunds any Event Pass. Members read the reason below.`
                              : "Nobody has booked, so nothing is refunded. Members read the reason below."}
                          </div>
                          <input
                            type="text"
                            value={cancelReasonText}
                            onChange={(e) => setCancelReasonText(e.target.value)}
                            placeholder="What members will read"
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              border: "1px solid rgba(57,41,42,0.25)",
                              borderRadius: "4px",
                              padding: "8px 10px",
                              fontFamily: "'Lora', Georgia, serif",
                              fontSize: "12.5px",
                              color: "#39292a",
                              backgroundColor: "#fff",
                              marginBottom: "8px",
                            }}
                          />
                          <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => handleExecuteCancel(r.id)}
                              disabled={actionLoading === r.id}
                              style={{
                                border: `1px solid ${WINE}`,
                                backgroundColor: "transparent",
                                color: WINE,
                                borderRadius: "4px",
                                padding: "7px 12px",
                                fontFamily: "'Cormorant Garamond', serif",
                                fontWeight: 600,
                                fontSize: "12.5px",
                                cursor: "pointer",
                              }}
                            >
                              Cancel the event
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancelEventId(null)}
                              style={{
                                border: "1px solid rgba(57,41,42,0.25)",
                                backgroundColor: "transparent",
                                color: "#39292a",
                                borderRadius: "4px",
                                padding: "7px 12px",
                                fontFamily: "'Cormorant Garamond', serif",
                                fontWeight: 600,
                                fontSize: "12.5px",
                                cursor: "pointer",
                              }}
                            >
                              Keep it
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Row Action Links */}
                      <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => openRosterModal(r)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            fontSize: "12.5px",
                            color: WINE,
                            cursor: "pointer",
                            textDecoration: "underline",
                            fontFamily: "'Lora', Georgia, serif",
                          }}
                        >
                          Roster ({r.bookingsCount})
                        </button>
                        <span style={{ color: "rgba(57,41,42,0.3)" }}>·</span>
                        <Link
                          href={`/admin/events/${r.id}/edit`}
                          style={{
                            fontSize: "12.5px",
                            color: "#39292a",
                            textDecoration: "none",
                          }}
                        >
                          Edit
                        </Link>
                        <span style={{ color: "rgba(57,41,42,0.3)" }}>·</span>
                        <button
                          type="button"
                          onClick={() => setOpenActionMenuId(isMenuOpen ? null : r.id)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: WINE,
                            fontFamily: "'Lora', Georgia, serif",
                            fontSize: "12.5px",
                            cursor: "pointer",
                            padding: 0,
                            textDecoration: "underline",
                          }}
                        >
                          More
                        </button>
                      </div>

                      {/* More Menu Dropdown */}
                      {isMenuOpen && (
                        <div style={{
                          border: "1px solid rgba(57,41,42,0.2)",
                          borderRadius: "5px",
                          backgroundColor: "#fff",
                          padding: "7px 0",
                          minWidth: "180px",
                          boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                          display: "flex",
                          flexDirection: "column",
                          zIndex: 10,
                        }}>
                          {r.displayState === "draft" && (
                            <button
                              onClick={() => { handlePublish(r.id); setOpenActionMenuId(null); }}
                              style={{ padding: "6px 13px", fontSize: "12.5px", color: WINE, border: "none", background: "none", textAlign: "left", cursor: "pointer", fontWeight: 600 }}
                            >
                              Publish event
                            </button>
                          )}
                          <button
                            onClick={() => { handleDuplicate(r.id, r.title); setOpenActionMenuId(null); }}
                            style={{ padding: "6px 13px", fontSize: "12.5px", color: "#39292a", border: "none", background: "none", textAlign: "left", cursor: "pointer" }}
                          >
                            Duplicate
                          </button>
                          <Link
                            href={`/admin/events/${r.id}/roster`}
                            onClick={() => setOpenActionMenuId(null)}
                            style={{ padding: "6px 13px", fontSize: "12.5px", color: "#39292a", textDecoration: "none" }}
                          >
                            Export / Print sheet
                          </Link>
                          {r.bookingsCount === 0 && r.displayState !== "completed" && (
                            <button
                              onClick={() => { handleDelete(r.id, r.title); setOpenActionMenuId(null); }}
                              style={{ padding: "6px 13px", fontSize: "12.5px", color: "#39292a", border: "none", background: "none", textAlign: "left", cursor: "pointer" }}
                            >
                              Archive
                            </button>
                          )}
                          {r.bookingsCount > 0 && r.displayState !== "past" && (
                            <div style={{ padding: "6px 13px", fontSize: "12px", color: "rgba(57,41,42,0.45)" }}>
                              Archive — unavailable, bookings exist
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                );
              })
            )}

          </div>
        </div>

        {/* Explanatory Cards at Bottom */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "16px", marginTop: "24px" }}>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", backgroundColor: "#fffdfa", padding: "18px 20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>
              What the columns mean
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
              <div>
                <strong style={{ fontWeight: 600 }}>Booked / min</strong> — members plus guests already booked, against the minimum this event needs to run. Amber under half at T-10, wine at the decision point.
              </div>
              <div>
                <strong style={{ fontWeight: 600 }}>Guests · pass</strong> — guest places taken against whichever cap is in force: the standing figure, or the higher gathering figure while the event is short. Below it, whether the €35 Event Pass button is shown.
              </div>
              <div>
                <strong style={{ fontWeight: 600 }}>When · schedule</strong> — the date, and where the event sits in its own T-schedule. Set per event, not hard-coded.
              </div>
            </div>
          </div>

          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", backgroundColor: "#fffdfa", padding: "18px 20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>
              Rules this page holds
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
              <div>
                Credit cost is typed by hand per event. No category price, no inheritance on duplicate, and changing it after anyone has booked asks what happens to the difference.
              </div>
              <div>
                Cancelled events stay on the calendar with their reason. <strong style={{ fontWeight: 600 }}>There is no delete</strong> — archive only, and never once a booking exists.
              </div>
              <div>
                Two Event Passes per person is global, set in settings. It never appears in the event editor.
              </div>
              <div>
                A past event offers a roster and a duplicate. It cannot be cancelled.
              </div>
            </div>
          </div>
        </div>

      </div>

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
          <div style={{ maxWidth: "880px", width: "100%", maxHeight: "90vh", overflowY: "auto", backgroundColor: "#fffdfa", borderRadius: "8px", border: "1px solid rgba(57,41,42,0.2)", padding: "32px", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "1px solid rgba(57,41,42,0.15)", paddingBottom: "16px" }}>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "12px", textTransform: "uppercase", color: WINE, fontWeight: 600, letterSpacing: "0.1em" }}>
                  Event Attendee Roster &amp; Ticketing Desk
                </div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", margin: "4px 0 2px" }}>{activeEventRoster.title}</h2>
                <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.7)" }}>
                  📍 Meeting Point: <strong>{activeEventRoster.meetingPoint}</strong>
                </div>
              </div>
              <button onClick={() => setActiveEventRoster(null)} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#39292a" }}>✕</button>
            </div>

            {rosterLoading ? (
              <p style={{ textAlign: "center", padding: "32px", color: MUTED }}>Loading attendees...</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* 1. Confirmed Members List */}
                <div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "17px", marginBottom: "12px", display: "flex", justifyContent: "space-between" }}>
                    <span>Confirmed Members ({memberBookings.length})</span>
                    <span style={{ fontSize: "13px", color: MUTED, fontWeight: 400 }}>Capacity: {activeEventRoster.capacityMember}</span>
                  </h3>

                  {memberBookings.length === 0 ? (
                    <p style={{ fontSize: "13px", color: MUTED, padding: "12px", backgroundColor: "#fbf8f3", borderRadius: "4px" }}>
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
                          <tr key={b.id} style={{ borderBottom: "1px solid rgba(57,41,42,0.1)" }}>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ fontWeight: 600 }}>{b.firstName} {b.lastName}</div>
                              <div style={{ fontSize: "11.5px", color: MUTED }}>{b.email}</div>
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
                                color: b.status === "attended" ? "#1e6833" : b.status === "no_show" ? "#b91c1c" : WINE
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
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "17px", marginBottom: "12px", display: "flex", justifyContent: "space-between" }}>
                    <span>Guest Passes ({guestPasses.length})</span>
                    <span style={{ fontSize: "13px", color: MUTED, fontWeight: 400 }}>Pass Capacity: {activeEventRoster.capacityGuest}</span>
                  </h3>

                  {guestPasses.length === 0 ? (
                    <p style={{ fontSize: "13px", color: MUTED, padding: "12px", backgroundColor: "#fbf8f3", borderRadius: "4px" }}>
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
                          <tr key={gp.id} style={{ borderBottom: "1px solid rgba(57,41,42,0.1)" }}>
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ fontWeight: 600 }}>{gp.firstName} {gp.lastName}</div>
                              <div style={{ fontSize: "11.5px", color: MUTED }}>{gp.email}</div>
                            </td>
                            <td style={{ padding: "10px 12px", fontWeight: 600 }}>€{(gp.pricePaidCents / 100).toFixed(2)}</td>
                            <td style={{ padding: "10px 12px" }}>
                              <a
                                href={`/ticket/${gp.ticketToken}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: WINE, fontSize: "12px", textDecoration: "underline" }}
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "12px", borderTop: "1px solid rgba(57,41,42,0.15)", paddingTop: "20px" }}>
                  {/* Manual Member Seat Booking */}
                  <div style={{ backgroundColor: "#fbf8f3", padding: "18px", borderRadius: "6px", border: "1px solid rgba(57,41,42,0.15)" }}>
                    <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "15px", margin: "0 0 10px", color: WINE }}>+ Manually Book Member to Event</h4>
                    <form onSubmit={handleManualMemberBook} style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px" }}>
                      <select
                        style={{ padding: "8px 10px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", backgroundColor: "#fff" }}
                        value={selectedMemberId}
                        onChange={(e) => setSelectedMemberId(e.target.value)}
                      >
                        {allMembers.filter(m => !memberBookings.some(b => b.email === m.email)).map((m) => (
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
                      <button type="submit" disabled={bookingMember} style={{ backgroundColor: WINE, color: "#fff", border: "none", borderRadius: "4px", padding: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                        {bookingMember ? "Booking..." : "Confirm Member Seat"}
                      </button>
                    </form>
                  </div>

                  {/* Direct Guest Pass Issue */}
                  <div style={{ backgroundColor: "#fbf8f3", padding: "18px", borderRadius: "6px", border: "1px solid rgba(57,41,42,0.15)" }}>
                    <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "15px", margin: "0 0 10px", color: WINE }}>+ Issue €35 Guest Ticket Pass</h4>
                    <p style={{ fontSize: "12px", color: MUTED, margin: "0 0 12px" }}>Generates a unique payment link. The guest is only confirmed once they complete checkout.</p>
                    <form onSubmit={handleIssueGuest} style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        <input
                          type="text"
                          placeholder="First Name"
                          value={guestForm.firstName}
                          onChange={(e) => setGuestForm({ ...guestForm, firstName: e.target.value })}
                          required
                          style={{ padding: "8px 10px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", backgroundColor: "#fff" }}
                        />
                        <input
                          type="text"
                          placeholder="Last Name"
                          value={guestForm.lastName}
                          onChange={(e) => setGuestForm({ ...guestForm, lastName: e.target.value })}
                          style={{ padding: "8px 10px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", backgroundColor: "#fff" }}
                        />
                      </div>
                      <input
                        type="email"
                        placeholder="guest@example.com"
                        value={guestForm.email}
                        onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                        required
                        style={{ padding: "8px 10px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", backgroundColor: "#fff" }}
                      />
                      <button type="submit" disabled={issuingPass} style={{ backgroundColor: "#fff", color: WINE, border: `1px solid ${WINE}`, borderRadius: "4px", padding: "8px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
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

    </div>
  );
}
