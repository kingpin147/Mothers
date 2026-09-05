"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminPartners, savePartner, deletePartner } from "@/app/actions/adminCms";

const WINE = "#7b1f2c",
  AMBER = "#a8752c",
  GREEN = "#3f6604",
  GREY = "rgba(57,41,42,0.55)";

const STATUS_COLORS: Record<string, string> = {
  Live: GREEN,
  "Ending soon": AMBER,
  Draft: GREY,
  Paused: AMBER,
  Ended: GREY,
};

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOfferText, setEditOfferText] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Filters & Sorting
  const [query, setQuery] = useState("");
  const [umbrellaFilter, setUmbrellaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("renewal");

  // Draft form
  const [draft, setDraft] = useState({
    name: "",
    specialty: "",
    umbrella: "Wellness & Movement",
    code: "",
    offer: "",
    ends: "",
    exclusive: false,
  });
  const [formError, setFormError] = useState("");

  const loadPartners = async () => {
    setLoading(true);
    const res = await getAdminPartners();
    setLoading(false);
    if (res.success && res.partners) {
      setPartners(res.partners);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSaveDraft = async () => {
    if (!draft.name.trim() || !draft.offer.trim()) {
      setFormError("Name and member offer are required.");
      return;
    }

    // Exclusivity collision check
    if (draft.exclusive) {
      const existingExclusive = partners.find(
        (p) =>
          p.exclusive &&
          (p.status || "Live") === "Live" &&
          p.specialty.toLowerCase() === draft.specialty.trim().toLowerCase() &&
          p.name.toLowerCase() !== draft.name.trim().toLowerCase()
      );
      if (existingExclusive) {
        if (
          !confirm(
            `Notice: ${existingExclusive.name} already holds exclusivity for "${draft.specialty}". Do you still wish to save this partner as exclusive?`
          )
        ) {
          return;
        }
      }
    }

    setFormError("");
    const res = await savePartner({
      name: draft.name.trim(),
      specialty: draft.specialty.trim() || "To be described",
      umbrella: draft.umbrella,
      discountCode: draft.code.trim() || undefined,
      offerForMembers: draft.offer.trim(),
      exclusive: draft.exclusive,
    });

    if (res.success) {
      setComposing(false);
      setDraft({
        name: "",
        specialty: "",
        umbrella: "Wellness & Movement",
        code: "",
        offer: "",
        ends: "",
        exclusive: false,
      });
      loadPartners();
    } else {
      alert(res.error || "Failed to save partner.");
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setMenuOpenId(null);
    const target = partners.find((p) => p.id === id);
    if (!target) return;

    const res = await savePartner({
      id: target.id,
      name: target.name,
      specialty: target.specialty,
      umbrella: target.umbrella,
      offerForMembers: target.offerForMembers || target.offer,
      exclusive: target.exclusive,
      status: newStatus,
    });

    if (res.success) {
      loadPartners();
    }
  };

  const handleInlineSaveOffer = async (p: any) => {
    if (!editOfferText.trim()) return;
    const res = await savePartner({
      id: p.id,
      name: p.name,
      specialty: p.specialty,
      umbrella: p.umbrella,
      offerForMembers: editOfferText.trim(),
      exclusive: p.exclusive,
      status: p.status,
    });
    if (res.success) {
      setEditingId(null);
      loadPartners();
    }
  };

  const q = query.trim().toLowerCase();
  let list = partners.filter((p) => {
    const pStatus = p.status || "Live";
    const pUmbrella = p.umbrella || "Expert Care & Support";
    const matchUmbrella = umbrellaFilter === "all" || pUmbrella === umbrellaFilter;
    const matchStatus = statusFilter === "all" || pStatus === statusFilter;
    const matchQ =
      !q ||
      `${p.name} ${p.specialty || ""} ${p.offerForMembers || p.offer || ""}`
        .toLowerCase()
        .includes(q);
    return matchUmbrella && matchStatus && matchQ;
  });

  if (sortFilter === "name") {
    list = list.slice().sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortFilter === "claims") {
    list = list.slice().sort((a, b) => (b.claims || 0) - (a.claims || 0));
  } else if (sortFilter === "renewal") {
    list = list
      .slice()
      .sort((a, b) => ((b.renewSoon || b.status === "Ending soon") ? 1 : 0) - ((a.renewSoon || a.status === "Ending soon") ? 1 : 0));
  }

  // Stats
  const liveCount = partners.filter((p) => (p.status || "Live") === "Live").length;
  const endingCount = partners.filter((p) => p.status === "Ending soon" || p.renewSoon).length;
  const exclusiveCount = partners.filter((p) => p.exclusive).length;
  const claimsTotal = partners.reduce((acc, p) => acc + (p.claims || 0), 0);

  const stats = [
    { value: liveCount.toString(), label: "Live agreements", note: "visible on Perks tab", color: GREEN },
    { value: endingCount.toString(), label: "Ending inside 30d", note: endingCount ? "needs attention" : "none expiring soon", color: endingCount ? AMBER : GREY },
    { value: exclusiveCount.toString(), label: "Exclusive to us", note: "category protected", color: "#39292a" },
    { value: claimsTotal.toString(), label: "Perks claimed", note: "by active members", color: "#39292a" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", WebkitFontSmoothing: "antialiased" }}>
      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "clamp(24px,3.4vw,36px) clamp(18px,3vw,30px) 60px" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "22px" }}>
          <div style={{ flex: "1 1 400px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>
              <Link href="/admin">← Dashboard</Link> · Content · Partners
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px,4vw,42px)", lineHeight: 1.1, margin: "0 0 9px" }}>
              Partners &amp; perks
            </h1>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "70ch", textWrap: "pretty" }}>
              What each partner gives our members, how the offer is claimed, and when the agreement runs out. An agreement inside thirty days appears on the dashboard.
            </p>
          </div>
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <Link href="/admin" style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap", textDecoration: "none" }}>
              ← Dashboard
            </Link>
            <button
              type="button"
              onClick={() => setComposing(!composing)}
              style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {composing ? "Close draft" : "+ Add a partner"}
            </button>
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,168px),1fr))", gap: "12px", marginBottom: "18px" }}>
          {stats.map((s, idx) => (
            <div key={idx} style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "6px", background: "#fffdfa", padding: "15px 17px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "24px", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", marginTop: "6px", lineHeight: 1.4 }}>{s.label}</div>
              <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "5px" }}>{s.note}</div>
            </div>
          ))}
        </div>

        {/* COMPOSE FORM */}
        {composing && (
          <div style={{ border: "1px solid rgba(123,31,44,0.4)", borderRadius: "8px", background: "#fdf6f2", padding: "20px 22px", marginBottom: "16px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "20px", margin: "0 0 12px" }}>A new partner</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: "14px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>Partner name</label>
                <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Clínica Bonanova" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>Specialty</label>
                <input type="text" value={draft.specialty} onChange={(e) => setDraft({ ...draft, specialty: e.target.value })} placeholder="e.g. Paediatrics & postnatal" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>Umbrella</label>
                <select value={draft.umbrella} onChange={(e) => setDraft({ ...draft, umbrella: e.target.value })} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff" }}>
                  <option value="Wellness & Movement">Wellness & Movement</option>
                  <option value="Expert Care & Support">Expert Care & Support</option>
                  <option value="Childcare & Family">Childcare & Family</option>
                  <option value="Food & Hospitality">Food & Hospitality</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>Perk code, if they use one</label>
                <input type="text" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} placeholder="Blank if she just shows membership" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff" }} />
              </div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>What members get</label>
              <input type="text" value={draft.offer} onChange={(e) => setDraft({ ...draft, offer: e.target.value })} placeholder="e.g. First class free, then 10% off monthly packs" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))", gap: "14px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>Agreement ends</label>
                <input type="date" value={draft.ends} onChange={(e) => setDraft({ ...draft, ends: e.target.value })} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", background: "#fff" }} />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "13.5px", cursor: "pointer", paddingBottom: "11px" }}>
                  <input type="checkbox" checked={draft.exclusive} onChange={(e) => setDraft({ ...draft, exclusive: e.target.checked })} style={{ width: "16px", height: "16px", accentColor: "#7b1f2c" }} />
                  <span>Exclusive to us</span>
                </label>
              </div>
            </div>
            <div style={{ fontSize: "12.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", marginBottom: "12px" }}>
              It joins as a draft, so nothing appears on anyone&apos;s Perks tab until you publish it.
            </div>
            {formError && <div style={{ color: WINE, fontSize: "13px", marginBottom: "10px" }}>{formError}</div>}
            <div style={{ display: "flex", gap: "9px", flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" onClick={handleSaveDraft} style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "10px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>
                Save as a draft
              </button>
              <button type="button" onClick={() => setComposing(false)} style={{ border: "1px solid rgba(57,41,42,0.28)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "10px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* CONTROLS */}
        <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 18px", marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search partner or offer" style={{ flex: "1 1 220px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }} />
          <select value={umbrellaFilter} onChange={(e) => setUmbrellaFilter(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
            <option value="all">Every umbrella</option>
            <option value="Wellness & Movement">Wellness & Movement</option>
            <option value="Expert Care & Support">Expert Care & Support</option>
            <option value="Childcare & Family">Childcare & Family</option>
            <option value="Food & Hospitality">Food & Hospitality</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
            <option value="all">Any status</option>
            <option value="Live">Live</option>
            <option value="Ending soon">Ending soon</option>
            <option value="Draft">Draft</option>
            <option value="Paused">Paused</option>
            <option value="Ended">Ended</option>
          </select>
          <select value={sortFilter} onChange={(e) => setSortFilter(e.target.value)} style={{ border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }}>
            <option value="renewal">Renewal soonest</option>
            <option value="name">Partner name</option>
            <option value="claims">Most claimed</option>
          </select>
        </div>

        {/* TABLE */}
        <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", overflowX: "auto", marginBottom: "18px" }}>
          <div style={{ minWidth: "1140px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.3fr 2.1fr 1fr 1.1fr 1.2fr", gap: "14px", padding: "14px 18px", borderBottom: "1px solid rgba(57,41,42,0.18)", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)" }}>
              <div>Partner</div>
              <div>Umbrella</div>
              <div>What members get</div>
              <div>Claimed</div>
              <div>Agreement</div>
              <div>Status &amp; actions</div>
            </div>

            {list.map((p) => {
              const pStatus = p.status || "Live";
              const isEnding = pStatus === "Ending soon" || p.renewSoon;
              const hasCode = !!p.discountCode || !!p.code;
              const codeVal = p.discountCode || p.code;
              const offerText = p.offerForMembers || p.offer || "—";
              const isEdit = editingId === p.id;

              return (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.3fr 2.1fr 1fr 1.1fr 1.2fr", gap: "14px", padding: "15px 18px", borderBottom: "1px solid rgba(57,41,42,0.1)", alignItems: "start", background: isEnding ? "rgba(168,117,44,0.03)" : "transparent" }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", lineHeight: 1.3, marginBottom: "3px" }}>{p.name}</div>
                    <div style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.68)" }}>{p.specialty}</div>
                    <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.55)", marginTop: "3px" }}>{p.neighbourhood || p.area || "Barcelona"}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: "13.5px", lineHeight: 1.5 }}>{p.umbrella || "Expert Care & Support"}</div>
                    {p.exclusive && (
                      <span style={{ display: "inline-block", border: "1px solid rgba(182,130,53,0.6)", color: "#8a6220", borderRadius: "3px", padding: "3px 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", marginTop: "6px" }}>
                        Exclusive to us
                      </span>
                    )}
                  </div>

                  <div>
                    {isEdit ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <input
                          type="text"
                          value={editOfferText}
                          onChange={(e) => setEditOfferText(e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", fontSize: "13px" }}
                        />
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button type="button" onClick={() => handleInlineSaveOffer(p)} style={{ border: "1px solid #7b1f2c", background: "#7b1f2c", color: "#fff", borderRadius: "4px", padding: "4px 10px", fontSize: "12px", cursor: "pointer" }}>Save</button>
                          <button type="button" onClick={() => setEditingId(null)} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", borderRadius: "4px", padding: "4px 10px", fontSize: "12px", cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: "13.5px", lineHeight: 1.6, color: "#39292a" }}>{offerText}</div>
                        <div style={{ fontSize: "12px", lineHeight: 1.55, color: "rgba(57,41,42,0.65)", marginTop: "5px" }}>
                          {hasCode ? "Code at their checkout" : "She shows her membership on arrival"}
                        </div>
                        {hasCode && (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "7px" }}>
                            <span style={{ border: "1px solid rgba(57,41,42,0.22)", borderRadius: "3px", padding: "4px 9px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.08em", background: "#fff" }}>
                              {codeVal}
                            </span>
                            <button type="button" onClick={() => handleCopyCode(codeVal)} style={{ border: "none", background: "transparent", color: "#7b1f2c", fontFamily: "'Lora', Georgia, serif", fontSize: "12px", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                              {copiedCode === codeVal ? "Copied" : "Copy"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "18px", lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                      {p.claims || 0}
                    </div>
                    <div style={{ fontSize: "11.5px", lineHeight: 1.45, color: "rgba(57,41,42,0.6)", marginTop: "4px" }}>
                      {p.claimNote || "active claims"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "13px", lineHeight: 1.5, fontVariantNumeric: "tabular-nums" }}>
                      {p.term || (p.agreementEndsAt ? `Ends ${new Date(p.agreementEndsAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` : "Active agreement")}
                    </div>
                    <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: isEnding ? AMBER : "rgba(57,41,42,0.6)", marginTop: "4px" }}>
                      {p.renewNote || (isEnding ? "Ends in 21 days" : "Standard agreement")}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start", position: "relative" }}>
                    <span style={{ display: "inline-block", border: `1px solid ${STATUS_COLORS[pStatus] || GREY}`, color: STATUS_COLORS[pStatus] || GREY, borderRadius: "3px", padding: "4px 9px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                      {pStatus}
                    </span>
                    <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isEdit) {
                            setEditingId(null);
                          } else {
                            setEditingId(p.id);
                            setEditOfferText(offerText);
                          }
                        }}
                        style={{ border: "none", background: "transparent", color: "#7b1f2c", fontFamily: "'Lora', Georgia, serif", fontSize: "12.5px", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                      >
                        {isEdit ? "Close" : "Edit offer"}
                      </button>
                      <span style={{ color: "rgba(57,41,42,0.3)" }}>·</span>
                      <button type="button" onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)} style={{ border: "none", background: "transparent", color: "#7b1f2c", fontFamily: "'Lora', Georgia, serif", fontSize: "12.5px", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                        Status ▾
                      </button>
                    </div>

                    {menuOpenId === p.id && (
                      <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 10, border: "1px solid rgba(57,41,42,0.2)", borderRadius: "5px", background: "#fff", padding: "7px 0", minWidth: "160px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                        <button type="button" onClick={() => handleUpdateStatus(p.id, "Live")} style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "6px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "12.5px", color: GREEN, cursor: "pointer" }}>
                          Set Live
                        </button>
                        <button type="button" onClick={() => handleUpdateStatus(p.id, "Paused")} style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "6px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "12.5px", color: AMBER, cursor: "pointer" }}>
                          Pause agreement
                        </button>
                        <button type="button" onClick={() => handleUpdateStatus(p.id, "Ended")} style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent", padding: "6px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "12.5px", color: GREY, cursor: "pointer" }}>
                          End agreement
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {list.length === 0 && (
              <div style={{ padding: "24px 18px", fontSize: "14px", color: "rgba(57,41,42,0.65)" }}>
                No partner matches. Widen the filters.
              </div>
            )}
          </div>
        </div>

        {/* RULE BOXES */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: "16px" }}>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>
              What changed from the current page
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
              <div><strong style={{ fontWeight: 600 }}>Status and exclusivity are separated</strong> — a partner can be live and non-exclusive, or exclusive and still a draft.</div>
              <div><strong style={{ fontWeight: 600 }}>Agreement end dates</strong> — the dashboard warns thirty days out before agreements expire.</div>
              <div><strong style={{ fontWeight: 600 }}>Perk codes &amp; claims tracked</strong> so the team knows which perks members actually use.</div>
              <div><strong style={{ fontWeight: 600 }}>Delete is replaced with End/Pause</strong> so historic member claims remain recorded.</div>
            </div>
          </div>
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>
              Rules this page holds
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
              <div>A partner offer is a perk, never a credit price. Credit cost belongs to an event, typed by hand.</div>
              <div>Only a live agreement shows on the member&apos;s Perks tab. Draft, paused and ended are invisible to her.</div>
              <div>Ending an agreement leaves claimed offers honoured, and says so in the member&apos;s own record.</div>
              <div>An agreement within thirty days of its end date appears under Money needing attention on the dashboard.</div>
              <div>Umbrellas are the four we use: Wellness &amp; Movement, Expert Care &amp; Support, Childcare &amp; Family, Food &amp; Hospitality.</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
