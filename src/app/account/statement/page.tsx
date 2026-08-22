"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function ActivityStatementPage() {
  const { data: session } = useSession();
  const [lang, setLang] = useState<"en" | "es">("en");

  useEffect(() => {
    const saved = localStorage.getItem("tm_lang");
    if (saved === "es" || saved === "en") setLang(saved);
  }, []);

  const user = session?.user as any;
  const memberName = user?.name || "Maria Garcia";

  const entries = [
    {
      date: "22 Aug 2026",
      type: "Monthly Grant",
      typeEs: "Asignación Mensual",
      detail: "Opening Circle subscription payment",
      detailEs: "Pago de suscripción Opening Circle",
      amount: "+20",
      color: "var(--color-accent-2)",
    },
    {
      date: "14 Aug 2026",
      type: "Godmother Referral",
      typeEs: "Bono de Madrina",
      detail: "Referred: Elena S. (Exempt from 40 cap)",
      detailEs: "Referida: Elena S. (Exento de límite de 40)",
      amount: "+20",
      color: "var(--color-accent-2)",
    },
    {
      date: "10 Aug 2026",
      type: "Event Spend",
      typeEs: "Reserva de Encuentro",
      detail: "Sensory Play & Stroller Meetup (Sarrià)",
      detailEs: "Sensory Play & Stroller Meetup (Sarrià)",
      amount: "-18",
      color: "var(--color-accent)",
    },
    {
      date: "02 Aug 2026",
      type: "Return / Release",
      typeEs: "Devolución / Liberación",
      detail: "Released booking >24h prior (Full return)",
      detailEs: "Plaza liberada con >24h de antelación",
      amount: "+18",
      color: "var(--color-accent-2)",
    },
  ];

  return (
    <div style={{ backgroundColor: "#fdf9f2", minHeight: "100vh", padding: "40px 24px 80px" }}>
      {/* Top Bar for Print / Back */}
      <div style={{ maxWidth: "800px", margin: "0 auto 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/account" style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          ← {lang === "en" ? "Back to Member Account" : "Volver a Mi Cuenta"}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn btn-primary"
          style={{ padding: "8px 18px", fontSize: "13px" }}
        >
          {lang === "en" ? "Print / Download PDF" : "Imprimir / Guardar PDF"}
        </button>
      </div>

      {/* Statement Card */}
      <div className="card" style={{ maxWidth: "800px", margin: "0 auto", padding: "clamp(32px, 5vw, 48px)", backgroundColor: "#fff", border: "1px solid var(--color-divider)" }}>
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
            <div>{lang === "en" ? "Issued:" : "Emitido:"} {new Date().toLocaleDateString()}</div>
            <div>Member: {memberName}</div>
          </div>
        </div>

        {/* 4 Summary Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "36px" }}>
          <div style={{ backgroundColor: "#fdf9f2", border: "1px solid var(--color-divider)", borderRadius: "4px", padding: "12px 16px" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "24px", fontWeight: 600, color: "var(--color-accent)" }}>20</div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-text-muted)", marginTop: "2px" }}>
              {lang === "en" ? "Current Balance" : "Saldo Actual"}
            </div>
          </div>
          <div style={{ backgroundColor: "#fdf9f2", border: "1px solid var(--color-divider)", borderRadius: "4px", padding: "12px 16px" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "24px", fontWeight: 600, color: "var(--color-accent-2)" }}>+40</div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-text-muted)", marginTop: "2px" }}>
              {lang === "en" ? "Total Granted" : "Total Otorgado"}
            </div>
          </div>
          <div style={{ backgroundColor: "#fdf9f2", border: "1px solid var(--color-divider)", borderRadius: "4px", padding: "12px 16px" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "24px", fontWeight: 600, color: "var(--color-accent)" }}>-18</div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-text-muted)", marginTop: "2px" }}>
              {lang === "en" ? "Total Spent" : "Total Utilizado"}
            </div>
          </div>
          <div style={{ backgroundColor: "#fdf9f2", border: "1px solid var(--color-divider)", borderRadius: "4px", padding: "12px 16px" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "24px", fontWeight: 600 }}>0</div>
            <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-text-muted)", marginTop: "2px" }}>
              {lang === "en" ? "Expired Credits" : "Créditos Caducados"}
            </div>
          </div>
        </div>

        {/* Ledger Entries Table */}
        <h3 style={{ fontSize: "18px", marginBottom: "16px" }}>
          {lang === "en" ? "Transaction History (Append-Only)" : "Historial de Movimientos"}
        </h3>
        <div style={{ border: "1px solid var(--color-divider)", borderRadius: "4px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
            <thead>
              <tr style={{ backgroundColor: "#faf6f0", borderBottom: "1px solid var(--color-divider)", textAlign: "left" }}>
                <th style={{ padding: "10px 14px" }}>Date</th>
                <th style={{ padding: "10px 14px" }}>Movement</th>
                <th style={{ padding: "10px 14px" }}>Details</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                  <td style={{ padding: "12px 14px", color: "var(--color-text-muted)", fontSize: "12.5px" }}>
                    {item.date}
                  </td>
                  <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                    {lang === "en" ? item.type : item.typeEs}
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--color-text-muted)" }}>
                    {lang === "en" ? item.detail : item.detailEs}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 600, color: item.color }}>
                    {item.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: "12.5px", color: "var(--color-text-muted)", marginTop: "24px", lineHeight: "1.5" }}>
          {lang === "en"
            ? "Note: Monthly credits are subject to a 40-credit maximum cap and FIFO 6-month expiry. Godmother referral bonus credits sit outside the rollover cap."
            : "Nota: Los créditos mensuales tienen un tope de acumulación de 40 créditos y caducidad FIFO a 6 meses. Los créditos de Madrina quedan exentos del tope."}
        </p>
      </div>
    </div>
  );
}
