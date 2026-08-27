"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Locale } from "@/lib/i18n";
import { getAccountData } from "@/app/actions/memberAccount";

export default function ActivityStatementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lang, setLang] = useState<Locale>("en");
  const [accountData, setAccountData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved as Locale);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/account/login");
    } else if (status === "authenticated") {
      getAccountData()
        .then((res) => {
          if (res.success) {
            setAccountData(res);
          } else {
            setError(res.error || "Failed to load account data");
          }
        })
        .catch((err) => {
          setError(err.message || "Error loading account");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "18px" }}>Loading statement...</p>
      </div>
    );
  }

  if (error || !accountData) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: "18px" }}>Unable to load statement</p>
        <Link href="/account" style={{ color: "var(--color-accent)", textDecoration: "underline" }}>
          Return to Account
        </Link>
      </div>
    );
  }

  const { member, credits } = accountData;
  const ledger = credits?.ledger || [];
  
  // Sort ledger by date descending for the statement
  const sortedLedger = [...ledger].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Compute stats
  const totalGranted = ledger.filter((e: any) => e.amount > 0).reduce((sum: number, e: any) => sum + e.amount, 0);
  const totalSpent = ledger.filter((e: any) => e.amount < 0).reduce((sum: number, e: any) => sum + Math.abs(e.amount), 0);
  // (Assuming expired credits would be a specific type or reason, for now just 0 as per hardcoded)
  const expiredCredits = 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ backgroundColor: "#FEFDF9", minHeight: "100vh", padding: "clamp(40px, 5vw, 64px) clamp(24px, 5vw, 64px) 88px" }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .ledger-container { border: none !important; padding: 0 !important; box-shadow: none !important; }
        }
      `}} />
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div className="no-print" style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/account" style={{ color: "var(--color-text-muted)", fontSize: "14px", textDecoration: "none" }}>
            ← {lang === "en" ? "Back to Member Account" : "Volver a Mi Cuenta"}
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ padding: "8px 18px", fontSize: "13px" }}
          >
            {lang === "en" ? "Print / Download PDF" : "Imprimir / Guardar PDF"}
          </button>
        </div>

        <div className="ledger-container" style={{ border: "1px solid var(--color-divider)", borderRadius: "8px", padding: "clamp(32px, 5vw, 48px)", backgroundColor: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--color-divider)", paddingBottom: "20px", marginBottom: "28px" }}>
            <div>
              <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "14px", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent)" }}>
                The Mothers · Barcelona
              </span>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "28px", margin: "6px 0 0" }}>
                {lang === "en" ? "Credit Ledger Statement" : "Extracto del Saldo de Créditos"}
              </h1>
            </div>
            <div style={{ textAlign: "right", fontSize: "12.5px", color: "var(--color-text-muted)" }}>
              <div>{lang === "en" ? "Issued:" : "Emitido:"} {new Date().toLocaleDateString(lang === "en" ? "en-GB" : "es-ES")}</div>
              <div>Member: {member?.firstName} {member?.lastName}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "36px" }}>
            <div style={{ backgroundColor: "#fdf9f2", border: "1px solid var(--color-divider)", borderRadius: "4px", padding: "12px 16px" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "24px", fontWeight: 600, color: "var(--color-accent)" }}>{credits?.available}</div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-text-muted)", marginTop: "2px" }}>
                {lang === "en" ? "Current Balance" : "Saldo Actual"}
              </div>
            </div>
            <div style={{ backgroundColor: "#fdf9f2", border: "1px solid var(--color-divider)", borderRadius: "4px", padding: "12px 16px" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "24px", fontWeight: 600, color: "var(--color-accent-2)" }}>+{totalGranted}</div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-text-muted)", marginTop: "2px" }}>
                {lang === "en" ? "Total Granted" : "Total Otorgado"}
              </div>
            </div>
            <div style={{ backgroundColor: "#fdf9f2", border: "1px solid var(--color-divider)", borderRadius: "4px", padding: "12px 16px" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "24px", fontWeight: 600, color: "var(--color-accent)" }}>-{totalSpent}</div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-text-muted)", marginTop: "2px" }}>
                {lang === "en" ? "Total Spent" : "Total Utilizado"}
              </div>
            </div>
            <div style={{ backgroundColor: "#fdf9f2", border: "1px solid var(--color-divider)", borderRadius: "4px", padding: "12px 16px" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "24px", fontWeight: 600 }}>{expiredCredits}</div>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-text-muted)", marginTop: "2px" }}>
                {lang === "en" ? "Expired Credits" : "Créditos Caducados"}
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>
            {lang === "en" ? "Transaction History (Append-Only)" : "Historial de Movimientos"}
          </h3>
          <div style={{ border: "1px solid var(--color-divider)", borderRadius: "4px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ backgroundColor: "#faf6f0", borderBottom: "1px solid var(--color-divider)", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px" }}>{lang === "en" ? "Date" : "Fecha"}</th>
                  <th style={{ padding: "10px 14px" }}>{lang === "en" ? "Movement Type" : "Tipo de Movimiento"}</th>
                  <th style={{ padding: "10px 14px" }}>{lang === "en" ? "Details" : "Detalles"}</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>{lang === "en" ? "Amount" : "Importe"}</th>
                </tr>
              </thead>
              <tbody>
                {sortedLedger.map((entry, idx) => (
                  <tr key={entry.id || idx} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                    <td style={{ padding: "12px 14px", color: "var(--color-text-muted)", fontSize: "12.5px" }}>
                      {new Date(entry.createdAt).toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                      {entry.type}
                    </td>
                    <td style={{ padding: "12px 14px", color: "var(--color-text-muted)" }}>
                      {entry.reason || "—"}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: entry.amount > 0 ? "var(--color-accent-2)" : "var(--color-accent)" }}>
                      {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                    </td>
                  </tr>
                ))}
                {sortedLedger.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: "24px 8px", textAlign: "center", color: "rgba(57,41,42,0.5)" }}>
                      {lang === "en" ? "No activity found." : "No se encontró actividad."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: "12.5px", color: "var(--color-text-muted)", marginTop: "24px", lineHeight: "1.5" }}>
            {lang === "en"
              ? "Note: Monthly credits expire after 6 months on a FIFO basis with no rollover cap. The clock pauses during membership pauses."
              : "Nota: Los créditos mensuales caducan a los 6 meses según el orden FIFO sin tope de acumulación. El plazo se congela durante las pausas de membresía."}
          </p>
        </div>
      </div>
    </div>
  );
}
