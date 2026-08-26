"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Locale } from "@/lib/i18n";
import { getAccountData, pauseMembership, updatePersonDetails, cancelMembership } from "@/app/actions/memberAccount";
import { buyExtraCredits } from "@/app/actions/booking";

type AccountTab = "overview" | "credits" | "groups" | "godmother" | "membership" | "details";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lang, setLang] = useState<Locale>("en");
  const [activeTab, setActiveTab] = useState<AccountTab>("overview");
  const [copied, setCopied] = useState(false);
  const [showExtraCreditsModal, setShowExtraCreditsModal] = useState(false);
  const [extraCreditsAmount, setExtraCreditsAmount] = useState(10);
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountData, setAccountData] = useState<any>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Membership pause state
  const [pauseLoading, setPauseLoading] = useState(false);
  const [pauseResult, setPauseResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Membership cancel state
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ success: boolean; error?: string; currentPeriodEnd?: string | null } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Details form state
  const [detailsForm, setDetailsForm] = useState({ firstName: "", lastName: "", phone: "", stage: "", neighbourhood: "" });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsResult, setDetailsResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Extra credits state
  const [extraCreditsLoading, setExtraCreditsLoading] = useState(false);
  const [extraCreditsError, setExtraCreditsError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved as Locale);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/account/login");
    } else if (status === "authenticated") {
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
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "18px" }}>Loading your circle...</p>
      </div>
    );
  }

  if (!session?.user || !accountData || accountError) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "18px" }}>Unable to load your account</p>
        {accountError && <p style={{ fontSize: "14px", color: "var(--color-accent)" }}>{accountError}</p>}
      </div>
    );
  }

  const user = session.user as any;
  const memberData = accountData?.member;
  const person = accountData?.member?.person;
  const firstName = memberData?.firstName || user.name?.split(" ")[0] || "Member";
  const availableCredits = accountData?.credits?.available || 0;
  const godmotherCreditsEarned = accountData?.godmother?.totalCreditsEarned || 0;
  const referralCode = `MOTHERS-${(memberData?.godmotherCode || firstName).toUpperCase().slice(0, 4)}-BCN`;

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const TABS: { id: AccountTab; labelEn: string; labelEs: string }[] = [
    { id: "overview", labelEn: "Overview", labelEs: "Resumen" },
    { id: "credits", labelEn: "Credits & Ledger", labelEs: "Créditos" },
    { id: "groups", labelEn: "My Circles", labelEs: "Mis Grupos" },
    { id: "godmother", labelEn: "Godmother", labelEs: "Madrina" },
    { id: "membership", labelEn: "Membership", labelEs: "Membresía" },
    { id: "details", labelEn: "Personal Details", labelEs: "Mis Datos" },
  ];

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "clamp(40px, 5vw, 64px) clamp(24px, 5vw, 64px) 88px" }}>
      <div style={{ maxWidth: "880px", margin: "0 auto" }}>
        {/* Header greeting */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "12.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: "4px" }}>
              {lang === "en" ? "Member Account" : "Cuenta de Socia"}
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "32px", margin: "0 0 4px 0" }}>
              {lang === "en" ? `Welcome back, ${firstName}` : `Bienvenida de nuevo, ${firstName}`}
            </h1>
            <p style={{ fontSize: "14px", color: "rgba(57, 41, 42, 0.65)", margin: 0 }}>
              {lang === "en" ? "Opening Circle Member · Rate locked at €29/mo" : "Socia Opening Circle · Tarifa fija a 29€/mes"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ border: "1px solid var(--color-accent)", color: "var(--color-accent)", padding: "6px 12px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px" }}>
              Opening Circle
            </span>
            <span style={{ border: "1px solid var(--color-accent-2)", color: "var(--color-accent-2)", padding: "6px 12px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px" }}>
              Godmother Active
            </span>
          </div>
        </div>

        {/* Balance & Status Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            border: "1px solid rgba(57, 41, 42, 0.16)",
            borderRadius: "8px",
            backgroundColor: "#fff",
            overflow: "hidden",
            marginBottom: "32px",
          }}
        >
          <div style={{ padding: "20px 24px", borderRight: "1px solid rgba(57, 41, 42, 0.12)" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", marginBottom: "4px", fontWeight: 600 }}>
              {lang === "en" ? "Available Credits" : "Créditos Disponibles"}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "36px", fontWeight: 600, color: "var(--color-accent)" }}>{availableCredits}</span>
              <span style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)" }}>{lang === "en" ? "credits" : "créditos"}</span>
            </div>
            <div style={{ marginTop: "6px" }}>
              <button
                type="button"
                onClick={() => setShowExtraCreditsModal(true)}
                style={{ border: "none", background: "none", color: "var(--color-accent)", fontSize: "12.5px", textDecoration: "underline", cursor: "pointer", padding: 0 }}
              >
                + {lang === "en" ? "Buy Extra Credits (€1/ea)" : "Comprar Créditos Extra (1€/ud)"}
              </button>
            </div>
          </div>

          <div style={{ padding: "20px 24px", borderRight: "1px solid rgba(57, 41, 42, 0.12)" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", marginBottom: "4px", fontWeight: 600 }}>
              {lang === "en" ? "Membership Status" : "Estado de Membresía"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: memberData?.status === "active" ? (memberData?.cancelAtPeriodEnd ? "#a4761f" : "var(--color-accent-2)") : "rgba(57,41,42,0.3)" }} />
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "18px" }}>
                {memberData?.status === "active"
                  ? (memberData?.cancelAtPeriodEnd 
                      ? (lang === "en" ? "Cancelling" : "Cancelando")
                      : (lang === "en" ? "Active" : "Activa"))
                  : memberData?.status === "paused"
                  ? (lang === "en" ? "Paused" : "Pausada")
                  : (lang === "en" ? "Inactive" : "Inactiva")}
              </span>
            </div>
            <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.6)", marginTop: "4px" }}>
              {memberData?.cancelAtPeriodEnd
                ? (lang === "en" 
                    ? `Ends on ${memberData.currentPeriodEnd ? new Date(memberData.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}`
                    : `Finaliza el ${memberData.currentPeriodEnd ? new Date(memberData.currentPeriodEnd).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : ""}`)
                : memberData?.status === "active"
                ? (lang === "en" 
                    ? `Next renewal: ${memberData.currentPeriodEnd ? new Date(memberData.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""} (€${(memberData.monthlyPriceCents || 0) / 100})`
                    : `Próxima renovación: ${memberData.currentPeriodEnd ? new Date(memberData.currentPeriodEnd).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : ""} (${(memberData.monthlyPriceCents || 0) / 100}€)`)
                : memberData?.status === "paused" && memberData.pausedUntil
                ? (lang === "en"
                    ? `Paused until: ${new Date(memberData.pausedUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                    : `Pausada hasta: ${new Date(memberData.pausedUntil).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`)
                : ""}
            </div>
          </div>

          <div style={{ padding: "20px 24px" }}>
            <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", marginBottom: "4px", fontWeight: 600 }}>
              {lang === "en" ? "Godmother Referral" : "Código de Madrina"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "16px", color: "var(--color-accent-2)" }}>
                {referralCode}
              </span>
              <button
                type="button"
                onClick={copyReferralCode}
                style={{
                  border: "1px solid rgba(86, 139, 5, 0.4)",
                  backgroundColor: "rgba(86, 139, 5, 0.08)",
                  color: "var(--color-accent-2)",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "11.5px",
                  cursor: "pointer",
                }}
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Swipeable Tab Navigation */}
        <div style={{ display: "flex", gap: "20px", borderBottom: "1px solid rgba(57,41,42,0.16)", overflowX: "auto", marginBottom: "32px", scrollbarWidth: "none" }}>
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
                  padding: "0 0 12px 0",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: "15px",
                  color: isSelected ? "var(--color-accent)" : "rgba(57, 41, 42, 0.65)",
                  borderBottom: isSelected ? "2px solid var(--color-accent)" : "2px solid transparent",
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
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "24px", backgroundColor: "#fff" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", margin: "0 0 16px 0" }}>
                {lang === "en" ? "Upcoming Reservations" : "Próximas Reservas"}
              </h3>

              {accountData?.bookings?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {accountData.bookings.map((b: any) => (
                    <div key={b.id} style={{ padding: "14px 16px", backgroundColor: "#f8efe2", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "15px" }}>{b.eventTitle}</div>
                        <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.65)", marginTop: "2px" }}>
                          📅 {new Date(b.eventDate).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { weekday: "short", day: "numeric", month: "short" })} · 📍 {b.eventLocation}
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
                <div style={{ padding: "20px", backgroundColor: "#faf7f2", borderRadius: "6px", textAlign: "center", color: "rgba(57,41,42,0.6)", fontSize: "14px" }}>
                  {lang === "en"
                    ? "No upcoming bookings. Browse the calendar and reserve your next spot."
                    : "Sin próximas reservas. Explora el calendario y reserva tu siguiente plaza."}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <Link
                href="/events"
                style={{
                  backgroundColor: "var(--color-accent)",
                  color: "#f8efe2",
                  padding: "12px 22px",
                  borderRadius: "4px",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: "14.5px",
                  textDecoration: "none",
                }}
              >
                {lang === "en" ? "Explore Events Calendar" : "Explorar Calendario de Eventos"}
              </Link>
            </div>
          </div>
        )}

        {/* ─── TAB 2: CREDITS & LEDGER ─── */}
        {activeTab === "credits" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "24px", backgroundColor: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", margin: 0 }}>
                  {lang === "en" ? "FIFO Credit Expiry Ledger" : "Historial FIFO de Créditos"}
                </h3>
                <Link href="/account/statement" style={{ fontSize: "13px", color: "var(--color-accent)", textDecoration: "underline" }}>
                  {lang === "en" ? "Print Activity Statement" : "Ver Extracto Completo"}
                </Link>
              </div>

              <p style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)", margin: "0 0 16px 0" }}>
                {lang === "en"
                  ? "Credits expire 6 months after issue on a First-In, First-Out basis. The expiry clock freezes automatically whenever you pause your membership."
                  : "Los créditos caducan a los 6 meses según orden de emisión (FIFO). El reloj de caducidad se congela automáticamente cuando estás en pausa."}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { desc: "Monthly membership grant (August 2026)", credits: "+20", date: "1 Aug 2026", expires: "1 Feb 2027" },
                  { desc: "Godmother referral reward (Friend Joined)", credits: "+5", date: "12 Aug 2026", expires: "12 Feb 2027" },
                  { desc: "Postnatal Yoga RSVP", credits: "0", date: "18 Aug 2026", expires: "Included walk" },
                ].map((row, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderBottom: "1px solid rgba(57,41,42,0.08)", fontSize: "13.5px" }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{row.desc}</div>
                      <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.55)", marginTop: "2px" }}>{row.date} · Expires: {row.expires}</div>
                    </div>
                    <span style={{ fontWeight: 600, color: row.credits.startsWith("+") ? "var(--color-accent-2)" : "var(--color-text)" }}>
                      {row.credits}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: GODMOTHER ─── */}
        {activeTab === "godmother" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ border: "1px solid rgba(86,139,5,0.4)", borderRadius: "8px", padding: "28px", backgroundColor: "#f4f7ee" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span style={{ color: "var(--color-accent-2)" }}>★</span>
                <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent-2)" }}>
                  {lang === "en" ? "Godmother Referral Program" : "Programa de Madrinas"}
                </span>
              </div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "24px", margin: "0 0 10px 0" }}>
                {lang === "en" ? "Invite fellow mothers, earn credits." : "Invita a otras madres y gana créditos."}
              </h2>
              <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.78)", margin: "0 0 20px 0" }}>
                {lang === "en"
                  ? "Every Godmother earns +5 credits the day her referred friend activates her membership, plus +15 credits when she renews for month three (+20 credits total). Bonus referral credits never expire or cap."
                  : "Cada Madrina gana +5 créditos el día que su amiga activa su membresía, más +15 créditos al cumplir el tercer mes (+20 créditos en total). Los créditos extra no tienen límite de acumulación."}
              </p>

              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "20px" }}>
                <span style={{ padding: "10px 16px", backgroundColor: "#fff", border: "1px solid rgba(86,139,5,0.4)", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "18px" }}>
                  {referralCode}
                </span>
                <button
                  type="button"
                  onClick={copyReferralCode}
                  style={{
                    backgroundColor: "var(--color-accent-2)",
                    color: "#fff",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  {copied ? "✓ Copied to Clipboard" : "Copy Referral Code"}
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                <div style={{ backgroundColor: "#fff", padding: "14px", borderRadius: "6px", border: "1px solid rgba(86,139,5,0.2)" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", color: "rgba(57,41,42,0.6)" }}>Friends Joined</div>
                  <div style={{ fontSize: "24px", fontWeight: 600, color: "var(--color-accent-2)", marginTop: "4px" }}>1</div>
                </div>
                <div style={{ backgroundColor: "#fff", padding: "14px", borderRadius: "6px", border: "1px solid rgba(86,139,5,0.2)" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", color: "rgba(57,41,42,0.6)" }}>Credits Earned</div>
                  <div style={{ fontSize: "24px", fontWeight: 600, color: "var(--color-accent-2)", marginTop: "4px" }}>+5</div>
                </div>
                <div style={{ backgroundColor: "#fff", padding: "14px", borderRadius: "6px", border: "1px solid rgba(86,139,5,0.2)" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", color: "rgba(57,41,42,0.6)" }}>Pending Renewal</div>
                  <div style={{ fontSize: "24px", fontWeight: 600, color: "var(--color-text)", marginTop: "4px" }}>+15</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: MEMBERSHIP ─── */}
        {activeTab === "membership" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Membership details card */}
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "24px", backgroundColor: "#fff" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", margin: "0 0 16px 0" }}>
                {lang === "en" ? "Your Membership" : "Tu Membresía"}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                <div style={{ padding: "14px 16px", backgroundColor: "#f8efe2", borderRadius: "6px" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.55)", fontWeight: 600, marginBottom: "4px" }}>
                    {lang === "en" ? "Tier" : "Nivel"}
                  </div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "16px" }}>
                    {memberData?.monthlyPriceCents === 2900
                      ? "Opening Circle"
                      : memberData?.monthlyPriceCents === 3900
                      ? "The Circle"
                      : lang === "en" ? "Member" : "Socia"}
                  </div>
                </div>
                <div style={{ padding: "14px 16px", backgroundColor: "#f8efe2", borderRadius: "6px" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.55)", fontWeight: 600, marginBottom: "4px" }}>
                    {lang === "en" ? "Monthly Rate" : "Cuota Mensual"}
                  </div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "16px" }}>
                    €{((memberData?.monthlyPriceCents || 0) / 100).toFixed(0)}/mo
                  </div>
                </div>
                <div style={{ padding: "14px 16px", backgroundColor: "#f8efe2", borderRadius: "6px" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.55)", fontWeight: 600, marginBottom: "4px" }}>
                    {lang === "en" ? "Status" : "Estado"}
                  </div>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "16px" }}>
                    {memberData?.status === "active"
                      ? lang === "en" ? "Active" : "Activa"
                      : memberData?.status === "paused"
                      ? lang === "en" ? "Paused" : "Pausada"
                      : memberData?.status || "—"}
                  </div>
                </div>
              </div>

              {/* Already paused banner */}
              {memberData?.pausedUntil && new Date(memberData.pausedUntil) > new Date() && (
                <div style={{ padding: "12px 16px", backgroundColor: "#f4f7ee", border: "1px solid rgba(86,139,5,0.35)", borderRadius: "6px", marginBottom: "16px", fontSize: "13.5px", color: "rgba(57,41,42,0.8)" }}>
                  ⏸ {lang === "en"
                    ? `Your membership is paused until ${new Date(memberData.pausedUntil).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`
                    : `Tu membresía está pausada hasta el ${new Date(memberData.pausedUntil).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}.`}
                </div>
              )}
            </div>

            {/* Pause card */}
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "24px", backgroundColor: "#fff" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", margin: "0 0 12px 0" }}>
                {lang === "en" ? "Pause Allowance (§20.1a)" : "Pausa de Membresía (§20.1a)"}
              </h3>
              <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.72)", margin: "0 0 16px 0" }}>
                {lang === "en"
                  ? "Members can pause for up to 2 whole months per calendar year free of charge. While paused, your credit expiry clock freezes and reservations are held off. Allowance resets every January 1."
                  : "Puedes pausar tu membresía hasta 2 meses por año natural sin coste. Durante la pausa, el reloj de caducidad se congela y no se cobran cuotas."}
              </p>

              {pauseResult?.success ? (
                <div style={{ padding: "12px 16px", backgroundColor: "#f4f7ee", border: "1px solid rgba(86,139,5,0.35)", borderRadius: "6px", fontSize: "13.5px", color: "rgba(57,41,42,0.85)", marginBottom: "12px" }}>
                  ✓ {lang === "en" ? "Your membership has been paused for 1 month." : "Tu membresía ha sido pausada por 1 mes."}
                </div>
              ) : pauseResult?.error ? (
                <div style={{ padding: "12px 16px", backgroundColor: "#fff0f0", border: "1px solid rgba(200,0,0,0.25)", borderRadius: "6px", fontSize: "13.5px", color: "#b91c1c", marginBottom: "12px" }}>
                  {pauseResult.error === "ALREADY_PAUSED"
                    ? (lang === "en" ? "Your membership is already paused." : "Tu membresía ya está pausada.")
                    : pauseResult.error === "AUTH_REQUIRED"
                    ? (lang === "en" ? "Please sign in again." : "Por favor, vuelve a iniciar sesión.")
                    : pauseResult.error}
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
                      // Refresh account data to reflect new pausedUntil
                      const refreshed = await getAccountData();
                      if (refreshed.success) setAccountData(refreshed);
                    }
                  } finally {
                    setPauseLoading(false);
                  }
                }}
                style={{
                  border: "1px solid var(--color-accent)",
                  backgroundColor: "transparent",
                  color: "var(--color-accent)",
                  padding: "10px 18px",
                  borderRadius: "4px",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: "14px",
                  cursor: pauseLoading ? "wait" : "pointer",
                  opacity: pauseLoading || (memberData?.pausedUntil && new Date(memberData.pausedUntil) > new Date()) ? 0.5 : 1,
                }}
              >
                {pauseLoading
                  ? (lang === "en" ? "Processing…" : "Procesando…")
                  : (lang === "en" ? "Request Membership Pause" : "Solicitar Pausa de Membresía")}
              </button>
            </div>

            {/* Cancel Membership card */}
            {!memberData?.cancelAtPeriodEnd ? (
              <div style={{ border: "1px solid rgba(200,0,0,0.18)", borderRadius: "8px", padding: "24px", backgroundColor: "#fff" }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", margin: "0 0 12px 0", color: "#993842" }}>
                  {lang === "en" ? "Cancel Membership" : "Cancelar Membresía"}
                </h3>
                <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.72)", margin: "0 0 16px 0" }}>
                  {lang === "en"
                    ? "You can cancel anytime — there are no cancellation fees. Your access continues until the end of your current billing period. If you're an Opening Circle member, your locked €29 rate will be released and cannot be reclaimed."
                    : "Puedes cancelar en cualquier momento sin cuota de cancelación. Tu acceso continúa hasta el final del período de facturación actual. Si eres socia del Opening Circle, tu tarifa bloqueada de 29€ quedará liberada y no podrá recuperarse."}
                </p>

                {cancelResult?.error && (
                  <div style={{ padding: "12px 16px", backgroundColor: "#fff0f0", border: "1px solid rgba(200,0,0,0.25)", borderRadius: "6px", fontSize: "13.5px", color: "#b91c1c", marginBottom: "12px" }}>
                    {cancelResult.error === "ALREADY_CANCELLING"
                      ? (lang === "en" ? "Your membership is already scheduled to cancel." : "Tu membresía ya está programada para cancelarse.")
                      : cancelResult.error}
                  </div>
                )}

                {!showCancelConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowCancelConfirm(true)}
                    style={{ border: "1px solid rgba(200,0,0,0.4)", backgroundColor: "transparent", color: "#993842", padding: "10px 18px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
                  >
                    {lang === "en" ? "Cancel Membership" : "Cancelar Membresía"}
                  </button>
                ) : (
                  <div style={{ backgroundColor: "#fff8f8", border: "1px solid rgba(200,0,0,0.25)", borderRadius: "6px", padding: "16px 20px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#993842", margin: "0 0 14px 0" }}>
                      {lang === "en"
                        ? `Are you sure? Your membership will end on ${memberData.currentPeriodEnd ? new Date(memberData.currentPeriodEnd).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { day: "numeric", month: "long", year: "numeric" }) : "the end of your current period"}.`
                        : `¿Estás segura? Tu membresía terminará el ${memberData.currentPeriodEnd ? new Date(memberData.currentPeriodEnd).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "final del período actual"}.`}
                    </p>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        onClick={() => setShowCancelConfirm(false)}
                        style={{ border: "1px solid rgba(57,41,42,0.2)", backgroundColor: "transparent", color: "rgba(57,41,42,0.7)", padding: "9px 16px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
                      >
                        {lang === "en" ? "Keep My Membership" : "Mantener Mi Membresía"}
                      </button>
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
                              setShowCancelConfirm(false);
                              const refreshed = await getAccountData();
                              if (refreshed.success) setAccountData(refreshed);
                            }
                          } finally {
                            setCancelLoading(false);
                          }
                        }}
                        style={{ border: "none", backgroundColor: "#993842", color: "#fff", padding: "9px 16px", borderRadius: "4px", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", cursor: cancelLoading ? "wait" : "pointer", opacity: cancelLoading ? 0.7 : 1 }}
                      >
                        {cancelLoading ? (lang === "en" ? "Processing…" : "Procesando…") : (lang === "en" ? "Yes, Cancel" : "Sí, Cancelar")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ border: "1px solid rgba(164,118,31,0.35)", borderRadius: "8px", padding: "24px", backgroundColor: "#fff9f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "18px" }}>⏳</span>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "17px", color: "#a4761f" }}>
                    {lang === "en" ? "Cancellation Scheduled" : "Cancelación Programada"}
                  </span>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(57,41,42,0.78)", margin: "0", lineHeight: "1.6" }}>
                  {lang === "en"
                    ? `Your membership access continues until ${memberData.currentPeriodEnd ? new Date(memberData.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "the end of your current period"}. After that, your account will become inactive. Any remaining credits will expire 6 months after their issue date.`
                    : `Tu acceso continúa hasta el ${memberData.currentPeriodEnd ? new Date(memberData.currentPeriodEnd).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "final del período actual"}. Después, tu cuenta quedará inactiva. Los créditos restantes caducan 6 meses después de su fecha de emisión.`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: GROUPS ─── */}
        {activeTab === "groups" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ border: "1px solid rgba(86,139,5,0.35)", borderRadius: "8px", padding: "28px", backgroundColor: "#f4f7ee" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent-2)", marginBottom: "12px" }}>
                {lang === "en" ? "Your Stage Group" : "Tu Grupo de Etapa"}
              </div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "22px", margin: "0 0 10px 0" }}>
                {memberData?.stage || (lang === "en" ? "Stage not set" : "Etapa no definida")}
              </h3>
              <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.72)", margin: "0 0 16px 0" }}>
                {lang === "en"
                  ? "You're grouped with mothers at the same stage as you. Events tagged with your stage appear highlighted in your calendar."
                  : "Estás agrupada con madres en la misma etapa que tú. Los eventos etiquetados con tu etapa aparecen destacados en tu calendario."}
              </p>
              {memberData?.stage && (
                <span style={{ display: "inline-block", padding: "6px 14px", border: "1px solid rgba(86,139,5,0.4)", borderRadius: "14px", backgroundColor: "#fff", fontSize: "13px", fontWeight: 600, color: "var(--color-accent-2)" }}>
                  {memberData.stage}
                </span>
              )}
            </div>

            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "28px", backgroundColor: "#fff" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "13px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent)", marginBottom: "12px" }}>
                {lang === "en" ? "Your Neighbourhood" : "Tu Barrio"}
              </div>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "22px", margin: "0 0 10px 0" }}>
                {memberData?.neighbourhood || (lang === "en" ? "Neighbourhood not set" : "Barrio no definido")}
              </h3>
              <p style={{ fontSize: "14px", lineHeight: "1.6", color: "rgba(57,41,42,0.72)", margin: "0 0 12px 0" }}>
                {lang === "en"
                  ? "Events near your neighbourhood appear first. We use this to help connect you with mothers who live close to you."
                  : "Los eventos cerca de tu barrio aparecen primero. Lo usamos para conectarte con madres que viven cerca."}
              </p>
              {memberData?.neighbourhood && (
                <span style={{ display: "inline-block", padding: "6px 14px", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "14px", backgroundColor: "#f8efe2", fontSize: "13px", fontWeight: 600, color: "var(--color-text)" }}>
                  {memberData.neighbourhood}
                </span>
              )}
              <p style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.5)", margin: "14px 0 0" }}>
                {lang === "en"
                  ? "Update your stage or neighbourhood in the Details tab."
                  : "Actualiza tu etapa o barrio en la pestaña Mis Datos."}
              </p>
            </div>
          </div>
        )}

        {/* ─── TAB 6: DETAILS ─── */}
        {activeTab === "details" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "28px", backgroundColor: "#fff" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "20px", margin: "0 0 20px 0" }}>
                {lang === "en" ? "Personal Details" : "Datos Personales"}
              </h3>

              {detailsResult?.success && (
                <div style={{ padding: "12px 16px", backgroundColor: "#f4f7ee", border: "1px solid rgba(86,139,5,0.35)", borderRadius: "6px", fontSize: "13.5px", color: "rgba(57,41,42,0.85)", marginBottom: "16px" }}>
                  ✓ {lang === "en" ? "Your details have been updated." : "Tus datos han sido actualizados."}
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
                    const res = await updatePersonDetails(detailsForm);
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.6)", marginBottom: "5px" }}>
                      {lang === "en" ? "First Name" : "Nombre"}
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={detailsForm.firstName}
                      onChange={(e) => setDetailsForm({ ...detailsForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.6)", marginBottom: "5px" }}>
                      {lang === "en" ? "Last Name" : "Apellido"}
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={detailsForm.lastName}
                      onChange={(e) => setDetailsForm({ ...detailsForm, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.6)", marginBottom: "5px" }}>
                    {lang === "en" ? "Phone (optional)" : "Teléfono (opcional)"}
                  </label>
                  <input
                    type="tel"
                    className="input"
                    value={detailsForm.phone}
                    onChange={(e) => setDetailsForm({ ...detailsForm, phone: e.target.value })}
                    placeholder="+34 600 000 000"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.6)", marginBottom: "5px" }}>
                    {lang === "en" ? "Stage" : "Etapa"}
                  </label>
                  <select
                    className="input"
                    value={detailsForm.stage}
                    onChange={(e) => setDetailsForm({ ...detailsForm, stage: e.target.value })}
                  >
                    <option value="">{lang === "en" ? "Select your stage" : "Selecciona tu etapa"}</option>
                    <option value="Pregnancy">{lang === "en" ? "Pregnancy" : "Embarazo"}</option>
                    <option value="Postpartum (0–12 months)">{lang === "en" ? "Postpartum (0–12 months)" : "Posparto (0–12 meses)"}</option>
                    <option value="Toddlerhood (1–3 years)">{lang === "en" ? "Toddlerhood (1–3 years)" : "Primera infancia (1–3 años)"}</option>
                    <option value="Primary school (4–10 years)">{lang === "en" ? "Primary school (4–10 years)" : "Etapa escolar (4–10 años)"}</option>
                    <option value="More than one stage at once">{lang === "en" ? "More than one stage" : "Más de una etapa"}</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(57,41,42,0.6)", marginBottom: "5px" }}>
                    {lang === "en" ? "Neighbourhood" : "Barrio"}
                  </label>
                  <select
                    className="input"
                    value={detailsForm.neighbourhood}
                    onChange={(e) => setDetailsForm({ ...detailsForm, neighbourhood: e.target.value })}
                  >
                    <option value="">{lang === "en" ? "Select neighbourhood" : "Selecciona barrio"}</option>
                    {["Ciutat Vella","Eixample","Sants-Montjuïc","Les Corts","Sarrià-Sant Gervasi","Gràcia","Horta-Guinardó","Nou Barris","Sant Andreu","Sant Martí"].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                    <option value="Outside Barcelona">{lang === "en" ? "Outside Barcelona" : "Fuera de Barcelona"}</option>
                  </select>
                </div>

                <div style={{ paddingTop: "8px" }}>
                  <button
                    type="submit"
                    disabled={detailsLoading}
                    style={{
                      backgroundColor: "var(--color-accent)",
                      color: "#f8efe2",
                      border: "none",
                      padding: "12px 24px",
                      borderRadius: "4px",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: detailsLoading ? "wait" : "pointer",
                      opacity: detailsLoading ? 0.7 : 1,
                    }}
                  >
                    {detailsLoading
                      ? (lang === "en" ? "Saving…" : "Guardando…")
                      : (lang === "en" ? "Save Changes" : "Guardar Cambios")}
                  </button>
                </div>
              </form>

              <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(57,41,42,0.1)", fontSize: "12.5px", color: "rgba(57,41,42,0.5)", lineHeight: "1.6" }}>
                {lang === "en"
                  ? "Your personal data is kept private and only used to personalise your experience. Children's birth months (not names) can be shared with hosts to help age-group planning."
                  : "Tus datos personales se mantienen privados y solo se usan para personalizar tu experiencia. Los meses de nacimiento de tus hijos (no los nombres) pueden compartirse con las anfitrionas para planificar grupos de edad."}
              </div>
            </div>
          </div>
        )}

        {/* Extra Credits Purchase Modal */}
        {showExtraCreditsModal && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(57,41,42,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "20px" }}>
            <div style={{ backgroundColor: "#fff", borderRadius: "8px", padding: "28px", maxWidth: "420px", width: "100%", boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }}>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "22px", margin: "0 0 10px 0" }}>
                {lang === "en" ? "Buy Extra Credits" : "Comprar Créditos Extra"}
              </h3>
              <p style={{ fontSize: "13.5px", color: "rgba(57,41,42,0.7)", margin: "0 0 20px 0" }}>
                {lang === "en"
                  ? "Extra credits cost a flat €1 per credit. They have a 6-month FIFO expiry term."
                  : "Los créditos extra tienen un coste fijo de 1€ por crédito con caducidad a 6 meses."}
              </p>

              <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                {[5, 10, 20].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => { setExtraCreditsAmount(amt); setExtraCreditsError(null); }}
                    style={{
                      flex: 1,
                      border: extraCreditsAmount === amt ? "2px solid var(--color-accent)" : "1px solid rgba(57,41,42,0.2)",
                      backgroundColor: extraCreditsAmount === amt ? "rgba(123,31,44,0.06)" : "#fff",
                      padding: "10px",
                      borderRadius: "6px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "var(--font-heading)",
                      fontSize: "14px",
                    }}
                  >
                    {amt} cr (€{amt})
                  </button>
                ))}
              </div>

              {extraCreditsError && (
                <div style={{ padding: "10px 14px", backgroundColor: "#fff0f0", border: "1px solid rgba(200,0,0,0.2)", borderRadius: "4px", fontSize: "13px", color: "#b91c1c", marginBottom: "14px" }}>
                  {extraCreditsError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => { setShowExtraCreditsModal(false); setExtraCreditsError(null); }}
                  style={{ border: "none", background: "none", color: "rgba(57,41,42,0.6)", padding: "10px", cursor: "pointer", fontFamily: "var(--font-heading)", fontSize: "14px" }}
                >
                  {lang === "en" ? "Cancel" : "Cancelar"}
                </button>
                <button
                  type="button"
                  disabled={extraCreditsLoading}
                  onClick={async () => {
                    setExtraCreditsLoading(true);
                    setExtraCreditsError(null);
                    const res = await buyExtraCredits(extraCreditsAmount);
                    setExtraCreditsLoading(false);
                    if (res.success && res.url) {
                      window.location.href = res.url;
                    } else {
                      setExtraCreditsError(
                        res.error === "ACTIVE_MEMBERSHIP_REQUIRED"
                          ? (lang === "en" ? "Active membership required to buy credits." : "Necesitas membresía activa para comprar créditos.")
                          : res.error || (lang === "en" ? "Something went wrong." : "Algo salió mal.")
                      );
                    }
                  }}
                  style={{
                    backgroundColor: "var(--color-accent)",
                    color: "#fff",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: "14px",
                    cursor: extraCreditsLoading ? "wait" : "pointer",
                    opacity: extraCreditsLoading ? 0.7 : 1,
                  }}
                >
                  {extraCreditsLoading
                    ? (lang === "en" ? "Redirecting…" : "Redirigiendo…")
                    : (lang === "en" ? `Pay €${extraCreditsAmount} →` : `Pagar ${extraCreditsAmount}€ →`)}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
