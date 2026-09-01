"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminFinance } from "@/app/actions/adminCms";

const WINE = "#7b1f2c",
  AMBER = "#a8752c",
  GREEN = "#3f6604",
  GREY = "rgba(57,41,42,0.55)";

export default function AdminFinancePage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [creditEntries, setCreditEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<"euros" | "credits">("euros");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [exported, setExported] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getAdminFinance();
      setLoading(false);
      if (res.success) {
        setPayments(res.payments || []);
        setCreditEntries(res.creditEntries || []);
      }
    }
    load();
  }, []);

  const SEED_ATTENTION = [
    { who: "Elena Prats", what: "renewal failed twice", meta: "Declined 28 and 30 Aug · membership pauses in 2 days", amount: "€29", color: WINE, action: "Retry or write" },
    { who: "Sofia Marín", what: "payment hold running out", meta: "Accepted 28 Aug · 11h of the 72 remaining", amount: "€48", color: WINE, action: "Extend" },
    { who: "Lina Djedir", what: "card declined, now past due", meta: "Failed 24 Aug · no card on file since", amount: "€29", color: AMBER, action: "Ask for a new card" },
    { who: "Clínica Bonanova", what: "partner agreement ends in 21 days", meta: "Perk live in 34 accounts", amount: "21 days", color: AMBER, action: "Renew" },
  ];

  // Helper functions
  const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");
  const money = (p: any) => {
    let cents = p.amountCents;
    if (p.status === "refunded") return -cents;
    return cents;
  };

  const ofPurpose = (purpose: string, statusOpt?: string) =>
    payments.filter(
      (p) =>
        p.purpose.toLowerCase() === purpose.toLowerCase().replace(/ /g, "_") &&
        (!statusOpt || p.status.toLowerCase() === statusOpt.toLowerCase())
    );

  const sum = (rows: any[]) => rows.reduce((n, p) => n + Math.abs(money(p) / 100), 0);

  const paid = payments.filter((p) => p.status === "succeeded" || p.status === "paid");
  const subs = ofPurpose("subscription", "succeeded");
  const passes = ofPurpose("event_pass", "succeeded");
  const joining = ofPurpose("joining_fee");
  const refunds = payments.filter((p) => p.status === "refunded");
  const failed = payments.filter((p) => p.status === "failed");

  const monthLabel = new Date().toLocaleDateString("en-GB", { month: "long" });

  const totalPaid = sum(paid) || 1;
  const pct = (n: number) => Math.round((n / totalPaid) * 100) + "%";

  const q = query.trim().toLowerCase();

  const euroRows = payments
    .filter((r) => {
      const matchKind = kind === "all" || r.purpose.toLowerCase() === kind.toLowerCase().replace(/ /g, "_");
      const matchStatus =
        status === "all" ||
        (status === "Paid" && (r.status === "succeeded" || r.status === "paid")) ||
        (status === "Failed" && r.status === "failed") ||
        (status === "Refunded" && r.status === "refunded") ||
        (status === "Pending" && r.status === "pending");
      const searchStr = `${r.personFirstName || ""} ${r.personLastName || ""} ${r.personEmail || ""} ${r.stripeInvoiceId || ""}`.toLowerCase();
      const matchQuery = !q || searchStr.includes(q);
      return matchKind && matchStatus && matchQuery;
    })
    .map((r) => {
      const isFailed = r.status === "failed";
      const isRefunded = r.status === "refunded";
      const isPaid = r.status === "succeeded" || r.status === "paid";
      return {
        ...r,
        displayStatus: isPaid ? "Paid" : isFailed ? "Failed" : isRefunded ? "Refunded" : "Pending",
        statusColor: isPaid ? GREEN : isFailed ? WINE : isRefunded ? GREY : AMBER,
        amountStr: `${isRefunded ? "−" : ""}€${(r.amountCents / 100).toFixed(0)}`,
        amountColor: isRefunded ? WINE : "#39292a",
        rowBg: isFailed ? "rgba(123,31,44,0.03)" : "transparent",
        dateStr: new Date(r.occurredAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        nameStr: `${r.personFirstName || ""} ${r.personLastName || ""}`.trim() || "—",
        purposeStr: r.purpose.replace(/_/g, " "),
      };
    });

  const creditRows = creditEntries.map((c) => {
    const amountVal = parseInt(c.amount, 10) || c.amount;
    const isOut = amountVal < 0;
    const isIn = amountVal > 0;
    return {
      ...c,
      nameStr: `${c.personFirstName || ""} ${c.personLastName || ""}`.trim() || "—",
      amountStr: isOut ? `−${Math.abs(amountVal)}` : `+${amountVal}`,
      amountColor: isIn ? GREEN : WINE,
      typeColor: c.type === "adjustment" || c.type === "correction" ? WINE : "rgba(57,41,42,0.75)",
      expiresStr: c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—",
      actorStr: c.actorAdminId ? `Admin · ${new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : `System · ${new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
      typeStr: c.type.replace(/_/g, " "),
    };
  });

  const csv = (rows: string[][]) => rows.map((r) => r.map((c) => '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"').join(",")).join("\r\n");

  const handleExportCsv = (type: "euros" | "credits") => () => {
    let head: string[] = [];
    let body: string[][] = [];

    if (type === "euros") {
      head = ["Payer", "Email", "What for", "Detail", "Date", "Status", "Amount", "Reference"];
      body = euroRows.map((r) => [r.nameStr, r.personEmail, r.purposeStr, "", r.dateStr, r.displayStatus, r.amountStr, r.stripeInvoiceId || ""]);
    } else {
      head = ["Member", "Type", "Reason", "Credits", "Expires", "Actor and when"];
      body = creditRows.map((c) => [c.nameStr, c.typeStr, c.reason || "", c.amountStr, c.expiresStr, c.actorStr]);
    }

    const blob = new Blob(["\ufeff" + csv([head].concat(body))], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `the-mothers-${type === "euros" ? "payments" : "credit-ledger"}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8efe2", padding: "40px", textAlign: "center" }}>
        Loading finance records...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8efe2" }}>
      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "clamp(24px,3.4vw,36px) clamp(18px,3vw,30px) 60px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "22px" }}>
          <div style={{ flex: "1 1 400px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>
              <Link href="/admin">← Dashboard</Link> · Finance
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 400, fontSize: "clamp(30px,4vw,42px)", lineHeight: 1.1, margin: "0 0 9px" }}>
              Money in, money back
            </h1>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "70ch", textWrap: "pretty" }}>
              Two ledgers side by side: euros through Stripe, and credits — which are money in all but name. Both are append-only. Nothing here can be edited, only added to.
            </p>
          </div>
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleExportCsv(tab)}
              style={{
                border: "1px solid rgba(57,41,42,0.3)",
                background: "transparent",
                color: "#39292a",
                borderRadius: "4px",
                padding: "9px 15px",
                fontFamily: "'Cormorant Garamond',serif",
                fontWeight: 600,
                fontSize: "13.5px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {exported ? "Downloaded" : `Export CSV (${tab === "euros" ? euroRows.length : creditRows.length})`}
            </button>
            <Link
              href="/admin"
              style={{
                border: "1px solid rgba(57,41,42,0.3)",
                color: "#39292a",
                borderRadius: "4px",
                padding: "9px 15px",
                fontFamily: "'Cormorant Garamond',serif",
                fontWeight: 600,
                fontSize: "13.5px",
                whiteSpace: "nowrap",
                textDecoration: "none",
              }}
            >
              ← Dashboard
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,168px),1fr))", gap: "12px", marginBottom: "18px" }}>
          {[
            { value: eur(sum(paid)), label: "Taken in " + monthLabel, color: "#39292a", note: `${paid.length} payments` },
            { value: eur(sum(subs)), label: "Recurring subscriptions", color: "#39292a", note: `${subs.length} payments` },
            { value: eur(sum(passes)), label: "Event Passes", color: "#39292a", note: `${passes.length} passes` },
            { value: eur(sum(joining)), label: "Joining fees", color: "#39292a", note: `${joining.length} first payments` },
            { value: eur(sum(refunds)), label: "Refunded", color: WINE, note: `${refunds.length} refunds` },
            { value: eur(sum(failed)), label: "Failed, unrecovered", color: AMBER, note: `${failed.length} to chase` },
          ].map((s, i) => (
            <div key={i} style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "6px", background: "#fffdfa", padding: "15px 17px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: "24px", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", marginTop: "6px", lineHeight: 1.4 }}>{s.label}</div>
              <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "5px" }}>{s.note}</div>
            </div>
          ))}
        </div>

        <div style={{ border: "1px solid rgba(123,31,44,0.4)", borderRadius: "8px", background: "#fdf6f2", padding: "clamp(18px,2.4vw,24px)", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", marginBottom: "14px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: "23px", lineHeight: 1.2, margin: 0, color: "#7b1f2c" }}>Needs you today</h2>
            <Link href="/admin/members" style={{ fontSize: "13.5px" }}>
              Member records →
            </Link>
          </div>
          <div>
            {SEED_ATTENTION.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", padding: "12px 0", borderBottom: i === SEED_ATTENTION.length - 1 ? "none" : "1px solid rgba(57,41,42,0.12)" }}>
                <div style={{ flex: "1 1 300px" }}>
                  <div style={{ fontSize: "14.5px", lineHeight: 1.5, marginBottom: "3px" }}>
                    <strong style={{ fontWeight: 600 }}>{a.who}</strong> — {a.what}
                  </div>
                  <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57,41,42,0.65)" }}>{a.meta}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "15px", fontVariantNumeric: "tabular-nums", color: a.color, whiteSpace: "nowrap" }}>{a.amount}</span>
                  <Link href="/admin/members" style={{ fontSize: "13px", whiteSpace: "nowrap" }}>
                    {a.action} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "9px", flexWrap: "wrap", marginBottom: "16px" }}>
          {[
            { id: "euros", label: "Euros · Stripe" },
            { id: "credits", label: "Credits · ledger" },
          ].map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as any)}
                style={{
                  border: `1px solid ${on ? WINE : "rgba(57,41,42,0.25)"}`,
                  background: on ? "rgba(123,31,44,0.08)" : "transparent",
                  color: on ? WINE : "#39292a",
                  borderRadius: "20px",
                  padding: "9px 18px",
                  fontFamily: "'Cormorant Garamond',serif",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "euros" && (
          <>
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 18px", marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search payer or reference"
                style={{ flex: "1 1 220px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 13px", fontFamily: "'Lora',Georgia,serif", fontSize: "14px", color: "#39292a", background: "#fff" }}
              />
              <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora',Georgia,serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
                <option value="all">Every kind</option>
                <option value="Subscription">Subscriptions</option>
                <option value="Joining fee">Joining fees</option>
                <option value="Event Pass">Event Passes</option>
                <option value="Extra credits">Extra credits</option>
                <option value="Refund">Refunds</option>
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora',Georgia,serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
                <option value="all">Any status</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", overflowX: "auto", marginBottom: "18px" }}>
              <div style={{ minWidth: "1000px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1.6fr 1fr 1fr 0.9fr 1fr", gap: "14px", padding: "14px 18px", borderBottom: "1px solid rgba(57,41,42,0.18)", fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)" }}>
                  <div>Payer</div>
                  <div>What for</div>
                  <div>When</div>
                  <div>Status</div>
                  <div style={{ textAlign: "right" }}>Amount</div>
                  <div style={{ textAlign: "right" }}>Reference</div>
                </div>
                {euroRows.map((r, i) => (
                  <div key={r.id || i} style={{ display: "grid", gridTemplateColumns: "1.6fr 1.6fr 1fr 1fr 0.9fr 1fr", gap: "14px", padding: "14px 18px", borderBottom: "1px solid rgba(57,41,42,0.1)", alignItems: "center", background: r.rowBg }}>
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "15px", lineHeight: 1.3 }}>{r.nameStr}</div>
                      <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.62)", marginTop: "2px" }}>{r.personEmail}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "13.5px", lineHeight: 1.5, textTransform: "capitalize" }}>{r.purposeStr}</div>
                    </div>
                    <div style={{ fontSize: "13px", lineHeight: 1.5, fontVariantNumeric: "tabular-nums" }}>{r.dateStr}</div>
                    <div>
                      <span style={{ display: "inline-block", border: `1px solid ${r.statusColor}`, color: r.statusColor, borderRadius: "3px", padding: "3px 9px", fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "11.5px", whiteSpace: "nowrap" }}>
                        {r.displayStatus}
                      </span>
                    </div>
                    <div style={{ textAlign: "right", fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "16px", fontVariantNumeric: "tabular-nums", color: r.amountColor }}>{r.amountStr}</div>
                    <div style={{ textAlign: "right", fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.55)", fontVariantNumeric: "tabular-nums", wordBreak: "break-all" }}>{r.stripeInvoiceId || "live"}</div>
                  </div>
                ))}
                {euroRows.length === 0 && (
                  <div style={{ padding: "22px 18px", fontSize: "14px", color: "rgba(57,41,42,0.65)" }}>Nothing matches those filters.</div>
                )}
              </div>
            </div>
          </>
        )}

        {tab === "credits" && (
          <>
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px,2.4vw,24px)", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", marginBottom: "6px" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: "21px", lineHeight: 1.2, margin: 0 }}>The credit ledger</h2>
                <span style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.6)" }}>Append-only · a balance is the sum of entries, never a stored figure</span>
              </div>
              <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 16px", maxWidth: "74ch", textWrap: "pretty" }}>
                Every entry carries the member, the amount, the type, the event it belongs to, a reason, who did it, when, and the expiry it inherits. Manual adjustments appear in her own statement as an adjustment by the team.
              </p>
              <div style={{ overflowX: "auto" }}>
                <div style={{ minWidth: "940px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 2.2fr 0.7fr 1fr 1fr", gap: "14px", padding: "12px 0", borderBottom: "1px solid rgba(57,41,42,0.18)", fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)" }}>
                    <div>Member</div>
                    <div>Type</div>
                    <div>Reason</div>
                    <div style={{ textAlign: "right" }}>Credits</div>
                    <div>Expires</div>
                    <div>Actor · when</div>
                  </div>
                  {creditRows.map((c, i) => (
                    <div key={c.id || i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.2fr 2.2fr 0.7fr 1fr 1fr", gap: "14px", padding: "13px 0", borderBottom: "1px solid rgba(57,41,42,0.1)", alignItems: "center" }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "14.5px" }}>{c.nameStr}</div>
                      <div style={{ fontSize: "13px", lineHeight: 1.5, color: c.typeColor, textTransform: "capitalize" }}>{c.typeStr}</div>
                      <div style={{ fontSize: "13px", lineHeight: 1.55, color: "rgba(57,41,42,0.78)" }}>{c.reason}</div>
                      <div style={{ textAlign: "right", fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "16px", fontVariantNumeric: "tabular-nums", color: c.amountColor }}>{c.amountStr}</div>
                      <div style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.65)", fontVariantNumeric: "tabular-nums" }}>{c.expiresStr}</div>
                      <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)" }}>{c.actorStr}</div>
                    </div>
                  ))}
                  {creditRows.length === 0 && (
                    <div style={{ padding: "22px 0", fontSize: "14px", color: "rgba(57,41,42,0.65)" }}>No credit entries found.</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: "16px" }}>
              <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>What the money is made of</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  {[
                    { label: "Subscriptions", value: eur(sum(subs)), pct: pct(sum(subs)) },
                    { label: "Event Passes", value: eur(sum(passes)), pct: pct(sum(passes)) },
                    { label: "Joining fees", value: eur(sum(joining)), pct: pct(sum(joining)) },
                    { label: "Extra credits", value: eur(0), pct: "0%" }, // Not tracked in DB yet
                    { label: "Refunded", value: `−${eur(sum(refunds))}`, pct: pct(sum(refunds)) },
                  ].map((m, i) => (
                    <div key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13.5px", lineHeight: 1.5, marginBottom: "4px" }}>
                        <span>{m.label}</span>
                        <span style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{m.value}</span>
                      </div>
                      <div style={{ height: "3px", background: "rgba(57,41,42,0.12)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "3px", width: m.pct, background: "#7b1f2c" }}></div>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "12px", lineHeight: 1.55, color: "rgba(57,41,42,0.62)", margin: "12px 0 0", textWrap: "pretty" }}>
                  {monthLabel} so far. There is no shop and no orders — that was cancelled.
                </p>
              </div>
              <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>Rules this page holds</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
                  <div><strong style={{ fontWeight: 600 }}>Nothing here is editable.</strong> A mistake is corrected by adding a correction entry, never by changing history.</div>
                  <div><strong style={{ fontWeight: 600 }}>We cancel an event, everyone is made whole:</strong> members get credits back at their original expiry, guests get €35 back to the card and the pass restored so it does not count against their two.</div>
                  <div><strong style={{ fontWeight: 600 }}>Expiry runs as a visible job</strong>, oldest credits first, and shows here — never silently.</div>
                  <div><strong style={{ fontWeight: 600 }}>Prices come from settings</strong>, so €19, €29, €35 and €39 are the same numbers the public pages quote.</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
