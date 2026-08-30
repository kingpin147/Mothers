"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Locale } from "@/lib/i18n";
import { getAccountData, pauseMembership, updatePersonDetails, cancelMembership, getStripePortalUrl } from "@/app/actions/memberAccount";
import { buyExtraCredits } from "@/app/actions/booking";

type AccountTab = "overview" | "credits" | "perks" | "membership";

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

const PERKS_LIST: PerkItem[] = [
  {
    id: "botanica",
    categoryEn: "Brands & Retail",
    categoryEs: "Marcas y tiendas",
    name: "Bebé Botánica",
    whereEn: "Gràcia · shop and online",
    whereEs: "Gràcia · tienda y online",
    offerEn: "15% off everything, in store and online.",
    offerEs: "15% de descuento en todo, en tienda y online.",
    detailEn: "Cot linen, wooden toys, the good muslin. Excludes sale items.",
    detailEs: "Ropa de cuna, juguetes de madera, las muselinas buenas. No aplica a rebajas.",
    kind: "code",
    code: "MOTHERS15",
    validityEn: "Ongoing while the partnership runs",
    validityEs: "Vigente mientras dure el acuerdo",
  },
  {
    id: "duet",
    categoryEn: "Expert Care & Support",
    categoryEs: "Cuidado experto",
    name: "Clínica Duet",
    whereEn: "Eixample · pelvic-floor physiotherapy",
    whereEs: "Eixample · fisioterapia de suelo pélvico",
    offerEn: "First postnatal assessment €35 instead of €60.",
    offerEs: "Primera valoración posparto por 35 € en vez de 60 €.",
    detailEn: "Quote the code when you book by phone or on their site.",
    detailEs: "Da el código al reservar por teléfono o en su web.",
    kind: "personal",
    code: "TM-DUET-4417",
    validityEn: "Valid until 31 December",
    validityEs: "Válido hasta el 31 de diciembre",
  },
  {
    id: "casanena",
    categoryEn: "Places & Hospitality",
    categoryEs: "Lugares",
    name: "Casa Nena",
    whereEn: "Sant Antoni · café",
    whereEs: "Sant Antoni · café",
    offerEn: "Coffee and a pastry on the house before 11am.",
    offerEs: "Café y bollería invitados antes de las 11h.",
    detailEn: "Any weekday morning, whether or not there is an event on.",
    detailEs: "Cualquier mañana entre semana, haya evento o no.",
    kind: "door",
    doorNoteEn: "No code — show your member card in the app at the counter.",
    doorNoteEs: "Sin código: enseña tu carné de socia en la barra.",
    validityEn: "Ongoing while the partnership runs",
    validityEs: "Vigente mientras dure el acuerdo",
  },
  {
    id: "lluna",
    categoryEn: "Wellness & Movement",
    categoryEs: "Bienestar y movimiento",
    name: "Lluna Postpartum",
    whereEn: "Home visits across Barcelona",
    whereEs: "A domicilio en Barcelona",
    offerEn: "20% off your first massage or doula session.",
    offerEs: "20% en tu primer masaje o sesión de doula.",
    detailEn: "Members book through a private link that holds the rate.",
    detailEs: "Las socias reservan por un enlace privado que fija la tarifa.",
    kind: "link",
    href: "https://llunapostpartum.com",
    validityEn: "Ongoing while the partnership runs",
    validityEs: "Vigente mientras dure el acuerdo",
  },
  {
    id: "atelier",
    categoryEn: "Brands & Retail",
    categoryEs: "Marcas y tiendas",
    name: "Petit Atelier",
    whereEn: "Poble-sec · family photography",
    whereEs: "Poble-sec · fotografía familiar",
    offerEn: "€40 off a family sitting, prints included.",
    offerEs: "40 € menos en una sesión familiar, copias incluidas.",
    detailEn: "One sitting per member. Studio or outdoors.",
    detailEs: "Una sesión por socia. En estudio o en exterior.",
    kind: "personal",
    code: "TM-ATL-0982",
    validityEn: "Valid until 12 September",
    validityEs: "Válido hasta el 12 de septiembre",
    endingSoon: true,
  },
  {
    id: "ona",
    categoryEn: "Baby & Child Activities",
    categoryEs: "Actividades",
    name: "Ona Swim",
    whereEn: "Poblenou · baby swimming",
    whereEs: "Poblenou · natación para bebés",
    offerEn: "Two trial classes free, then 10% off a term.",
    offerEs: "Dos clases de prueba gratis y 10% en el trimestre.",
    detailEn: "From four months. Give the code at reception.",
    detailEs: "Desde los cuatro meses. Da el código en recepción.",
    kind: "code",
    code: "MOTHERSONA",
    validityEn: "Ongoing while the partnership runs",
    validityEs: "Vigente mientras dure el acuerdo",
  },
];

const STAGES_KEYS = [
  { key: "expecting", labelEn: "Pregnant", labelEs: "Embarazo", whatsapp: "https://chat.whatsapp.com/DE10fxxsteA6ItbTPt6HnC" },
  { key: "babies", labelEn: "Babies", labelEs: "Bebés", whatsapp: "https://chat.whatsapp.com/CSgdyyfXDCjDwwDh17j0yB" },
  { key: "toddlers", labelEn: "Toddlers", labelEs: "Peques", whatsapp: "https://chat.whatsapp.com/KYaepZmYshSGemCDnoXO4C" },
  { key: "children36", labelEn: "Children", labelEs: "Niños", whatsapp: "https://chat.whatsapp.com/EPaXEsg41sG0dZjyBJU2xr" },
  { key: "children610", labelEn: "Big kids", labelEs: "Niños grandes", whatsapp: "https://chat.whatsapp.com/DaOQgBCeZPoB6Z5fXTzXMo" },
];

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lang, setLang] = useState<Locale>("en");
  const [activeTab, setActiveTab] = useState<AccountTab>("overview");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(10);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountData, setAccountData] = useState<any>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Stripe Portal Loading State
  const [portalLoading, setPortalLoading] = useState(false);

  // Membership pause state
  const [pauseLoading, setPauseLoading] = useState(false);
  const [pauseResult, setPauseResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Membership cancel state
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ success: boolean; error?: string; currentPeriodEnd?: string | null } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Details form state
  const [detailsForm, setDetailsForm] = useState({ firstName: "", lastName: "", phone: "", stage: "", neighbourhood: "" });
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsResult, setDetailsResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Extra credits top-up state
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  // Perks revealed codes state
  const [revealedPerks, setRevealedPerks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved as Locale);
  }, []);

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
          const res = await getAccountData();
          if (res.success) {
            setAccountData(res);
            setAccountError(null);
            // Pre-populate details form
            setDetailsForm({
              firstName: res.member?.firstName || "",
              lastName: res.member?.lastName || "",
              phone: res.member?.phone || "",
              stage: res.member?.stage || "",
              neighbourhood: res.member?.neighbourhood || "",
            });
            // Parse stages
            const currentStages = res.member?.stage
              ? res.member.stage.split(",").map((s: string) => s.trim())
              : [];
            setSelectedStages(currentStages);
          } else {
            setAccountError(res.error || "Failed to load account data");
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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8efe2", fontFamily: "'Lora', Georgia, serif" }}>
        <p style={{ fontSize: "18px", color: "#7b1f2c", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>Loading your circle...</p>
      </div>
    );
  }

  if (!session?.user || !accountData || accountError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px", backgroundColor: "#f8efe2", fontFamily: "'Lora', Georgia, serif" }}>
        <p style={{ fontSize: "18px", color: "#7b1f2c", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>Unable to load your account</p>
        {accountError && <p style={{ fontSize: "14px", color: "var(--color-accent)" }}>{accountError}</p>}
      </div>
    );
  }

  const user = session.user as any;
  const memberData = accountData?.member;
  const firstName = memberData?.firstName || user.name?.split(" ")[0] || "Member";
  const availableCredits = accountData?.credits?.available || 0;
  const referralCode = `MOTHERS-${(memberData?.firstName || "MEMBER").toUpperCase().slice(0, 4)}-BCN`;

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

  const TABS: { id: AccountTab; labelEn: string; labelEs: string }[] = [
    { id: "overview", labelEn: "Overview", labelEs: "Resumen" },
    { id: "credits", labelEn: "Credits", labelEs: "Créditos" },
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
    <div style={{ backgroundColor: "#f8efe2", color: "#39292a", minHeight: "100vh", fontFamily: "'Lora', Georgia, serif", padding: "clamp(40px, 5vw, 64px) clamp(24px, 5vw, 64px) 88px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        
        {/* Header Greeting */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "4px" }}>
              {lang === "en" ? "Member Account" : "Cuenta de Socia"}
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(34px, 5vw, 54px)", margin: "0 0 4px 0", lineHeight: 1.1 }}>
              {lang === "en" ? "Welcome back." : "Bienvenida de nuevo."}
            </h1>
            <p style={{ fontSize: "16px", color: "rgba(57, 41, 42, 0.72)", margin: 0 }}>
              {lang === "en"
                ? "Your credits, your bookings and your membership, all in one place."
                : "Tus créditos, tus reservas y tu membresía, todo en un mismo lugar."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ border: "1px solid #7b1f2c", color: "#7b1f2c", padding: "6px 14px", borderRadius: "4px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px" }}>
              Opening Circle
            </span>
            <span style={{ border: "1px solid #568b05", color: "#568b05", padding: "6px 14px", borderRadius: "4px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px" }}>
              ★ Godmother Active
            </span>
          </div>
        </div>

        {/* Balance & Code Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            border: "1px solid rgba(57, 41, 42, 0.18)",
            borderRadius: "8px",
            backgroundColor: "#f8efe2",
            overflow: "hidden",
            marginBottom: "32px",
          }}
        >
          <div style={{ padding: "18px 22px", borderRight: "1px solid rgba(57, 41, 42, 0.14)" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.5)", marginBottom: "7px" }}>
              {lang === "en" ? "Credits Available" : "Créditos Disponibles"}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "7px" }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "32px", color: "#39292a" }}>{availableCredits}</span>
              <span style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.6)" }}>{lang === "en" ? "credits remaining" : "créditos restantes"}</span>
            </div>
          </div>

          <div style={{ padding: "18px 22px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.5)", marginBottom: "7px" }}>
              {lang === "en" ? "Your Godmother Code" : "Tu Código de Madrina"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", letterSpacing: "0.03em", color: "#568b05" }}>
                {referralCode}
              </span>
              <button
                type="button"
                onClick={() => copyText(referralCode, "referral")}
                style={{
                  border: "1px solid rgba(86, 139, 5, 0.5)",
                  color: "#568b05",
                  padding: "4px 11px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "12px",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {copiedCode === "referral" ? (lang === "en" ? "Copied!" : "¡Copiado!") : (lang === "en" ? "Copy" : "Copiar")}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "26px", borderBottom: "1px solid rgba(57, 41, 42, 0.2)", marginBottom: "28px", overflowX: "auto", scrollbarWidth: "none" }}>
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
                  fontSize: "15px",
                  letterSpacing: "0.03em",
                  color: isSelected ? "#7b1f2c" : "rgba(57, 41, 42, 0.6)",
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
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {accountData.bookings.map((b: any) => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", borderBottom: "1px solid rgba(57,41,42,0.08)", paddingBottom: "16px" }}>
                      <div>
                        <span style={{ fontSize: "11px", letterSpacing: "0.04em", color: "#7b1f2c", border: "1px solid rgba(123,31,44,0.3)", borderRadius: "10px", padding: "2px 8px", marginRight: "8px", verticalAlign: "middle" }}>
                          {lang === "en" ? "Easy connection" : "Conexión fácil"}
                        </span>
                        <div style={{ fontWeight: 600, fontSize: "15px", marginTop: "6px" }}>{b.eventTitle}</div>
                        <div style={{ fontSize: "13.5px", color: "rgba(57, 41, 42, 0.65)", marginTop: "4px" }}>
                          {new Date(b.eventDate).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { weekday: "short", day: "numeric", month: "short" })} · {new Date(b.eventDate).toLocaleTimeString(lang === "en" ? "en-GB" : "es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div style={{ fontSize: "13px", color: "rgba(57, 41, 42, 0.5)", marginTop: "2px" }}>
                          📍 {b.eventLocation}
                        </div>
                      </div>
                      
                      <span style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        backgroundColor: b.status === "confirmed" ? "#e8f1e9" : "#fff3e4",
                        color: b.status === "confirmed" ? "#285430" : "#a4761f",
                        padding: "4px 10px",
                        borderRadius: "4px",
                        border: `1px solid ${b.status === "confirmed" ? "rgba(74,122,80,0.3)" : "rgba(164,118,31,0.3)"}`,
                      }}>
                        {b.status === "confirmed"
                          ? (lang === "en" ? "Confirmed" : "Confirmada")
                          : (lang === "en" ? "Pending" : "Pendiente")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "20px", backgroundColor: "#faf7f2", borderRadius: "6px", textAlign: "center", color: "rgba(57,41,42,0.6)", fontSize: "14px", fontStyle: "italic" }}>
                  {lang === "en"
                    ? "No upcoming bookings. Browse the calendar and reserve your next spot."
                    : "Sin próximas reservas. Explora el calendario y reserva tu siguiente plaza."}
                </div>
              )}

              <p style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.5)", lineHeight: 1.5, marginTop: "20px", marginBottom: 0 }}>
                {lang === "en"
                  ? "Meeting points are shared with booked members only — please keep them inside the club. Cancel more than 24 hours ahead and your credits come straight back. Inside 24 hours, they return only if someone on the waitlist takes your place — and two no-shows in three months pause your RSVPs."
                  : "Los puntos de encuentro se comparten solo con las socias reservadas; por favor, mantenlos dentro del club. Si cancelas con más de 24h, recuperas tus créditos. Dentro de las 24h, solo se devuelven si alguien de la lista ocupa tu plaza."}
              </p>
            </div>

            <div style={{ display: "flex", gap: "16px" }}>
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

            {/* WhatsApp Stage Circles - Render a box for each stage they are in */}
            {selectedStages.length > 0 && selectedStages.map((stageKey) => {
              const matched = STAGES_KEYS.find((s) => s.key === stageKey);
              if (!matched) return null;
              return (
                <div key={stageKey} style={{ border: "1px solid rgba(86,139,5,0.4)", borderRadius: "8px", padding: "clamp(22px, 3vw, 28px)", backgroundColor: "#f4f7ee" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#568b05", marginBottom: "9px" }}>
                    {lang === "en" ? "Private WhatsApp Circle" : "Círculo Privado de WhatsApp"}
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
                      display: "inline-block",
                      border: "1px solid #568b05",
                      color: "#456f04",
                      backgroundColor: "#fffdfa",
                      padding: "12px 22px",
                      borderRadius: "4px",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "14.5px",
                      textDecoration: "none",
                    }}
                  >
                    {lang === "en" ? "Open WhatsApp thread →" : "Abrir el hilo de WhatsApp →"}
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
        {activeTab === "credits" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Main Credits Card (Image 2 style) */}
            <div style={{ border: "1px solid rgba(57, 41, 42, 0.16)", borderRadius: "8px", padding: "clamp(24px, 4vw, 36px)", backgroundColor: "#fffdfa" }}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px", borderBottom: "1px solid rgba(57,41,42,0.1)", paddingBottom: "14px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#7b1f2c" }}>
                  {lang === "en" ? "MONTHLY CREDITS" : "CRÉDITOS MENSUALES"}
                </div>
                <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.5)" }}>
                  {(() => {
                    const renewalDate = memberData?.currentPeriodEnd ? new Date(memberData.currentPeriodEnd) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
                    const renewalDateStr = renewalDate.toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { month: "short", day: "numeric", year: "numeric" });
                    return lang === "en" ? `Credits renew on ${renewalDateStr}` : `Los créditos se renuevan el ${renewalDateStr}`;
                  })()}
                </div>
              </div>

              {/* Large balance display */}
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "20px" }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "56px", color: "#39292a", lineHeight: 1 }}>{availableCredits}</span>
                <span style={{ fontSize: "16px", color: "rgba(57, 41, 42, 0.6)" }}>{lang === "en" ? "credits remaining" : "créditos restantes"}</span>
              </div>

              {/* Balance bar */}
              <div style={{ margin: "24px 0" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.5)", marginBottom: "8px" }}>
                  {lang === "en" ? "YOUR BALANCE RIGHT NOW" : "TU SALDO AHORA MISMO"}
                </div>
                <div style={{ height: "8px", borderRadius: "4px", backgroundColor: "rgba(57,41,42,0.12)", overflow: "hidden", margin: "10px 0 14px" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, (availableCredits / 20) * 100)}%`, backgroundColor: "#568b05" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", color: "#568b05", fontWeight: 600 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", borderRadius: "3px", border: "2px solid #568b05", fontSize: "11px" }}>✓</span>
                  <span>{lang === "en" ? `${availableCredits} ready to spend` : `${availableCredits} listos para usar`}</span>
                </div>
              </div>

              {/* Ledger breakdown (How you got here) */}
              <div style={{ borderTop: "1px solid rgba(57,41,42,0.1)", paddingTop: "20px", marginTop: "20px" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.5)", marginBottom: "14px" }}>
                  {lang === "en" ? "HOW YOU GOT HERE" : "DE DÓNDE VIENEN"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(57,41,42,0.06)", paddingBottom: "6px" }}>
                    <span style={{ color: "rgba(57, 41, 42, 0.7)" }}>{lang === "en" ? "Rolled over" : "Acumulados"}</span>
                    <strong>+{availableCredits > 20 ? availableCredits - 20 : 0}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(57,41,42,0.06)", paddingBottom: "6px" }}>
                    <span style={{ color: "rgba(57, 41, 42, 0.7)" }}>{lang === "en" ? "This month" : "Este mes"}</span>
                    <strong>+{availableCredits > 20 ? 20 : availableCredits}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: "15px", paddingTop: "6px" }}>
                    <span>{lang === "en" ? "Credits remaining" : "Créditos disponibles"}</span>
                    <span>{availableCredits}</span>
                  </div>
                </div>
                <p style={{ fontSize: "12.5px", color: "rgba(57, 41, 42, 0.5)", margin: "10px 0 0 0", fontStyle: "italic" }}>
                  {lang === "en" ? "Rollover credits will be used first when booking an event." : "Los créditos acumulados se usan primero al reservar un encuentro."}
                </p>
              </div>

              {/* Spent section */}
              <div style={{ borderTop: "1px solid rgba(57,41,42,0.1)", paddingTop: "20px", marginTop: "24px" }}>
                {(() => {
                  const spent = accountData.bookings?.reduce((acc: number, b: any) => acc + (b.creditsCharged || 0), 0) || 0;
                  const monthName = new Date().toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { month: "long" });
                  return (
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57, 41, 42, 0.5)", marginBottom: "10px" }}>
                        {lang === "en" ? `SPENT IN ${monthName.toUpperCase()}` : `USADOS EN ${monthName.toUpperCase()}`}
                      </div>
                      <p style={{ fontSize: "14px", color: "rgba(57, 41, 42, 0.7)", margin: "0 0 16px 0" }}>
                        {lang === "en"
                          ? `${spent} credits already gone from your balance.`
                          : `${spent} créditos ya descontados de tu saldo.`}
                      </p>
                    </div>
                  );
                })()}

                {/* Inline action buttons */}
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => { setTopUpError(null); }}
                    style={{
                      border: "1px solid #7b1f2c",
                      color: "#7b1f2c",
                      backgroundColor: "transparent",
                      padding: "10px 20px",
                      borderRadius: "4px",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    {lang === "en" ? "Buy extra credits" : "Comprar créditos extra"}
                  </button>
                  <Link
                    href="/events"
                    style={{
                      border: "1px solid #7b1f2c",
                      backgroundColor: "#7b1f2c",
                      color: "#f8efe2",
                      padding: "10px 20px",
                      borderRadius: "4px",
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 600,
                      fontSize: "14px",
                      textDecoration: "none",
                    }}
                  >
                    {lang === "en" ? "Book an event" : "Reservar un evento"}
                  </Link>
                </div>
              </div>
            </div>

            {/* FIFO Breakdown Section */}
            <div style={{ border: "1px solid rgba(57, 41, 42, 0.14)", borderRadius: "8px", padding: "clamp(22px, 3vw, 30px)", backgroundColor: "#fffdfa" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#568b05", marginBottom: "16px" }}>
                {lang === "en" ? "WHERE YOUR BALANCE CAME FROM" : "DE DÓNDE VIENE TU SALDO"}
              </div>

              {/* FIFO entries list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid rgba(57,41,42,0.08)", paddingBottom: "10px" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>
                      {lang === "en" ? "This month's credits, still unspent" : "Créditos de este mes, sin usar"}
                    </div>
                    <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.5)" }}>
                      {new Date().toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { month: "long", year: "numeric" })}
                    </div>
                  </div>
                  <strong style={{ color: "#568b05" }}>+{availableCredits > 20 ? 20 : availableCredits} credits</strong>
                </div>

                {availableCredits > 20 && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid rgba(57,41,42,0.08)", paddingBottom: "10px" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "14px" }}>
                        {lang === "en" ? "Rolled over from previous month" : "Acumulados del mes anterior"}
                      </div>
                      <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.5)" }}>
                        {new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { month: "long", year: "numeric" })}
                      </div>
                    </div>
                    <strong style={{ color: "#568b05" }}>+{availableCredits - 20} credits</strong>
                  </div>
                )}
              </div>

              {/* Download statement (PDF) button */}
              <div style={{ textAlign: "center", borderTop: "1px solid rgba(57,41,42,0.12)", paddingTop: "18px" }}>
                <Link
                  href="/account/statement"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    border: "1px solid rgba(57,41,42,0.25)",
                    borderRadius: "4px",
                    padding: "10px 22px",
                    color: "#39292a",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontWeight: 600,
                    fontSize: "14px",
                    textDecoration: "none",
                    backgroundColor: "#fffdfa",
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  {lang === "en" ? "Download full statement (PDF)" : "Descargar el extracto completo (PDF)"}
                </Link>
                <div style={{ fontSize: "12px", color: "rgba(57, 41, 42, 0.5)", marginTop: "8px" }}>
                  {lang === "en"
                    ? "Everything since you joined, month by month — yours to keep."
                    : "Todo desde que te uniste, mes a mes — para que lo guardes."}
                </div>
              </div>
            </div>

            {/* Custom Styled Add Credits Top Up Form (Image 2) */}
            <div style={{ border: "1px solid rgba(57,41,42,0.18)", borderRadius: "8px", padding: "clamp(24px, 4vw, 32px)", backgroundColor: "#fff" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", margin: "0 0 6px" }}>
                {lang === "en" ? "Add credits — €1 each" : "Añadir créditos — 1€ cada uno"}
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
                      onClick={() => setTopUpAmount(Math.max(1, topUpAmount - 1))}
                      style={{ width: "46px", height: "46px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "5px", backgroundColor: "#f8efe2", color: "#39292a", fontSize: "20px", cursor: "pointer" }}
                    >
                      −
                    </button>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "34px", minWidth: "66px", textAlign: "center" }}>
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
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "34px" }}>
                    {lang === "en" ? `€${topUpAmount}` : `${topUpAmount}€`}
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
                      color: "rgba(57,41,42,0.75)"
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
                    cursor: topUpLoading ? "wait" : "pointer"
                  }}
                >
                  {topUpLoading
                    ? (lang === "en" ? "Processing…" : "Procesando…")
                    : (lang === "en" ? `Pay €${topUpAmount} & Add Credits` : `Pagar ${topUpAmount}€ y Añadir Créditos`)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: PERKS (NEW TAB!) ─── */}
        {activeTab === "perks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ border: "1px solid rgba(57, 41, 42, 0.14)", borderRadius: "8px", padding: "clamp(22px, 3vw, 30px)", backgroundColor: "#fffdfa" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", margin: "0 0 10px" }}>
                {lang === "en" ? "Partner perks" : "Ventajas con nuestros partners"}
              </h2>
              <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.75)", margin: "0 0 24px" }}>
                {lang === "en"
                  ? "What the club opens for you outside the calendar. Every offer below is held for members, arranged one partner at a time, and yours for as long as you are with us."
                  : "Lo que el club te abre fuera del calendario. Cada ventaja está reservada a las socias, acordada partner a partner, y es tuya mientras estés con nosotras."}
              </p>

              {/* Perks Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
                {(() => {
                  const dbPerksMapped: PerkItem[] = (accountData?.partners || []).map((p: any) => ({
                    id: `db-${p.id}`,
                    categoryEn: p.umbrella,
                    categoryEs: p.umbrella,
                    name: p.name,
                    whereEn: p.specialty,
                    whereEs: p.specialty,
                    offerEn: p.offerForMembers,
                    offerEs: p.offerForMembers,
                    detailEn: p.description,
                    detailEs: p.description,
                    kind: p.discountCode ? "code" : "door",
                    code: p.discountCode || "",
                    validityEn: "Exclusive member benefit",
                    validityEs: "Beneficio exclusivo de socias",
                  }));
                  const allPerks = [...PERKS_LIST, ...dbPerksMapped];

                  return allPerks.map((perk) => {
                    const category = lang === "en" ? perk.categoryEn : perk.categoryEs;
                    const where = lang === "en" ? perk.whereEn : perk.whereEs;
                    const offer = lang === "en" ? perk.offerEn : perk.offerEs;
                    const detail = lang === "en" ? perk.detailEn : perk.detailEs;
                    const validity = lang === "en" ? perk.validityEn : perk.validityEs;
                    const isRevealed = !!revealedPerks[perk.id];

                    return (
                      <div
                        key={perk.id}
                        style={{
                          border: "1px solid " + (perk.endingSoon ? "rgba(164,118,31,0.5)" : "rgba(57,41,42,0.18)"),
                          borderRadius: "8px",
                          padding: "20px",
                          backgroundColor: "#fffdfa",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                      <div>
                        <div style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.45)", marginBottom: "4px" }}>
                          {category}
                        </div>
                        <h4 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", margin: "0 0 4px" }}>
                          {perk.name}
                        </h4>
                        <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.5)", marginBottom: "12px" }}>
                          {where}
                        </div>
                        <p style={{ fontSize: "14.5px", fontWeight: 600, margin: "0 0 6px" }}>
                          {offer}
                        </p>
                        <p style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.65)", margin: "0 0 16px" }}>
                          {detail}
                        </p>
                      </div>

                      <div style={{ borderTop: "1px solid rgba(57,41,42,0.1)", paddingTop: "14px", marginTop: "14px" }}>
                        {perk.kind === "door" && (
                          <div style={{ fontSize: "13px", color: "#568b05", fontWeight: 500 }}>
                            {lang === "en" ? perk.doorNoteEn : perk.doorNoteEs}
                          </div>
                        )}

                        {perk.kind === "link" && (
                          <a
                            href={perk.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-block",
                              border: "1px solid #7b1f2c",
                              color: "#7b1f2c",
                              borderRadius: "4px",
                              padding: "8px 16px",
                              fontFamily: "'Cormorant Garamond', serif",
                              fontWeight: 600,
                              fontSize: "13px",
                              textDecoration: "none",
                            }}
                          >
                            {lang === "en" ? "Open private link" : "Abrir enlace privado"}
                          </a>
                        )}

                        {(perk.kind === "code" || perk.kind === "personal") && (
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <div style={{ fontSize: "10px", letterSpacing: "0.04em", color: "rgba(57,41,42,0.45)", textTransform: "uppercase" }}>
                                {perk.kind === "personal" ? (lang === "en" ? "Your personal code" : "Tu código personal") : (lang === "en" ? "Discount code" : "Código de descuento")}
                              </div>
                              <div style={{ fontFamily: "monospace", fontSize: "14px", fontWeight: 600, letterSpacing: "0.06em", color: isRevealed ? "#39292a" : "rgba(57,41,42,0.4)" }}>
                                {isRevealed ? perk.code : "••••••••"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (!isRevealed) {
                                  setRevealedPerks({ ...revealedPerks, [perk.id]: true });
                                } else {
                                  copyText(perk.code || "", `perk-${perk.id}`);
                                }
                              }}
                              style={{
                                border: "1px solid #7b1f2c",
                                backgroundColor: "transparent",
                                color: "#7b1f2c",
                                padding: "6px 12px",
                                borderRadius: "4px",
                                fontFamily: "'Cormorant Garamond', serif",
                                fontWeight: 600,
                                fontSize: "13px",
                                cursor: "pointer",
                              }}
                            >
                              {!isRevealed
                                ? (lang === "en" ? "Reveal code" : "Ver código")
                                : copiedCode === `perk-${perk.id}`
                                ? (lang === "en" ? "Copied" : "Copiado")
                                : (lang === "en" ? "Copy code" : "Copiar código")}
                            </button>
                          </div>
                        )}

                        <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.5)", marginTop: "10px" }}>
                          {validity}
                        </div>
                      </div>
                    </div>
                    );
                  });
                })()}
              </div>

              <div style={{ border: "1px solid rgba(57,41,42,0.18)", borderRadius: "8px", backgroundColor: "#f8efe2", padding: "20px 24px", marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "baseline", justifyContent: "space-between" }}>
                <p style={{ margin: 0, fontSize: "13.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.72)", maxWidth: "40em" }}>
                  {lang === "en"
                    ? "Perks are for you and your household, not transferable. If a partner ever turns one down, write to us and we will sort it — and tell them."
                    : "Las ventajas son para ti y tu casa, no transferibles. Si algún partner no la aplica, escríbenos y lo resolvemos — y hablamos con ellos."}
                </p>
                <Link href="/partners" style={{ fontSize: "13.5px", color: "#7b1f2c", textDecoration: "underline", fontWeight: 600 }}>
                  {lang === "en" ? "See all partners" : "Ver todos los partners"}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: MEMBERSHIP ─── */}
        {activeTab === "membership" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Membership Details Card */}
            <div style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px", backgroundColor: "#fffdfa", padding: "clamp(22px, 3vw, 30px)" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "25px", lineHeight: "1.15", margin: "0 0 20px" }}>
                {lang === "en" ? "Your membership" : "Tu membresía"}
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "14px" }}>
                <div style={{ backgroundColor: "#f4ece0", borderRadius: "6px", padding: "18px 20px" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", marginBottom: "9px" }}>
                    {lang === "en" ? "Plan" : "Plan"}
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px" }}>
                    {memberData?.monthlyPriceCents === 2900 ? "Opening Circle" : "The Circle"}
                  </div>
                </div>

                <div style={{ backgroundColor: "#f4ece0", borderRadius: "6px", padding: "18px 20px" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", marginBottom: "9px" }}>
                    {lang === "en" ? "Monthly Rate" : "Cuota mensual"}
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px" }}>
                    {lang === "en"
                      ? `€${((memberData?.monthlyPriceCents || 0) / 100).toFixed(0)}/mo`
                      : `${((memberData?.monthlyPriceCents || 0) / 100).toFixed(0)} €/mes`}
                  </div>
                </div>

                <div style={{ backgroundColor: "#f4ece0", borderRadius: "6px", padding: "18px 20px" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", marginBottom: "9px" }}>
                    {lang === "en" ? "Status" : "Estado"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      backgroundColor: memberData?.status === "active" ? "#568b05" : memberData?.status === "paused" ? "#a4761f" : "#993842"
                    }} />
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "19px" }}>
                      {memberData?.status === "active"
                        ? (lang === "en" ? "Active" : "Activa")
                        : memberData?.status === "paused"
                        ? (lang === "en" ? "Paused" : "Pausada")
                        : (lang === "en" ? "Inactive" : "Inactiva")}
                    </span>
                  </div>
                  {memberData?.currentPeriodEnd && (
                    <div style={{ fontSize: "11px", color: "rgba(57,41,42,0.5)", marginTop: "4px" }}>
                      {lang === "en" ? "Renews" : "Renovación"}: {new Date(memberData.currentPeriodEnd).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { day: "numeric", month: "short" })}
                    </div>
                  )}
                </div>
              </div>

              {/* Secure Stripe Billing Portal Link */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 22px", alignItems: "baseline", marginTop: "20px", paddingTop: "18px", borderTop: "1px solid rgba(57,41,42,0.12)" }}>
                <a
                  href="#"
                  onClick={handleUpdateCardClick}
                  style={{ fontSize: "13.5px", color: "#7b1f2c", textDecoration: "underline", pointerEvents: portalLoading ? "none" : "auto" }}
                >
                  {portalLoading
                    ? (lang === "en" ? "Loading Portal…" : "Cargando Portal…")
                    : (lang === "en" ? "Update Credit Card" : "Actualizar tarjeta")}
                </a>
              </div>
            </div>

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
                      {lang === "en" ? "Name" : "Nombre"}
                    </label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="text"
                        value={detailsForm.firstName}
                        onChange={(e) => setDetailsForm({ ...detailsForm, firstName: e.target.value })}
                        required
                        style={{ width: "100%", boxSizing: "border-box", minHeight: "46px", padding: "11px 14px", fontSize: "15px", fontFamily: "'Lora', Georgia, serif", color: "#39292a", background: "#fff", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "5px", outline: "none" }}
                      />
                      <input
                        type="text"
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
                      {lang === "en" ? "Your email is your membership login. Write to us and we will move it for you." : "Tu email es tu acceso de socia. Escríbenos y lo cambiamos por ti."}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "7px", display: "block" }}>
                      {lang === "en" ? "Phone" : "Teléfono"}
                    </label>
                    <input
                      type="tel"
                      value={detailsForm.phone}
                      onChange={(e) => setDetailsForm({ ...detailsForm, phone: e.target.value })}
                      style={{ width: "100%", boxSizing: "border-box", minHeight: "46px", padding: "11px 14px", fontSize: "15px", fontFamily: "'Lora', Georgia, serif", color: "#39292a", background: "#fff", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "5px", outline: "none" }}
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
                    </select>
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
                      fontFamily: "'Cormorant Garamond', serif",
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
            </div>

            {/* Pause Membership */}
            <div style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px", padding: "clamp(22px, 3vw, 28px)", backgroundColor: "#fffdfa" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", lineHeight: "1.2", margin: "0 0 10px" }}>
                {lang === "en" ? "Pause allowance" : "Pausas disponibles"}
              </h2>
              <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.75)", margin: "0 0 18px" }}>
                {lang === "en"
                  ? "Pause for up to two whole months a calendar year, free of charge. While you are paused your credits are frozen — the six-month expiry clock stops with them — and nothing is billed."
                  : "Puedes pausar hasta dos meses completos por año natural, sin coste. Mientras estás en pausa tus créditos quedan congelados — el reloj de caducidad de seis meses se detiene con ellos — y no se cobra nada."}
              </p>

              {pauseResult?.success ? (
                <div style={{ padding: "12px 16px", backgroundColor: "#f4f7ee", border: "1px solid rgba(86,139,5,0.35)", borderRadius: "6px", fontSize: "13.5px", color: "rgba(57,41,42,0.85)", marginBottom: "12px" }}>
                  ✓ {lang === "en" ? "Your membership has been paused for 1 month." : "Tu membresía ha sido pausada por 1 mes."}
                </div>
              ) : pauseResult?.error ? (
                <div style={{ padding: "12px 16px", backgroundColor: "#fff0f0", border: "1px solid rgba(200,0,0,0.25)", borderRadius: "6px", fontSize: "13.5px", color: "#b91c1c", marginBottom: "12px" }}>
                  {pauseResult.error}
                </div>
              ) : null}

              <button
                type="button"
                disabled={pauseLoading || (memberData?.pausedUntil && new Date(memberData.pausedUntil) > new Date())}
                onClick={async () => {
                  setPauseLoading(true);
                  setPauseResult(null);
                  try {
                    const res = await pauseMembership();
                    setPauseResult(res);
                    if (res.success) {
                      const refreshed = await getAccountData();
                      if (refreshed.success) setAccountData(refreshed);
                    }
                  } finally {
                    setPauseLoading(false);
                  }
                }}
                style={{
                  border: "1px solid #7b1f2c",
                  color: "#7b1f2c",
                  backgroundColor: "transparent",
                  padding: "12px 22px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "14.5px",
                  cursor: pauseLoading ? "wait" : "pointer"
                }}
              >
                {pauseLoading
                  ? (lang === "en" ? "Processing…" : "Procesando…")
                  : (lang === "en" ? "Request a pause" : "Solicitar una pausa")}
              </button>
            </div>

            {/* Cancel Membership */}
            {!memberData?.cancelAtPeriodEnd ? (
              <div style={{ border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px", padding: "clamp(22px, 3vw, 28px)", backgroundColor: "#fffdfa" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "22px", lineHeight: "1.2", margin: "0 0 10px", color: "#993842" }}>
                  {lang === "en" ? "Cancel membership" : "Cancelar la membresía"}
                </h2>
                <p style={{ fontSize: "14.5px", lineHeight: "1.6", color: "rgba(57,41,42,0.75)", margin: "0 0 18px" }}>
                  {lang === "en"
                    ? "Cancel any time; there is never a cancellation fee. You keep your place until the end of the period you have paid for. If you are an Opening Circle member, your locked €29 rate is released and cannot be reclaimed."
                    : "Puedes cancelar cuando quieras; nunca hay cuota de cancelación. Conservas tu plaza hasta el final del periodo que ya has pagado. Si eres socia del Opening Circle, tu tarifa fija de 29 € se libera y no se puede recuperar."}
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
                        ? "Cancelling ends your membership at the close of the current billing period. Your Opening Circle rate ends with it — if you rejoin later it will be at the standard rate. Pausing keeps your Opening Circle price; cancelling does not."
                        : "Cancelar finaliza tu membresía al cierre del periodo de facturación actual. Tu tarifa de Opening Circle termina con ella: si vuelves más adelante, será a la tarifa estándar. Pausar mantiene tu precio de Opening Circle; cancelar no."}
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
              <div style={{ padding: "16px 20px", backgroundColor: "#fff8f8", border: "1px solid rgba(200,0,0,0.25)", borderRadius: "6px", fontSize: "14px", color: "#993842" }}>
                ✓ {lang === "en"
                  ? `Your membership has been cancelled and will end at the close of your current billing period. Your Opening Circle rate ends with it — rejoining later would be at the standard rate.`
                  : `Tu membresía ha sido cancelada y finalizará al cierre de tu periodo de facturación actual. Tu tarifa de Opening Circle termina con ella: volver más adelante sería a la tarifa estándar.`}
              </div>
            )}

            {/* Logout button at the very bottom */}
            <div style={{ marginTop: "12px", borderTop: "1px solid rgba(57,41,42,0.12)", paddingTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/account/login" })}
                style={{
                  border: "1px solid rgba(57, 41, 42, 0.3)",
                  color: "#39292a",
                  padding: "9px 16px",
                  borderRadius: "4px",
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: "14px",
                  background: "transparent",
                  cursor: "pointer"
                }}
              >
                {lang === "en" ? "Log out" : "Cerrar sesión"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
