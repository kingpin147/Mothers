"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { updateAdminEvent, getEventRoster } from "@/app/actions/adminEvents";

export default function AdminEditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Walks & park socials");
  const [neighbourhood, setNeighbourhood] = useState("Ciutat Vella");
  const [venueName, setVenueName] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [host, setHost] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [minToConfirm, setMinToConfirm] = useState("");
  const [memberPlaces, setMemberPlaces] = useState("");
  const [creditCost, setCreditCost] = useState("");
  const [guestPlaces, setGuestPlaces] = useState("2");
  const [guestGathering, setGuestGathering] = useState("");
  const [description, setDescription] = useState("");

  // Toggles & Arrays
  const [langs, setLangs] = useState<string[]>(["English"]);
  const [stages, setStages] = useState<string[]>(["Babies"]);
  const [headStart, setHeadStart] = useState("No head start — opens to everyone at once");
  const [membersOnly, setMembersOnly] = useState(false);
  const [freeEvent, setFreeEvent] = useState(false);
  const [passCta, setPassCta] = useState(false);

  // Schedule overrides
  const [schMembers, setSchMembers] = useState("T-28");
  const [schGuestsOpen, setSchGuestsOpen] = useState("T-14");
  const [schDecision, setSchDecision] = useState("T-7");
  const [schGuestsClose, setSchGuestsClose] = useState("T-2");

  useEffect(() => {
    async function loadEvent() {
      if (!eventId) return;
      setFetching(true);
      const res = await getEventRoster(eventId);
      if (res.success && res.event) {
        const ev = res.event;
        setTitle(ev.title || "");
        if (ev.categoryId) setCategory(ev.categoryId);
        if (ev.partnerId) setHost(ev.partnerId);
        setNeighbourhood(ev.neighbourhood || "Ciutat Vella");
        setVenueName(ev.venueName || "");
        setMeetingPoint(ev.meetingPoint || "");
        setStartsAt(ev.startsAt ? new Date(new Date(ev.startsAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
        setEndsAt(ev.endsAt ? new Date(new Date(ev.endsAt).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
        setMinToConfirm(ev.minToConfirm?.toString() || "");
        setMemberPlaces(ev.capacityMember?.toString() || "");
        setCreditCost(ev.creditCost?.toString() || "");
        setGuestPlaces(ev.capacityGuest?.toString() || "0");
        setGuestGathering(ev.capacityGuestGathering?.toString() || "");
        setDescription(ev.description || "");
        setLangs(ev.languages || ["English"]);
        setPassCta(ev.showEventPassCta || false);
        
        if (ev.creditCost === 0) {
          setFreeEvent(true);
        }
        if (ev.capacityGuest === 0) {
          setMembersOnly(true);
        }
      } else {
        alert("Failed to load event.");
        router.push("/admin/events");
      }
      setFetching(false);
    }
    loadEvent();
  }, [eventId, router]);

  const toggleLang = (l: string) => {
    setLangs(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  };

  const toggleStage = (s: string) => {
    setStages(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const onMembersOnly = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setMembersOnly(checked);
    if (checked) setPassCta(false);
  };

  const chip = (on: boolean) => ({
    border: on ? '#7b1f2c' : 'rgba(57,41,42,0.25)',
    bg: on ? 'rgba(123,31,44,0.08)' : 'transparent',
    color: on ? '#7b1f2c' : '#39292a'
  });

  const passDisabled = membersOnly;
  const passCursor = passDisabled ? 'not-allowed' : 'pointer';
  const passBorder = passDisabled ? 'rgba(57,41,42,0.16)' : 'rgba(86,139,5,0.4)';
  const passBg = passDisabled ? 'rgba(57,41,42,0.04)' : 'rgba(86,139,5,0.05)';
  const passNote = passDisabled
    ? 'Unavailable — this event is members only. A pass could not complete, so we do not advertise it.'
    : 'Off by default. When on, a non-member sees a second outlined button beside Reserve, leading straight into pass checkout. The button disappears by itself at T-2 when guest bookings close. Two passes per person, ever — that limit lives in settings, not here.';
  const guestOpacity = membersOnly ? 0.55 : 1;
  const guestIntro = membersOnly
    ? 'This event is members only, so guest places and the pass button are closed.'
    : 'Guest places open at T-14, once members have had a clear fortnight, and close at T-2.';
  const costBorder = freeEvent ? 'rgba(57,41,42,0.16)' : 'rgba(123,31,44,0.4)';
  const costBg = freeEvent ? 'rgba(57,41,42,0.05)' : '#fff';
  const costHint = freeEvent
    ? 'No credits taken for a free event.'
    : 'Required, and yours alone to set. Comparable Learn & grow events have cost 16–20 credits — for information, never written into the field.';

  const validationLine = freeEvent
    ? 'Still needed before publishing: title, venue, meeting point, dates, minimum, description.'
    : 'Still needed before publishing: title, venue, meeting point, dates, minimum, credit cost, description.';


  const handleSave = async () => {
    if (!title || !venueName || !meetingPoint || !startsAt || !endsAt) {
      alert("Please fill in core details (title, venue, dates).");
      return;
    }

    setLoading(true);
    const start = new Date(startsAt);
    
    const res = await updateAdminEvent(eventId, {
      title,
      category,
      partnerId: host.trim() || undefined,
      host: host.trim() || undefined,
      isSignature: category === "Signature moments",
      neighbourhood,
      venueName,
      meetingPoint,
      startsAt: start,
      endsAt: new Date(endsAt),
      creditCost: freeEvent ? 0 : (parseInt(creditCost) || 0),
      capacityMember: parseInt(memberPlaces) || 100, // fallback for walk
      capacityGuest: membersOnly ? 0 : (parseInt(guestPlaces) || 0),
      capacityGuestGathering: membersOnly ? 0 : (parseInt(guestGathering) || undefined),
      minToConfirm: parseInt(minToConfirm) || 0,
      description,
      languages: langs,
      showEventPassCta: passCta,
    });

    setLoading(false);
    if (res.success) {
      alert("Event updated successfully!");
      router.push("/admin/events");
    } else {
      alert(res.error || "Failed to save event");
    }
  };

  if (fetching) {
    return <div style={{ padding: "40px", textAlign: "center", fontFamily: "'Cormorant Garamond', serif", color: "#7b1f2c", fontSize: "18px" }}>Loading event details...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "rgba(57,41,42,0.34)", padding: "clamp(18px,4vw,46px) clamp(14px,3vw,30px)", fontFamily: "'Lora', Georgia, serif", color: "#39292a", WebkitFontSmoothing: "antialiased" }}>
      <style dangerouslySetInnerHTML={{__html: `
        a { color:#7b1f2c; text-decoration:none; }
        a:hover { color:#5d1620; text-decoration:underline; }
        button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline:2px solid #7b1f2c; outline-offset:2px; }
        input::placeholder, textarea::placeholder { color:rgba(57,41,42,0.4); }
      `}} />
      
      <div style={{ maxWidth: "880px", margin: "0 auto", background: "#fffdfa", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "10px", boxShadow: "0 18px 50px rgba(57,41,42,0.18)", overflow: "hidden" }}>
        
        <div style={{ padding: "clamp(22px,3vw,30px) clamp(22px,3vw,32px) 18px", borderBottom: "1px solid rgba(57,41,42,0.14)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "18px" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "8px" }}>Edit event</div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(26px,3.2vw,33px)", lineHeight: 1.15, margin: "0 0 7px" }}>Update calendar details</h1>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", margin: 0, maxWidth: "62ch", textWrap: "pretty" }}>Changes to time or venue will trigger an automatic email to any booked members.</p>
          </div>
          <Link href="/admin/events" style={{ border: "1px solid rgba(57,41,42,0.25)", color: "#39292a", borderRadius: "4px", width: "34px", height: "34px", fontSize: "16px", lineHeight: 1, flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>✕</Link>
        </div>

        <div style={{ padding: "clamp(20px,2.6vw,28px) clamp(22px,3vw,32px)", display: "flex", flexDirection: "column", gap: "26px" }}>
          
          {/* THE EVENT */}
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "14px" }}>The event</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Title <span style={{ color: "#7b1f2c" }}>*</span></label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Morning walk & coffee in Ciutadella" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Category <span style={{ color: "#7b1f2c" }}>*</span></label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }}>
                    <option value="Walks & park socials">Walks & park socials</option>
                    <option value="Play dates">Play dates</option>
                    <option value="MoM's dates">MoM's dates</option>
                    <option value="Learn & grow">Learn & grow</option>
                    <option value="Signature moments">Signature moments</option>
                  </select>
                  <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>A label for members and a filter for you. It carries no price.</div>
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Neighbourhood <span style={{ color: "#7b1f2c" }}>*</span></label>
                  <select value={neighbourhood} onChange={(e) => setNeighbourhood(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }}>
                    <option>Ciutat Vella</option>
                    <option>Eixample</option>
                    <option>Sants-Montjuïc</option>
                    <option>Les Corts</option>
                    <option>Sarrià-Sant Gervasi</option>
                    <option>Gràcia</option>
                    <option>Horta-Guinardó</option>
                    <option>Nou Barris</option>
                    <option>Sant Andreu</option>
                    <option>Sant Martí</option>
                    <option>Online</option>
                    <option>Outside Barcelona</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Venue, publicly <span style={{ color: "#7b1f2c" }}>*</span></label>
                  <input type="text" value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="e.g. Parc de la Ciutadella" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Exact meeting point <span style={{ color: "#7b1f2c" }}>*</span></label>
                  <input type="text" value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} placeholder="e.g. Til·lers gate, by the fountain" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }} />
                  <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Sent only to people who have booked.</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Host or partner</label>
                  <input type="text" value={host} onChange={(e) => setHost(e.target.value)} placeholder="e.g. Luz Movement Studio" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Languages</label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "3px" }}>
                    {['English', 'Spanish', 'Catalan'].map((l) => {
                      const c = chip(langs.includes(l));
                      return <button key={l} type="button" onClick={() => toggleLang(l)} style={{ border: `1px solid ${c.border}`, background: c.bg, color: c.color, borderRadius: "16px", padding: "8px 14px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>{l}</button>
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: "1px", background: "rgba(57,41,42,0.12)" }}></div>

          {/* WHEN */}
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "14px" }}>When</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Starts <span style={{ color: "#7b1f2c" }}>*</span></label>
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }} />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Ends <span style={{ color: "#7b1f2c" }}>*</span></label>
                <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }} />
              </div>
            </div>
          </div>

          <div style={{ height: "1px", background: "rgba(57,41,42,0.12)" }}></div>

          {/* WHO IT IS FOR */}
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "6px" }}>Who it is for</div>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", margin: "0 0 12px", maxWidth: "66ch", textWrap: "pretty" }}>Pick the groups this suits. It decides which threads it gets announced in, and which group may book it early.</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
              {['Pregnant', 'Babies', 'Toddlers', 'Children', 'Big kids'].map(s => {
                const c = chip(stages.includes(s));
                return <button key={s} type="button" onClick={() => toggleStage(s)} style={{ border: `1px solid ${c.border}`, background: c.bg, color: c.color, borderRadius: "16px", padding: "8px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>{s}</button>
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Head start for one group</label>
                <select value={headStart} onChange={(e) => setHeadStart(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }}>
                  <option>No head start — opens to everyone at once</option>
                  <option>Babies, two days early</option>
                  <option>Toddlers, two days early</option>
                  <option>Pregnant, three days early</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", lineHeight: 1.5, cursor: "pointer", paddingBottom: "11px" }}>
                  <input type="checkbox" checked={membersOnly} onChange={onMembersOnly} style={{ width: "17px", height: "17px", accentColor: "#7b1f2c" }} />
                  <span>Members only — no guest places at all</span>
                </label>
              </div>
            </div>
          </div>

          <div style={{ height: "1px", background: "rgba(57,41,42,0.12)" }}></div>

          {/* PLACES AND COST */}
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "14px" }}>Places and cost</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Minimum to run <span style={{ color: "#7b1f2c" }}>*</span></label>
                <input type="number" value={minToConfirm} onChange={(e) => setMinToConfirm(e.target.value)} placeholder="—" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }} />
                <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>The number below which you would cancel. Everything at T-10 and T-7 is measured against this.</div>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Member places <span style={{ color: "#7b1f2c" }}>*</span></label>
                <input type="number" value={memberPlaces} onChange={(e) => setMemberPlaces(e.target.value)} placeholder="—" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }} />
                <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Leave empty for a walk with no ceiling.</div>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Credit cost <span style={{ color: "#7b1f2c" }}>*</span></label>
                <input type="number" value={creditCost} onChange={(e) => setCreditCost(e.target.value)} placeholder="—" disabled={freeEvent} style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${costBorder}`, borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: costBg }} />
                <div style={{ fontSize: "12px", lineHeight: 1.5, color: "#7b1f2c", marginTop: "6px" }}>{costHint}</div>
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", lineHeight: 1.5, cursor: "pointer", marginTop: "14px" }}>
              <input type="checkbox" checked={freeEvent} onChange={(e) => setFreeEvent(e.target.checked)} style={{ width: "17px", height: "17px", accentColor: "#7b1f2c" }} />
              <span>Free event — an RSVP list, no credits taken</span>
            </label>
          </div>

          <div style={{ height: "1px", background: "rgba(57,41,42,0.12)" }}></div>

          {/* GUESTS */}
          <div style={{ opacity: guestOpacity }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "6px" }}>Guests</div>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", margin: "0 0 12px", maxWidth: "70ch", textWrap: "pretty" }}>{guestIntro}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Guest places</label>
                <input type="number" value={guestPlaces} onChange={(e) => setGuestPlaces(e.target.value)} disabled={membersOnly} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }} />
                <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Two by default. Zero closes the event to guests.</div>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Guest places while gathering</label>
                <input type="number" value={guestGathering} onChange={(e) => setGuestGathering(e.target.value)} placeholder="Blank — same as above" disabled={membersOnly} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }} />
                <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>A higher cap while the event is short of its minimum. Drops back once confirmed; places already sold are always kept.</div>
              </div>
            </div>
            <div style={{ marginTop: "16px", border: `1px solid ${passBorder}`, borderRadius: "6px", padding: "14px 16px", background: passBg }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "11px", fontSize: "14px", lineHeight: 1.55, cursor: passCursor }}>
                <input type="checkbox" checked={passCta} disabled={passDisabled} onChange={(e) => setPassCta(e.target.checked)} style={{ width: "17px", height: "17px", accentColor: "#7b1f2c", marginTop: "2px" }} />
                <span><strong style={{ fontWeight: 600 }}>Show the €35 Event Pass button</strong><br /><span style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.68)" }}>{passNote}</span></span>
              </label>
            </div>
          </div>

          <div style={{ height: "1px", background: "rgba(57,41,42,0.12)" }}></div>

          {/* SCHEDULE */}
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "6px" }}>The schedule</div>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", margin: "0 0 12px", maxWidth: "70ch", textWrap: "pretty" }}>Our standing schedule, filled in for you. Change it here when a partner will only hold the room until a different date.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: "12px" }}>
              <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "5px", padding: "12px 14px", background: "#fff" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", marginBottom: "5px" }}>Members book from</div>
                <input type="text" value={schMembers} onChange={(e) => setSchMembers(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "4px", padding: "8px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px", color: "#39292a", background: "#fff" }} />
                <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Announced in the chosen threads</div>
              </div>
              <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "5px", padding: "12px 14px", background: "#fff" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", marginBottom: "5px" }}>Guests open</div>
                <input type="text" value={schGuestsOpen} onChange={(e) => setSchGuestsOpen(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "4px", padding: "8px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px", color: "#39292a", background: "#fff" }} />
                <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Every event, no exception</div>
              </div>
              <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "5px", padding: "12px 14px", background: "#fff" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", marginBottom: "5px" }}>Decision point</div>
                <input type="text" value={schDecision} onChange={(e) => setSchDecision(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "4px", padding: "8px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px", color: "#39292a", background: "#fff" }} />
                <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Confirm or cancel by this date</div>
              </div>
              <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "5px", padding: "12px 14px", background: "#fff" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", marginBottom: "5px" }}>Guests close</div>
                <input type="text" value={schGuestsClose} onChange={(e) => setSchGuestsClose(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "4px", padding: "8px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px", color: "#39292a", background: "#fff" }} />
                <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Members keep booking to the start</div>
              </div>
            </div>
          </div>

          <div style={{ height: "1px", background: "rgba(57,41,42,0.12)" }}></div>

          {/* DESCRIPTION */}
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "14px" }}>The words members read</div>
            <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Description <span style={{ color: "#7b1f2c" }}>*</span></label>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happens, who it suits, what to bring. Two or three sentences." style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", lineHeight: 1.6, color: "#39292a", background: "#fff", resize: "vertical" }}></textarea>
            <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Spanish version can be added after publishing — the page falls back to English until it exists.</div>
          </div>

        </div>

        <div style={{ padding: "18px clamp(22px,3vw,32px) clamp(22px,3vw,28px)", borderTop: "1px solid rgba(57,41,42,0.14)", background: "rgba(57,41,42,0.02)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57,41,42,0.65)", maxWidth: "44ch", textWrap: "pretty" }}>{validationLine}</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" onClick={handleSave} disabled={loading} style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "11px 20px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
              {loading ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
