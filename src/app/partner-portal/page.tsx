"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  getCommunityPortalDataAction,
  createCommunityEventAction,
  connectStripeAccountAction,
  getEventAttendeesAction,
  cancelCommunityEventAction,
  messageBookedMothersAction,
  updateCommunityDetailsAction,
} from "@/app/actions/partnerPortal";

// Sample Community Data for 1-click Demo Preview (matching Partner Portal.dc.html)
const SAMPLE_COMMUNITY = {
  id: "mamas-gracia",
  name: "Mamás de Gràcia",
  slug: "mamas-gracia",
  type: "community",
  contactName: "Claire Puig",
  contactEmail: "claire@mamasdegracia.org",
  contactPhone: "+34 612 345 678",
  legalName: "Asociación Mamás de Gràcia",
  taxId: "G-12345678",
  commissionRatePercent: 15,
  stripeAccountId: "acct_sample_gracia",
  stripeCardOnFile: true,
  inviteCode: "GRACIA",
  approved: true,
  publishesWithoutReview: false,
  freeEventsThisMonth: 1,
  membersCount: 80,
};

const SAMPLE_EVENTS = [
  {
    id: "sample-ev-1",
    title: "Morning coffee & playground stroll",
    description: "Meet outside Plaça del Sol for coffee, then an easy stroller walk through the village.",
    startsAt: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 2 * 24 * 3600 * 1000 + 2 * 3600 * 1000).toISOString(),
    venueName: "Café del Sol",
    meetingPoint: "Plaça del Sol, 12, Gràcia",
    neighbourhood: "Gràcia",
    capacityMember: 12,
    minToConfirm: 3,
    priceCents: 0,
    isCommunityOnly: true,
    status: "confirmed",
    durationHours: 2,
    stages: ["babies", "toddlers"],
    who: "kids",
    langs: "Spanish, Catalan, English",
    cancelHours: 24,
    bookedCount: 9,
    attendees: [
      { id: "att-1", name: "Claire", stage: "Babies" },
      { id: "att-2", name: "Núria", stage: "Pregnant" },
      { id: "att-3", name: "Anna", stage: "Toddlers" },
      { id: "att-4", name: "Elena", stage: "Babies" },
      { id: "att-5", name: "Sophie", stage: "Babies" },
      { id: "att-6", name: "Mireia", stage: "Children" },
      { id: "att-7", name: "Laura", stage: "Toddlers" },
      { id: "att-8", name: "Chloe", stage: "Babies" },
      { id: "att-9", name: "Berta", stage: "Babies" },
    ],
  },
  {
    id: "sample-ev-2",
    title: "Postnatal pelvic floor workshop",
    description: "Hands-on guidance with a certified physiotherapist on breath and core rebuilding.",
    startsAt: new Date(Date.now() + 8 * 24 * 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 8 * 24 * 3600 * 1000 + 2 * 3600 * 1000).toISOString(),
    venueName: "Espai de Salut Gràcia",
    meetingPoint: "Carrer de Verdi, 45",
    neighbourhood: "Gràcia",
    capacityMember: 10,
    minToConfirm: 4,
    priceCents: 2000, // €20
    isCommunityOnly: false,
    status: "confirmed",
    durationHours: 2,
    stages: ["pregnant", "babies"],
    who: "mothers",
    langs: "Spanish, English",
    cancelHours: 48,
    bookedCount: 7,
    attendees: [
      { id: "att-1", name: "Núria", stage: "Pregnant" },
      { id: "att-2", name: "Claire", stage: "Babies" },
      { id: "att-4", name: "Elena", stage: "Babies" },
      { id: "att-5", name: "Sophie", stage: "Babies" },
      { id: "att-10", name: "Maria", stage: "Pregnant" },
      { id: "att-11", name: "Inés", stage: "Babies" },
      { id: "att-12", name: "Lucía", stage: "Pregnant" },
    ],
  },
  {
    id: "sample-ev-3",
    title: "Mothers night tapas & wine",
    description: "A relaxed evening of tapas without little ones.",
    startsAt: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 15 * 24 * 3600 * 1000 + 3 * 3600 * 1000).toISOString(),
    venueName: "Bar del Pla",
    meetingPoint: "Carrer de Montcada, 2",
    neighbourhood: "Gràcia",
    capacityMember: 14,
    minToConfirm: 6,
    priceCents: 2500, // €25
    isCommunityOnly: true,
    status: "published_pending",
    durationHours: 3,
    stages: ["babies", "toddlers", "children"],
    who: "mothers",
    langs: "Spanish, English",
    cancelHours: 24,
    bookedCount: 4,
    attendees: [
      { id: "att-1", name: "Claire", stage: "Babies" },
      { id: "att-3", name: "Anna", stage: "Toddlers" },
      { id: "att-6", name: "Mireia", stage: "Children" },
      { id: "att-7", name: "Laura", stage: "Toddlers" },
    ],
  },
];

const STAGE_OPTIONS = [
  { id: "pregnant", label: "Pregnant" },
  { id: "babies", label: "Babies" },
  { id: "toddlers", label: "Toddlers" },
  { id: "children", label: "Children" },
  { id: "bigkids", label: "Big kids" },
];

export default function PartnerPortalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "events" | "new" | "earnings" | "profile">("overview");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<"all" | "upcoming" | "review" | "past" | "cancelled">("all");

  const [loading, setLoading] = useState(true);
  const [dbData, setDbData] = useState<{ community: any; events: any[] } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Event Detail State
  const [attendeesList, setAttendeesList] = useState<Array<{ id: string; name: string; stage: string }>>([]);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);

  // New Event Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("easy");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("11:00");
  const [durationHours, setDurationHours] = useState(2);
  const [neighbourhood, setNeighbourhood] = useState("Gràcia");
  const [venueName, setVenueName] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [selectedStages, setSelectedStages] = useState<string[]>(["babies"]);
  const [whoComes, setWhoComes] = useState<"kids" | "mothers">("kids");
  const [languages, setLanguages] = useState("Spanish, English");
  const [priceEur, setPriceEur] = useState<string>("0");
  const [capacity, setCapacity] = useState(12);
  const [minToConfirm, setMinToConfirm] = useState(3);
  const [cancelHours, setCancelHours] = useState(24);
  const [cutoffHours, setCutoffHours] = useState(3);
  const [visibility, setVisibility] = useState<"public" | "community">("public");

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Details Profile State
  const [profileName, setProfileName] = useState("");
  const [profileContact, setProfileContact] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileLegal, setProfileLegal] = useState("");
  const [profileTaxId, setProfileTaxId] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    async function init() {
      if (status === "authenticated") {
        try {
          const res = await getCommunityPortalDataAction();
          if (res?.community) {
            setDbData(res);
            setProfileName(res.community.name || "");
            setProfileEmail(res.community.contactEmail || "");
            setProfilePhone(res.community.contactPhone || "");
            setProfileLegal(res.community.legalName || "");
            setProfileTaxId(res.community.taxId || "");
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error("Portal load error:", err);
        }
      }
      setLoading(false);
    }
    if (status !== "loading") {
      init();
    }
  }, [status]);

  // Resolve active community and events
  const currentCommunity = useMemo(() => {
    if (dbData?.community) return dbData.community;
    if (isDemoMode) return SAMPLE_COMMUNITY;
    return null;
  }, [dbData, isDemoMode]);

  const currentEvents = useMemo(() => {
    if (dbData?.events && dbData.events.length > 0) return dbData.events;
    if (isDemoMode) return SAMPLE_EVENTS;
    return [];
  }, [dbData, isDemoMode]);

  const isTrusted = Boolean(currentCommunity?.publishesWithoutReview);
  const commissionRate = currentCommunity?.commissionRatePercent ?? (currentCommunity?.type === "workshop" ? 20 : 15);

  // Commission calculations
  const parsedPrice = parseFloat(priceEur) || 0;
  let commissionEur = 0;
  if (parsedPrice > 0) {
    const rawComm = (parsedPrice * commissionRate) / 100;
    commissionEur = Math.max(1.0, Math.round(rawComm * 100) / 100);
  }
  const netPerMother = Math.max(0, parsedPrice - commissionEur);
  const totalIfFull = netPerMother * capacity;

  // Selected event for detail view
  const activeDetailEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return currentEvents.find((e: any) => e.id === selectedEventId) || null;
  }, [selectedEventId, currentEvents]);

  // Fetch or populate attendees when opening detail
  useEffect(() => {
    if (activeDetailEvent) {
      if (activeDetailEvent.attendees) {
        setAttendeesList(activeDetailEvent.attendees);
      } else if (!isDemoMode) {
        getEventAttendeesAction(activeDetailEvent.id)
          .then((res) => setAttendeesList(res))
          .catch(() => setAttendeesList([]));
      }
    }
  }, [activeDetailEvent, isDemoMode]);

  const handleCopyInviteLink = async () => {
    const code = currentCommunity?.inviteCode || "GRACIA";
    const url = `https://themothers.cc/join/${code}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    if (isDemoMode) {
      setTimeout(() => {
        setSubmitting(false);
        setFormSuccessMessage(
          isTrusted
            ? `“${title}” is live on the calendar.`
            : `“${title}” has been sent to The Mothers team for review.`
        );
        setTitle("");
        setDescription("");
      }, 600);
      return;
    }

    try {
      const startsAtISO = new Date(`${eventDate}T${eventTime}:00`).toISOString();
      const priceCents = Math.round(parsedPrice * 100);

      const res = await createCommunityEventAction({
        title,
        description,
        startsAt: startsAtISO,
        durationMinutes: durationHours * 60,
        capacity,
        locationName: venueName || neighbourhood,
        locationAddress: meetingPoint,
        googleMapsUrl: googleMapsUrl.trim() || undefined,
        priceCents,
        isCommunityOnly: visibility === "community",
        bookingCutoffHours: cutoffHours,
      });

      if (!res.success) {
        if (res.error === "STRIPE_ACCOUNT_REQUIRED") {
          setFormError("A connected Stripe account is required to publish paid events. Connect Stripe in the Details tab.");
        } else if (res.error === "WORKSHOPS_CANNOT_BE_COMMUNITY_ONLY") {
          setFormError("Workshops cannot be marked as community-only.");
        } else {
          setFormError(res.error || "Failed to create event.");
        }
      } else {
        setFormSuccessMessage(
          isTrusted
            ? `“${title}” is live on the calendar.`
            : `“${title}” has been sent to The Mothers team for review.`
        );
        setTitle("");
        setDescription("");
        const refreshed = await getCommunityPortalDataAction();
        setDbData(refreshed);
      }
    } catch (err: any) {
      setFormError(err?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!cancelReason.trim()) {
      setCancelError("Please add a reason for the mothers.");
      return;
    }
    if (isDemoMode) {
      alert("Event cancelled and all mothers refunded in full.");
      setShowCancelPrompt(false);
      setSelectedEventId(null);
      return;
    }

    if (activeDetailEvent) {
      const res = await cancelCommunityEventAction(activeDetailEvent.id, cancelReason);
      if (res.success) {
        setShowCancelPrompt(false);
        setSelectedEventId(null);
        const refreshed = await getCommunityPortalDataAction();
        setDbData(refreshed);
      } else {
        setCancelError(res.error || "Failed to cancel event.");
      }
    }
  };

  const handleSendMessage = async () => {
    if (!broadcastMessage.trim()) return;
    if (activeDetailEvent) {
      await messageBookedMothersAction(activeDetailEvent.id, broadcastMessage);
      setBroadcastSent(true);
      setBroadcastMessage("");
      setTimeout(() => setBroadcastSent(false), 4000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDemoMode) {
      await updateCommunityDetailsAction({
        name: profileName,
        contactEmail: profileEmail,
        contactPhone: profilePhone,
        legalName: profileLegal,
        taxId: profileTaxId,
      });
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(57, 41, 42, 0.6)" }}>
        Loading community space...
      </div>
    );
  }

  // Not signed in and not previewing demo
  if (!currentCommunity && !isDemoMode) {
    return (
      <div style={{ minHeight: "90vh", backgroundColor: "#fdf8f2", padding: "80px 24px" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", padding: "40px 36px", textAlign: "center" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "12px", fontWeight: 600 }}>
            Community Space
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "36px", fontWeight: 400, color: "#39292a", margin: "0 0 14px", lineHeight: 1.15 }}>
            Organise your group’s events on The Mothers.
          </h1>
          <p style={{ fontSize: "16px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.76)", margin: "0 0 28px" }}>
            Sign in with the email we approved your community or workshop with.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
            <Link
              href="/account/login?callbackUrl=/partner-portal"
              style={{
                backgroundColor: "#7b1f2c",
                color: "#fdf8f2",
                padding: "13px 28px",
                borderRadius: "4px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "16px",
                textDecoration: "none",
                width: "100%",
                maxWidth: "320px",
                display: "inline-block",
              }}
            >
              Sign in to Community space
            </Link>

            <button
              type="button"
              onClick={() => {
                setIsDemoMode(true);
                setActiveTab("overview");
              }}
              style={{
                border: "1px solid rgba(57, 41, 42, 0.25)",
                backgroundColor: "#fffdfa",
                color: "#39292a",
                padding: "12px 28px",
                borderRadius: "4px",
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 600,
                fontSize: "15px",
                cursor: "pointer",
                width: "100%",
                maxWidth: "320px",
              }}
            >
              Explore sample portal (Mamás de Gràcia)
            </button>
          </div>

          <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid rgba(57, 41, 42, 0.12)", fontSize: "13.5px", color: "rgba(57, 41, 42, 0.65)" }}>
            Need to bring your group? <Link href="/partner-apply" style={{ color: "#7b1f2c", fontWeight: 600 }}>Apply here</Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const nowMs = Date.now();
  const upcomingEvents = currentEvents.filter((e: any) => new Date(e.startsAt).getTime() >= nowMs && e.status !== "cancelled");
  const inReviewEvents = currentEvents.filter((e: any) => e.status === "published_pending");
  const pastEvents = currentEvents.filter((e: any) => new Date(e.startsAt).getTime() < nowMs && e.status !== "cancelled");
  const bookedOnUpcoming = upcomingEvents.reduce((acc: number, e: any) => acc + (e.bookedCount || 0), 0);

  // Month earnings calculation
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const receivedThisMonth = currentEvents
    .filter((e: any) => (e.priceCents || 0) > 0 && e.status !== "cancelled" && new Date(e.startsAt).getTime() >= startOfMonth)
    .reduce((sum: number, e: any) => {
      const price = (e.priceCents || 0) / 100;
      const comm = Math.max(1, (price * commissionRate) / 100);
      return sum + (price - comm) * (e.bookedCount || 0);
    }, 0);

  const contactFirstName = currentCommunity?.contactName?.split(" ")[0] || "Organiser";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fdf8f2", color: "#39292a", fontFamily: "'Lora', Georgia, serif" }}>
      {/* Top Banner if demo mode */}
      {isDemoMode && (
        <div style={{ backgroundColor: "#39292a", color: "#f8efe2", padding: "10px 24px", fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Previewing sample community: <strong>Mamás de Gràcia</strong> (Claire Puig)</span>
          <button
            onClick={() => setIsDemoMode(false)}
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "4px 10px", borderRadius: "3px", fontSize: "12px", cursor: "pointer" }}
          >
            Exit preview
          </button>
        </div>
      )}

      {/* Portal Header */}
      <div style={{ borderBottom: "1px solid rgba(57, 41, 42, 0.14)", backgroundColor: "#fffdfa" }}>
        <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
              <img src="/assets/logo-mark-alpha.png" alt="The Mothers" style={{ height: "42px", width: "auto" }} />
              <span style={{ width: "1px", height: "22px", backgroundColor: "rgba(57, 41, 42, 0.2)" }} />
              <img src="/assets/logo-wordmark-alpha.png" alt="The Mothers" style={{ height: "12px", width: "auto" }} />
            </Link>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "14px", color: "rgba(57, 41, 42, 0.65)", marginLeft: "4px" }}>
              Community space
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <span style={{ fontSize: "14px", color: "rgba(57, 41, 42, 0.75)" }}>
              {currentCommunity?.name}
            </span>
            <button
              onClick={() => {
                if (isDemoMode) setIsDemoMode(false);
                else signOut({ callbackUrl: "/" });
              }}
              style={{ background: "transparent", border: "none", color: "#7b1f2c", fontSize: "13.5px", cursor: "pointer", textDecoration: "underline" }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Tab Navigation Rail */}
        <div style={{ maxWidth: "1160px", margin: "0 auto", padding: "0 24px", display: "flex", gap: "28px", overflowX: "auto" }}>
          {[
            { id: "overview", label: "Overview" },
            { id: "events", label: "Events" },
            { id: "new", label: "New event" },
            { id: "earnings", label: "Earnings" },
            { id: "profile", label: "Details" },
          ].map((tab) => {
            const isActive = activeTab === tab.id || (tab.id === "events" && selectedEventId !== null);
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedEventId(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive ? "2px solid #7b1f2c" : "2px solid transparent",
                  color: isActive ? "#7b1f2c" : "rgba(57, 41, 42, 0.75)",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "16px",
                  padding: "12px 2px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <main style={{ maxWidth: "1160px", margin: "0 auto", padding: "clamp(32px, 4vw, 56px) 24px 80px" }}>
        {/* ============================================================== */}
        {/* TAB 1: OVERVIEW */}
        {/* ============================================================== */}
        {activeTab === "overview" && !selectedEventId && (
          <div>
            <div style={{ marginBottom: "28px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", fontWeight: 600, marginBottom: "8px" }}>
                {currentCommunity?.name}
              </div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(30px, 4vw, 42px)", fontWeight: 400, margin: "0 0 6px", lineHeight: 1.1 }}>
                Good to see you, {contactFirstName}.
              </h1>
              <p style={{ fontSize: "15px", color: "rgba(57, 41, 42, 0.72)", margin: 0 }}>
                {currentCommunity?.type === "workshop" ? "Studio & workshop space on The Mothers" : "Mother community space on The Mothers"} · {currentCommunity?.membersCount || 80} mothers in your circle
              </p>
            </div>

            {/* Invite Link Banner */}
            <div style={{ border: "1px solid rgba(86, 139, 5, 0.35)", backgroundColor: "rgba(86, 139, 5, 0.06)", borderRadius: "8px", padding: "18px 22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", marginBottom: "32px" }}>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "17px", color: "#39292a", marginBottom: "4px" }}>
                  Invite mothers to your community space
                </div>
                <div style={{ fontSize: "14px", color: "rgba(57, 41, 42, 0.74)" }}>
                  Share this link on your WhatsApp or Instagram to invite mothers directly:
                  <span style={{ display: "inline-block", marginLeft: "6px", fontFamily: "monospace", color: "#3b5e04", fontWeight: 600 }}>
                    themothers.cc/join/{currentCommunity?.inviteCode || "GRACIA"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyInviteLink}
                style={{
                  backgroundColor: "#568b05",
                  color: "#ffffff",
                  border: "1px solid #568b05",
                  borderRadius: "4px",
                  padding: "9px 18px",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 600,
                  fontSize: "14.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {copiedLink ? "Copied!" : "Copy invite link"}
              </button>
            </div>

            {/* KPI Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "16px", marginBottom: "36px" }}>
              <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", padding: "20px 22px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "36px", fontWeight: 500, color: "#39292a", lineHeight: 1 }}>
                  {upcomingEvents.length}
                </div>
                <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.65)", marginTop: "6px" }}>
                  Upcoming events
                </div>
              </div>

              <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", padding: "20px 22px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "36px", fontWeight: 500, color: "#39292a", lineHeight: 1 }}>
                  {bookedOnUpcoming}
                </div>
                <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.65)", marginTop: "6px" }}>
                  Mothers booked on upcoming
                </div>
              </div>

              <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", padding: "20px 22px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "36px", fontWeight: 500, color: "#3b5e04", lineHeight: 1 }}>
                  €{receivedThisMonth.toFixed(2)}
                </div>
                <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.65)", marginTop: "6px" }}>
                  Received this month
                </div>
              </div>

              <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", padding: "20px 22px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "36px", fontWeight: 500, color: "#7a5612", lineHeight: 1 }}>
                  {inReviewEvents.length}
                </div>
                <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.65)", marginTop: "6px" }}>
                  Waiting for our review
                </div>
              </div>
            </div>

            {/* Needs You / Attention Box */}
            {inReviewEvents.length > 0 && (
              <div style={{ border: "1px solid rgba(164, 118, 31, 0.35)", backgroundColor: "rgba(201, 162, 39, 0.08)", borderRadius: "8px", padding: "18px 22px", marginBottom: "32px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px", color: "#7a5612", marginBottom: "6px" }}>
                  Needs you
                </div>
                <div style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57, 41, 42, 0.8)" }}>
                  {inReviewEvents.length} event waiting for team review. Your first 3 events are verified by our team before going live.
                </div>
              </div>
            )}

            {/* Coming Up Section */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", padding: "24px 26px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 500, margin: 0 }}>
                  Coming up
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("new")}
                  style={{
                    backgroundColor: "#7b1f2c",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "7px 16px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  + Create event
                </button>
              </div>

              {upcomingEvents.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: "rgba(57, 41, 42, 0.6)", fontSize: "14.5px" }}>
                  No upcoming events scheduled. Create an event to gather your community.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {upcomingEvents.map((ev: any) => (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEventId(ev.id)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "14px 18px",
                        borderRadius: "6px",
                        backgroundColor: "#fffdfa",
                        border: "1px solid rgba(57, 41, 42, 0.12)",
                        cursor: "pointer",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(123, 31, 44, 0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fffdfa")}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "15.5px", color: "#39292a", marginBottom: "4px" }}>
                          {ev.title}
                        </div>
                        <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.65)" }}>
                          {new Date(ev.startsAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {ev.bookedCount || 0} of {ev.capacityMember || 12} booked · {ev.priceCents > 0 ? `€${(ev.priceCents / 100).toFixed(2)}` : "Free"}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            padding: "3px 10px",
                            borderRadius: "12px",
                            backgroundColor: ev.status === "confirmed" ? "rgba(86, 139, 5, 0.1)" : "rgba(164, 118, 31, 0.1)",
                            color: ev.status === "confirmed" ? "#3b5e04" : "#7a5612",
                            fontWeight: 600,
                          }}
                        >
                          {ev.status === "confirmed" ? "Live" : "In review"}
                        </span>
                        <span style={{ color: "#7b1f2c", fontSize: "14px" }}>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: EVENTS LIST & DETAIL SUB-VIEW */}
        {/* ============================================================== */}
        {activeTab === "events" && !selectedEventId && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "24px" }}>
              <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 400, margin: 0 }}>
                Your events
              </h1>
              <button
                type="button"
                onClick={() => setActiveTab("new")}
                style={{
                  backgroundColor: "#7b1f2c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "9px 20px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "14.5px",
                  cursor: "pointer",
                }}
              >
                + Create event
              </button>
            </div>

            {/* Filter Chips */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
              {[
                { id: "all", label: "All" },
                { id: "upcoming", label: "Upcoming" },
                { id: "review", label: "In review" },
                { id: "past", label: "Past" },
                { id: "cancelled", label: "Cancelled" },
              ].map((fl) => {
                const isSelected = eventFilter === fl.id;
                return (
                  <button
                    key={fl.id}
                    onClick={() => setEventFilter(fl.id as any)}
                    style={{
                      border: isSelected ? "1px solid #7b1f2c" : "1px solid rgba(57, 41, 42, 0.22)",
                      backgroundColor: isSelected ? "rgba(123, 31, 44, 0.08)" : "transparent",
                      color: isSelected ? "#7b1f2c" : "#39292a",
                      padding: "6px 14px",
                      borderRadius: "16px",
                      fontSize: "13.5px",
                      cursor: "pointer",
                    }}
                  >
                    {fl.label}
                  </button>
                );
              })}
            </div>

            {/* Event List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {currentEvents
                .filter((e: any) => {
                  const isPast = new Date(e.startsAt).getTime() < nowMs;
                  if (eventFilter === "upcoming") return !isPast && e.status !== "cancelled";
                  if (eventFilter === "review") return e.status === "published_pending";
                  if (eventFilter === "past") return isPast && e.status !== "cancelled";
                  if (eventFilter === "cancelled") return e.status === "cancelled";
                  return true;
                })
                .map((ev: any) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "#ffffff",
                      border: "1px solid rgba(57, 41, 42, 0.14)",
                      borderRadius: "6px",
                      padding: "16px 20px",
                      cursor: "pointer",
                      transition: "border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#7b1f2c")}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(57, 41, 42, 0.14)")}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "16px", color: "#39292a", marginBottom: "4px" }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.7)" }}>
                        {new Date(ev.startsAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {ev.venueName || ev.neighbourhood} · {ev.priceCents > 0 ? `€${(ev.priceCents / 100).toFixed(2)}` : "Free"} {ev.isCommunityOnly && "· Community only"}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <span style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.8)", fontWeight: 500 }}>
                        {ev.bookedCount || 0} / {ev.capacityMember || 12}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          backgroundColor:
                            ev.status === "cancelled"
                              ? "rgba(153, 56, 66, 0.1)"
                              : ev.status === "published_pending"
                              ? "rgba(164, 118, 31, 0.1)"
                              : "rgba(86, 139, 5, 0.1)",
                          color:
                            ev.status === "cancelled"
                              ? "#993842"
                              : ev.status === "published_pending"
                              ? "#7a5612"
                              : "#3b5e04",
                          fontWeight: 600,
                        }}
                      >
                        {ev.status === "cancelled" ? "Cancelled" : ev.status === "published_pending" ? "In review" : "Live"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* EVENT DETAIL SUB-VIEW */}
        {selectedEventId && activeDetailEvent && (
          <div>
            <button
              onClick={() => setSelectedEventId(null)}
              style={{ background: "transparent", border: "none", color: "#7b1f2c", fontSize: "14px", fontWeight: 600, cursor: "pointer", marginBottom: "16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              ← Back to events
            </button>

            {/* Event Header Card */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.15)", borderRadius: "8px", padding: "26px 28px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 400, margin: "0 0 6px" }}>
                    {activeDetailEvent.title}
                  </h1>
                  <div style={{ fontSize: "14.5px", color: "rgba(57, 41, 42, 0.72)" }}>
                    {new Date(activeDetailEvent.startsAt).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} · {activeDetailEvent.venueName}, {activeDetailEvent.neighbourhood}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "12.5px",
                    padding: "4px 12px",
                    borderRadius: "14px",
                    backgroundColor: activeDetailEvent.status === "cancelled" ? "rgba(153, 56, 66, 0.1)" : "rgba(86, 139, 5, 0.1)",
                    color: activeDetailEvent.status === "cancelled" ? "#993842" : "#3b5e04",
                    fontWeight: 600,
                  }}
                >
                  {activeDetailEvent.status === "cancelled" ? "Cancelled" : activeDetailEvent.status === "published_pending" ? "In review" : "Live"}
                </span>
              </div>

              {/* Notice Banner if any */}
              {activeDetailEvent.isCommunityOnly && (
                <div style={{ backgroundColor: "rgba(86, 139, 5, 0.08)", border: "1px solid rgba(86, 139, 5, 0.3)", borderRadius: "6px", padding: "10px 14px", fontSize: "13.5px", color: "#3b5e04", marginBottom: "18px" }}>
                  Community only: this event is hidden from the public calendar. Only mothers with your community invite link can book.
                </div>
              )}

              {/* Stats Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))", gap: "14px", paddingTop: "14px", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#39292a" }}>
                    {activeDetailEvent.bookedCount || 0} / {activeDetailEvent.capacityMember || 12}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.65)" }}>Booked</div>
                </div>

                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#39292a" }}>
                    {activeDetailEvent.minToConfirm || 2}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.65)" }}>Minimum to run</div>
                </div>

                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#39292a" }}>
                    {activeDetailEvent.priceCents > 0 ? `€${(activeDetailEvent.priceCents / 100).toFixed(2)}` : "Free"}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.65)" }}>Price per mother</div>
                </div>

                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 600, color: "#3b5e04" }}>
                    {activeDetailEvent.priceCents > 0
                      ? `€${Math.max(0, activeDetailEvent.priceCents / 100 - Math.max(1, (activeDetailEvent.priceCents / 100) * (commissionRate / 100))).toFixed(2)}`
                      : "€0"}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.65)" }}>You receive / mother</div>
                </div>
              </div>
            </div>

            {/* Who is coming (Roster Table) - STRICT PRIVACY RULE */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.15)", borderRadius: "8px", padding: "24px 26px", marginBottom: "24px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 500, margin: "0 0 8px" }}>
                Who is coming
              </h2>
              <p style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.65)", margin: "0 0 16px" }}>
                For privacy, attendee first name and stage are shown. Contact information is kept private.
              </p>

              {attendeesList.length === 0 ? (
                <div style={{ padding: "20px 0", color: "rgba(57, 41, 42, 0.6)", fontSize: "14px" }}>
                  No bookings yet for this event.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                  {attendeesList.map((att: any, idx: number) => (
                    <div
                      key={att.id || idx}
                      style={{
                        padding: "10px 14px",
                        backgroundColor: "#fffdfa",
                        border: "1px solid rgba(57, 41, 42, 0.12)",
                        borderRadius: "5px",
                        fontSize: "14.5px",
                      }}
                    >
                      <strong>{att.name}</strong> <span style={{ color: "rgba(57, 41, 42, 0.6)" }}>· {att.stage}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Everyone Booked */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.15)", borderRadius: "8px", padding: "24px 26px", marginBottom: "24px" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 500, margin: "0 0 6px" }}>
                Message everyone booked
              </h2>
              <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.7)", margin: "0 0 14px" }}>
                Send an update to all mothers booked for this event through The Mothers notification system.
              </p>

              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="e.g. Please bring a water bottle and arrive 5 minutes early outside the fountain."
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "5px",
                  border: "1px solid rgba(57, 41, 42, 0.22)",
                  fontFamily: "'Lora', Georgia, serif",
                  fontSize: "14.5px",
                  boxSizing: "border-box",
                  marginBottom: "12px",
                }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!broadcastMessage.trim()}
                  style={{
                    backgroundColor: "#7b1f2c",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "9px 20px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "14.5px",
                    cursor: broadcastMessage.trim() ? "pointer" : "not-allowed",
                    opacity: broadcastMessage.trim() ? 1 : 0.6,
                  }}
                >
                  Send message
                </button>
                {broadcastSent && (
                  <span style={{ color: "#3b5e04", fontSize: "14px", fontWeight: 600 }}>
                    Message dispatched to booked mothers.
                  </span>
                )}
              </div>
            </div>

            {/* Cancel Event Action */}
            {activeDetailEvent.status !== "cancelled" && (
              <div style={{ border: "1px solid rgba(153, 56, 66, 0.3)", backgroundColor: "rgba(153, 56, 66, 0.04)", borderRadius: "8px", padding: "20px 24px" }}>
                {!showCancelPrompt ? (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "16px", color: "#993842", marginBottom: "2px" }}>
                        Cancel this event
                      </div>
                      <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.7)" }}>
                        If you cannot run this event, cancelling will automatically refund every mother in full.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCancelPrompt(true)}
                      style={{
                        backgroundColor: "transparent",
                        border: "1px solid #993842",
                        color: "#993842",
                        borderRadius: "4px",
                        padding: "8px 18px",
                        fontFamily: "'Cormorant Garamond', serif",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel event
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "16px", color: "#993842", marginBottom: "8px" }}>
                      Provide a reason for cancelling
                    </div>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => {
                        setCancelReason(e.target.value);
                        setCancelError(null);
                      }}
                      placeholder="e.g. Unforeseen studio maintenance, or rain forecast for park meetup."
                      rows={2}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "4px",
                        border: "1px solid rgba(153, 56, 66, 0.4)",
                        marginBottom: "10px",
                        boxSizing: "border-box",
                        fontSize: "14px",
                      }}
                    />
                    {cancelError && <div style={{ color: "#993842", fontSize: "13px", marginBottom: "10px" }}>{cancelError}</div>}
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={handleCancelEvent}
                        style={{
                          backgroundColor: "#993842",
                          color: "#fff",
                          border: "none",
                          padding: "8px 18px",
                          borderRadius: "4px",
                          fontSize: "14px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Confirm cancellation & refund mothers
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCancelPrompt(false)}
                        style={{
                          backgroundColor: "transparent",
                          border: "1px solid rgba(57, 41, 42, 0.25)",
                          padding: "8px 16px",
                          borderRadius: "4px",
                          fontSize: "14px",
                          cursor: "pointer",
                        }}
                      >
                        Keep event
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: NEW EVENT FORM */}
        {/* ============================================================== */}
        {activeTab === "new" && (
          <div style={{ maxWidth: "780px" }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 400, margin: "0 0 6px" }}>
              New event
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(57, 41, 42, 0.72)", margin: "0 0 28px" }}>
              {isTrusted
                ? "Your events go live on the calendar immediately."
                : "Your first 3 events are verified by our team before going live — usually within one business day."}
            </p>

            {formSuccessMessage && (
              <div style={{ backgroundColor: "rgba(86, 139, 5, 0.1)", border: "1px solid #568b05", color: "#3b5e04", padding: "14px 18px", borderRadius: "6px", marginBottom: "24px" }}>
                {formSuccessMessage}
              </div>
            )}

            {formError && (
              <div style={{ backgroundColor: "rgba(153, 56, 66, 0.08)", border: "1px solid #993842", color: "#993842", padding: "14px 18px", borderRadius: "6px", marginBottom: "24px" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateEvent} style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", padding: "28px 30px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                  Event title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Morning stroller walk & coffee"
                  style={{ width: "100%", padding: "11px 14px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.22)", fontSize: "15px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                  Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell mothers what to expect, what to bring, and the rhythm of the session."
                  style={{ width: "100%", padding: "11px 14px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.22)", fontSize: "14.5px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.22)", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                    Start time *
                  </label>
                  <input
                    type="time"
                    required
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.22)", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={durationHours}
                    onChange={(e) => setDurationHours(parseInt(e.target.value, 10) || 2)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.22)", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                    Venue name *
                  </label>
                  <input
                    type="text"
                    required
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="e.g. Café del Sol or Parc de la Ciutadella"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.22)", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                    Meeting point / address *
                  </label>
                  <input
                    type="text"
                    required
                    value={meetingPoint}
                    onChange={(e) => setMeetingPoint(e.target.value)}
                    placeholder="Exact address or where to stand"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.22)", fontSize: "14px", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* Stages multi-select */}
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                  Stages
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {STAGE_OPTIONS.map((stg) => {
                    const isSelected = selectedStages.includes(stg.id);
                    return (
                      <button
                        key={stg.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedStages(selectedStages.filter((s) => s !== stg.id));
                          } else {
                            setSelectedStages([...selectedStages, stg.id]);
                          }
                        }}
                        style={{
                          border: isSelected ? "1px solid #568b05" : "1px solid rgba(57, 41, 42, 0.25)",
                          backgroundColor: isSelected ? "rgba(86, 139, 5, 0.1)" : "transparent",
                          color: isSelected ? "#3b5e04" : "#39292a",
                          padding: "6px 14px",
                          borderRadius: "16px",
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                      >
                        {stg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Who can book (Workshops cannot be community only) */}
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                  Who can book
                </label>
                <div style={{ display: "flex", gap: "20px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === "public"}
                      onChange={() => setVisibility("public")}
                    />
                    Everyone (listed on public calendar)
                  </label>

                  {currentCommunity?.type !== "workshop" && (
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="visibility"
                        checked={visibility === "community"}
                        onChange={() => setVisibility("community")}
                      />
                      Community only (via your invite link)
                    </label>
                  )}
                </div>
              </div>

              {/* Price and Live Commission Calculator */}
              <div style={{ border: "1px solid rgba(57, 41, 42, 0.15)", backgroundColor: "#fffdfa", borderRadius: "6px", padding: "18px 20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                      Price per mother (€)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={priceEur}
                      onChange={(e) => setPriceEur(e.target.value)}
                      placeholder="0 for free"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.25)", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                      Capacity (places)
                    </label>
                    <input
                      type="number"
                      min={2}
                      max={50}
                      value={capacity}
                      onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 12)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.25)", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                      Minimum to confirm
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={capacity}
                      value={minToConfirm}
                      onChange={(e) => setMinToConfirm(parseInt(e.target.value, 10) || 2)}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.25)", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* Live payout breakdown */}
                {parsedPrice > 0 ? (
                  <div style={{ backgroundColor: "#ffffff", padding: "12px 14px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.12)", fontSize: "13.5px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span>Mothers pay:</span>
                      <strong>€{parsedPrice.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(57, 41, 42, 0.7)", marginBottom: "4px" }}>
                      <span>The Mothers commission ({commissionRate}%, min €1):</span>
                      <span>− €{commissionEur.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: "#3b5e04", paddingTop: "6px", borderTop: "1px solid rgba(57, 41, 42, 0.1)" }}>
                      <span>You receive per mother:</span>
                      <span>€{netPerMother.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.6)", marginTop: "6px" }}>
                      If all {capacity} places are booked: <strong>€{totalIfFull.toFixed(2)}</strong> deposited directly to your Stripe account.
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.7)" }}>
                    Free event for mothers · Included in your 2 free events per month allowance.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px" }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    backgroundColor: "#7b1f2c",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "11px 26px",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontWeight: 600,
                    fontSize: "16px",
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? "Publishing..." : isTrusted ? "Publish event" : "Send for review"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: EARNINGS */}
        {/* ============================================================== */}
        {activeTab === "earnings" && (
          <div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 400, margin: "0 0 6px" }}>
              Earnings
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(57, 41, 42, 0.72)", margin: "0 0 28px" }}>
              Card payments from mothers are paid to your Stripe account at booking, net of commission.
            </p>

            {/* Earnings KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "16px", marginBottom: "32px" }}>
              <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", padding: "20px 22px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "34px", fontWeight: 500, color: "#3b5e04", lineHeight: 1 }}>
                  €{receivedThisMonth.toFixed(2)}
                </div>
                <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.65)", marginTop: "6px" }}>
                  Received this month
                </div>
              </div>

              <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", padding: "20px 22px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "34px", fontWeight: 500, color: "#39292a", lineHeight: 1 }}>
                  €{currentEvents.reduce((acc: number, e: any) => {
                    const price = (e.priceCents || 0) / 100;
                    const comm = Math.max(1, (price * commissionRate) / 100);
                    return acc + (price - comm) * (e.bookedCount || 0);
                  }, 0).toFixed(2)}
                </div>
                <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.65)", marginTop: "6px" }}>
                  Received to date
                </div>
              </div>

              <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", padding: "20px 22px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "34px", fontWeight: 500, color: "rgba(57, 41, 42, 0.8)", lineHeight: 1 }}>
                  €{currentEvents.reduce((acc: number, e: any) => {
                    const price = (e.priceCents || 0) / 100;
                    const comm = Math.max(1, (price * commissionRate) / 100);
                    return acc + comm * (e.bookedCount || 0);
                  }, 0).toFixed(2)}
                </div>
                <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.65)", marginTop: "6px" }}>
                  Commission to date
                </div>
              </div>
            </div>

            {/* Payout Breakdown Table */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(57, 41, 42, 0.12)", fontWeight: 600, fontSize: "16px" }}>
                Event statements
              </div>

              {currentEvents.filter((e: any) => e.status !== "cancelled").length === 0 ? (
                <div style={{ padding: "30px 20px", textAlign: "center", color: "rgba(57, 41, 42, 0.6)", fontSize: "14px" }}>
                  No event payouts yet.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#fffdfa", borderBottom: "1px solid rgba(57, 41, 42, 0.1)" }}>
                        <th style={{ textAlign: "left", padding: "12px 18px", color: "rgba(57, 41, 42, 0.7)" }}>Event</th>
                        <th style={{ textAlign: "center", padding: "12px 18px", color: "rgba(57, 41, 42, 0.7)" }}>Mothers</th>
                        <th style={{ textAlign: "right", padding: "12px 18px", color: "rgba(57, 41, 42, 0.7)" }}>Gross</th>
                        <th style={{ textAlign: "right", padding: "12px 18px", color: "rgba(57, 41, 42, 0.7)" }}>Commission</th>
                        <th style={{ textAlign: "right", padding: "12px 18px", color: "rgba(57, 41, 42, 0.7)" }}>Net received</th>
                        <th style={{ textAlign: "center", padding: "12px 18px", color: "rgba(57, 41, 42, 0.7)" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentEvents
                        .filter((e: any) => e.status !== "cancelled")
                        .map((ev: any) => {
                          const price = (ev.priceCents || 0) / 100;
                          const comm = Math.max(1, (price * commissionRate) / 100);
                          const count = ev.bookedCount || 0;
                          const gross = price * count;
                          const fee = comm * count;
                          const net = Math.max(0, gross - fee);

                          return (
                            <tr key={ev.id} style={{ borderBottom: "1px solid rgba(57, 41, 42, 0.08)" }}>
                              <td style={{ padding: "14px 18px" }}>
                                <div style={{ fontWeight: 600 }}>{ev.title}</div>
                                <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.6)" }}>
                                  {new Date(ev.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                </div>
                              </td>
                              <td style={{ textAlign: "center", padding: "14px 18px" }}>{count}</td>
                              <td style={{ textAlign: "right", padding: "14px 18px" }}>{price > 0 ? `€${gross.toFixed(2)}` : "Free"}</td>
                              <td style={{ textAlign: "right", padding: "14px 18px", color: "rgba(57, 41, 42, 0.7)" }}>
                                {price > 0 ? `− €${fee.toFixed(2)}` : "Included"}
                              </td>
                              <td style={{ textAlign: "right", padding: "14px 18px", fontWeight: 600, color: price > 0 ? "#3b5e04" : "#39292a" }}>
                                {price > 0 ? `€${net.toFixed(2)}` : "€0.00"}
                              </td>
                              <td style={{ textAlign: "center", padding: "14px 18px" }}>
                                <span style={{ fontSize: "12px", color: "#3b5e04", backgroundColor: "rgba(86, 139, 5, 0.1)", padding: "3px 8px", borderRadius: "10px", fontWeight: 600 }}>
                                  {price > 0 ? "In your Stripe" : "Included"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: DETAILS PROFILE */}
        {/* ============================================================== */}
        {activeTab === "profile" && (
          <div style={{ maxWidth: "680px" }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 400, margin: "0 0 6px" }}>
              Your details
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(57, 41, 42, 0.72)", margin: "0 0 28px" }}>
              Community information and Stripe Connect payment setup.
            </p>

            {profileSaved && (
              <div style={{ backgroundColor: "rgba(86, 139, 5, 0.1)", border: "1px solid #568b05", color: "#3b5e04", padding: "12px 16px", borderRadius: "6px", marginBottom: "22px", fontSize: "14px" }}>
                Details saved successfully.
              </div>
            )}

            {/* Stripe Card */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", padding: "22px 24px", marginBottom: "26px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "16px", marginBottom: "4px" }}>
                    Stripe Connect Account
                  </div>
                  <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.7)" }}>
                    {currentCommunity?.stripeAccountId
                      ? "Your Stripe account is connected. Payouts arrive directly upon booking."
                      : "Connect with Stripe to receive card payments directly from booked mothers."}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (isDemoMode) {
                      alert("Stripe Connected in demo mode.");
                    } else {
                      await connectStripeAccountAction();
                      alert("Stripe connected successfully.");
                    }
                  }}
                  style={{
                    backgroundColor: currentCommunity?.stripeAccountId ? "rgba(86, 139, 5, 0.1)" : "#568b05",
                    color: currentCommunity?.stripeAccountId ? "#3b5e04" : "#ffffff",
                    border: "1px solid #568b05",
                    borderRadius: "4px",
                    padding: "9px 18px",
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  {currentCommunity?.stripeAccountId ? "✓ Stripe Connected" : "Connect with Stripe"}
                </button>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSaveProfile} style={{ backgroundColor: "#ffffff", border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", padding: "26px 28px", display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                  Community name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.22)", fontSize: "14.5px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                  Contact email
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.22)", fontSize: "14.5px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                  Contact phone
                </label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.22)", fontSize: "14.5px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                  Legal / autónoma name (if registered)
                </label>
                <input
                  type="text"
                  value={profileLegal}
                  onChange={(e) => setProfileLegal(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.22)", fontSize: "14.5px", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "6px" }}>
                  Tax ID (NIF / CIF)
                </label>
                <input
                  type="text"
                  value={profileTaxId}
                  onChange={(e) => setProfileTaxId(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "4px", border: "1px solid rgba(57, 41, 42, 0.22)", fontSize: "14.5px", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="submit"
                  style={{
                    backgroundColor: "#7b1f2c",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "10px 24px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "15.5px",
                    cursor: "pointer",
                  }}
                >
                  Save details
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
