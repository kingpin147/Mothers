"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "es">("en");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/account/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "18px" }}>Loading your circle...</p>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user as any;
  const isAdmin = user.role === "owner" || user.role === "manager" || user.role === "host";
  const firstName = user.name?.split(" ")[0] || "Member";
  const referralCode = `MOTHERS-${firstName.toUpperCase().slice(0, 4)}-BCN`;

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", padding: "48px clamp(24px, 5vw, 64px) 80px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Admin Notification Banner */}
        {isAdmin && (
          <div style={{
            backgroundColor: "#fdf4e7",
            border: "1px solid #e0c8a8",
            borderRadius: "8px",
            padding: "16px 20px",
            marginBottom: "28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px"
          }}>
            <div>
              <div style={{ fontWeight: 600, color: "var(--color-accent)" }}>
                🛡️ Operator / Admin Account Detected ({user.role})
              </div>
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                You have full back-office control over applications, events, finance, and CMS.
              </div>
            </div>
            <Link href="/admin" className="btn btn-primary" style={{ padding: "8px 16px", fontSize: "13px" }}>
              Go to Admin Dashboard →
            </Link>
          </div>
        )}

        {/* Header Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "20px",
          marginBottom: "32px",
          borderBottom: "1px solid var(--color-divider)",
          paddingBottom: "24px"
        }}>
          <div>
            <div style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-accent)",
              marginBottom: "4px"
            }}>
              {lang === "en" ? "Member Portal" : "Portal de Socias"}
            </div>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "32px", margin: "0 0 6px" }}>
              {lang === "en" ? `Welcome back, ${firstName}` : `Bienvenida de nuevo, ${firstName}`}
            </h1>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0 }}>
              {lang === "en"
                ? `Opening Circle Member · Stage: ${user.stage || "Pregnancy & Postpartum"}`
                : `Socia Opening Circle · Etapa: ${user.stage || "Embarazo y Posparto"}`}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{
              backgroundColor: "var(--color-status-confirmed)",
              color: "#285430",
              border: "1px solid rgba(40, 84, 48, 0.3)",
              borderRadius: "4px",
              padding: "6px 12px",
              fontSize: "12.5px",
              fontWeight: 600
            }}>
              Active Member
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="btn btn-secondary"
              style={{ padding: "6px 12px", fontSize: "12.5px" }}
            >
              {lang === "en" ? "Log Out" : "Salir"}
            </button>
          </div>
        </div>

        {/* ─── 1. CREDIT LEDGER SUMMARY ─── */}
        <div className="card" style={{
          backgroundColor: "#fff",
          padding: "28px 24px",
          marginBottom: "28px",
          display: "flex",
          flexWrap: "wrap",
          gap: "24px",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-muted)", marginBottom: "4px" }}>
              {lang === "en" ? "Available Credit Balance" : "Saldo de Créditos Disponible"}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "44px", fontWeight: 600, color: "var(--color-accent)" }}>
                20
              </span>
              <span style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
                / 40 max cap
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: "4px 0 0" }}>
              {lang === "en"
                ? "Renews on your next billing date. FIFO 6-month expiry."
                : "Se renueva en tu próxima fecha de cobro. Caducidad FIFO a 6 meses."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link href="/events" className="btn btn-primary" style={{ padding: "10px 18px", fontSize: "14px" }}>
              {lang === "en" ? "Book an Event" : "Reservar Encuentro"}
            </Link>
            <Link href="/account/statement" className="btn btn-secondary" style={{ padding: "10px 18px", fontSize: "14px" }}>
              {lang === "en" ? "Activity Statement" : "Extracto de Actividad"}
            </Link>
          </div>
        </div>

        {/* ─── 2. GODMOTHER / AMBASSADOR REFERRAL ─── */}
        <div style={{
          border: "1px solid rgba(86, 139, 5, 0.4)",
          borderRadius: "8px",
          padding: "24px",
          backgroundColor: "#f4f7ee",
          marginBottom: "28px"
        }}>
          <div style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "13px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--color-accent-2)",
            marginBottom: "6px"
          }}>
            {lang === "en" ? "Godmother Referral Link (+20 Credits)" : "Tu Enlace de Madrina (+20 Créditos)"}
          </div>
          <p style={{ fontSize: "14px", lineHeight: "1.55", color: "var(--color-text)", margin: "0 0 16px" }}>
            {lang === "en"
              ? "Share The Mothers with friends. When a friend joins with your code, you receive +20 bonus credits (outside the 40-credit cap) for a full month's allowance."
              : "Comparte The Mothers con amigas. Cuando una amiga se una con tu código, recibes +20 créditos extra (fuera del tope de 40) equivalentes a un mes entero."}
          </p>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{
              backgroundColor: "#fff",
              border: "1px solid rgba(86, 139, 5, 0.3)",
              borderRadius: "4px",
              padding: "8px 16px",
              fontFamily: "monospace",
              fontSize: "15px",
              fontWeight: "bold",
              color: "var(--color-accent)"
            }}>
              {referralCode}
            </div>
            <button
              type="button"
              onClick={copyReferralCode}
              className="btn btn-secondary"
              style={{ borderColor: "rgba(86, 139, 5, 0.5)", color: "var(--color-accent-2)" }}
            >
              {copied
                ? lang === "en" ? "Copied to Clipboard!" : "¡Copiado!"
                : lang === "en" ? "Copy Invite Link" : "Copiar Enlace"}
            </button>
          </div>
        </div>

        {/* ─── 3. COMMUNITY GROUPS ─── */}
        <div className="card" style={{ padding: "28px 24px", marginBottom: "28px", backgroundColor: "#fff" }}>
          <h3 style={{ fontSize: "20px", marginBottom: "8px" }}>
            {lang === "en" ? "Your Stage & Neighbourhood Circles" : "Tus Círculos por Etapa y Barrio"}
          </h3>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
            {lang === "en"
              ? "Connect with mothers nearby. Group invitations are sent via WhatsApp."
              : "Conecta con madres cerca de ti. Las invitaciones a grupos se envían por WhatsApp."}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            <div style={{ border: "1px solid var(--color-divider)", borderRadius: "6px", padding: "16px" }}>
              <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600 }}>
                {lang === "en" ? "Stage Circle" : "Círculo por Etapa"}
              </div>
              <h4 style={{ fontSize: "16px", margin: "6px 0 4px" }}>
                {user.stage || "Pregnancy & Postpartum"}
              </h4>
              <span style={{ fontSize: "13px", color: "var(--color-accent-2)", fontWeight: 600 }}>
                ✓ Connected
              </span>
            </div>

            <div style={{ border: "1px solid var(--color-divider)", borderRadius: "6px", padding: "16px" }}>
              <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-accent)", fontWeight: 600 }}>
                {lang === "en" ? "Neighbourhood Circle" : "Círculo de Barrio"}
              </div>
              <h4 style={{ fontSize: "16px", margin: "6px 0 4px" }}>
                {user.neighbourhood || "Eixample & Gràcia"}
              </h4>
              <span style={{ fontSize: "13px", color: "var(--color-accent-2)", fontWeight: 600 }}>
                ✓ Connected
              </span>
            </div>
          </div>
        </div>

        {/* ─── 4. MEMBERSHIP DETAILS & BILLING ─── */}
        <div className="card" style={{ padding: "28px 24px", backgroundColor: "#fff" }}>
          <h3 style={{ fontSize: "20px", marginBottom: "16px" }}>
            {lang === "en" ? "Membership & Security" : "Membresía y Seguridad"}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-divider)", paddingBottom: "8px" }}>
              <span style={{ color: "var(--color-text-muted)" }}>Email</span>
              <span style={{ fontWeight: 600 }}>{user.email}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-divider)", paddingBottom: "8px" }}>
              <span style={{ color: "var(--color-text-muted)" }}>{lang === "en" ? "Plan Rate" : "Tarifa"}</span>
              <span style={{ fontWeight: 600 }}>€29 / month (Opening Circle Lock)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-divider)", paddingBottom: "8px" }}>
              <span style={{ color: "var(--color-text-muted)" }}>{lang === "en" ? "Next Renewal" : "Próxima Renovación"}</span>
              <span style={{ fontWeight: 600 }}>
                {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap" }}>
            <Link href="/account/change-password" className="btn btn-secondary" style={{ fontSize: "13px" }}>
              {lang === "en" ? "Change Password" : "Cambiar Contraseña"}
            </Link>
            <Link href="/account/pause" className="btn btn-secondary" style={{ fontSize: "13px" }}>
              {lang === "en" ? "Pause Membership (Free up to 2 mo)" : "Pausar Membresía (Gratis hasta 2 meses)"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
