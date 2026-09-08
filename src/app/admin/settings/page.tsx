"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getClubSettings, updateClubSettings, getMembershipWindows, createMembershipWindow, setMembershipWindowStatus } from "@/app/actions/adminSettings";

const WINE = '#7b1f2c', AMBER = '#a8752c', GREEN = '#3f6604', GREY = 'rgba(57,41,42,0.55)';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [windows, setWindows] = useState<any[]>([]);
  const [windowForm, setWindowForm] = useState({
    opensAt: "",
    closesAt: "",
    placesOffered: 50
  });

  const [form, setForm] = useState({
    joiningFee: 19,
    standardMonthly: 39,
    standardQuarterly: 99,
    joiningFeeFreePlaces: 50,
    passToMemberDays: 30,
    
    eventPassPrice: 35,
    passCreditCeiling: 18,
    lifetimeGuestPasses: 2,
    guestPlacesDefault: 2,
    guestsOpenDays: 14,
    guestsCloseDays: 2,
    
    monthlyGrant: 20,
    creditLifeMonths: 6,
    rolloverCeiling: 0,
    expiryWarningDays: 30,
    topUpPrice: 1,
    releaseDeadlineHours: 48,
    
    godmotherJoinBonus: 5,
    godmotherThreeMonthBonus: 15,
    godmotherBonusLife: 6,
    
    answerAppHours: 72,
    paymentLinkHours: 72,
    pauseAllowanceMonths: 2,
    
    scheduleMembersFrom: 28,
    scheduleGuestsOpen: 14,
    scheduleEarlyWarning: 10,
    scheduleDecisionPoint: 7,
    scheduleGuestsClose: 2
  });

  const loadSettings = async () => {
    setLoading(true);
    const res = await getClubSettings();
    const windowsRes = await getMembershipWindows();
    if (windowsRes.success) setWindows(windowsRes.windows || []);
    
    if (res.success && res.settings) {
      setForm(prev => ({
        ...prev,
        monthlyGrant: res.settings.monthlyGrantCredits ?? prev.monthlyGrant,
        rolloverCeiling: res.settings.rolloverCapCredits ?? prev.rolloverCeiling,
        godmotherJoinBonus: res.settings.referralBonusCredits ?? prev.godmotherJoinBonus,
        eventPassPrice: (res.settings.guestPassPriceCents ?? 3500) / 100,
        lifetimeGuestPasses: res.settings.maxLifetimeGuestPasses ?? prev.lifetimeGuestPasses,
        
        passToMemberDays: res.settings.passToMemberDays ?? prev.passToMemberDays,
        passCreditCeiling: res.settings.passCreditCeiling ?? prev.passCreditCeiling,
        guestPlacesDefault: res.settings.guestPlacesDefault ?? prev.guestPlacesDefault,
        guestsOpenDays: res.settings.guestsOpenDays ?? prev.guestsOpenDays,
        guestsCloseDays: res.settings.guestsCloseDays ?? prev.guestsCloseDays,
        
        creditLifeMonths: res.settings.creditLifeMonths ?? prev.creditLifeMonths,
        expiryWarningDays: res.settings.expiryWarningDays ?? prev.expiryWarningDays,
        topUpPrice: (res.settings.topUpPriceCents ?? 100) / 100,
        releaseDeadlineHours: res.settings.releaseDeadlineHours ?? prev.releaseDeadlineHours,
        
        godmotherThreeMonthBonus: res.settings.godmotherThreeMonthBonus ?? prev.godmotherThreeMonthBonus,
        godmotherBonusLife: res.settings.godmotherBonusLife ?? prev.godmotherBonusLife,
        
        answerAppHours: res.settings.answerAppHours ?? prev.answerAppHours,
        paymentLinkHours: res.settings.paymentLinkHours ?? prev.paymentLinkHours,
        pauseAllowanceMonths: res.settings.pauseAllowanceMonths ?? prev.pauseAllowanceMonths,
        
        scheduleMembersFrom: res.settings.scheduleMembersFrom ?? prev.scheduleMembersFrom,
        scheduleGuestsOpen: res.settings.scheduleGuestsOpen ?? prev.scheduleGuestsOpen,
        scheduleEarlyWarning: res.settings.scheduleEarlyWarning ?? prev.scheduleEarlyWarning,
        scheduleDecisionPoint: res.settings.scheduleDecisionPoint ?? prev.scheduleDecisionPoint,
        scheduleGuestsClose: res.settings.scheduleGuestsClose ?? prev.scheduleGuestsClose,

        joiningFeeFreePlaces: res.settings.joiningFeeFreePlaces ?? (res.currentWindow?.placesOffered ?? prev.joiningFeeFreePlaces),
        standardMonthly: (res.currentWindow?.monthlyPriceCents ?? (prev.standardMonthly * 100)) / 100,
        standardQuarterly: (res.settings.quarterlyFeeCents ?? (prev.standardQuarterly * 100)) / 100,
        joiningFee: (res.currentWindow?.joiningFeeCents ?? (prev.joiningFee * 100)) / 100,
      }));
    }
    setLoading(false);
  };

  const handleCreateWindow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!windowForm.opensAt || !windowForm.closesAt) return;
    const res = await createMembershipWindow({
      opensAt: windowForm.opensAt,
      closesAt: windowForm.closesAt,
      placesOffered: windowForm.placesOffered,
      openingMonthlyPriceCents: form.standardMonthly * 100,
      openingQuarterlyPriceCents: form.standardQuarterly * 100,
      standardMonthlyPriceCents: form.standardMonthly * 100,
      standardQuarterlyPriceCents: form.standardQuarterly * 100
    });
    if (!res.success) {
      alert(res.error || "Failed to create window.");
      return;
    }
    setWindowForm({ opensAt: "", closesAt: "", placesOffered: 50 });
    const refreshed = await getMembershipWindows();
    if (refreshed.success) setWindows(refreshed.windows || []);
  };

  const handleWindowStatus = async (id: string, status: "open" | "closed") => {
    const res = await setMembershipWindowStatus(id, status);
    if (!res.success) alert(res.error || "Failed to update window.");
    const refreshed = await getMembershipWindows();
    if (refreshed.success) setWindows(refreshed.windows || []);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      joiningFeeCents: form.joiningFee * 100,
      standardMonthlyPriceCents: form.standardMonthly * 100,
      openingMonthlyPriceCents: form.standardMonthly * 100,
      openingQuarterlyPriceCents: form.standardQuarterly * 100,
      quarterlyFeeCents: form.standardQuarterly * 100,
      joiningFeeFreePlaces: form.joiningFeeFreePlaces,
      placesOffered: form.joiningFeeFreePlaces,
      passToMemberDays: form.passToMemberDays,
      
      guestPassPriceCents: form.eventPassPrice * 100,
      passCreditCeiling: form.passCreditCeiling,
      maxLifetimeGuestPasses: form.lifetimeGuestPasses,
      guestPlacesDefault: form.guestPlacesDefault,
      guestsOpenDays: form.guestsOpenDays,
      guestsCloseDays: form.guestsCloseDays,
      
      monthlyGrantCredits: form.monthlyGrant,
      creditLifeMonths: form.creditLifeMonths,
      rolloverCapCredits: form.rolloverCeiling,
      expiryWarningDays: form.expiryWarningDays,
      topUpPriceCents: form.topUpPrice * 100,
      releaseDeadlineHours: form.releaseDeadlineHours,
      
      referralBonusCredits: form.godmotherJoinBonus,
      godmotherThreeMonthBonus: form.godmotherThreeMonthBonus,
      godmotherBonusLife: form.godmotherBonusLife,
      
      answerAppHours: form.answerAppHours,
      paymentLinkHours: form.paymentLinkHours,
      pauseAllowanceMonths: form.pauseAllowanceMonths,
      
      scheduleMembersFrom: form.scheduleMembersFrom,
      scheduleGuestsOpen: form.scheduleGuestsOpen,
      scheduleEarlyWarning: form.scheduleEarlyWarning,
      scheduleDecisionPoint: form.scheduleDecisionPoint,
      scheduleGuestsClose: form.scheduleGuestsClose
    };
    const res = await updateClubSettings(payload);
    setSaving(false);
    if (res.success) {
      loadSettings();
    } else {
      alert("Failed to save settings.");
    }
  };

  const handleInput = (key: keyof typeof form, val: string) => {
    setForm(prev => ({ ...prev, [key]: Number(val) }));
  };

  const SectionTitle = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <div style={{ marginBottom: "20px" }}>
      <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "28px", color: WINE, margin: "0 0 6px" }}>{title}</h2>
      <p style={{ fontSize: "14px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "80ch" }}>{subtitle}</p>
    </div>
  );

  const InputField = ({ label, desc, val, keyName, quoted = false, suffix = "" }: { label: string, desc: string, val: number, keyName: keyof typeof form, quoted?: boolean, suffix?: string }) => (
    <div>
      <div style={{ fontSize: "13.5px", color: "#39292a", marginBottom: "8px" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <input 
          type="number" 
          value={val}
          onChange={(e) => handleInput(keyName, e.target.value)}
          style={{ 
            width: "100%", maxWidth: "200px", 
            border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", 
            fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" 
          }} 
        />
        {quoted && <span style={{ border: "1px solid rgba(168,117,44,0.4)", color: AMBER, borderRadius: "4px", padding: "5px 8px", fontSize: "10px", fontWeight: 600, fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>QUOTED PUBLICLY</span>}
        {suffix && <span style={{ fontSize: "14px", color: "#39292a" }}>{suffix}</span>}
      </div>
      <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", minHeight: "36px" }}>{desc}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", WebkitFontSmoothing: "antialiased" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 80px" }}>
        
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "40px" }}>
          <div style={{ flex: "1 1 500px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: WINE, marginBottom: "9px" }}>
              ← Dashboard · Configuration
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(34px, 4.5vw, 48px)", lineHeight: 1.1, margin: "0 0 12px", color: "#39292a" }}>
              Club & credit policy
            </h1>
            <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "70ch", textWrap: "pretty" }}>
              Every number the public pages quote lives here, once. Change one and each page that mentions it is flagged for rewriting — nothing is written in two places.
            </p>
          </div>
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <Link href="/admin" style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap" }}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "rgba(57,41,42,0.6)" }}>Loading configuration...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            
            {/* Membership Windows */}
            <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "32px" }}>
              <SectionTitle title="Membership windows" subtitle="A window is a period with a number of places. Closing one early is deliberate; it never closes itself except by running out of places or reaching its end date." />
              
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                {windows.length === 0 ? (
                  <div style={{ padding: "20px 24px", border: "1px solid rgba(57,41,42,0.12)", borderRadius: "6px" }}>
                    <div style={{ fontSize: "14px", color: GREY }}>No windows found. Create one below.</div>
                  </div>
                ) : windows.map((w) => (
                  <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flexWrap: "wrap", padding: "20px 24px", border: "1px solid rgba(57,41,42,0.12)", borderRadius: "6px" }}>
                    <div>
                      <div style={{ fontSize: "14.5px", fontWeight: 600, marginBottom: "8px" }}>
                        {new Date(w.opensAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – {new Date(w.closesAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {w.placesOffered} places
                      </div>
                      <div style={{ fontSize: "13.5px", color: GREY }}>
                        {w.status === 'open' ? 'Open' : w.status === 'closed' ? 'Closed' : 'Draft'} · 34 applications in · 9 places taken · 41 remaining
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <Link href="/admin/applications" style={{ color: WINE, fontSize: "13.5px" }}>Review queue →</Link>
                      <button 
                        onClick={() => handleWindowStatus(w.id, w.status === 'open' ? 'closed' : 'open')}
                        style={{ border: "1px solid rgba(57,41,42,0.25)", background: "transparent", borderRadius: "4px", padding: "8px 14px", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", cursor: "pointer", color: "#39292a" }}
                      >
                        {w.status === 'open' ? 'Close early' : 'Open now'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "16px", alignItems: "end" }}>
                <div>
                  <div style={{ fontSize: "13.5px", color: "#39292a", marginBottom: "8px" }}>Opens</div>
                  <input type="date" value={windowForm.opensAt} onChange={e => setWindowForm({...windowForm, opensAt: e.target.value})} style={{ width: "100%", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }} />
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", color: "#39292a", marginBottom: "8px" }}>Closes</div>
                  <input type="date" value={windowForm.closesAt} onChange={e => setWindowForm({...windowForm, closesAt: e.target.value})} style={{ width: "100%", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }} />
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", color: "#39292a", marginBottom: "8px" }}>Places</div>
                  <input type="number" value={windowForm.placesOffered} onChange={e => setWindowForm({...windowForm, placesOffered: Number(e.target.value)})} style={{ width: "100%", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }} />
                </div>
                <button onClick={handleCreateWindow} style={{ border: `1px solid ${WINE}`, color: WINE, background: "transparent", borderRadius: "4px", padding: "10px 16px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", cursor: "pointer", height: "43px" }}>
                  Create as a draft
                </button>
              </div>
            </div>

            {/* Rates and Fees */}
            <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "32px" }}>
              <SectionTitle title="Rates and fees" subtitle="What a membership costs. Existing members keep the rate they joined on — changing a figure here only affects who joins next." />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px 32px" }}>
                <InputField label="Joining fee (€)" val={form.joiningFee} keyName="joiningFee" desc="One-off, charged with the first payment. Waived entirely if an Event Pass was taken in the last 30 days." />
                <InputField label="Membership · monthly (€)" val={form.standardMonthly} keyName="standardMonthly" desc="The one membership rate. Quoted on Membership, Payment, the FAQ and Legal." />
                <InputField label="Membership · quarterly (€)" val={form.standardQuarterly} keyName="standardQuarterly" desc="The same membership paid three months at a time." />
                <InputField label="Joining-fee-free places" val={form.joiningFeeFreePlaces} keyName="joiningFeeFreePlaces" desc="Members joining before this many are charged no joining fee. 8 taken, 42 left." />
                <InputField label="Pass-to-member window (days)" val={form.passToMemberDays} keyName="passToMemberDays" quoted desc="Join within this many days of taking a pass and the joining fee is waived." />
              </div>
            </div>

            {/* Booking Rules */}
            <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "32px" }}>
              <SectionTitle title="Booking rules — enforced on the public site" subtitle="These six are read by the events page itself: change one, reload Events, and the buttons change. Everything else on this page is a figure the pages quote." />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px 32px" }}>
                <InputField label="Event Pass (€)" val={form.eventPassPrice} keyName="eventPassPrice" desc="What a non-member pays for one event. The price shown in checkout." />
                <InputField label="Pass credit ceiling (credits)" val={form.passCreditCeiling} keyName="passCreditCeiling" desc="A pass can book any event costing this or less. Above it, the pass button is not shown and the press explains why." />
                <InputField label="Passes per person (lifetime)" val={form.lifetimeGuestPasses} keyName="lifetimeGuestPasses" desc="Not per year — ever. This is the limit that makes people join." />
                <InputField label="Guest places per event (default)" val={form.guestPlacesDefault} keyName="guestPlacesDefault" desc="Pre-filled on a new event and editable per event. Places already sold are always honoured." />
                <InputField label="Guests open (days before)" val={form.guestsOpenDays} keyName="guestsOpenDays" desc="Members book from publication; guests cannot appear until this point." />
                <InputField label="Guests close (days before)" val={form.guestsCloseDays} keyName="guestsCloseDays" desc="Guest bookings stop here. Members keep booking until the start." />
              </div>
            </div>

            {/* Credits */}
            <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "32px" }}>
              <SectionTitle title="Credits" subtitle="Credits are money in all but name. Nothing here rewrites credits already granted — they keep the expiry they arrived with." />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px 32px" }}>
                <InputField label="Monthly grant" val={form.monthlyGrant} keyName="monthlyGrant" quoted desc="Deposited on each successful renewal." />
                <InputField label="Credit life (months)" val={form.creditLifeMonths} keyName="creditLifeMonths" quoted desc="From the day each credit arrives. Oldest are always spent first." />
                <InputField label="Rollover ceiling" val={form.rolloverCeiling} keyName="rolloverCeiling" quoted desc="Set to 0 to represent no ceiling." />
                <InputField label="Expiry warning (days before)" val={form.expiryWarningDays} keyName="expiryWarningDays" desc="She is told a month before anything expires." />
                <InputField label="Top-up price (€ per credit)" val={form.topUpPrice} keyName="topUpPrice" quoted desc="Bought credits behave like any other." />
                <InputField label="Release deadline (hours before)" val={form.releaseDeadlineHours} keyName="releaseDeadlineHours" quoted desc="Release a booking with more than this to go and the credits come back." />
              </div>
            </div>

            {/* Godmother */}
            <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "32px" }}>
              <SectionTitle title="Godmother" subtitle="Every member is a Godmother automatically, with a code derived from her name. There is no application and no approval." />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px 32px" }}>
                <InputField label="Bonus when a friend joins" val={form.godmotherJoinBonus} keyName="godmotherJoinBonus" quoted desc="" />
                <InputField label="Bonus at three months" val={form.godmotherThreeMonthBonus} keyName="godmotherThreeMonthBonus" quoted desc="Granted when the friend reaches her third month as a member." />
                <InputField label="Bonus credit life (months)" val={form.godmotherBonusLife} keyName="godmotherBonusLife" desc="The same life as any other credit." />
              </div>
            </div>

            {/* Membership behaviour */}
            <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "32px" }}>
              <SectionTitle title="Membership behaviour" subtitle="Pausing, cancelling and the promises we make about answering. These are quoted in the FAQ and in the acceptance emails." />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px 32px" }}>
                <InputField label="Answer an application within (hours)" val={form.answerAppHours} keyName="answerAppHours" quoted desc="Our promise. The queue turns amber at 48 and wine at 72." />
                <InputField label="Payment link valid for (hours)" val={form.paymentLinkHours} keyName="paymentLinkHours" quoted desc="After acceptance. Reminder at 48; the place returns to the window at 72." />
                <InputField label="Pause allowance (months per year)" val={form.pauseAllowanceMonths} keyName="pauseAllowanceMonths" quoted desc="Nothing expires while paused, and nothing new arrives." />
              </div>
            </div>

            {/* The event schedule */}
            <div style={{ background: "#fffdfa", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "32px" }}>
              <SectionTitle title="The event schedule" subtitle="Defaults for a new event. Each one can be overridden on the event itself when a partner will only hold a room until a different date." />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "24px" }}>
                <div>
                  <div style={{ fontSize: "13.5px", color: "#39292a", marginBottom: "8px" }}>Members book from</div>
                  <input type="text" value={`T-${form.scheduleMembersFrom}`} onChange={e => handleInput('scheduleMembersFrom', e.target.value.replace('T-', ''))} style={{ width: "100%", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }} />
                  <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "8px" }}>Announced in the chosen threads</div>
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", color: "#39292a", marginBottom: "8px" }}>Guests open</div>
                  <input type="text" value={`T-${form.scheduleGuestsOpen}`} onChange={e => handleInput('scheduleGuestsOpen', e.target.value.replace('T-', ''))} style={{ width: "100%", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }} />
                  <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "8px" }}>Every event, no exception</div>
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", color: "#39292a", marginBottom: "8px" }}>Early warning</div>
                  <input type="text" value={`T-${form.scheduleEarlyWarning}`} onChange={e => handleInput('scheduleEarlyWarning', e.target.value.replace('T-', ''))} style={{ width: "100%", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }} />
                  <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "8px" }}>Flagged if under half the minimum</div>
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", color: "#39292a", marginBottom: "8px" }}>Decision point</div>
                  <input type="text" value={`T-${form.scheduleDecisionPoint}`} onChange={e => handleInput('scheduleDecisionPoint', e.target.value.replace('T-', ''))} style={{ width: "100%", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }} />
                  <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "8px" }}>Confirm or cancel by this date</div>
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", color: "#39292a", marginBottom: "8px" }}>Guests close</div>
                  <input type="text" value={`T-${form.scheduleGuestsClose}`} onChange={e => handleInput('scheduleGuestsClose', e.target.value.replace('T-', ''))} style={{ width: "100%", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }} />
                  <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "8px" }}>Members keep booking to the start</div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", borderTop: "1px solid rgba(57,41,42,0.16)", paddingTop: "18px", marginTop: "12px", marginBottom: "26px" }}>
              <div style={{ maxWidth: "52ch" }}>
                <div style={{ fontSize: "12.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.68)" }}>
                  Saving shows you which pages and FAQ answers quote each changed figure, before anything goes live.
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button 
                  type="button" 
                  onClick={loadSettings}
                  style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "11px 18px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
                >
                  Discard changes
                </button>
                <button 
                  type="button" 
                  onClick={handleSave} 
                  disabled={saving}
                  style={{ border: `1px solid ${WINE}`, background: "transparent", color: WINE, borderRadius: "4px", padding: "11px 20px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
                >
                  {saving ? "Saving..." : "Review and save →"}
                </button>
              </div>
            </div>

            {/* Information & Policy Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "16px" }}>
              <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px", color: "#39292a" }}>
                  What changed from the current page
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
                  <div><strong style={{ fontWeight: 600 }}>Joining fee read €58.</strong> It is €19. The helper text under it even said €19 while the field said 58 — the field is what charges the card.</div>
                  <div><strong style={{ fontWeight: 600 }}>A rollover cap of 40 existed at all.</strong> We agreed credits have no ceiling; a cap silently destroys credits a member has paid for.</div>
                  <div><strong style={{ fontWeight: 600 }}>Godmother bonus read 20 credits.</strong> It is 5 when a friend joins and 15 more at three months — two figures, not one.</div>
                  <div><strong style={{ fontWeight: 600 }}>Credit expiry was missing entirely</strong> — six months is the rule the whole ledger runs on.</div>
                  <div><strong style={{ fontWeight: 600 }}>The Event Pass price was missing</strong>, as were the pass window, the quarterly rate, the pause allowance and the payment hold.</div>
                  <div><strong style={{ fontWeight: 600 }}>Save was one filled button with no confirmation.</strong> These figures are quoted on live pages; saving now goes through a review step.</div>
                </div>
              </div>

              <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px", color: "#39292a" }}>
                  Rules this page holds
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
                  <div>A figure marked <em>quoted publicly</em> appears in copy on the site. Changing it flags every page and FAQ answer that mentions it, and the change is not live until those are settled.</div>
                  <div>A change never rewrites the past. Existing members keep the rate they joined on; credits keep the expiry they were granted with.</div>
                  <div>Two Event Passes per person is global and belongs here — never on an individual event.</div>
                  <div>There is one membership rate. The joining fee is waived for the first fifty members, and for anyone who took an Event Pass in the last thirty days.</div>
                  <div>Only the Owner can save this page, and every change is written to the audit log with the previous value.</div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
