"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Locale } from "@/lib/i18n";
import { getAccountData, pauseMembership, resumeMembership, updatePersonDetails, cancelMembership, reactivateMembership, getStripePortalUrl, deleteMyAccountGDPR, leaveWaitlist } from "@/app/actions/memberAccount";
import { buyExtraCredits, releaseBooking } from "@/app/actions/booking";
import { getUpcomingEventsNeedingHost, checkHostEligibility, applyToHostEvent, withdrawHostRequest } from "@/app/actions/host";
import { formatEventDate } from "@/app/events/EventsCalendar";
import ThemeLoader from "@/components/ThemeLoader";
import { ForwardArrow } from "@/components/Icons";
import CountryPhoneInput from "@/components/CountryPhoneInput";

type AccountTab = "overview" | "credits" | "hosting" | "perks" | "membership";

interface PerkItem {
  id: string;
  categoryEn: string;
  categoryEs: string;
  name: string;
  whereEn: string;
  whereEs: string;
  offerEn: string;
  offerEs: string;
  detailEn: string;
  detailEs: string;
  kind: "code" | "personal" | "door" | "link";
  code?: string;
  href?: string;
  doorNoteEn?: string;
  doorNoteEs?: string;
  validityEn: string;
  validityEs: string;
  endingSoon?: boolean;
}

const GENERAL_WHATSAPP_LINK = "https://chat.whatsapp.com/FjzdbYTUcbmGvVEVSXY23J?s=cl&p=i&mlu=4&ilr=4";

const STAGES_KEYS = [
  { key: "expecting", labelEn: "Pregnant", labelEs: "Embarazo", whatsapp: "https://chat.whatsapp.com/DE10fxxsteA6ItbTPt6HnC" },
  { key: "babies", labelEn: "Babies", labelEs: "Bebés", whatsapp: "https://chat.whatsapp.com/CSgdyyfXDCjDwwDh17j0yB" },
  { key: "toddlers", labelEn: "Toddlers", labelEs: "Peques", whatsapp: "https://chat.whatsapp.com/KYaepZmYshSGemCDnoXO4C" },
  { key: "children36", labelEn: "Children", labelEs: "Niños", whatsapp: "https://chat.whatsapp.com/EPaXEsg41sG0dZjyBJU2xr" },
  { key: "children610", labelEn: "Big kids", labelEs: "Niños grandes", whatsapp: GENERAL_WHATSAPP_LINK },
];

const normalizeStageKey = (raw: string): string => {
  if (!raw) return "";
  const s = raw.toLowerCase().trim();
  if (s.includes("preg") || s.includes("expect") || s.includes("embaraz")) return "expecting";
  if (s.includes("baby") || s.includes("babies") || s.includes("postpartum") || s.includes("posparto") || s.includes("0–12") || s.includes("0-12")) return "babies";
  if (s.includes("toddler") || s.includes("peque") || s.includes("1–3") || s.includes("1-3")) return "toddlers";
  if (s.includes("3–6") || s.includes("3-6") || s.includes("children36") || (s.includes("child") && !s.includes("610") && !s.includes("big"))) return "children36";
  if (s.includes("6–10") || s.includes("6-10") || s.includes("children610") || s.includes("big")) return "children610";
  return raw;
};

const TARGET_DATE = new Date("2027-01-06T00:00:00+01:00").getTime();

function calculateTimeLeft() {
  const now = new Date().getTime();
  const diff = Math.max(0, TARGET_DATE - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds };
}

function AccountPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<Locale>("en");
  const [activeTab, setActiveTab] = useState<AccountTab>("overview");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(10);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountData, setAccountData] = useState<any>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Extra credits purchase confirmation banner state (Image 2)
  const [purchaseConfirmed, setPurchaseConfirmed] = useState(false);
  const [purchasedAmount, setPurchasedAmount] = useState(1);

  // Stripe Portal Loading State
  const [portalLoading, setPortalLoading] = useState(false);

  // Membership pause state
  const [pauseLoading, setPauseLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [pauseResult, setPauseResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);

  // Ref for scrolling to top-up section
  const topUpRef = useRef<HTMLDivElement>(null);

  // Membership cancel & reactivate state
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ success: boolean; error?: string; currentPeriodEnd?: string | null } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);

  // Details form state
  const [detailsForm, setDetailsForm] = useState({ firstName: "", lastName: "", phone: "", stage: "", neighbourhood: "", customNeighbourhood: "" });
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsResult, setDetailsResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Extra credits top-up state
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  // Perks revealed codes state
  const [revealedPerks, setRevealedPerks] = useState<Record<string, boolean>>({});

  // Cancel reservation state
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [leavingWaitlistId, setLeavingWaitlistId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Membership waitlist state
  const [listJoined, setListJoined] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("tm_pre_joined_list") === "true") {
      setListJoined(true);
    }
  }, []);

  const handleNotifyMe = async () => {
    if (listJoined || listLoading) return;
    setListLoading(true);
    try {
      const userEmail = accountData?.member?.email || session?.user?.email;
      const userName = accountData?.member?.fullName || session?.user?.name || "";
      if (userEmail) {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, name: userName, source: "account_membership_waitlist" }),
        });
      }
      setListJoined(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("tm_pre_joined_list", "true");
      }
    } catch (err) {
      console.error(err);
      setListJoined(true);
    } finally {
      setListLoading(false);
    }
  };

  // Hosting tab state
  const [hostLoading, setHostLoading] = useState(false);
  const [hostEvents, setHostEvents] = useState<any[]>([]);
  const [hostEligibility, setHostEligibility] = useState<any>(null);
  const [userHostBookings, setUserHostBookings] = useState<string[]>([]);
  const [userHostRequests, setUserHostRequests] = useState<any[]>([]);
  const [hostActionLoadingId, setHostActionLoadingId] = useState<string | null>(null);
  const [hostMessage, setHostMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadHostData = async () => {
    try {
      setHostLoading(true);
      const [eligRes, eventsRes] = await Promise.all([
        checkHostEligibility(),
        getUpcomingEventsNeedingHost(),
      ]);
      setHostEligibility(eligRes);
      if (eventsRes.success) {
        setHostEvents(eventsRes.events || []);
        setUserHostBookings(eventsRes.userBookings || []);
        setUserHostRequests(eventsRes.userHostRequests || []);
      }
    } catch (err: any) {
      console.error("loadHostData error:", err);
    } finally {
      setHostLoading(false);
    }
  };

  const handleApplyToHost = async (eventId: string) => {
    setHostActionLoadingId(eventId);
    setHostMessage(null);
    try {
      const res = await applyToHostEvent(eventId);
      if (res.success) {
        setHostMessage({
          type: "success",
          text: lang === "en"
            ? "Your request has been submitted! The team will review and confirm by email."
            : "¡Tu solicitud ha sido enviada! El equipo la revisará y te confirmará por correo.",
        });
        await loadHostData();
      } else {
        setHostMessage({
          type: "error",
          text: res.error || (lang === "en" ? "Failed to submit host request" : "Error al enviar la solicitud"),
        });
      }
    } catch (err: any) {
      setHostMessage({
        type: "error",
        text: err?.message || (lang === "en" ? "Something went wrong" : "Ha ocurrido un error"),
      });
    } finally {
      setHostActionLoadingId(null);
    }
  };

  const handleWithdrawHost = async (requestId: string, eventId: string) => {
    if (!confirm(lang === "en" ? "Withdraw your host request?" : "¿Retirar tu solicitud de anfitriona?")) return;
    setHostActionLoadingId(eventId);
    setHostMessage(null);
    try {
      const res = await withdrawHostRequest(requestId);
      if (res.success) {
        setHostMessage({
          type: "success",
          text: lang === "en" ? "Host request withdrawn." : "Solicitud de anfitriona retirada.",
        });
        await loadHostData();
      } else {
        setHostMessage({
          type: "error",
          text: res.error || (lang === "en" ? "Failed to withdraw request" : "Error al retirar la solicitud"),
        });
      }
    } catch (err: any) {
      setHostMessage({
        type: "error",
        text: err?.message || (lang === "en" ? "Something went wrong" : "Ha ocurrido un error"),
      });
    } finally {
      setHostActionLoadingId(null);
    }
  };

  const handleLeaveWaitlist = async (waitlistId: string) => {
    if (!confirm(lang === "en" ? "Are you sure you want to leave this waitlist?" : "¿Segura que deseas salir de la lista de espera?")) return;
    setLeavingWaitlistId(waitlistId);
    try {
      const res = await leaveWaitlist(waitlistId);
      if (res.success) {
        const refreshed = await getAccountData();
        if (refreshed.success) setAccountData(refreshed);
      }
    } catch (e: any) {
      alert(e?.message || "Failed to leave waitlist");
    } finally {
      setLeavingWaitlistId(null);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await deleteMyAccountGDPR();
      if (res.success) {
        await signOut({ redirect: false });
        window.location.href = "/";
      }
    } catch (e: any) {
      setDeleteError(e?.message || "Account deletion failed");
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved as Locale);
  }, []);

  useEffect(() => {
    if (searchParams) {
      if (searchParams.get("credits_purchased") === "true") {
        setActiveTab("credits");
        setPurchaseConfirmed(true);
        const amt = parseInt(searchParams.get("amount") || "1", 10);
        if (!isNaN(amt) && amt > 0) {
          setPurchasedAmount(amt);
        }
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/account/login");
    } else if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role === "owner" || role === "manager" || role === "super_admin" || role === "host") {
        router.push("/admin");
        return;
      }
      const loadData = async () => {
        try {
          setAccountLoading(true);
          const [res, eligRes, eventsRes] = await Promise.all([
            getAccountData(),
            checkHostEligibility(),
            getUpcomingEventsNeedingHost(),
          ]);
          if (res.success) {
            setAccountData(res);
            setAccountError(null);
            // Pre-populate details form
            const existingNeighbourhood = res.member?.neighbourhood || "";
            const isPredefined = ["Ciutat Vella", "Eixample", "Sants-Montjuïc", "Les Corts", "Sarrià-Sant Gervasi", "Gràcia", "Horta-Guinardó", "Nou Barris", "Sant Andreu", "Sant Martí", "Outside Barcelona", "Other", ""].includes(existingNeighbourhood);
            
            setDetailsForm({
              firstName: res.member?.firstName || "",
              lastName: res.member?.lastName || "",
              phone: res.member?.phone || "",
              stage: res.member?.stage || "",
              neighbourhood: isPredefined ? existingNeighbourhood : "Other",
              customNeighbourhood: isPredefined ? "" : existingNeighbourhood,
            });
            // Parse stages
            const currentStages = typeof res.member?.stage === "string"
              ? res.member.stage.split(",").map((s: string) => normalizeStageKey(s.trim())).filter(Boolean)
              : [];
            setSelectedStages(currentStages);
          } else {
            setAccountError(res.error || "Failed to load account data");
          }
          setHostEligibility(eligRes);
          if (eventsRes.success) {
            setHostEvents(eventsRes.events || []);
            setUserHostBookings(eventsRes.userBookings || []);
            setUserHostRequests(eventsRes.userHostRequests || []);
          }
        } catch (err: any) {
          setAccountError(err.message || "Error loading account");
        } finally {
          setAccountLoading(false);
        }
      };
      loadData();
    }
  }, [status, router]);

  if (status === "loading" || accountLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fdf8f2" }}>
        <ThemeLoader text={lang === "en" ? "Loading your account..." : "Cargando tu cuenta..."} size="large" />
      </div>
    );
  }

  if (!session?.user || !accountData || accountError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px", backgroundColor: "#fdf8f2", fontFamily: "'Lora', Georgia, serif" }}>
        <p style={{ fontSize: "18px", color: "#7b1f2c", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>Unable to load your account</p>
        {accountError && <p style={{ fontSize: "14px", color: "var(--color-accent)" }}>{accountError}</p>}
      </div>
    );
  }

  const user = session.user as any;
  const memberData = accountData?.member;
  const referralCode = accountData?.member?.godmotherCode || "";
  const availableCredits = accountData?.credits?.available ?? 0;

  const copyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(type);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleUpdateCardClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (portalLoading) return;
    setPortalLoading(true);
    try {
      const res = await getStripePortalUrl();
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        alert(res.error || "Failed to redirect to billing portal.");
      }
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleTopUpSubmit = async () => {
    if (topUpLoading) return;
    setTopUpLoading(true);
    setTopUpError(null);
    try {
      const res = await buyExtraCredits(topUpAmount);
      if (res.success && res.url) {
        window.location.href = res.url;
      } else {
        setTopUpError(res.error || "Failed to create checkout session.");
      }
    } catch (err) {
      setTopUpError("An error occurred during payment initiation.");
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const promptMsg = lang === "en"
      ? "Are you sure you want to cancel this reservation? If you cancel more than 24 hours ahead, your credits return immediately."
      : "¿Estás segura de que quieres cancelar esta reserva? Si cancelas con más de 24 horas de antelación, tus créditos vuelven de inmediato.";
    
    if (!window.confirm(promptMsg)) return;

    setCancellingBookingId(bookingId);
    try {
      const res = await releaseBooking(bookingId);
      if (res.success) {
        const updated = await getAccountData();
        if (updated.success) {
          setAccountData(updated);
        }
        router.refresh();
      } else {
        alert(res.error || (lang === "en" ? "Failed to cancel reservation." : "No se pudo cancelar la reserva."));
      }
    } catch (err: any) {
      alert(err?.message || "An error occurred.");
    } finally {
      setCancellingBookingId(null);
    }
  };

  const TABS: { id: AccountTab; labelEn: string; labelEs: string }[] = [
    { id: "overview", labelEn: "Overview", labelEs: "Resumen" },
    { id: "credits", labelEn: "Credits", labelEs: "Créditos" },
    { id: "hosting", labelEn: "Hosting", labelEs: "Anfitriona" },
    { id: "perks", labelEn: "Perks", labelEs: "Ventajas" },
    { id: "membership", labelEn: "Membership", labelEs: "Membresía" },
  ];

  // Map stage keys to clean, range-free titles
  const getStageTitle = (key: string, isEn: boolean) => {
    const found = STAGES_KEYS.find((s) => s.key === key);
    if (!found) return key;
    return isEn ? found.labelEn : found.labelEs;
  };

  return (
    <div style={{ backgroundColor: "#fdf8f2", color: "#39292a", minHeight: "100vh", fontFamily: "'Lora', Georgia, serif", padding: "clamp(40px, 5vw, 64px) clamp(24px, 5vw, 64px) 88px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        
        {/* Header Greeting */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "4px" }}>
              {lang === "en" ? "Member Account" : "Cuenta de Socia"}
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(34px, 5vw, 54px)", margin: "0 0 4px 0", lineHeight: 1.1 }}>
              {detailsForm.firstName
                ? (lang === "en" ? `Welcome, ${detailsForm.firstName}.` : `Bienvenida, ${detailsForm.firstName}.`)
                : (lang === "en" ? "Welcome." : "Bienvenida.")}
            </h1>
            <p style={{ fontSize: "16px", color: "rgba(57, 41, 42, 0.72)", margin: 0 }}>
              {lang === "en"
                ? "Your credits, your bookings and your membership, all in one place."
                : "Tus créditos, tus reservas y tu membresía, todo en un mismo lugar."}
            </p>
          </div>
        </div>

        {/* Balance & Code Strip */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            border: "1px solid rgba(57, 41, 42, 0.18)",
            borderRadius: "6px",
            backgroundColor: "#f8efe2",
            overflow: "hidden",
            marginBottom: "36px",
            boxSizing: "border-box",
            width: "100%",
          }}
        >
          <div style={{ flex: "1 1 260px", minWidth: "220px", padding: "20px 24px", boxSizing: "border-box", borderRight: "1px solid rgba(57, 41, 42, 0.14)" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.7)", marginBottom: "7px" }}>
              {lang === "fr" ? "Crédits disponibles" : lang === "es" ? "Créditos Disponibles" : "Credits Available"}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "7px" }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "36px", color: "#39292a" }}>{availableCredits}</span>
              <span style={{ fontSize: "14.5px", color: "rgba(57, 41, 42, 0.75)" }}>{lang === "fr" ? (availableCredits === 1 ? "crédit restant" : "crédits restants") : lang === "es" ? "créditos restantes" : "credits remaining"}</span>
            </div>
          </div>

          <div style={{ flex: "1 1 300px", minWidth: "220px", padding: "20px 24px", boxSizing: "border-box" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.7)", marginBottom: "7px" }}>
              {lang === "fr" ? "Votre code marraine" : lang === "es" ? "Tu Código de Madrina" : "Your Godmother Code"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "20px", letterSpacing: "0.03em", color: "#456f04", wordBreak: "break-all" }}>
                {referralCode}
              </span>
              <button
                type="button"
                onClick={() => copyText(referralCode, "referral")}
                style={{
                  border: "1px solid rgba(86, 139, 5, 0.6)",
                  color: "#456f04",
                  padding: "5px 13px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "13px",
                  background: "transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {copiedCode === "referral" ? (lang === "fr" ? "Copié !" : lang === "es" ? "¡Copiado!" : "Copied!") : (lang === "fr" ? "Copier" : lang === "es" ? "Copiar" : "Copy")}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "28px", borderBottom: "1px solid rgba(57, 41, 42, 0.2)", marginBottom: "28px", overflowX: "auto", scrollbarWidth: "none" }}>
          {TABS.map((t) => {
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  border: "none",
                  background: "none",
                  padding: "0 0 11px 0",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "17px",
                  letterSpacing: "0.02em",
                  color: isSelected ? "#7b1f2c" : "rgba(57, 41, 42, 0.75)",
                  borderBottom: isSelected ? "2px solid #7b1f2c" : "2px solid transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {lang === "en" ? t.labelEn : t.labelEs}
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: OVERVIEW ─── */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Upcoming Reservations */}
            <div style={{ border: "1px solid rgba(57, 41, 42, 0.14)", borderRadius: "8px", padding: "clamp(22px, 3vw, 30px)", backgroundColor: "#fffdfa" }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", margin: "0 0 20px" }}>
                {lang === "en" ? "Upcoming reservations" : "Próximas reservas"}
              </h3>

              {accountData?.bookings?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  {accountData.bookings.map((b: any) => {
                    const isPending = b.eventStatus === "published_pending" || b.eventStatus === "pending" || b.status === "held";
                    const categoryLabel = b.categoryName || (b.isSignature ? "Signature moments" : "Easy connection");
                    const safeDate = b.eventDate ? new Date(b.eventDate) : null;
                    const isValidDate = safeDate && !isNaN(safeDate.getTime());
                    const dateFormatted = isValidDate ? safeDate.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { month: "short", day: "numeric", year: "numeric" }) : "";
                    const timeFormatted = isValidDate ? safeDate.toLocaleTimeString(lang === "en" ? "en-GB" : "es-ES", { hour: "2-digit", minute: "2-digit" }) : "";
                    const locationText = b.meetingPoint || (b.venueName ? `${b.venueName} — ${b.eventLocation}` : b.eventLocation);

                    return (
                      <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", borderBottom: "1px solid rgba(57,41,42,0.08)", paddingBottom: "18px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                            <span style={{ fontSize: "11px", letterSpacing: "0.04em", color: "rgba(57, 41, 42, 0.7)", border: "1px solid rgba(57, 41, 42, 0.28)", borderRadius: "12px", padding: "2px 9px", display: "inline-block", backgroundColor: "transparent" }}>
                              {categoryLabel}
                            </span>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#7b1f2c", border: "1px solid rgba(123, 31, 44, 0.28)", borderRadius: "12px", padding: "2px 9px", display: "inline-block", backgroundColor: "#fdf6f2" }}>
                              {b.creditsCharged > 0 ? `${b.creditsCharged} ${lang === "en" ? "credits" : "créditos"}` : (lang === "en" ? "0 credits" : "0 créditos")}
                            </span>
                          </div>
                          
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", marginTop: "4px", color: "#39292a" }}>
                            {b.eventTitle}
                          </div>

                          {isPending && (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#8a6116", fontWeight: 600, marginTop: "6px", flexWrap: "wrap" }}>
                              <span style={{ textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: "#fffaf2", border: "1px solid rgba(164,118,31,0.35)", padding: "3px 8px", borderRadius: "4px" }}>
                                {lang === "en" ? "AWAITING CONFIRMATION" : "PENDIENTE DE CONFIRMACIÓN"}
                              </span>
                              <span style={{ fontWeight: 400, color: "rgba(57,41,42,0.7)" }}>
                                {b.minToConfirm && b.confirmedCount != null
                                  ? (lang === "en" ? `${Math.max(1, b.minToConfirm - b.confirmedCount)} more mothers and it is confirmed` : `${Math.max(1, b.minToConfirm - b.confirmedCount)} madres más para confirmar`)
                                  : (lang === "en" ? "Gathering members to confirm" : "Reuniendo socias para confirmar")}
                              </span>
                            </div>
                          )}

                          <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.75)", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(57,41,42,0.6)", flexShrink: 0 }}>
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span>{dateFormatted} {timeFormatted && `· ${timeFormatted}`}</span>
                          </div>

                          <div style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.65)", marginTop: "3px", display: "flex", alignItems: "center", gap: "6px" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#568b05" }}>
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span>{locationText}</span>
                          </div>
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(b.id)}
                            disabled={cancellingBookingId === b.id}
                            style={{
                              border: "1px solid rgba(57, 41, 42, 0.28)",
                              backgroundColor: "#fffdfa",
                              color: "rgba(57, 41, 42, 0.75)",
                              padding: "5px 14px",
                              borderRadius: "16px",
                              fontSize: "12px",
                              fontFamily: "'Lora', Georgia, serif",
                              cursor: cancellingBookingId === b.id ? "not-allowed" : "pointer",
                              whiteSpace: "nowrap",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {cancellingBookingId === b.id ? (lang === "en" ? "Cancelling..." : "Cancelando...") : (lang === "en" ? "Cancel" : "Cancelar")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: "32px 20px", backgroundColor: "#faf7f2", borderRadius: "6px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                  <div style={{ color: "rgba(57,41,42,0.6)", fontSize: "14px", fontStyle: "italic" }}>
                    {lang === "en"
                      ? "No upcoming bookings. Browse the calendar and reserve your next spot."
                      : "Sin próximas reservas. Explora el calendario y reserva tu siguiente plaza."}
                  </div>
                  <Link
                    href="/events"
                    style={{
                      backgroundColor: "#7b1f2c",
                      color: "#f8efe2",
                      padding: "12px 24px",
                      borderRadius: "4px",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "14.5px",
                      textDecoration: "none",
                    }}
                  >
                    {lang === "en" ? "Explore events calendar" : "Explorar calendario de eventos"}
                  </Link>
                </div>
              )}

              <p style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.55)", lineHeight: 1.55, marginTop: "24px", marginBottom: 0 }}>
                {lang === "en"
                  ? "Meeting points are shared with booked members only — please keep them inside the club. Cancel more than 24 hours ahead and your credits come straight back. Inside 24 hours, they remain only if someone on the waitlist takes your place — and we've all been in those last-minute fix moments. Reserved credits are held for events until filling. They return to your balance if the occasion can't go ahead."
                  : "Los puntos de encuentro se comparten solo con las socias reservadas; por favor, mantenlos dentro del club. Si cancelas con más de 24 horas de antelación, tus créditos vuelven de inmediato. Dentro de las 24 horas, solo se devuelven si alguien de la lista de espera ocupa tu plaza. Los créditos reservados se retienen hasta completarse el evento y regresan a tu saldo si la ocasión no puede llevarse a cabo."}
              </p>
            </div>

            {/* Pre-Launch Early Access Waiver Banner */}
            {accountData?.member?.createdBeforeLaunch && (
              <div style={{ backgroundColor: "#fbf6ef", border: "1px solid #7b1f2c", borderRadius: "8px", padding: "18px 22px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
                <span style={{ fontSize: "20px", color: "#7b1f2c" }}>★</span>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: "16px", color: "#7b1f2c" }}>
                    {lang === "en" ? "Early Mother Benefit" : "Beneficio de Madrina Pionera"}
                  </div>
                  <div style={{ fontSize: "14px", color: "#39292a", marginTop: "4px", lineHeight: "1.5" }}>
                    {lang === "en"
                      ? "You opened your account before launch, so you won't pay a joining fee. You pay only pay-as-you-go credits for gatherings."
                      : "Abriste tu cuenta antes del lanzamiento, por lo que no pagarás cuota de alta. Solo pagas los créditos por encuentro que utilices."}
                  </div>
                </div>
              </div>
            )}

            {/* Active Waitlists Section */}
            {accountData?.waitlists?.length > 0 && (
              <div style={{ border: "1px solid rgba(57, 41, 42, 0.14)", borderRadius: "8px", padding: "clamp(22px, 3vw, 30px)", backgroundColor: "#fffdfa" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", margin: 0 }}>
                    {lang === "en" ? "Active Waitlists" : "Listas de Espera Activas"}
                  </h3>
                  <span style={{ fontSize: "12px", color: "#7b1f2c", fontWeight: 600, border: "1px solid rgba(123,31,44,0.3)", borderRadius: "12px", padding: "2px 8px" }}>
                    {accountData.waitlists.length} {lang === "en" ? "queued" : "en espera"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {accountData.waitlists.map((w: any) => {
                    const dateStr = w.startsAt ? new Date(w.startsAt).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { month: "short", day: "numeric", weekday: "short" }) : "";
                    const isOffered = !!w.offeredAt;
                    return (
                      <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(57,41,42,0.08)", paddingBottom: "12px", gap: "12px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, backgroundColor: isOffered ? "#e6f4ea" : "#f3efe6", color: isOffered ? "#137333" : "#7b1f2c", padding: "2px 8px", borderRadius: "4px" }}>
                              {isOffered ? (lang === "en" ? "SPOT AVAILABLE NOW" : "PLAZA DISPONIBLE AHORA") : (lang === "en" ? "Position #" + w.position : "Posición #" + w.position)}
                            </span>
                            <span style={{ fontSize: "13px", color: "rgba(57,41,42,0.7)" }}>{dateStr}</span>
                          </div>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px", color: "#39292a" }}>
                            {w.eventTitle}
                          </div>
                          {w.venueName && <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.6)" }}>{w.venueName} · {w.neighbourhood}</div>}
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {isOffered && (
                            <Link
                              href={"/events/" + w.eventId}
                              style={{ backgroundColor: "#7b1f2c", color: "#faf7f1", fontSize: "12.5px", fontWeight: 600, padding: "6px 14px", borderRadius: "4px", textDecoration: "none" }}
                            >
                              {lang === "en" ? "Claim spot" : "Confirmar"}
                            </Link>
                          )}
                          <button
                            type="button"
                            disabled={leavingWaitlistId === w.id}
                            onClick={() => handleLeaveWaitlist(w.id)}
                            style={{ border: "1px solid rgba(57,41,42,0.25)", backgroundColor: "transparent", color: "rgba(57,41,42,0.7)", fontSize: "12px", padding: "5px 12px", borderRadius: "4px", cursor: "pointer" }}
                          >
                            {leavingWaitlistId === w.id ? (lang === "en" ? "Leaving..." : "Saliendo...") : (lang === "en" ? "Leave list" : "Salir")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WhatsApp Circles: Always show General Circle for all members */}
            <div style={{ border: "1px solid rgba(86,139,5,0.4)", borderRadius: "8px", padding: "clamp(22px, 3vw, 28px)", backgroundColor: "#f4f7ee" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#568b05", marginBottom: "9px" }}>
                {lang === "en" ? "Community WhatsApp Group" : "Grupo de la Comunidad en WhatsApp"}
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", lineHeight: "1.2", margin: "0 0 10px" }}>
                General — La Gazette WhatsApp Group
              </h2>
              <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.75)", margin: "0 0 18px" }}>
                {lang === "en"
                  ? "The main community WhatsApp group for all members across Barcelona. Announcements, conversations, and club updates are shared here."
                  : "El grupo principal de WhatsApp para todas las socias en Barcelona. Anuncios, conversaciones y novedades del club se comparten aquí."}
              </p>
              <a
                href={GENERAL_WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  border: "1px solid #568b05",
                  color: "#456f04",
                  backgroundColor: "#fffdfa",
                  padding: "12px 22px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "14.5px",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {lang === "en" ? <>Join General Circle <ForwardArrow /></> : <>Unirse al Círculo General <ForwardArrow /></>}
              </a>
            </div>

            {/* Additional Stage Circle (if specific stage chosen) */}
            {selectedStages.length > 0 && selectedStages.filter(k => k !== "children610").map((stageKey) => {
              const matched = STAGES_KEYS.find((s) => s.key === stageKey);
              if (!matched) return null;
              return (
                <div key={stageKey} style={{ border: "1px solid rgba(86,139,5,0.4)", borderRadius: "8px", padding: "clamp(22px, 3vw, 28px)", backgroundColor: "#f4f7ee" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#568b05", marginBottom: "9px" }}>
                    {lang === "en" ? "Stage WhatsApp Circle" : "Círculo por Etapa en WhatsApp"}
                  </div>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", lineHeight: "1.2", margin: "0 0 10px" }}>
                    {lang === "en" ? `Your stage: ${matched.labelEn}` : `Tu etapa: ${matched.labelEs}`}
                  </h2>
                  <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.75)", margin: "0 0 18px" }}>
                    {lang === "en"
                      ? "Every thread is moderated by the Community Manager. Meeting-point changes and last-minute places are posted here first."
                      : "Cada hilo está moderado por la Community Manager. Los cambios de punto de encuentro y las plazas de última hora se publican aquí primero."}
                  </p>
                  <a
                    href={matched.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      border: "1px solid #568b05",
                      color: "#456f04",
                      backgroundColor: "#fffdfa",
                      padding: "12px 22px",
                      borderRadius: "4px",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "14.5px",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    {lang === "en" ? <>Open WhatsApp thread <ForwardArrow /></> : <>Abrir el hilo de WhatsApp <ForwardArrow /></>}
                  </a>
                </div>
              );
            })}

            {/* Godmother Program Info Card */}
            <div style={{ border: "1px solid rgba(86,139,5,0.4)", borderRadius: "8px", padding: "clamp(22px, 3vw, 28px)", backgroundColor: "#f4f7ee" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "9px" }}>
                <span style={{ color: "#568b05" }}>★</span>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#568b05" }}>
                  {lang === "en" ? "Godmother Programme" : "Programa de Madrinas"}
                </span>
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", lineHeight: "1.2", margin: "0 0 10px" }}>
                {lang === "en" ? "Share the club you are part of" : "Comparte el club del que formas parte"}
              </h2>
              <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.75)", margin: "0 0 18px" }}>
                {lang === "en"
                  ? `Every Godmother earns +5 credits when a friend joins with her code, plus +15 credits once she has been a member for three months (+20 credits total). Credits never cap, and expire six months after they land.`
                  : `Cada Madrina gana +5 créditos cuando una amiga se une con su código, y +15 más cuando ella cumple tres meses (+20 en total). Los créditos no tienen límite y caducan seis meses después de llegar.`}
              </p>
              
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px", letterSpacing: "0.04em", color: "#39292a", backgroundColor: "#fffdfa", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "4px", padding: "10px 16px" }}>
                  {referralCode}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(referralCode, "referral-bottom")}
                  style={{
                    border: "1px solid #568b05",
                    background: "#568b05",
                    color: "#f8efe2",
                    padding: "11px 18px",
                    borderRadius: "4px",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  {copiedCode === "referral-bottom" ? (lang === "en" ? "Copied!" : "¡Copiado!") : (lang === "en" ? "Copy" : "Copiar")}
                </button>
              </div>

              <p style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.6)", margin: 0 }}>
                {lang === "en"
                  ? "Nobody has used your code yet. Give it to the mother who keeps asking where you found your people."
                  : "Todavía nadie ha usado tu código. Dáselo a la madre que siempre pregunta dónde encontraste a tu gente."}
              </p>
            </div>
          </div>
        )}

        {/* ─── TAB 2: CREDITS & LEDGER ─── */}
        {/* ─── TAB 2: CREDITS & LEDGER ─── */}
        {activeTab === "credits" && (() => {
          const now = Date.now();
          const bal = availableCredits || 0;
          const pd = (d: any) => {
            if (!d) return null;
            const x = new Date(d);
            return isNaN(x.getTime()) ? null : x;
          };
          const fmtD = (d: any) => {
            const x = pd(d);
            return x ? x.toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { day: "numeric", month: "short", year: "numeric" }) : String(d || "");
          };
          const rawBatches = (accountData?.credits?.batches || accountData?.credits?.activeBatches || []);
          const live = rawBatches.filter((b: any) => {
            const remainingCount = b.remaining != null ? b.remaining : (b.amount != null ? b.amount : (b.n != null ? b.n : 0));
            return remainingCount > 0 && (!pd(b.expiresAt) || pd(b.expiresAt)!.getTime() > now);
          });
          const sortedLive = live.slice().sort((a: any, b: any) => (pd(a.expiresAt)?.getTime() || 0) - (pd(b.expiresAt)?.getTime() || 0));
          const soonCut = now + 30 * 86400000;
          const soon = sortedLive
            .filter((b: any) => pd(b.expiresAt) && pd(b.expiresAt)!.getTime() <= soonCut)
            .reduce((s: number, b: any) => s + (b.remaining != null ? b.remaining : (b.amount != null ? b.amount : (b.n != null ? b.n : 0))), 0);
          const soonN = Math.min(soon, bal);
          const ready = Math.max(0, bal - soonN);
          const next = sortedLive[0];

          const crTopRight = next && pd(next.expiresAt)
            ? (lang === "en" ? `Next credits expire on ${fmtD(next.expiresAt)}` : `Los próximos créditos caducan el ${fmtD(next.expiresAt)}`)
            : (lang === "en" ? "Credits last six months" : "Los créditos duran seis meses");

          const isMember = !!(memberData?.status === "active" && memberData?.hasActiveSubscription);
          const planLine = isMember
            ? (memberData?.plan === "quarterly"
                ? (lang === "en" ? "60 credits every 3 months" : "60 créditos cada 3 meses")
                : (lang === "en" ? "20 credits each month" : "20 créditos al mes"))
            : "";
          const renewLine = isMember && memberData?.currentPeriodEnd
            ? (lang === "en" ? `Renews on ${fmtD(memberData.currentPeriodEnd)}` : `Se renueva el ${fmtD(memberData.currentPeriodEnd)}`)
            : "";

          const crUnit = bal === 1
            ? (lang === "en" ? "credit remaining" : "crédito restante")
            : (lang === "en" ? "credits remaining" : "créditos restantes");
          const crReadyPct = bal > 0 ? Math.round((ready / bal) * 100) : 0;
          const crSoonPct = bal > 0 ? Math.round((soonN / bal) * 100) : 0;
          const crReadyLabel = lang === "en" ? `${ready} ready to spend` : `${ready} listos para usar`;
          const crHasSoon = soonN > 0;
          const crSoonLabel = lang === "en" ? `${soonN} expire within 30 days` : `${soonN} caducan en menos de 30 días`;

          const srcNames: Record<string, { en: string; es: string }> = {
            hosting: { en: "Hosting reward", es: "Recompensa por anfitriona" },
            godmother: { en: "Godmother bonus", es: "Bonus Madrina" },
            refund: { en: "Refund", es: "Reembolso" },
            membership: { en: "Monthly credits", es: "Créditos mensuales" },
            subscription: { en: "Monthly credits", es: "Créditos mensuales" },
            grant: { en: "Monthly credits", es: "Créditos mensuales" },
            topup: { en: "Top-up", es: "Recarga" },
            purchase: { en: "Top-up", es: "Recarga" },
            admin_adjustment: { en: "Adjustment", es: "Ajuste" },
          };

          const crRows = rawBatches.slice().sort((a: any, b: any) => (pd(b.createdAt)?.getTime() || 0) - (pd(a.createdAt)?.getTime() || 0)).map((b: any) => {
            const exp = pd(b.expiresAt);
            const gone = exp && exp.getTime() <= now;
            const srcObj = srcNames[b.source];
            const label = srcObj ? (lang === "en" ? srcObj.en : srcObj.es) : (lang === "en" ? "Top-up" : "Recarga");
            const boughtPart = b.createdAt ? `${fmtD(b.createdAt)} · ` : "";
            const expPart = gone
              ? (lang === "en" ? `expired ${fmtD(b.expiresAt)}` : `caducado ${fmtD(b.expiresAt)}`)
              : (lang === "en" ? `expires ${fmtD(b.expiresAt)}` : `caduca ${fmtD(b.expiresAt)}`);
            const amt = b.amount != null ? b.amount : (b.remaining != null ? b.remaining : (b.n != null ? b.n : 0));
            return {
              label,
              sub: `${boughtPart}${expPart}`,
              subColor: gone ? "#993842" : "rgba(57,41,42,0.66)",
              amount: `+${amt}`,
            };
          });

          const currentMonthName = new Date().toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { month: "long" });
          const m0 = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
          const spent = (accountData?.bookings || [])
            .filter((b: any) => b.status !== "cancelled" && (pd(b.bookedAt || b.createdAt)?.getTime() || 0) >= m0)
            .reduce((s: number, b: any) => s + (b.creditsCharged || 0), 0);
          const crSpentTitle = lang === "en" ? `Spent in ${currentMonthName}` : `Usados en ${currentMonthName}`;
          const crSpentLine = lang === "en"
            ? `${spent} ${spent === 1 ? "credit" : "credits"} already gone from your balance.`
            : `${spent} ${spent === 1 ? "crédito ya descontado" : "créditos ya descontados"} de tu saldo.`;

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Main Pay-as-you-go Credits Card matching Account.dc.html */}
              <div
                style={{
                  border: "1px solid rgba(57,41,42,0.16)",
                  borderRadius: "8px",
                  background: "#fffdfa",
                  padding: "clamp(22px, 3vw, 34px)",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 1px 4px rgba(57,41,42,0.04)",
                }}
              >
                {/* Header Row */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px 20px",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    paddingBottom: "16px",
                    borderBottom: "1px solid rgba(57,41,42,0.12)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "11.5px",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "#7b1f2c",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lang === "en" ? "Your credits" : "Tus créditos"}
                  </span>
                  <span style={{ fontSize: "14px", color: "rgba(57,41,42,0.74)" }}>
                    {crTopRight}
                  </span>
                </div>

                {/* Member Banner (Only for active members) */}
                {isMember && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px 20px",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginTop: "16px",
                      padding: "12px 16px",
                      background: "rgba(86,139,5,0.06)",
                      border: "1px solid rgba(86,139,5,0.3)",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                  >
                    <span>
                      <strong style={{ fontWeight: 600 }}>{lang === "en" ? "Member" : "Socia"}</strong> · {planLine}
                    </span>
                    <span style={{ color: "rgba(57,41,42,0.72)" }}>{renewLine}</span>
                  </div>
                )}

                {/* Balance Display */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", margin: "22px 0 4px", flexWrap: "nowrap" }}>
                  <span
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: "46px",
                      lineHeight: 1,
                      fontFeatureSettings: "'lnum' 1, 'tnum' 1",
                      fontVariantNumeric: "lining-nums tabular-nums",
                      color: "#39292a",
                    }}
                  >
                    {bal}
                  </span>
                  <span style={{ fontSize: "17px", color: "rgba(57,41,42,0.78)", whiteSpace: "nowrap" }}>
                    {crUnit}
                  </span>
                </div>

                {/* Balance Bar */}
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "11.5px",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "rgba(57,41,42,0.62)",
                    margin: "14px 0 8px",
                  }}
                >
                  {lang === "en" ? "Your balance right now" : "Tu saldo ahora mismo"}
                </div>
                <div style={{ height: "8px", borderRadius: "4px", background: "rgba(57,41,42,0.1)", overflow: "hidden", display: "flex" }}>
                  <div style={{ height: "100%", background: "#568b05", width: `${crReadyPct}%`, transition: "width 0.3s ease" }} />
                  <div style={{ height: "100%", background: "#c9a227", width: `${crSoonPct}%`, transition: "width 0.3s ease" }} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 22px", marginTop: "10px", fontSize: "14px" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "7px", color: "#3b5e04", fontWeight: 600 }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#568b05" }} />
                    {crReadyLabel}
                  </span>
                  {crHasSoon && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "7px", color: "#7a5612", fontWeight: 600 }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#c9a227" }} />
                      {crSoonLabel}
                    </span>
                  )}
                </div>

                {/* How You Got Here */}
                <div style={{ borderTop: "1px solid rgba(57,41,42,0.12)", marginTop: "22px", paddingTop: "18px" }}>
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "11.5px",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "rgba(57,41,42,0.62)",
                      marginBottom: "6px",
                    }}
                  >
                    {lang === "en" ? "How you got here" : "De dónde vienen"}
                  </div>

                  {crRows.length === 0 ? (
                    <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.72)", margin: "6px 0 0" }}>
                      {lang === "en"
                        ? "No credits yet. Buy as many as you need, and they last six months."
                        : "Aún no tienes créditos. Compra todos los que necesites; caducan a los seis meses."}
                    </p>
                  ) : (
                    <>
                      {crRows.map((r: any, idx: number) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "4px 16px",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            padding: "11px 0",
                            borderBottom: "1px solid rgba(57,41,42,0.1)",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: "14.5px" }}>{r.label}</div>
                            <div style={{ fontSize: "12.5px", color: r.subColor }}>{r.sub}</div>
                          </div>
                          <span
                            style={{
                              fontSize: "14.5px",
                              fontWeight: 600,
                              fontFeatureSettings: "'lnum' 1, 'tnum' 1",
                              fontVariantNumeric: "lining-nums tabular-nums",
                            }}
                          >
                            {r.amount}
                          </span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "13px 0 6px" }}>
                        <span style={{ fontSize: "15.5px", fontWeight: 600 }}>
                          {lang === "en" ? "Credits remaining" : "Créditos restantes"}
                        </span>
                        <span
                          style={{
                            fontSize: "15.5px",
                            fontWeight: 600,
                            fontFeatureSettings: "'lnum' 1, 'tnum' 1",
                            fontVariantNumeric: "lining-nums tabular-nums",
                          }}
                        >
                          {bal}
                        </span>
                      </div>
                    </>
                  )}
                  <p style={{ fontSize: "13px", fontStyle: "italic", color: "rgba(57,41,42,0.66)", margin: "6px 0 0" }}>
                    {lang === "en"
                      ? "Credits expiring soonest are used first when you book."
                      : "Los créditos que caducan antes se consumen primero al reservar."}
                  </p>
                </div>

                {/* Spent & Action Row */}
                <div
                  style={{
                    borderTop: "1px solid rgba(57,41,42,0.12)",
                    marginTop: "20px",
                    paddingTop: "18px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "16px 24px",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontWeight: 600,
                        fontSize: "11.5px",
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "rgba(57,41,42,0.62)",
                        marginBottom: "6px",
                      }}
                    >
                      {crSpentTitle}
                    </div>
                    <div style={{ fontSize: "14.5px", color: "rgba(57,41,42,0.8)" }}>{crSpentLine}</div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setTopUpError(null);
                        setTimeout(() => topUpRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                      }}
                      style={{
                        border: "1px solid #7b1f2c",
                        color: "#7b1f2c",
                        backgroundColor: "transparent",
                        borderRadius: "4px",
                        padding: "12px 22px",
                        fontFamily: "'Cormorant Garamond', serif",
                        fontWeight: 600,
                        fontSize: "15px",
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                      }}
                    >
                      {lang === "en" ? "Buy credits" : "Comprar créditos"}
                    </button>
                    <Link
                      href="/events"
                      style={{
                        border: "1px solid #7b1f2c",
                        backgroundColor: "#7b1f2c",
                        color: "#fdf8f2",
                        borderRadius: "4px",
                        padding: "12px 22px",
                        fontFamily: "'Cormorant Garamond', serif",
                        fontWeight: 600,
                        fontSize: "15px",
                        whiteSpace: "nowrap",
                        textDecoration: "none",
                      }}
                    >
                      {lang === "en" ? "Book an event" : "Reservar un evento"}
                    </Link>
                  </div>
                </div>

                {/* Statement Download Option */}
                <div style={{ borderTop: "1px solid rgba(57,41,42,0.12)", marginTop: "18px", paddingTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <Link
                    href="/account/statement"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "13.5px",
                      color: "#7b1f2c",
                      textDecoration: "underline",
                      fontWeight: 500,
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    {lang === "en" ? "Download full statement (PDF)" : "Descargar el extracto completo (PDF)"}
                  </Link>
                  <span style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.6)" }}>
                    {lang === "en" ? "Everything since you joined, month by month." : "Todo desde que te uniste, mes a mes."}
                  </span>
                </div>
              </div>

              {/* Purchase Confirmed Banner */}
              {purchaseConfirmed && (
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(57, 41, 42, 0.14)",
                    borderRadius: "8px",
                    padding: "20px 24px",
                    display: "flex",
                    gap: "14px",
                    alignItems: "flex-start",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      border: "1.8px solid #568b05",
                      color: "#568b05",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: "bold",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontWeight: 600,
                        fontSize: "17px",
                        color: "#568b05",
                      }}
                    >
                      {lang === "en"
                        ? `${purchasedAmount} credit${purchasedAmount === 1 ? "" : "s"} added to your balance.`
                        : `${purchasedAmount} crédito${purchasedAmount === 1 ? "" : "s"} añadido${purchasedAmount === 1 ? "" : "s"} a tu saldo.`}
                    </div>
                    <p
                      style={{
                        fontSize: "14.5px",
                        lineHeight: "1.6",
                        color: "rgba(57, 41, 42, 0.72)",
                        margin: "4px 0 14px",
                      }}
                    >
                      {lang === "en"
                        ? `Your balance is now ${bal} credits — ready to book with.`
                        : `Tu saldo es ahora de ${bal} créditos — listos para reservar.`}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPurchaseConfirmed(false)}
                      style={{
                        border: "1px solid rgba(57, 41, 42, 0.28)",
                        backgroundColor: "#ffffff",
                        color: "#39292a",
                        padding: "8px 24px",
                        borderRadius: "4px",
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontWeight: 600,
                        fontSize: "14.5px",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#7b1f2c")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(57, 41, 42, 0.28)")}
                    >
                      {lang === "en" ? "Done" : "Hecho"}
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Styled Add Credits Top Up Form (Image 2) */}
              <div ref={topUpRef} style={{ border: "1px solid rgba(57,41,42,0.18)", borderRadius: "8px", padding: "clamp(24px, 4vw, 32px)", backgroundColor: "#fff" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", margin: "0 0 6px" }}>
                  {lang === "en" ? "Add credits — €2 each (min. 5)" : "Añadir créditos — 2€ cada uno (mín. 5)"}
                </div>
                <p style={{ fontSize: "13.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.62)", margin: "0 0 22px", maxWidth: "56ch" }}>
                  {lang === "en"
                    ? "Buy exactly the number you need. Top-up credits join your balance under the same rules: 6-month expiry, oldest credits used first."
                    : "Compra exactamente los que necesites. Los créditos extra se suman a tu saldo con las mismas reglas: caducan a los 6 meses y se usan primero los más antiguos."}
                </p>

                {topUpError && (
                  <div style={{ padding: "12px 14px", backgroundColor: "#fff0f0", border: "1px solid rgba(200,0,0,0.2)", borderRadius: "4px", fontSize: "13px", color: "#b91c1c", marginBottom: "16px" }}>
                    {topUpError}
                  </div>
                )}

                {/* Quantity selector & Quick add */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div>
                    <div style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "9px" }}>
                      {lang === "en" ? "HOW MANY" : "CUÁNTOS"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <button
                        type="button"
                        onClick={() => setTopUpAmount(Math.max(5, topUpAmount - 1))}
                        style={{ width: "46px", height: "46px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "5px", backgroundColor: "#f8efe2", color: "#39292a", fontSize: "20px", cursor: "pointer" }}
                      >
                        −
                      </button>
                      <span
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontWeight: 500,
                          fontSize: "34px",
                          minWidth: "66px",
                          textAlign: "center",
                          fontFeatureSettings: "'lnum' 1, 'tnum' 1",
                          fontVariantNumeric: "lining-nums tabular-nums",
                        }}
                      >
                        {topUpAmount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTopUpAmount(topUpAmount + 1)}
                        style={{ width: "46px", height: "46px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "5px", backgroundColor: "#f8efe2", color: "#39292a", fontSize: "20px", cursor: "pointer" }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.6)", marginBottom: "9px" }}>
                      {lang === "en" ? "TOTAL" : "TOTAL"}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontWeight: 500,
                        fontSize: "34px",
                        fontFeatureSettings: "'lnum' 1, 'tnum' 1",
                        fontVariantNumeric: "lining-nums tabular-nums",
                      }}
                    >
                      {lang === "en" ? `€${topUpAmount * 2}` : `${topUpAmount * 2}€`}
                    </div>
                  </div>
                </div>

                {/* Quick Add Pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "24px" }}>
                  <span style={{ fontSize: "13px", color: "rgba(57,41,42,0.55)", marginRight: "4px" }}>
                    {lang === "en" ? "Quick add" : "Añadir rápido"}
                  </span>
                  {[5, 10, 20].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopUpAmount(amt)}
                      style={{
                        border: "1px solid rgba(57,41,42,0.25)",
                        borderRadius: "16px",
                        padding: "6px 14px",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: "rgba(57,41,42,0.75)",
                        fontFeatureSettings: "'lnum' 1, 'tnum' 1",
                        fontVariantNumeric: "lining-nums tabular-nums",
                      }}
                    >
                      +{amt}
                    </button>
                  ))}
                </div>

                {/* PCI-Compliant secure button redirecting to Stripe */}
                <div style={{ borderTop: "1px solid rgba(57,41,42,0.14)", paddingTop: "18px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    disabled={topUpLoading}
                    onClick={handleTopUpSubmit}
                    style={{
                      border: "1px solid #7b1f2c",
                      color: "#7b1f2c",
                      backgroundColor: "transparent",
                      padding: "13px 24px",
                      borderRadius: "5px",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "15px",
                      cursor: topUpLoading ? "wait" : "pointer",
                    }}
                  >
                    {topUpLoading
                      ? (lang === "en" ? "Processing…" : "Procesando…")
                      : (lang === "en" ? `Pay €${topUpAmount * 2} & Add Credits` : `Pagar ${topUpAmount * 2}€ y Añadir Créditos`)}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── TAB: HOSTING ─── */}
        {activeTab === "hosting" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ border: "1px solid rgba(57, 41, 42, 0.14)", borderRadius: "8px", padding: "clamp(24px, 4vw, 36px)", backgroundColor: "#fffdfa" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: "12px", marginBottom: "8px" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "26px", color: "#39292a", margin: 0 }}>
                  {lang === "en" ? "Events that need a host" : "Eventos que necesitan anfitriona"}
                </h2>
                <Link
                  href="/host"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "15px",
                    color: "#3b5e04",
                    textDecoration: "none",
                  }}
                >
                  {lang === "en" ? "What a host does →" : "Qué hace una anfitriona →"}
                </Link>
              </div>

              <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57, 41, 42, 0.72)", margin: "0 0 24px" }}>
                {(() => {
                  const attended = hostEligibility?.totalAttended ?? (accountData?.member?.eventsAttendedCount || 0);
                  const isElig = hostEligibility?.eligible === true;
                  if (!isElig) {
                    if (attended < 2) {
                      const needed = Math.max(1, 2 - attended);
                      return lang === "en"
                        ? `You have been to ${attended} event${attended === 1 ? "" : "s"}. Come to ${needed} more and you can host.`
                        : `Has asistido a ${attended} evento${attended === 1 ? "" : "s"}. Ven a ${needed} más y podrás ser anfitriona.`;
                    }
                    return lang === "en"
                      ? "Hosting is temporarily paused due to a recent cancellation or account status."
                      : "La opción de ser anfitriona está en pausa por el momento.";
                  }
                  return lang === "en"
                    ? "You have attended 2+ events and are eligible to host! Select an event below."
                    : "¡Has asistido a más de 2 eventos y puedes ser anfitriona! Elige un evento a continuación.";
                })()}
              </p>

              {hostMessage && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "6px",
                    marginBottom: "18px",
                    fontSize: "13.5px",
                    backgroundColor: hostMessage.type === "success" ? "rgba(86,139,5,0.1)" : "rgba(153,56,66,0.1)",
                    border: `1px solid ${hostMessage.type === "success" ? "rgba(86,139,5,0.4)" : "rgba(153,56,66,0.4)"}`,
                    color: hostMessage.type === "success" ? "#3b5e04" : "#993842",
                  }}
                >
                  {hostMessage.text}
                </div>
              )}

              {/* Real Events List needing host */}
              {hostLoading ? (
                <div style={{ textAlign: "center", padding: "24px", color: "rgba(57,41,42,0.6)" }}>
                  {lang === "en" ? "Loading hosting opportunities..." : "Cargando eventos para anfitrionas..."}
                </div>
              ) : hostEvents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", backgroundColor: "#fdf8f2", borderRadius: "6px", border: "1px dashed rgba(57,41,42,0.16)" }}>
                  <p style={{ margin: 0, fontSize: "14px", color: "rgba(57,41,42,0.68)", fontStyle: "italic" }}>
                    {lang === "en"
                      ? "All upcoming events currently have a host confirmed. Check back soon!"
                      : "Todos los próximos eventos ya cuentan con anfitriona confirmada. ¡Vuelve a consultar pronto!"}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {hostEvents.map((ev) => {
                    const isBooked = userHostBookings.includes(ev.id);
                    const hostReq = userHostRequests.find((r) => r.eventId === ev.id);
                    const isElig = hostEligibility?.eligible === true;
                    const dateFormatted = formatEventDate(ev.startsAt, lang as any);

                    return (
                      <div
                        key={ev.id}
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "16px",
                          padding: "18px 20px",
                          border: "1px solid rgba(57, 41, 42, 0.14)",
                          borderRadius: "6px",
                          backgroundColor: "#fdf8f2",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{ fontSize: "11px", letterSpacing: "0.04em", color: "#3b5e04", border: "1px solid rgba(86,139,5,0.35)", borderRadius: "10px", padding: "2px 8px", backgroundColor: "rgba(86,139,5,0.06)", fontWeight: 600 }}>
                              +2 credits reward
                            </span>
                          </div>
                          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px", color: "#39292a", margin: "0 0 4px" }}>
                            {ev.title}
                          </h3>
                          <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.7)" }}>
                            {dateFormatted} · {ev.neighbourhood || ev.venueName || "Barcelona"}
                          </div>
                        </div>

                        {/* CTA button or status on right */}
                        <div>
                          {hostReq ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontSize: "13px", fontWeight: 500, color: hostReq.status === "confirmed" ? "#3b5e04" : "#8a6116" }}>
                                {hostReq.status === "confirmed"
                                  ? (lang === "en" ? "You're hosting · confirmed" : "Eres la anfitriona · confirmada")
                                  : (lang === "en" ? "Request pending" : "Solicitud en revisión")}
                              </span>
                              {hostReq.status === "pending" && (
                                <button
                                  type="button"
                                  disabled={hostActionLoadingId === ev.id}
                                  onClick={() => handleWithdrawHost(hostReq.id, ev.id)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "rgba(57, 41, 42, 0.6)",
                                    fontSize: "12.5px",
                                    textDecoration: "underline",
                                    cursor: "pointer",
                                  }}
                                >
                                  {lang === "en" ? "Cancel" : "Retirar"}
                                </button>
                              )}
                            </div>
                          ) : !isElig ? (
                            /* When conditions are not met, DO NOT show the host CTA */
                            null
                          ) : !isBooked ? (
                            <Link
                              href={`/events/${ev.id}`}
                              style={{
                                border: "1px solid rgba(57, 41, 42, 0.28)",
                                backgroundColor: "transparent",
                                color: "#39292a",
                                padding: "9px 18px",
                                borderRadius: "4px",
                                fontFamily: "'Cormorant Garamond', serif",
                                fontWeight: 600,
                                fontSize: "14.5px",
                                textDecoration: "none",
                                whiteSpace: "nowrap",
                                display: "inline-block",
                              }}
                            >
                              {lang === "en" ? "Book first to host" : "Reservar plaza primero"}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled={hostActionLoadingId === ev.id}
                              onClick={() => handleApplyToHost(ev.id)}
                              style={{
                                border: "1px solid #568b05",
                                backgroundColor: "#568b05",
                                color: "#ffffff",
                                padding: "9px 18px",
                                borderRadius: "4px",
                                fontFamily: "'Cormorant Garamond', serif",
                                fontWeight: 600,
                                fontSize: "14.5px",
                                cursor: hostActionLoadingId === ev.id ? "wait" : "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {hostActionLoadingId === ev.id
                                ? "..."
                                : (lang === "en" ? "Host this event" : "Ser anfitriona")}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── CONDITIONS MODULE (Simple, and fair.) ─── */}
            <div style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", backgroundColor: "#fffdfa", padding: "clamp(24px, 4vw, 36px)" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "8px" }}>
                {lang === "en" ? "CONDITIONS" : "CONDICIONES"}
              </div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(24px, 3.4vw, 34px)", margin: "0 0 24px", color: "#39292a" }}>
                {lang === "en" ? "Simple, and fair." : "Sencillas y transparentes."}
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "20px" }}>
                {/* 1. Eligibility */}
                <div style={{ border: "1px solid rgba(57, 41, 42, 0.14)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "22px 20px" }}>
                  <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px", color: "#39292a", margin: "0 0 14px" }}>
                    {lang === "en" ? "Eligibility" : "Requisitos"}
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 0", fontSize: "13.5px", color: "#39292a", lineHeight: "1.5" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#568b05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m5 12 5 5L20 7" /></svg>
                      <span>{lang === "en" ? "An account on themothers.cc" : "Tener cuenta en themothers.cc"}</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid rgba(57,41,42,0.08)", fontSize: "13.5px", color: "#39292a", lineHeight: "1.5" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#568b05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m5 12 5 5L20 7" /></svg>
                      <span>{lang === "en" ? "At least 2 events attended in person" : "Haber asistido al menos a 2 eventos"}</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid rgba(57,41,42,0.08)", fontSize: "13.5px", color: "#39292a", lineHeight: "1.5" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#568b05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m5 12 5 5L20 7" /></svg>
                      <span>{lang === "en" ? "No no-shows in the last 3 months" : "Sin ausencias injustificadas en 3 meses"}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Commitment */}
                <div style={{ border: "1px solid rgba(57, 41, 42, 0.14)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "22px 20px" }}>
                  <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px", color: "#39292a", margin: "0 0 14px" }}>
                    {lang === "en" ? "Commitment" : "Compromiso"}
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 0", fontSize: "13.5px", color: "#39292a", lineHeight: "1.5" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#568b05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m5 12 5 5L20 7" /></svg>
                      <span>{lang === "en" ? "Arrive 10 minutes early at the meeting point" : "Llegar 10 minutos antes al punto de encuentro"}</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid rgba(57,41,42,0.08)", fontSize: "13.5px", color: "#39292a", lineHeight: "1.5" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#568b05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m5 12 5 5L20 7" /></svg>
                      <span>{lang === "en" ? "Welcome mothers as they arrive" : "Dar la bienvenida a cada madre al llegar"}</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid rgba(57,41,42,0.08)", fontSize: "13.5px", color: "#39292a", lineHeight: "1.5" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#568b05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m5 12 5 5L20 7" /></svg>
                      <span>{lang === "en" ? "No commercial selling or promotion" : "Prohibida la venta o promoción comercial"}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Rewards */}
                <div style={{ border: "1px solid rgba(57, 41, 42, 0.14)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "22px 20px" }}>
                  <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px", color: "#39292a", margin: "0 0 14px" }}>
                    {lang === "en" ? "Rewards" : "Compensación"}
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 0", fontSize: "13.5px", color: "#39292a", lineHeight: "1.5" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#568b05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m5 12 5 5L20 7" /></svg>
                      <span>{lang === "en" ? "2 credits awarded once the event runs" : "2 créditos al completarse el encuentro"}</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid rgba(57,41,42,0.08)", fontSize: "13.5px", color: "#39292a", lineHeight: "1.5" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#568b05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m5 12 5 5L20 7" /></svg>
                      <span>{lang === "en" ? "50% credit refund on your booked place" : "50% de devolución en créditos de tu plaza"}</span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid rgba(57,41,42,0.08)", fontSize: "13.5px", color: "#39292a", lineHeight: "1.5" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#568b05" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="15" height="15" style={{ flexShrink: 0, marginTop: "2px" }}><path d="m5 12 5 5L20 7" /></svg>
                      <span>{lang === "en" ? "Credits valid for 6 months across calendar" : "Créditos válidos durante 6 meses"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: PERKS ─── */}
        {activeTab === "perks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {!accountData?.settings?.membershipLive ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <span
                  style={{
                    alignSelf: "flex-start",
                    fontFamily: "var(--font-heading)",
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#7b1f2c",
                    background: "rgba(123,31,44,0.07)",
                    border: "1px solid rgba(123,31,44,0.35)",
                    borderRadius: "8px",
                    padding: "4px 10px",
                    marginBottom: "14px",
                    fontWeight: 600,
                  }}
                >
                  {lang === "en" ? "FROM JANUARY 2027" : "A PARTIR DE ENERO DE 2027"}
                </span>
                <h2
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 400,
                    fontSize: "clamp(28px, 3.6vw, 36px)",
                    lineHeight: 1.15,
                    margin: "0 0 10px",
                    color: "#39292a",
                  }}
                >
                  {lang === "en"
                    ? "Partner perks open with membership"
                    : "Las ventajas de partners abren con la membresía"}
                </h2>
                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: "1.65",
                    color: "rgba(57,41,42,0.78)",
                    margin: "0 0 26px",
                    maxWidth: "62ch",
                  }}
                >
                  {lang === "en"
                    ? "Standing offers from the studios, clinics, cafés and shops we work with, for members only. The sessions themselves are already on the calendar and open to you today."
                    : "Ofertas continuas en estudios, clínicas, cafeterías y tiendas con las que colaboramos, solo para socias. Las sesiones ya están en el calendario y abiertas para ti hoy."}
                </p>
                <div
                  style={{
                    border: "1px solid rgba(57,41,42,0.14)",
                    borderRadius: "8px",
                    background: "#fffdfa",
                    padding: "clamp(32px, 5vw, 48px) 24px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "14px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontStyle: "italic",
                      fontSize: "14.5px",
                      lineHeight: "1.6",
                      color: "rgba(57,41,42,0.66)",
                      margin: 0,
                    }}
                  >
                    {lang === "en"
                      ? "Partner perks appear here once membership opens."
                      : "Las ventajas de partners aparecerán aquí cuando se abra la membresía."}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: "inline-block",
                    fontSize: "11px",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#7b1f2c",
                    border: "1px solid rgba(123,31,44,0.3)",
                    borderRadius: "10px",
                    padding: "3px 10px",
                    background: "rgba(123,31,44,0.06)",
                    fontWeight: 600,
                    width: "fit-content",
                    marginBottom: "10px",
                  }}
                >
                  {lang === "en" ? "MEMBERS ONLY" : "SOLO SOCIAS"}
                </div>
                <h2
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 400,
                    fontSize: "clamp(28px, 4vw, 36px)",
                    margin: "0 0 10px",
                    color: "#39292a",
                  }}
                >
                  {lang === "en" ? "Partner perks" : "Ventajas con nuestros partners"}
                </h2>
                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: "1.6",
                    color: "rgba(57,41,42,0.8)",
                    margin: "0 0 28px",
                    maxWidth: "680px",
                  }}
                >
                  {lang === "en"
                    ? "What the club opens for you outside the calendar. Every offer below is held for members, arranged one partner at a time, and yours for as long as you are with us."
                    : "Lo que el club te abre fuera del calendario. Cada ventaja está reservada a las socias, acordada partner a partner, y es tuya mientras estés con nosotras."}
                </p>

                {/* Perks Grid */}
                {(!accountData?.partners || accountData.partners.length === 0) ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "48px 24px",
                      backgroundColor: "#fffdfa",
                      borderRadius: "8px",
                      border: "1px solid rgba(57, 41, 42, 0.12)",
                    }}
                  >
                    <p
                      style={{
                        color: "rgba(57,41,42,0.65)",
                        fontSize: "14.5px",
                        fontStyle: "italic",
                        margin: 0,
                      }}
                    >
                      {lang === "en"
                        ? "No partner perks are currently active. Curated member offers will appear here when added."
                        : "No hay ventajas de partners activas actualmente. Las ventajas exclusivas para socias aparecerán aquí cuando se añadan."}
                    </p>
                  </div>
                ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "22px" }}>
                  {accountData.partners.map((p: any) => {
                    const isRevealed = !!revealedPerks[p.id];
                    return (
                      <div
                        key={p.id}
                        style={{
                          border: "1px solid rgba(57,41,42,0.14)",
                          borderRadius: "8px",
                          padding: "26px 24px",
                          backgroundColor: "#ffffff",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                          gap: "18px",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", fontWeight: 600, marginBottom: "8px" }}>
                            {p.umbrella || (lang === "en" ? "Curated Partner" : "Partner Recomendado")}
                          </div>
                          <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "21px", margin: "0 0 4px", color: "#39292a", lineHeight: 1.25 }}>
                            {p.name}
                          </h3>
                          <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.62)", marginBottom: "16px" }}>
                            {p.specialty || ""}
                          </div>
                          <p style={{ fontSize: "16px", fontWeight: 600, color: "#39292a", margin: "0 0 6px", lineHeight: 1.35 }}>
                            {p.offerForMembers}
                          </p>
                          {p.description && (
                            <p style={{ fontSize: "14px", lineHeight: "1.55", color: "rgba(57,41,42,0.8)", margin: 0 }}>
                              {p.description}
                            </p>
                          )}
                        </div>

                        <div style={{ borderTop: "1px solid rgba(57,41,42,0.1)", paddingTop: "16px", marginTop: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                          {p.discountCode ? (
                            <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
                              <div>
                                <div style={{ fontSize: "10.5px", letterSpacing: "0.06em", color: "rgba(57,41,42,0.52)", textTransform: "uppercase", fontWeight: 500, marginBottom: "2px" }}>
                                  {lang === "en" ? "DISCOUNT CODE" : "CÓDIGO DE DESCUENTO"}
                                </div>
                                <div style={{ fontFamily: "monospace", fontSize: "15px", fontWeight: 600, letterSpacing: "0.08em", color: isRevealed ? "#39292a" : "rgba(57,41,42,0.4)" }}>
                                  {isRevealed ? p.discountCode : "••••••••"}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isRevealed) {
                                    setRevealedPerks({ ...revealedPerks, [p.id]: true });
                                  } else {
                                    copyText(p.discountCode || "", `perk-${p.id}`);
                                  }
                                }}
                                style={{
                                  border: "1px solid #7b1f2c",
                                  backgroundColor: "transparent",
                                  color: "#7b1f2c",
                                  padding: "6px 14px",
                                  borderRadius: "4px",
                                  fontFamily: "var(--font-heading)",
                                  fontWeight: 600,
                                  fontSize: "13px",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {!isRevealed
                                  ? (lang === "en" ? "Reveal code" : "Ver código")
                                  : copiedCode === `perk-${p.id}`
                                  ? (lang === "en" ? "Copied" : "Copiado")
                                  : (lang === "en" ? "Copy code" : "Copiar código")}
                              </button>
                            </div>
                          ) : p.links?.website ? (
                            <a
                              href={p.links.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-block",
                                alignSelf: "flex-start",
                                border: "1px solid #7b1f2c",
                                color: "#7b1f2c",
                                backgroundColor: "transparent",
                                borderRadius: "4px",
                                padding: "8px 16px",
                                fontFamily: "var(--font-heading)",
                                fontWeight: 600,
                                fontSize: "13.5px",
                                textDecoration: "none",
                              }}
                            >
                              {lang === "en" ? "Visit partner website" : "Visitar web del partner"}
                            </a>
                          ) : (
                            <div style={{ fontSize: "13.5px", color: "#3e6308", fontWeight: 500, lineHeight: 1.4 }}>
                              {lang === "en" ? "Show member card in person" : "Enseña tu carné de socia en persona"}
                            </div>
                          )}

                          <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.55)", fontStyle: "italic" }}>
                            {lang === "en" ? "Exclusive member benefit" : "Beneficio exclusivo para socias"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {accountData?.settings?.membershipLive && (
                <div style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px", backgroundColor: "#f8efe2", padding: "20px 24px", marginTop: "24px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "baseline", justifyContent: "space-between" }}>
                  <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.8)", maxWidth: "42em" }}>
                    {lang === "en"
                      ? "Perks are for you and your household, not transferable. If a partner ever turns one down, write to us and we will sort it — and tell them."
                      : "Las ventajas son para ti y tu casa, no transferibles. Si algún partner no la aplica, escríbenos y lo resolvemos — y hablamos con ellos."}
                  </p>
                  <Link href="/partners" style={{ fontSize: "14px", color: "#7b1f2c", textDecoration: "underline", fontWeight: 600 }}>
                    {lang === "en" ? "See all partners" : "Ver todos los partners"}
                  </Link>
                </div>
              )}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4: MEMBERSHIP ─── */}
        {activeTab === "membership" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* When Membership is Live and User is Subscribed */}
            {accountData?.settings?.membershipLive && accountData?.member?.hasActiveSubscription && (
              <div style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px", backgroundColor: "#fffdfa", padding: "clamp(26px, 4vw, 36px)" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#568b05", marginBottom: "12px" }}>
                  {lang === "en" ? "ACTIVE MEMBERSHIP" : "MEMBRESÍA ACTIVA"}
                </div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, fontSize: "clamp(26px, 4vw, 36px)", margin: "0 0 14px", color: "#39292a" }}>
                  {accountData.member.status === "paused" ? (lang === "en" ? "Membership Paused" : "Membresía en Pausa") : (lang === "en" ? "The Mothers Club Membership" : "Membresía The Mothers Club")}
                </h2>
                <p style={{ fontSize: "15px", color: "rgba(57, 41, 42, 0.75)", margin: "0 0 20px" }}>
                  {lang === "en" ? "Your membership grants 20 credits every month and full access to partner perks and member events." : "Tu membresía te otorga 20 créditos cada mes y acceso total a ventajas de partners y encuentros de socias."}
                </p>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={handleUpdateCardClick}
                    disabled={portalLoading}
                    style={{ border: "1px solid #7b1f2c", backgroundColor: "#7b1f2c", color: "#f8efe2", padding: "10px 20px", borderRadius: "4px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}
                  >
                    {portalLoading ? (lang === "en" ? "Opening..." : "Abriendo...") : (lang === "en" ? "Manage Billing & Payment Method" : "Gestionar Facturación y Método de Pago")}
                  </button>
                </div>
              </div>
            )}

            {/* When Membership is Live and User is NOT Subscribed */}
            {accountData?.settings?.membershipLive && !accountData?.member?.hasActiveSubscription && (
              <div style={{ border: "1px solid #7b1f2c", borderRadius: "8px", backgroundColor: "#fffdfa", padding: "clamp(26px, 4vw, 36px)" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "12px" }}>
                  {lang === "en" ? "MEMBERSHIP AVAILABLE NOW" : "MEMBRESÍA DISPONIBLE AHORA"}
                </div>
                <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, fontSize: "clamp(26px, 4vw, 36px)", margin: "0 0 14px", color: "#39292a" }}>
                  {lang === "en" ? "Become a Member of The Mothers" : "Hazte Socia de The Mothers"}
                </h2>
                <p style={{ fontSize: "15.5px", lineHeight: "1.6", color: "rgba(57, 41, 42, 0.8)", margin: "0 0 24px", maxWidth: "58ch" }}>
                  {lang === "en"
                    ? "Choose monthly (€39/mo for 20 credits) or quarterly (€99/qtr for 60 credits). Wallet credits apply automatically as a discount at checkout."
                    : "Elige mensual (39€/mes por 20 créditos) o trimestral (99€/trimestre por 60 créditos). Tus créditos se descuentan automáticamente."}
                </p>
                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch("/api/stripe/checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ plan: "monthly" }),
                      });
                      let data;
                      try {
                        if (!res.ok) throw new Error(`Server error: ${res.statusText}`);
                        data = await res.json();
                      } catch (err: any) {
                        alert(err.message || "Subscription failed");
                        return;
                      }
                      if (data.url) window.location.href = data.url;
                      else alert(data.error || "Subscription failed");
                    }}
                    style={{ border: "1px solid #7b1f2c", backgroundColor: "#7b1f2c", color: "#f8efe2", padding: "12px 24px", borderRadius: "4px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}
                  >
                    {lang === "en" ? "Subscribe Monthly (€39 / mo)" : "Suscripción Mensual (39€ / mes)"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch("/api/stripe/checkout", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ plan: "quarterly" }),
                      });
                      let data;
                      try {
                        if (!res.ok) throw new Error(`Server error: ${res.statusText}`);
                        data = await res.json();
                      } catch (err: any) {
                        alert(err.message || "Subscription failed");
                        return;
                      }
                      if (data.url) window.location.href = data.url;
                      else alert(data.error || "Subscription failed");
                    }}
                    style={{ border: "1px solid #7b1f2c", backgroundColor: "transparent", color: "#7b1f2c", padding: "12px 24px", borderRadius: "4px", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}
                  >
                    {lang === "en" ? "Subscribe Quarterly (€99 / qtr · 60 credits)" : "Suscripción Trimestral (99€ / trim · 60 créditos)"}
                  </button>
                </div>
              </div>
            )}

            {/* When Membership is Not Live (Pre-Launch) */}
            {!accountData?.settings?.membershipLive && (
              <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", backgroundColor: "#ffffff", padding: "clamp(22px, 3vw, 30px)" }}>
                <div
                  style={{
                    fontSize: "11.5px",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#7b1f2c",
                    marginBottom: "12px",
                    fontWeight: 600,
                  }}
                >
                  {lang === "en" ? "MEMBERSHIP OPENS JANUARY 2027" : "LA MEMBRESÍA ABRE EN ENERO DE 2027"}
                </div>

                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 400,
                    fontSize: "24px",
                    lineHeight: "1.2",
                    margin: "0 0 10px",
                    color: "#39292a",
                  }}
                >
                  {lang === "en" ? "You do not have one yet — nobody does." : "Aún no tienes una — nadie la tiene todavía."}
                </h2>

                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: "1.65",
                    color: "rgba(57, 41, 42, 0.74)",
                    margin: "0 0 18px",
                    maxWidth: "62ch",
                  }}
                >
                  {lang === "en"
                    ? "€39 a month or €99 quarterly, twenty credits granted each month, and the partner list. As an early mother you join without a joining fee, and credits already in your wallet keep their full six-month life."
                    : "39 € al mes o 99 € al trimestre, veinte créditos concedidos cada mes y la lista de partners. Como madre pionera te unes sin cuota de alta, y los créditos que ya tengas en tu monedero conservan su validez completa de seis meses."}
                </p>

                <div style={{ display: "flex", gap: "9px", flexWrap: "wrap", marginBottom: "20px" }}>
                  {[
                    { label: lang === "en" ? "DAYS" : "DÍAS", value: timeLeft.days },
                    { label: lang === "en" ? "HOURS" : "HORAS", value: timeLeft.hours },
                    { label: lang === "en" ? "MINS" : "MINS", value: timeLeft.minutes },
                    { label: lang === "en" ? "SECS" : "SEGS", value: timeLeft.seconds },
                  ].map((unit, idx) => (
                    <div
                      key={idx}
                      style={{
                        minWidth: "62px",
                        textAlign: "center",
                        backgroundColor: "#ecdcd0",
                        border: "1px solid rgba(57,41,42,0.18)",
                        borderRadius: "5px",
                        padding: "11px 8px",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: "24px",
                          lineHeight: "1",
                          fontFeatureSettings: "'tnum'",
                          color: "#7b1f2c",
                        }}
                      >
                        {unit.value}
                      </div>
                      <div
                        style={{
                          fontSize: "9.5px",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "rgba(57,41,42,0.72)",
                          marginTop: "5px",
                        }}
                      >
                        {unit.label}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
                  {listJoined ? (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "10px",
                        border: "1px solid rgba(86,139,5,0.45)",
                        backgroundColor: "#f4f7ee",
                        color: "#3e6308",
                        borderRadius: "4px",
                        padding: "11px 18px",
                        fontFamily: "'Lora', Georgia, serif",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      <span>✓ {lang === "en" ? "You're on the list" : "Estás en la lista"}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setListJoined(false);
                          if (typeof window !== "undefined") {
                            localStorage.removeItem("tm_pre_joined_list");
                          }
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#3e6308",
                          cursor: "pointer",
                          padding: "0 2px",
                          fontSize: "13px",
                          marginLeft: "6px",
                          lineHeight: 1,
                        }}
                        title={lang === "en" ? "Leave waitlist" : "Salir de la lista"}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNotifyMe}
                      disabled={listLoading}
                      style={{
                        border: "1px solid #7b1f2c",
                        backgroundColor: "#7b1f2c",
                        color: "#fdf8f2",
                        borderRadius: "4px",
                        padding: "12px 24px",
                        fontFamily: "'Cormorant Garamond', serif",
                        fontWeight: 600,
                        fontSize: "15px",
                        whiteSpace: "nowrap",
                        cursor: listLoading ? "wait" : "pointer",
                      }}
                    >
                      {listLoading
                        ? (lang === "en" ? "Saving..." : "Guardando...")
                        : (lang === "en" ? "Tell me when it opens" : "Avísame cuando abra")}
                    </button>
                  )}

                  <Link
                    href="/membership"
                    style={{
                      border: "1px solid rgba(57,41,42,0.24)",
                      backgroundColor: "transparent",
                      color: "#39292a",
                      borderRadius: "4px",
                      padding: "12px 22px",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "15px",
                      whiteSpace: "nowrap",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    {lang === "en" ? "What it will be" : "Cómo será"}
                  </Link>
                </div>
              </div>
            )}

            {/* Personal Details with Toggle Stage Buttons (No ranges, Multi-select) */}
            <div style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px", padding: "clamp(22px, 3vw, 30px)", backgroundColor: "#fffdfa" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", lineHeight: "1.2", margin: "0 0 20px" }}>
                {lang === "en" ? "Personal details" : "Datos personales"}
              </h2>

              {detailsResult?.success && (
                <div style={{ padding: "12px 16px", backgroundColor: "#f4f7ee", border: "1px solid rgba(86,139,5,0.35)", borderRadius: "6px", fontSize: "13.5px", color: "rgba(57,41,42,0.85)", marginBottom: "16px" }}>
                  ✓ {lang === "en" ? "Saved. Your details are up to date." : "Guardado. Tus datos están al día."}
                </div>
              )}
              {detailsResult?.error && (
                <div style={{ padding: "12px 16px", backgroundColor: "#fff0f0", border: "1px solid rgba(200,0,0,0.2)", borderRadius: "6px", fontSize: "13.5px", color: "#b91c1c", marginBottom: "16px" }}>
                  {detailsResult.error}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setDetailsLoading(true);
                  setDetailsResult(null);
                  try {
                    const res = await updatePersonDetails({
                      ...detailsForm,
                      neighbourhood: detailsForm.neighbourhood === "Other" && detailsForm.customNeighbourhood.trim() ? detailsForm.customNeighbourhood.trim() : detailsForm.neighbourhood,
                      stage: selectedStages.join(","),
                    });
                    setDetailsResult(res);
                    if (res.success) {
                      const refreshed = await getAccountData();
                      if (refreshed.success) setAccountData(refreshed);
                    }
                  } finally {
                    setDetailsLoading(false);
                  }
                }}
                style={{ display: "flex", flexDirection: "column", gap: "18px" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
                  <div>
                    <label style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "7px", display: "block" }}>
                      {lang === "en" ? "Name and last name" : "Nombre y apellidos"}
                    </label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="text"
                        placeholder={lang === "en" ? "First name" : "Nombre"}
                        value={detailsForm.firstName}
                        onChange={(e) => setDetailsForm({ ...detailsForm, firstName: e.target.value })}
                        required
                        style={{ width: "100%", boxSizing: "border-box", minHeight: "46px", padding: "11px 14px", fontSize: "15px", fontFamily: "'Lora', Georgia, serif", color: "#39292a", background: "#fff", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "5px", outline: "none" }}
                      />
                      <input
                        type="text"
                        placeholder={lang === "en" ? "Last name" : "Apellidos"}
                        value={detailsForm.lastName}
                        onChange={(e) => setDetailsForm({ ...detailsForm, lastName: e.target.value })}
                        style={{ width: "100%", boxSizing: "border-box", minHeight: "46px", padding: "11px 14px", fontSize: "15px", fontFamily: "'Lora', Georgia, serif", color: "#39292a", background: "#fff", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "5px", outline: "none" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "7px", display: "block" }}>
                      {lang === "en" ? "Email" : "Email"}
                    </label>
                    <input
                      type="email"
                      value={memberData?.person?.email || session.user?.email || ""}
                      disabled
                      style={{ width: "100%", boxSizing: "border-box", minHeight: "46px", padding: "11px 14px", fontSize: "15px", fontFamily: "'Lora', Georgia, serif", background: "rgba(57,41,42,0.05)", color: "rgba(57,41,42,0.55)", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "5px", cursor: "not-allowed" }}
                    />
                    <div style={{ fontSize: "12px", lineHeight: "1.5", color: "rgba(57,41,42,0.5)", marginTop: "6px" }}>
                      {lang === "en" ? (
                        <>Your email is your login. <a href="mailto:hello@themothers.cc" style={{ color: "inherit", textDecoration: "underline" }}>Write to us</a> and we will move it for you.</>
                      ) : (
                        <>Tu email es tu acceso. <a href="mailto:hello@themothers.cc" style={{ color: "inherit", textDecoration: "underline" }}>Escríbenos</a> y lo cambiamos por ti.</>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "7px", display: "block" }}>
                      {lang === "en" ? "Phone" : "Teléfono"}
                    </label>
                    <CountryPhoneInput
                      value={detailsForm.phone}
                      onChange={(val) => setDetailsForm({ ...detailsForm, phone: val })}
                      lang={lang}
                      placeholder={lang === "en" ? "612 345 678" : "612 345 678"}
                    />
                  </div>

                  <div>
                    <label style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "7px", display: "block" }}>
                      {lang === "en" ? "Neighbourhood" : "Barrio"}
                    </label>
                    <select
                      value={detailsForm.neighbourhood}
                      onChange={(e) => setDetailsForm({ ...detailsForm, neighbourhood: e.target.value })}
                      style={{ width: "100%", boxSizing: "border-box", minHeight: "46px", padding: "11px 14px", fontSize: "15px", fontFamily: "'Lora', Georgia, serif", color: "#39292a", background: "#fff", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "5px", outline: "none" }}
                    >
                      {["Ciutat Vella", "Eixample", "Sants-Montjuïc", "Les Corts", "Sarrià-Sant Gervasi", "Gràcia", "Horta-Guinardó", "Nou Barris", "Sant Andreu", "Sant Martí"].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                      <option value="Outside Barcelona">{lang === "en" ? "Outside Barcelona" : "Fuera de Barcelona"}</option>
                      <option value="Other">{lang === "en" ? "Other" : "Otro"}</option>
                    </select>
                    {detailsForm.neighbourhood === "Other" && (
                      <input
                        type="text"
                        placeholder={lang === "en" ? "Enter your neighbourhood" : "Ingresa tu barrio"}
                        value={detailsForm.customNeighbourhood}
                        onChange={(e) => setDetailsForm({ ...detailsForm, customNeighbourhood: e.target.value })}
                        required
                        style={{ width: "100%", boxSizing: "border-box", minHeight: "46px", padding: "11px 14px", fontSize: "15px", fontFamily: "'Lora', Georgia, serif", color: "#39292a", background: "#fff", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "5px", outline: "none", marginTop: "10px" }}
                      />
                    )}
                  </div>

                  {/* Multi-Select Stage Buttons (Image 3) */}
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "7px", display: "block" }}>
                      {lang === "en" ? "Stage" : "Etapa"}
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "9px" }}>
                      {STAGES_KEYS.map((s) => {
                        const isSelected = selectedStages.includes(s.key);
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => {
                              let next = [...selectedStages];
                              if (next.includes(s.key)) {
                                if (next.length > 1) {
                                  next = next.filter((k) => k !== s.key);
                                }
                              } else {
                                next.push(s.key);
                              }
                              setSelectedStages(next);
                            }}
                            style={{
                              border: "1px solid " + (isSelected ? "#7b1f2c" : "rgba(57,41,42,0.28)"),
                              color: isSelected ? "#7b1f2c" : "rgba(57,41,42,0.7)",
                              backgroundColor: isSelected ? "rgba(123, 31, 44, 0.08)" : "#fff",
                              padding: "9px 16px",
                              borderRadius: "20px",
                              fontSize: "14px",
                              fontFamily: "'Lora', Georgia, serif",
                              cursor: "pointer",
                              outline: "none",
                              transition: "all 0.2s ease",
                            }}
                          >
                            {lang === "en" ? s.labelEn : s.labelEs}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.55)", marginTop: "7px" }}>
                      {lang === "en" ? "Pick every stage you are in — one per child." : "Elige todas las etapas en las que estés — una por hijo/a."}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", marginTop: "10px" }}>
                  <button
                    type="submit"
                    disabled={detailsLoading}
                    style={{
                      border: "1px solid #7b1f2c",
                      background: "#7b1f2c",
                      color: "#f8efe2",
                      padding: "12px 24px",
                      borderRadius: "4px",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 600,
                      fontSize: "14.5px",
                      cursor: detailsLoading ? "wait" : "pointer"
                    }}
                  >
                    {detailsLoading
                      ? (lang === "en" ? "Saving…" : "Guardando…")
                      : (lang === "en" ? "Save details" : "Guardar cambios")}
                  </button>
                </div>
              </form>

              {/* Sign out and Delete account divider inside Personal details card */}
              <div style={{ marginTop: "28px", borderTop: "1px solid rgba(57,41,42,0.12)", paddingTop: "22px", display: "flex", flexDirection: "column", gap: "16px", alignItems: "flex-start" }}>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut({ redirect: false });
                    window.location.href = "/";
                  }}
                  style={{
                    border: "1px solid rgba(57, 41, 42, 0.28)",
                    background: "transparent",
                    color: "rgba(57, 41, 42, 0.78)",
                    borderRadius: "4px",
                    padding: "10px 20px",
                    fontFamily: "'Lora', Georgia, serif",
                    fontSize: "13.5px",
                    cursor: "pointer",
                  }}
                >
                  {lang === "en" ? "Sign out" : "Cerrar sesión"}
                </button>

                {!showDeleteModal ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "rgba(153, 56, 66, 0.8)",
                      fontSize: "13px",
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                    }}
                  >
                    {lang === "en" ? "Delete my account" : "Eliminar mi cuenta"}
                  </button>
                ) : (
                  <div style={{ width: "100%", maxWidth: "560px", backgroundColor: "#fdf2f2", border: "1px solid rgba(153,56,66,0.35)", borderRadius: "8px", padding: "20px 22px" }}>
                    <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px", color: "#993842", margin: "0 0 10px" }}>
                      {lang === "en" ? "Delete your account permanently?" : "¿Eliminar tu cuenta de forma permanente?"}
                    </h3>
                    <p style={{ fontSize: "14px", lineHeight: "1.55", color: "#39292a", margin: "0 0 12px" }}>
                      {lang === "en"
                        ? "If you delete your account, here is what happens:"
                        : "Si eliminas tu cuenta, esto es lo que ocurrirá:"}
                    </p>
                    <ul style={{ fontSize: "13.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.85)", margin: "0 0 18px", paddingLeft: "20px" }}>
                      <li>{lang === "en" ? "Your upcoming bookings will be cancelled and the places freed" : "Tus reservas próximas se cancelarán y las plazas quedarán libres"}</li>
                      <li>{lang === "en" ? "Any remaining credits in your wallet are forfeited" : "Los créditos restantes en tu monedero se perderán"}</li>
                      <li>{lang === "en" ? "Your La Gazette posts stay, signed \"A mother in Barcelona\"" : "Tus publicaciones en La Gazette permanecerán firmadas como \"Una madre en Barcelona\""}</li>
                      <li><strong>{lang === "en" ? "This action is permanent and cannot be undone" : "Esta acción es definitiva y no se puede deshacer"}</strong></li>
                    </ul>
                    {deleteError && (
                      <div style={{ color: "#b91c1c", fontSize: "13px", marginBottom: "12px" }}>{deleteError}</div>
                    )}
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        type="button"
                        disabled={deleteLoading}
                        onClick={handleDeleteAccount}
                        style={{
                          backgroundColor: "#993842",
                          color: "#faf7f1",
                          border: "1px solid #993842",
                          padding: "10px 20px",
                          borderRadius: "4px",
                          fontFamily: "'Cormorant Garamond', serif",
                          fontWeight: 600,
                          fontSize: "14.5px",
                          cursor: deleteLoading ? "wait" : "pointer",
                        }}
                      >
                        {deleteLoading
                          ? (lang === "en" ? "Deleting…" : "Eliminando…")
                          : (lang === "en" ? "Delete permanently" : "Eliminar permanentemente")}
                      </button>
                      <button
                        type="button"
                        disabled={deleteLoading}
                        onClick={() => {
                          setShowDeleteModal(false);
                          setDeleteError(null);
                        }}
                        style={{
                          backgroundColor: "transparent",
                          border: "1px solid rgba(57,41,42,0.3)",
                          color: "#39292a",
                          padding: "10px 18px",
                          borderRadius: "4px",
                          fontFamily: "'Cormorant Garamond', serif",
                          fontWeight: 600,
                          fontSize: "14.5px",
                          cursor: "pointer",
                        }}
                      >
                        {lang === "en" ? "Keep my account" : "Conservar mi cuenta"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pause & Cancel Membership — only shown to paying / active members when membership is live */}
            {accountData?.settings?.membershipLive && (memberData?.status === "active" || memberData?.status === "paused" || memberData?.cancelAtPeriodEnd) && (
              <>
                {/* Pause Membership */}
                <div style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px", padding: "clamp(22px, 3vw, 28px)", backgroundColor: "#fffdfa" }}>
                  <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "22px", lineHeight: "1.2", margin: "0 0 10px", color: "#39292a" }}>
                    {lang === "en" ? "Pause allowance" : "Pausas disponibles"}
                  </h2>
                  <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.78)", margin: "0 0 18px" }}>
                    {lang === "en"
                      ? "Pause for up to two whole months a calendar year, free of charge. While you are paused your credits are frozen — the six-month expiry clock stops with them — and nothing is billed."
                      : "Puedes pausar hasta dos meses completos por año natural, sin coste. Mientras estás en pausa tus créditos quedan congelados — el reloj de caducidad de seis meses se detiene con ellos — y no se cobra nada."}
                  </p>

                  {memberData?.status === "paused" || pauseResult?.success ? (
                    <div style={{ padding: "16px 20px", backgroundColor: "#f4f7ee", border: "1px solid rgba(86,139,5,0.35)", borderRadius: "6px", fontSize: "14px", color: "rgba(57,41,42,0.88)", marginBottom: "12px" }}>
                      <div style={{ fontWeight: 600, marginBottom: "4px", color: "#3e6308" }}>✓ {lang === "en" ? "Your membership is paused." : "Tu membresía está pausada."}</div>
                      <div style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)" }}>
                        {lang === "en" ? "Your credits are frozen and nothing will be billed while you're away." : "Tus créditos están congelados y no se cobrará nada mientras estés en pausa."}
                      </div>
                      <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          disabled={resumeLoading}
                          onClick={async () => {
                            setResumeLoading(true);
                            try {
                              const res = await resumeMembership();
                              if (res.success) {
                                setPauseResult(null);
                                const refreshed = await getAccountData();
                                if (refreshed.success) setAccountData(refreshed);
                              } else {
                                alert(res.error || (lang === "en" ? "Failed to resume membership." : "Error al reanudar la membresía."));
                              }
                            } finally {
                              setResumeLoading(false);
                            }
                          }}
                          style={{ border: "1px solid #568b05", color: "#456f04", backgroundColor: "transparent", padding: "9px 20px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", cursor: resumeLoading ? "wait" : "pointer" }}
                        >
                          {resumeLoading ? (lang === "en" ? "Resuming…" : "Reanudando…") : (lang === "en" ? "Resume membership" : "Reanudar membresía")}
                        </button>
                      </div>
                    </div>
                  ) : pauseResult?.error ? (
                    <div style={{ padding: "12px 16px", backgroundColor: "#fff0f0", border: "1px solid rgba(200,0,0,0.25)", borderRadius: "6px", fontSize: "13.5px", color: "#b91c1c", marginBottom: "14px" }}>
                      {pauseResult.error}
                    </div>
                  ) : null}

                  {memberData?.status !== "paused" && !pauseResult?.success && (
                    !showPauseConfirm ? (
                      <button
                        type="button"
                        disabled={pauseLoading}
                        onClick={() => setShowPauseConfirm(true)}
                        style={{
                          border: "1px solid #7b1f2c",
                          color: "#7b1f2c",
                          backgroundColor: "transparent",
                          padding: "10px 22px",
                          borderRadius: "4px",
                          fontFamily: "var(--font-heading)",
                          fontWeight: 600,
                          fontSize: "14.5px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {lang === "en" ? "Request a pause" : "Solicitar una pausa"}
                      </button>
                    ) : (
                      <div style={{ border: "1px solid rgba(86,139,5,0.4)", borderRadius: "6px", padding: "18px 20px", backgroundColor: "#f4f7ee" }}>
                        <p style={{ fontSize: "14px", lineHeight: "1.55", color: "#39292a", margin: "0 0 14px" }}>
                          {lang === "en"
                            ? "Pause for up to two months a year at no cost — your credit expiry clock pauses too, so nothing lapses while you're away."
                            : "Pausa hasta dos meses al año sin coste — el reloj de caducidad de créditos también se detiene, así que no pierdes nada mientras estás fuera."}
                        </p>
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            disabled={pauseLoading}
                            onClick={async () => {
                              setPauseLoading(true);
                              try {
                                const res = await pauseMembership();
                                setPauseResult(res);
                                setShowPauseConfirm(false);
                                if (res.success) {
                                  const refreshed = await getAccountData();
                                  if (refreshed.success) setAccountData(refreshed);
                                }
                              } finally {
                                setPauseLoading(false);
                              }
                            }}
                            style={{ border: "1px solid #568b05", color: "#456f04", backgroundColor: "transparent", padding: "10px 20px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", cursor: pauseLoading ? "wait" : "pointer" }}
                          >
                            {pauseLoading ? (lang === "en" ? "Processing…" : "Procesando…") : (lang === "en" ? "Yes, pause my membership" : "Sí, pausar mi membresía")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowPauseConfirm(false)}
                            style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", padding: "10px 20px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", backgroundColor: "transparent", cursor: "pointer" }}
                          >
                            {lang === "en" ? "Keep my membership active" : "Mantener mi membresía activa"}
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Cancel Membership — always rendered for active subscribers; text changes when scheduled */}
                {!memberData?.cancelAtPeriodEnd ? (
                  <div style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px", padding: "clamp(22px, 3vw, 28px)", backgroundColor: "#fffdfa" }}>
                    <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", lineHeight: "1.2", margin: "0 0 10px", color: "#993842" }}>
                      {lang === "en" ? "Cancel membership" : "Cancelar la membresía"}
                    </h2>
                    <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.75)", margin: "0 0 18px" }}>
                      {lang === "en"
                        ? "Cancel any time; there is never a cancellation fee. You keep your place until the end of the period you have paid for."
                        : "Puedes cancelar cuando quieras; nunca hay cuota de cancelación. Conservas tu plaza hasta el final del periodo que ya has pagado."}
                    </p>

                    {cancelResult?.error && (
                      <div style={{ padding: "12px 16px", backgroundColor: "#fff0f0", border: "1px solid rgba(200,0,0,0.25)", borderRadius: "6px", fontSize: "13.5px", color: "#b91c1c", marginBottom: "12px" }}>
                        {cancelResult.error}
                      </div>
                    )}

                    {!showCancelConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowCancelConfirm(true)}
                        style={{
                          border: "1px solid #993842",
                          color: "#993842",
                          backgroundColor: "transparent",
                          padding: "12px 22px",
                          borderRadius: "4px",
                          fontFamily: "'Cormorant Garamond', serif",
                          fontWeight: 600,
                          fontSize: "14.5px",
                          cursor: "pointer"
                        }}
                      >
                        {lang === "en" ? "Cancel membership" : "Cancelar membresía"}
                      </button>
                    ) : (
                      <div style={{ border: "1px solid rgba(153,56,66,0.4)", borderRadius: "6px", padding: "18px 20px", backgroundColor: "#fdf2f2" }}>
                        <p style={{ fontSize: "14px", lineHeight: "1.55", color: "#39292a", margin: "0 0 14px" }}>
                          {lang === "en"
                            ? "Cancelling ends your membership at the close of the current billing period. Pausing allows you to step away for up to two months per year at no cost; cancelling ends your membership."
                            : "Cancelar finaliza tu membresía al cierre del periodo de facturación actual. Pausar te permite ausentarte hasta dos meses al año sin coste; cancelar finaliza tu membresía."}
                        </p>
                        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            disabled={cancelLoading}
                            onClick={async () => {
                              setCancelLoading(true);
                              setCancelResult(null);
                              try {
                                const res = await cancelMembership();
                                setCancelResult(res);
                                if (res.success) {
                                  const refreshed = await getAccountData();
                                  if (refreshed.success) setAccountData(refreshed);
                                }
                              } finally {
                                setCancelLoading(false);
                              }
                            }}
                            style={{ border: "1px solid #993842", color: "#993842", padding: "10px 20px", borderRadius: "4px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", backgroundColor: "transparent", cursor: "pointer" }}
                          >
                            {cancelLoading ? (lang === "en" ? "Processing…" : "Procesando…") : (lang === "en" ? "Yes, cancel my membership" : "Sí, cancelar mi membresía")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCancelConfirm(false)}
                            style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", padding: "10px 20px", borderRadius: "4px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", backgroundColor: "transparent", cursor: "pointer" }}
                          >
                            {lang === "en" ? "Keep my membership" : "Mantener mi membresía"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: "16px 20px", backgroundColor: "#fdf2f2", border: "1px solid rgba(153,56,66,0.4)", borderRadius: "6px", marginBottom: "14px" }}>
                    <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 500, fontSize: "17px", color: "#993842", margin: "0 0 6px" }}>
                      {lang === "en" ? "Membership scheduled for cancellation" : "Membresía programada para cancelación"}
                    </h3>
                    <p style={{ fontSize: "14px", color: "#39292a", margin: "0 0 14px", lineHeight: 1.5 }}>
                      {lang === "en"
                        ? "Your membership has been cancelled and will end at the close of your current billing period. If you changed your mind, you can reactivate it anytime before the end of the period."
                        : "Tu membresía ha sido cancelada y finalizará al cierre de tu periodo de facturación actual. Si has cambiado de opinión, puedes reactivarla en cualquier momento antes de que finalice el periodo."}
                    </p>
                    <button
                      type="button"
                      disabled={reactivateLoading}
                      onClick={async () => {
                        setReactivateLoading(true);
                        try {
                          const res = await reactivateMembership();
                          if (res.success) {
                            const refreshed = await getAccountData();
                            if (refreshed.success) setAccountData(refreshed);
                          } else {
                            alert(res.error || "Failed to reactivate membership");
                          }
                        } finally {
                          setReactivateLoading(false);
                        }
                      }}
                      style={{
                        border: "1px solid #3f6604",
                        color: "#3f6604",
                        backgroundColor: "transparent",
                        padding: "10px 18px",
                        borderRadius: "4px",
                        fontFamily: "'Cormorant Garamond', serif",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: "pointer"
                      }}
                    >
                      {reactivateLoading ? (lang === "en" ? "Reactivating…" : "Reactivando…") : (lang === "en" ? "Reactivate my membership" : "Reactivar mi membresía")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fdf8f2" }}>
          <ThemeLoader text="Loading..." size="large" />
        </div>
      }
    >
      <AccountPageContent />
    </Suspense>
  );
}
