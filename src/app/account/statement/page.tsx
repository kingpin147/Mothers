"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Locale } from "@/lib/i18n";
import { getAccountData } from "@/app/actions/memberAccount";

function groupByMonth(entries: any[]) {
  const map: Record<string, any[]> = {};
  for (const e of entries) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map[key]) map[key] = [];
    map[key].push(e);
  }
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
}

function formatMonthLabel(key: string, locale: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
}

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
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#FEFDF9" }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", color: "#7b1f2c" }}>Loading statement...</p>
      </div>
    );
  }

  if (error || !accountData) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}>Unable to load statement</p>
        <Link href="/account" style={{ color: "#7b1f2c", textDecoration: "underline" }}>Return to Account</Link>
      </div>
    );
  }

  const { member, credits } = accountData;
  const ledger: any[] = credits?.ledger || [];
  const locale = lang === "en" ? "en-GB" : "es-ES";

  const totalGranted = ledger.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const totalSpent = ledger.filter((e) => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
  const memberSince = member?.createdAt
    ? new Date(member.createdAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
    : "";

  const grouped = groupByMonth(ledger);

  const handlePrint = () => window.print();

  return (
    <div style={{ backgroundColor: "#FEFDF9", minHeight: "100vh", padding: "clamp(40px, 5vw, 64px) clamp(24px, 5vw, 64px) 88px", fontFamily: "'Lora', Georgia, serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `@media print { body { background: white !important; } .no-print { display: none !important; } }` }} />
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>

        {/* Nav */}
        <div className="no-print" style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/account" style={{ color: "rgba(57,41,42,0.6)", fontSize: "14px", textDecoration: "none" }}>
            ← {lang === "en" ? "Back to Member Account" : "Volver a Mi Cuenta"}
          </Link>
          <button type="button" onClick={handlePrint} style={{ border: "1px solid #7b1f2c", backgroundColor: "#7b1f2c", color: "#f8efe2", padding: "8px 18px", borderRadius: "4px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
            {lang === "en" ? "Print / Download PDF" : "Imprimir / Guardar PDF"}
          </button>
        </div>

        {/* Document */}
        <div style={{ backgroundColor: "#fff", border: "1px solid rgba(57,41,42,0.14)", borderRadius: "8px", padding: "clamp(32px, 5vw, 48px)" }}>
          {/* Header */}
          <div style={{ borderBottom: "1px solid rgba(57,41,42,0.12)", paddingBottom: "22px", marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "6px" }}>
                The Mothers · Barcelona
              </div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 400, margin: "0 0 4px" }}>
                {lang === "en" ? "Your activity since joining." : "Tu actividad desde que te uniste."}
              </h1>
              {memberSince && (
                <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.55)" }}>
                  {lang === "en" ? `Founding Circle member since ${memberSince}` : `Socia del Opening Circle desde ${memberSince}`}
                </div>
              )}
              <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.45)", marginTop: "4px" }}>
                {lang === "en" ? "Issued" : "Emitido"} {new Date().toLocaleDateString(locale)}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: "12.5px", color: "rgba(57,41,42,0.55)" }}>
              {member?.firstName} {member?.lastName}
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "36px" }}>
            {[
              { label: lang === "en" ? "CREDITS SINCE JOINING" : "CRÉDITOS DESDE EL INICIO", value: `+${totalGranted}`, color: "#568b05" },
              { label: lang === "en" ? "CREDITS TO SPEND" : "CRÉDITOS PARA USAR", value: `${credits?.available ?? 0}`, color: "#39292a" },
              { label: lang === "en" ? "USED IN EVENTS" : "USADOS EN EVENTOS", value: `${totalSpent}`, color: "#7b1f2c" },
            ].map((stat) => (
              <div key={stat.label} style={{ backgroundColor: "#fdf9f2", border: "1px solid rgba(57,41,42,0.1)", borderRadius: "6px", padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 600, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(57,41,42,0.5)", marginTop: "4px", lineHeight: 1.3 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Month-grouped ledger */}
          {grouped.length === 0 ? (
            <p style={{ textAlign: "center", color: "rgba(57,41,42,0.5)", fontSize: "14px", padding: "24px 0" }}>
              {lang === "en" ? "No activity yet." : "Sin actividad aún."}
            </p>
          ) : (
            grouped.map(([monthKey, entries]) => (
              <div key={monthKey} style={{ marginBottom: "32px" }}>
                {/* Month heading */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid rgba(57,41,42,0.15)", paddingBottom: "8px", marginBottom: "12px" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "15px", textTransform: "capitalize", color: "#39292a" }}>
                    {formatMonthLabel(monthKey, locale)}
                  </span>
                  <span style={{ fontSize: "11px", color: "rgba(57,41,42,0.45)", letterSpacing: "0.04em" }}>
                    {entries.length} {lang === "en" ? (entries.length === 1 ? "entry" : "entries") : (entries.length === 1 ? "movimiento" : "movimientos")}
                  </span>
                </div>

                {/* Entries */}
                {[...entries]
                  .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((entry: any, idx: number) => (
                    <div key={entry.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", padding: "10px 0", borderBottom: "1px solid rgba(57,41,42,0.06)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "14px", color: "#39292a", lineHeight: 1.3 }}>
                          {entry.reason || entry.type || "Credit entry"}
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.5)", marginTop: "2px" }}>
                          {new Date(entry.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                          {entry.type && entry.reason && ` · ${entry.type}`}
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: "14px", color: entry.amount > 0 ? "#568b05" : "#7b1f2c", whiteSpace: "nowrap" }}>
                        {entry.amount > 0 ? `+${entry.amount}` : `${entry.amount}`} {lang === "en" ? "credits" : "créditos"}
                      </span>
                    </div>
                  ))}
              </div>
            ))
          )}

          <p style={{ fontSize: "12px", color: "rgba(57,41,42,0.45)", marginTop: "24px", lineHeight: "1.5", borderTop: "1px solid rgba(57,41,42,0.1)", paddingTop: "16px" }}>
            {lang === "en"
              ? "Monthly credits expire after 6 months on a FIFO basis. The clock pauses during membership pauses."
              : "Los créditos mensuales caducan a los 6 meses según el orden FIFO. El plazo se congela durante las pausas de membresía."}
          </p>
        </div>
      </div>
    </div>
  );
}
