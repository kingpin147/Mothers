"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminMembers, adjustMemberCredits } from "@/app/actions/adminCms";

const WINE = '#7b1f2c', AMBER = '#a8752c', GREEN = '#3f6604', GREY = 'rgba(57,41,42,0.55)';

const STATUS_COLORS: Record<string, string> = { 
  active: GREEN, 
  paused: AMBER, 
  past_due: WINE, 
  cancelled_at_period_end: WINE,
  lapsed: WINE
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  past_due: "Past due",
  cancelled_at_period_end: "Ending",
  lapsed: "Lapsed",
  applicant: "Applicant"
};

export default function AdminMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("risk");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  
  const [adjustAmount, setAdjustAmount] = useState<number | "">("");
  const [adjustReason, setAdjustReason] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [exported, setExported] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    const res = await getAdminMembers();
    setLoading(false);
    if (res.success && res.members) {
      setMembers(res.members);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleExportCSV = (list: any[]) => {
    const head = ['Name','Email','Stage','Neighbourhood','Children','Plan','Status','Credits','Attended 90d','Member since','Needs a word'];
    const rows = list.map(m => [
      `${m.firstName} ${m.lastName}`,
      m.email,
      m.stage || '',
      m.neighbourhood || '',
      m.children?.length ? `${m.children.length} child(ren)` : '—',
      `€${(m.monthlyPriceCents / 100).toFixed(0)}/mo`,
      STATUS_LABELS[m.status] || m.status,
      m.credits || 0,
      m.attended || 0,
      new Date(m.joinedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      m.atRiskSince ? 'At risk' : ''
    ]);

    const csvContent = [head.join(","), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(['\ufeff' + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `the-mothers-members-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  const handleAdjustCredits = async (memberId: string) => {
    if (!adjustReason.trim() || adjustAmount === "") {
      alert("A valid explanation/reason and amount are required for ledger adjustments.");
      return;
    }

    setIsAdjusting(true);
    const res = await adjustMemberCredits({
      memberId: memberId,
      amount: Number(adjustAmount),
      reason: adjustReason,
    });
    setIsAdjusting(false);

    if (res.success) {
      setAdjustingId(null);
      setAdjustReason("");
      setAdjustAmount("");
      fetchMembers(); // refresh balances
    } else {
      alert(res.error || "Adjustment failed.");
    }
  };

  const q = query.trim().toLowerCase();
  
  let filtered = members.filter(m => {
    const isRisk = !!m.atRiskSince;
    const isEnding = m.status === 'cancelled_at_period_end';
    const stateMatched = 
      statusFilter === 'all' || 
      (statusFilter === 'risk' && isRisk) || 
      (statusFilter === 'ending' && isEnding) ||
      m.status === statusFilter;
      
    const stageMatched = stageFilter === 'all' || m.stage === stageFilter;
    const areaMatched = areaFilter === 'all' || m.neighbourhood === areaFilter;
    const planMatched = planFilter === 'all'; // Currently simplified plan matching
    
    const textMatched = !q || (`${m.firstName} ${m.lastName} ${m.email}`).toLowerCase().includes(q);

    return stateMatched && stageMatched && areaMatched && planMatched && textMatched;
  });

  if (sortFilter === 'risk') {
    filtered = filtered.slice().sort((a,b) => (b.atRiskSince?1:0) - (a.atRiskSince?1:0));
  } else if (sortFilter === 'name') {
    filtered = filtered.slice().sort((a,b) => a.firstName.localeCompare(b.firstName));
  } else if (sortFilter === 'quiet') {
    filtered = filtered.slice().sort((a,b) => (a.attended || 0) - (b.attended || 0));
  } else if (sortFilter === 'joined') {
    filtered = filtered.slice().sort((a,b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
  }

  const riskyCount = members.filter(m => !!m.atRiskSince).length;

  const topFilters = [
    { id:'all', label:`All (${members.length})` },
    { id:'active', label:`Active (${members.filter(m => m.status === 'active').length})` },
    { id:'risk', label:`Needs a word (${riskyCount})` },
    { id:'paused', label:`Paused (${members.filter(m => m.status === 'paused').length})` },
    { id:'past_due', label:`Past due (${members.filter(m => m.status === 'past_due').length})` },
    { id:'ending', label:`Ending (${members.filter(m => m.status === 'cancelled_at_period_end').length})` }
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2" }}>


      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 60px" }}>
        
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "22px" }}>
          <div style={{ flex: "1 1 400px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>
              <Link href="/admin" style={{ color: "#7b1f2c" }}>← Dashboard</Link> · Members
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px, 4vw, 42px)", lineHeight: 1.1, margin: "0 0 9px" }}>The membership</h1>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "70ch", textWrap: "pretty" }}>
              Stage is in the list because it is how you think about them. The at-risk flag is a prompt to write to someone — never a message the system sends by itself.
            </p>
          </div>
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <button type="button" onClick={() => handleExportCSV(filtered)} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer", whiteSpace: "nowrap" }}>
              {exported ? 'Downloaded' : `Export CSV (${filtered.length})`}
            </button>
            <Link href="/admin" style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap" }}>
              ← Dashboard
            </Link>
          </div>
        </div>

        <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 18px", marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or phone" style={{ flex: "1 1 240px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }} />
          
          <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
            <option value="all">All stages</option>
            <option value="Pregnant">Pregnant</option>
            <option value="Babies">Babies</option>
            <option value="Toddlers">Toddlers</option>
            <option value="Children">Children</option>
            <option value="Big kids">Big kids</option>
          </select>
          
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
            <option value="all">All neighbourhoods</option>
            <option value="Gràcia">Gràcia</option>
            <option value="Eixample">Eixample</option>
            <option value="Sarrià–Sant Gervasi">Sarrià–Sant Gervasi</option>
            <option value="Ciutat Vella">Ciutat Vella</option>
            <option value="Sant Martí">Sant Martí</option>
          </select>

          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
            <option value="all">All plans</option>
            <option value="29">€29 monthly · Opening Circle</option>
            <option value="79">€79 quarterly · Opening Circle</option>
            <option value="39">€39 monthly · standard</option>
          </select>

          <select value={sortFilter} onChange={(e) => setSortFilter(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
            <option value="risk">At-risk first</option>
            <option value="name">Name</option>
            <option value="joined">Newest first</option>
            <option value="quiet">Longest since attending</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "9px", flexWrap: "wrap", marginBottom: "18px" }}>
          {topFilters.map(f => {
            const isOn = statusFilter === f.id;
            return (
              <button 
                key={f.id} 
                type="button" 
                onClick={() => setStatusFilter(f.id)} 
                style={{ 
                  border: `1px solid ${isOn ? WINE : 'rgba(57,41,42,0.25)'}`, 
                  background: isOn ? 'rgba(123,31,44,0.08)' : 'transparent', 
                  color: isOn ? WINE : '#39292a', 
                  borderRadius: "20px", 
                  padding: "8px 16px", 
                  fontFamily: "'Cormorant Garamond', serif", 
                  fontWeight: 600, 
                  fontSize: "13px", 
                  cursor: "pointer", 
                  whiteSpace: "nowrap" 
                }}>
                {f.label}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px" }}>Loading members...</div>
        ) : (
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", overflowX: "auto", marginBottom: "18px" }}>
            <div style={{ minWidth: "1140px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.1fr 1fr 0.8fr 1fr 1.4fr", gap: "14px", padding: "14px 18px", borderBottom: "1px solid rgba(57,41,42,0.18)", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)" }}>
                <div>Member</div>
                <div>Stage & area</div>
                <div>Plan</div>
                <div>Status</div>
                <div>Credits</div>
                <div>Attended · 90d</div>
                <div>Care</div>
              </div>

              {filtered.map(m => {
                const isRisk = !!m.atRiskSince;
                const creditColor = (m.credits || 0) <= 8 ? AMBER : '#39292a';
                const attendColor = (m.attended || 0) === 0 ? WINE : (m.attended || 0) <= 2 ? AMBER : GREEN;
                const isAdjustingThis = adjustingId === m.id;
                
                const joinedDate = new Date(m.joinedAt);
                let lastSeenText = 'Not seen yet';
                if (m.lastSeenDate) {
                  const daysSince = Math.floor((new Date().getTime() - new Date(m.lastSeenDate).getTime()) / (1000 * 3600 * 24));
                  lastSeenText = `Last seen ${daysSince} days ago`;
                }
                
                let childrenStr = m.children && m.children.length > 0 ? `${m.children.length} child(ren)` : '—';
                const statusName = STATUS_LABELS[m.status] || m.status;

                return (
                  <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.1fr 1fr 0.8fr 1fr 1.4fr", gap: "14px", padding: "15px 18px", borderBottom: "1px solid rgba(57,41,42,0.1)", alignItems: "start", background: isRisk ? 'rgba(168,117,44,0.04)' : 'transparent' }}>
                    
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", lineHeight: 1.3, marginBottom: "3px" }}>{m.firstName} {m.lastName}</div>
                      <div style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.68)" }}>{m.email}</div>
                      <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.55)", marginTop: "3px" }}>Member since {joinedDate.toLocaleDateString('en-GB', {month:'short', year:'numeric'})}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: "13.5px", lineHeight: 1.5 }}>{m.stage || "Not given"}</div>
                      <div style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.65)", marginTop: "3px" }}>{m.neighbourhood || "Not given"}</div>
                      <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.55)", marginTop: "3px" }}>{childrenStr}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: "13.5px", lineHeight: 1.5, fontVariantNumeric: "tabular-nums" }}>€{(m.monthlyPriceCents / 100).toFixed(0)} / {m.planName?.includes('quarter') ? 'quarter' : 'month'}</div>
                      <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "3px" }}>{m.planSubtext || m.planName || "Standard"}</div>
                    </div>

                    <div>
                      <span style={{ display: "inline-block", border: `1px solid ${STATUS_COLORS[m.status] || GREY}`, color: STATUS_COLORS[m.status] || GREY, borderRadius: "3px", padding: "4px 9px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{statusName}</span>
                      {m.statusSubtext && <div style={{ fontSize: "11.5px", lineHeight: 1.4, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>{m.statusSubtext}</div>}
                    </div>

                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", color: creditColor }}>{m.credits || 0}</div>
                      {m.creditsSubtext && <div style={{ fontSize: "11px", lineHeight: 1.4, color: "rgba(57,41,42,0.6)", marginTop: "4px" }}>{m.creditsSubtext}</div>}
                    </div>

                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", color: attendColor }}>{m.attended || 0}</div>
                      <div style={{ fontSize: "11px", lineHeight: 1.4, color: "rgba(57,41,42,0.6)", marginTop: "4px" }}>{lastSeenText}</div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "7px", alignItems: "flex-start" }}>
                      {isRisk && (
                        <div style={{ border: "1px solid rgba(168,117,44,0.6)", borderRadius: "4px", padding: "7px 10px", background: "rgba(168,117,44,0.06)", width: "100%", boxSizing: "border-box", marginBottom: "2px" }}>
                          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#8a6220", marginBottom: "3px" }}>Needs a word</div>
                          <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.75)" }}>{m.riskReason || "Flagged at risk manually or system rule."}</div>
                        </div>
                      )}
                      
                      <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", alignItems: "center" }}>
                        <Link href={`/admin/members/${m.id}`} style={{ fontSize: "12.5px", color: "#39292a" }}>Record</Link>
                        <span style={{ color: "rgba(57,41,42,0.3)" }}>·</span>
                        <Link href={`/admin/members/${m.id}`} style={{ fontSize: "12.5px", color: "#39292a" }}>Ledger</Link>
                      </div>
                      <button type="button" onClick={() => setAdjustingId(isAdjustingThis ? null : m.id)} style={{ border: "none", background: "transparent", color: "#7b1f2c", fontFamily: "'Lora', Georgia, serif", fontSize: "12.5px", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Adjust credits</button>

                      {isAdjustingThis && (
                        <div style={{ border: "1px solid rgba(123,31,44,0.35)", borderRadius: "5px", background: "#fdf6f2", padding: "12px", width: "100%", boxSizing: "border-box", marginTop: "8px" }}>
                          <div style={{ display: "flex", gap: "7px", marginBottom: "9px" }}>
                            <input 
                              type="number" 
                              placeholder="±" 
                              value={adjustAmount}
                              onChange={(e) => setAdjustAmount(e.target.value ? Number(e.target.value) : "")}
                              style={{ width: "64px", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "8px 9px", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", background: "#fff" }} 
                            />
                            <input 
                              type="text" 
                              placeholder="Reason — required" 
                              value={adjustReason}
                              onChange={(e) => setAdjustReason(e.target.value)}
                              style={{ flex: "1 1 90px", minWidth: 0, boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "8px 9px", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", background: "#fff" }} 
                            />
                          </div>
                          <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.68)", marginBottom: "9px" }}>
                            Written to her ledger and the audit log with your name. New credits carry a fresh six-month life.
                          </div>
                          <div style={{ display: "flex", gap: "7px" }}>
                            <button type="button" onClick={() => handleAdjustCredits(m.id)} disabled={isAdjusting} style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "7px 12px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>{isAdjusting ? '...' : 'Apply'}</button>
                            <button type="button" onClick={() => setAdjustingId(null)} style={{ border: "1px solid rgba(57,41,42,0.25)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "7px 12px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>Cancel</button>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )
              })}
            </div>
            
            {filtered.length === 0 && (
              <div style={{ padding: "24px 18px", fontSize: "14px", color: "rgba(57,41,42,0.65)" }}>No one matches. Widen the filters.</div>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "16px" }}>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>What puts someone on the at-risk list</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
              <div>Nothing attended in sixty days.</div>
              <div>Credits unspent two months running.</div>
              <div>A payment that failed.</div>
              <div>A rate step-up within thirty days — the month-eleven moment.</div>
              <div>A booking released twice in a row.</div>
            </div>
            <p style={{ fontSize: "12.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.65)", margin: "12px 0 0", textWrap: "pretty" }}>Surfaced for you to act on, and we record that you did. Nothing automated goes to her.</p>
          </div>
        </div>

      </div>

    </div>
  );
}
