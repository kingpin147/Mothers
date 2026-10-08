"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createAdminEvent } from "@/app/actions/adminEvents";
import { getAdminAllMothers } from "@/app/actions/adminCms";
import { ForwardArrow } from "@/components/Icons";

export default function AdminCreateEventPage() {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [titleEs, setTitleEs] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [category, setCategory] = useState("cat-easy");
  const [neighbourhood, setNeighbourhood] = useState("Ciutat Vella");
  const [venueName, setVenueName] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [host, setHost] = useState("");
  const [assignedHostPersonId, setAssignedHostPersonId] = useState("");
  const [allMothers, setAllMothers] = useState<any[]>([]);
  const [hostSearch, setHostSearch] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [minToConfirm, setMinToConfirm] = useState("");
  const [memberPlaces, setMemberPlaces] = useState("");
  const [creditCost, setCreditCost] = useState("");
  const [memberCredits, setMemberCredits] = useState("");
  const [nonMemberCredits, setNonMemberCredits] = useState("");
  const [cancellationWindowHours, setCancellationWindowHours] = useState("24");
  const [isMembershipLive, setIsMembershipLive] = useState(false);
  const [description, setDescription] = useState("");
  const [descriptionEs, setDescriptionEs] = useState("");
  const [descriptionFr, setDescriptionFr] = useState("");

  useEffect(() => {
    import("@/app/actions/adminSettings").then(({ getPublicClubSettings }) => {
      getPublicClubSettings().then((s) => {
        if (s.membershipLive) setIsMembershipLive(true);
      }).catch(() => {});
    });
    // Load all mothers for host assignment dropdown
    getAdminAllMothers().then((res) => {
      if (res.success && res.mothers) setAllMothers(res.mothers);
    }).catch(() => {});
  }, []);

  // Cover photo state (AD-16)
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");

  // Toggles & Arrays
  const [langs, setLangs] = useState<string[]>(["English"]);
  const [stages, setStages] = useState<string[]>(["Babies"]);
  const [childcare, setChildcare] = useState<string>("child_inclusive");
  const [nonMemberOpensAt, setNonMemberOpensAt] = useState("");
  const [freeEvent, setFreeEvent] = useState(false);
  const [noCeiling, setNoCeiling] = useState(false);
  const [noMinimum, setNoMinimum] = useState(false);
  const [needsHost, setNeedsHost] = useState(false);

  // Schedule overrides
  const [schMembers, setSchMembers] = useState("T-28");
  const [schDecision, setSchDecision] = useState("T-7");

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please upload a valid image file (JPEG, PNG, WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError("Image must be under 10MB.");
      return;
    }

    setPhotoError("");
    setUploadingPhoto(true);

    try {
      // Set instant local preview
      const localPreview = URL.createObjectURL(file);
      setImageUrl(localPreview);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "events");
      formData.append("altText", title.trim() || "Event cover photo");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        if (res.status === 413) throw new Error("Image is too large. Please use an image under 10MB.");
        let errText = "Failed to upload image.";
        try {
          const errData = await res.json();
          if (errData.error) errText = errData.error;
        } catch {
          errText = `Server error: ${res.statusText || res.status}`;
        }
        throw new Error(errText);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to upload image");
      }

      setImageId(data.asset.id);
      setImageUrl(data.asset.publicUrl);
    } catch (err: any) {
      setPhotoError(err.message || "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setImageId(null);
    setImageUrl(null);
    setPhotoError("");
  };

  const isLangSelected = (l: string) => {
    return langs.some(
      (x) =>
        x.toLowerCase() === l.toLowerCase() ||
        (l === "Spanish" && (x.toLowerCase() === "español" || x.toLowerCase() === "es")) ||
        (l === "French" && (x.toLowerCase() === "français" || x.toLowerCase() === "fr")) ||
        (l === "Catalan" && (x.toLowerCase() === "català" || x.toLowerCase() === "ca")) ||
        (l === "English" && x.toLowerCase() === "en")
    );
  };

  const toggleLang = (l: string) => {
    setLangs((prev) => {
      const selected = isLangSelected(l);
      if (selected) {
        return prev.filter(
          (x) =>
            x.toLowerCase() !== l.toLowerCase() &&
            !(l === "Spanish" && (x.toLowerCase() === "español" || x.toLowerCase() === "es")) &&
            !(l === "French" && (x.toLowerCase() === "français" || x.toLowerCase() === "fr")) &&
            !(l === "Catalan" && (x.toLowerCase() === "català" || x.toLowerCase() === "ca")) &&
            !(l === "English" && x.toLowerCase() === "en")
        );
      } else {
        return [...prev, l];
      }
    });
  };

  const toggleStage = (s: string) => {
    setStages(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const chip = (on: boolean) => ({
    border: on ? '#7b1f2c' : 'rgba(57,41,42,0.25)',
    bg: 'transparent',
    color: on ? '#7b1f2c' : '#39292a'
  });

  const costBorder = freeEvent ? 'rgba(57,41,42,0.16)' : 'rgba(123,31,44,0.4)';
  const costBg = freeEvent ? 'rgba(57,41,42,0.05)' : '#fff';
  const costHint = freeEvent
    ? 'No credits taken for this event (free gathering).'
    : 'Price in credits (e.g. 15 credits). Single price applies before membership launch.';

  const validationLine = freeEvent
    ? 'Still needed before publishing: title, venue, meeting point, dates, minimum, description.'
    : 'Still needed before publishing: title, venue, meeting point, dates, minimum, price in credits, description.';

  // Helper to parse T-X schedule into Dates
  const calculateDate = (startD: string, expr: string) => {
    if (!startD || !expr) return undefined;
    const d = new Date(startD);
    if (isNaN(d.getTime())) return undefined;
    const trimmed = expr.trim();
    if (trimmed.startsWith("T-")) {
      const days = parseFloat(trimmed.replace("T-", ""));
      if (!isNaN(days)) {
        d.setTime(d.getTime() - days * 24 * 60 * 60 * 1000);
        return d;
      }
    }
    if (trimmed.endsWith("h")) {
      const hours = parseFloat(trimmed.replace("h", ""));
      if (!isNaN(hours)) {
        d.setTime(d.getTime() - hours * 60 * 60 * 1000);
        return d;
      }
    }
    // If they typed an explicit date string (fallback)
    const exact = new Date(trimmed);
    if (!isNaN(exact.getTime())) return exact;
    return undefined;
  };

  const now = new Date();
  const daysUntilStart = startsAt ? (new Date(startsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24) : null;
  const isShortNotice = daysUntilStart !== null && daysUntilStart <= 7.5 && daysUntilStart > 0;

  const handleStartsAtChange = (val: string) => {
    setStartsAt(val);
    if (val) {
      const startD = new Date(val);
      if (!isNaN(startD.getTime())) {
        const days = (startD.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (days <= 7.5 && days > 0) {
          if (schDecision === "T-7") {
            if (days >= 3) setSchDecision("T-2");
            else if (days >= 1.5) setSchDecision("T-1");
            else setSchDecision("12h");
          }
        }
      }
    }
  };

  const formatSchedulePreview = (date?: Date) => {
    if (!date || isNaN(date.getTime())) return null;
    const isPast = date.getTime() <= Date.now();
    const formatted = date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return { formatted, isPast };
  };

  const handleSave = async (status: "draft" | "published_pending") => {
    if (!title || !venueName || !meetingPoint || !startsAt || !endsAt) {
      alert("Please fill in core details (title, venue, dates) even for draft.");
      return;
    }

    const parsedCredits = freeEvent ? 0 : (parseInt(creditCost) || 0);
    if (!freeEvent && parsedCredits <= 0) {
      alert("Please enter the price in credits (e.g. 15) or tick 'Free event'.");
      return;
    }

    setLoadingAction(status);
    
    const parsedCap = noCeiling ? 0 : (parseInt(memberPlaces) || 0);
    const parsedMin = noMinimum ? 0 : (parseInt(minToConfirm) || 0);

    if (!noCeiling && parsedCap > 0 && parsedMin > parsedCap) {
      alert(`Minimum to confirm (${parsedMin}) cannot exceed Total Capacity (${parsedCap}).`);
      setLoadingAction(null);
      return;
    }

    const start = new Date(startsAt);
    const resolvedDecisionAt = calculateDate(startsAt, schDecision);

    if (status === "published_pending" && parsedMin > 0) {
      if (resolvedDecisionAt && resolvedDecisionAt.getTime() <= Date.now()) {
        alert("The confirmation decision deadline (" + resolvedDecisionAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + ") is in the past. Please set a decision deadline before the event starts (e.g. T-2, T-1, or 24h).");
        setLoadingAction(null);
        return;
      }
      if (resolvedDecisionAt && resolvedDecisionAt.getTime() >= start.getTime()) {
        alert("The confirmation decision deadline must be before the event starts.");
        setLoadingAction(null);
        return;
      }
    }
    
    const parsedMemberCredits = freeEvent ? 0 : (parseInt(isMembershipLive ? (memberCredits || creditCost) : creditCost) || 0);
    const parsedNonMemberCredits = freeEvent ? 0 : (parseInt(isMembershipLive ? (nonMemberCredits || creditCost) : creditCost) || 0);

    const res = await createAdminEvent({
      title,
      titleEs: titleEs.trim() || undefined,
      titleFr: titleFr.trim() || undefined,
      categoryId: category,
      partnerId: host.trim() || undefined,
      host: host.trim() || undefined,
      isSignature: category === "cat-signature",
      neighbourhood,
      venueName,
      meetingPoint,
      startsAt: start,
      endsAt: new Date(endsAt),
      creditCost: parsedMemberCredits,
      memberCredits: parsedMemberCredits,
      nonMemberCredits: parsedNonMemberCredits,
      cancellationWindowHours: parseInt(cancellationWindowHours) || 0,
      childcare,
      needsHost,
      // 0 = uncapped (no ceiling). When noCeiling is checked, store 0 explicitly.
      capacityMember: noCeiling ? 0 : (memberPlaces.trim() === "" || parseInt(memberPlaces) <= 0 ? 0 : parseInt(memberPlaces)),
      minToConfirm: noMinimum || minToConfirm.trim() === "" ? 0 : (parseInt(minToConfirm) || 0),
      description,
      descriptionEs: descriptionEs.trim() || undefined,
      descriptionFr: descriptionFr.trim() || undefined,
      status,
      languages: langs,
      targetStages: stages,
      nonMemberOpensAt: nonMemberOpensAt ? new Date(nonMemberOpensAt) : undefined,
      imageId: imageId || undefined,
      decisionAt: resolvedDecisionAt,
      publishedAt: status === "published_pending" ? new Date() : undefined,
    });

    setLoadingAction(null);
    if (res.success) {
      alert(status === "draft" ? "Draft saved successfully!" : "Event published successfully!");
      router.push("/admin/events");
    } else {
      alert(res.error || "Failed to save event");
    }
  };

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
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "8px" }}>New event</div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(26px,3.2vw,33px)", lineHeight: 1.15, margin: "0 0 7px" }}>Put something in the calendar</h1>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", margin: 0, maxWidth: "62ch", textWrap: "pretty" }}>Nothing is published until you say so, and nothing is pre-filled that only you can know.</p>
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
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Morning walk & coffee in Ciutadella" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff", marginBottom: "8px" }} />
                <input type="text" value={titleEs} onChange={(e) => setTitleEs(e.target.value)} placeholder="Title (Spanish) - optional" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff", marginBottom: "8px" }} />
                <input type="text" value={titleFr} onChange={(e) => setTitleFr(e.target.value)} placeholder="Title (French) - optional" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Category <span style={{ color: "#7b1f2c" }}>*</span></label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }}>
                    <option value="cat-easy">Easy connection</option>
                    <option value="cat-baby">Play date</option>
                    <option value="cat-evenings">MoM's date</option>
                    <option value="cat-learn">Learn & grow</option>
                    <option value="cat-signature">Signature moments</option>
                  </select>
                  <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>A label for members and a filter for you. It carries no price.</div>
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Neighbourhood <span style={{ color: "#7b1f2c" }}>*</span></label>
                  <select value={neighbourhood} onChange={(e) => setNeighbourhood(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }}>
                    <option>To be confirmed</option>
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
                  {neighbourhood === "To be confirmed" && (
                    <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>
                      Mothers see "Location to be confirmed". When you pick the real area, everyone booked gets an email with it.
                    </div>
                  )}
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
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Assign a host mother</label>
                  <select
                    value={assignedHostPersonId}
                    onChange={(e) => setAssignedHostPersonId(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }}
                  >
                    <option value="">— No host assigned —</option>
                    {allMothers.map((m) => (
                      <option key={m.personId} value={m.personId}>
                        {m.firstName} {m.lastName} · {m.neighbourhood}{m.isMember ? '' : ' (non-member)'}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Pick a mother to welcome guests at this event. She earns 2 credits when it runs.</div>
                </div>
                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Partner or venue name</label>
                  <input type="text" value={host} onChange={(e) => setHost(e.target.value)} placeholder="e.g. Luz Movement Studio" style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Languages</label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "3px" }}>
                    {['English', 'Spanish', 'French', 'Catalan'].map((l) => {
                      const c = chip(isLangSelected(l));
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
                <input type="datetime-local" value={startsAt} onChange={(e) => handleStartsAtChange(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }} />
                <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Pick a date and the T-schedule counts back from it.</div>
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
            
            {/* Children Welcome / Mothers Only Selection */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "8px" }}>Children</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                  <input 
                    type="radio" 
                    name="childcare" 
                    value="child_inclusive" 
                    checked={childcare === "child_inclusive"} 
                    onChange={(e) => setChildcare(e.target.value)} 
                    style={{ width: "16px", height: "16px", accentColor: "#7b1f2c" }} 
                  />
                  <span>Children welcome</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px" }}>
                  <input 
                    type="radio" 
                    name="childcare" 
                    value="adults_only" 
                    checked={childcare === "adults_only"} 
                    onChange={(e) => setChildcare(e.target.value)} 
                    style={{ width: "16px", height: "16px", accentColor: "#7b1f2c" }} 
                  />
                  <span>Mothers only</span>
                </label>
              </div>
              <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>
                Shown on the card and the event page, and used by the "Kids welcome / Mothers only" filter.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Members-first date (optional)</label>
                <input type="datetime-local" value={nonMemberOpensAt} onChange={(e) => setNonMemberOpensAt(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff" }} />
                <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Gives members a head start before non-members can book. Set per event — not a global window. Leave blank to open to everyone at once.</div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", lineHeight: 1.5, cursor: "pointer", paddingBottom: "11px" }}>
                  <input type="checkbox" checked={needsHost} onChange={(e) => setNeedsHost(e.target.checked)} style={{ width: "17px", height: "17px", accentColor: "#7b1f2c" }} />
                  <span>Needs a host — show the host-volunteer prompt on the event page</span>
                </label>
              </div>
            </div>
          </div>

          <div style={{ height: "1px", background: "rgba(57,41,42,0.12)" }}></div>

          {/* PLACES AND COST */}
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)", marginBottom: "14px" }}>Places and cost</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Minimum to run <span style={{ color: "#7b1f2c" }}>*</span></label>
                <input
                  type="number"
                  value={noMinimum ? "" : minToConfirm}
                  onChange={(e) => setMinToConfirm(e.target.value)}
                  placeholder={noMinimum ? "No minimum" : "e.g. 4"}
                  disabled={noMinimum}
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: noMinimum ? "rgba(57,41,42,0.04)" : "#fff", opacity: noMinimum ? 0.6 : 1 }}
                />
                <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.75)", marginTop: "6px" }}>The number below which you would cancel. Everything at T-10 and T-7 is measured against this.</div>
              </div>
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Capacity</label>
                <input
                  type="number"
                  value={noCeiling ? "" : memberPlaces}
                  onChange={(e) => setMemberPlaces(e.target.value)}
                  placeholder={noCeiling ? "No ceiling" : "e.g. 10"}
                  disabled={noCeiling}
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: noCeiling ? "rgba(57,41,42,0.04)" : "#fff", opacity: noCeiling ? 0.6 : 1 }}
                />
                <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.75)", marginTop: "6px" }}>
                  {noCeiling ? "Open — no ceiling on bookings." : "Total places. Leave empty or tick below for no ceiling."}
                </div>
              </div>
              {isMembershipLive ? (
                <>
                  <div>
                    <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Member price (credits) <span style={{ color: "#7b1f2c" }}>*</span></label>
                    <input
                      type="number"
                      value={freeEvent ? "" : (memberCredits || creditCost)}
                      onChange={(e) => {
                        setMemberCredits(e.target.value);
                        setCreditCost(e.target.value);
                      }}
                      placeholder={freeEvent ? "0 (Free event)" : "e.g. 15"}
                      disabled={freeEvent}
                      style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${costBorder}`, borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: costBg }}
                    />
                    <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.75)", marginTop: "6px" }}>Credits charged to club members.</div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Non-member price (credits) <span style={{ color: "#7b1f2c" }}>*</span></label>
                    <input
                      type="number"
                      value={freeEvent ? "" : (nonMemberCredits || creditCost)}
                      onChange={(e) => setNonMemberCredits(e.target.value)}
                      placeholder={freeEvent ? "0 (Free event)" : "e.g. 20"}
                      disabled={freeEvent}
                      style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${costBorder}`, borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: costBg }}
                    />
                    <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.75)", marginTop: "6px" }}>Credits charged to non-members.</div>
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Price (credits) <span style={{ color: "#7b1f2c" }}>*</span></label>
                  <input
                    type="number"
                    value={freeEvent ? "" : creditCost}
                    onChange={(e) => setCreditCost(e.target.value)}
                    placeholder={freeEvent ? "0 (Free event)" : "e.g. 15"}
                    disabled={freeEvent}
                    style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${costBorder}`, borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: costBg }}
                  />
                  <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.75)", marginTop: "6px" }}>{costHint}</div>
                </div>
              )}
              <div>
                <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Cancellation window <span style={{ color: "#7b1f2c" }}>*</span></label>
                <select
                  value={cancellationWindowHours}
                  onChange={(e) => setCancellationWindowHours(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", color: "#39292a", background: "#fff" }}
                >
                  <option value="0">Any time (free cancellation)</option>
                  <option value="24">24 hours before (standard)</option>
                  <option value="48">48 hours before</option>
                  <option value="168">7 days before (168 hours)</option>
                </select>
                <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.75)", marginTop: "6px" }}>Window before start for free cancellation and host penalties.</div>
              </div>
            </div>
            {/* Checkboxes row */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", lineHeight: 1.5, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={noCeiling}
                  onChange={(e) => {
                    setNoCeiling(e.target.checked);
                    if (e.target.checked) setMemberPlaces("");
                  }}
                  style={{ width: "17px", height: "17px", accentColor: "#7b1f2c", flexShrink: 0 }}
                />
                <span>No ceiling — open to everyone, no cap on bookings</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", lineHeight: 1.5, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={noMinimum}
                  onChange={(e) => {
                    setNoMinimum(e.target.checked);
                    if (e.target.checked) setMinToConfirm("");
                  }}
                  style={{ width: "17px", height: "17px", accentColor: "#7b1f2c", flexShrink: 0 }}
                />
                <span>No minimum — runs whatever the numbers</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", lineHeight: 1.5, cursor: "pointer" }}>
                <input type="checkbox" checked={freeEvent} onChange={(e) => setFreeEvent(e.target.checked)} style={{ width: "17px", height: "17px", accentColor: "#7b1f2c", flexShrink: 0 }} />
                <span>Free event — 0 credits for everyone (member and non-member)</span>
              </label>
            </div>

            {/* Capacity Summary & Validation */}
            {(() => {
              const parsedCap = noCeiling ? 0 : (parseInt(memberPlaces) || 0);
              const parsedMinToConfirm = noMinimum ? 0 : (parseInt(minToConfirm) || 0);
              const hasMinExceedingCap = !noCeiling && parsedCap > 0 && parsedMinToConfirm > parsedCap;

              return (
                <div style={{
                  marginTop: "16px",
                  padding: "14px 18px",
                  borderRadius: "6px",
                  border: hasMinExceedingCap ? "1px solid #e05252" : "1px solid rgba(57,41,42,0.18)",
                  background: hasMinExceedingCap ? "#fdf2f2" : "#fdfbf7",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: "14.5px", color: hasMinExceedingCap ? "#a82020" : "#39292a" }}>
                      Total capacity: {noCeiling ? "Unlimited (open list)" : `${parsedCap} places`}
                    </div>
                  </div>
                  {hasMinExceedingCap && (
                    <div style={{ fontSize: "12.5px", color: "#a82020", lineHeight: 1.4, fontWeight: 500 }}>
                      ⚠️ Minimum to confirm ({parsedMinToConfirm}) exceeds the total capacity ({parsedCap}). Please increase capacity or lower the minimum.
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          <div style={{ height: "1px", background: "rgba(57,41,42,0.12)" }}></div>

          {/* SCHEDULE */}
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "6px" }}>The schedule</div>
            <p style={{ fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", margin: "0 0 12px", maxWidth: "70ch", textWrap: "pretty" }}>Our standing schedule, filled in for you from settings. Change it here when a partner will only hold the room until a different date.</p>

            {isShortNotice && (
              <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: "6px", padding: "12px 16px", marginBottom: "16px", fontSize: "13.5px", lineHeight: 1.6, color: "#92400e" }}>
                <strong style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontSize: "15.5px", marginBottom: "3px" }}>⚠️ Short-notice event (starts in {daysUntilStart ? daysUntilStart.toFixed(1) : ""} days)</strong>
                Because this event starts in less than a week, the standard <strong>T-7 decision point</strong> would be in the past. We have suggested <strong>{schDecision}</strong> below, or you can set a custom relative deadline (e.g. <code>T-2</code>, <code>T-1</code>, <code>24h</code>) or exact date.
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "12px" }}>
              {/* Booking opens */}
              {(() => {
                const preview = formatSchedulePreview(calculateDate(startsAt, schMembers));
                return (
                  <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "5px", padding: "12px 14px", background: "#fff" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", marginBottom: "5px" }}>Booking opens</div>
                    <input type="text" value={schMembers} onChange={(e) => setSchMembers(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "4px", padding: "8px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px", color: "#39292a", background: "#fff" }} />
                    <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Announced in chosen threads; members-first date applies from here if set above</div>
                    {preview && (
                      <div style={{ fontSize: "11px", marginTop: "6px", color: preview.isPast ? "#b45309" : "#3f6604", fontWeight: 500 }}>
                        {preview.isPast ? "↳ Opens immediately (T past)" : `↳ ${preview.formatted}`}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Decision point */}
              {(() => {
                const preview = formatSchedulePreview(calculateDate(startsAt, schDecision));
                return (
                  <div style={{ border: preview?.isPast ? "1px solid #dc2626" : "1px solid rgba(57,41,42,0.16)", borderRadius: "5px", padding: "12px 14px", background: preview?.isPast ? "#fef2f2" : "#fff" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12.5px", marginBottom: "5px", color: preview?.isPast ? "#991b1b" : "#39292a" }}>Decision point <span style={{ color: "#7b1f2c" }}>*</span></div>
                    <input type="text" value={schDecision} onChange={(e) => setSchDecision(e.target.value)} style={{ width: "100%", boxSizing: "border-box", border: preview?.isPast ? "1px solid #dc2626" : "1px solid rgba(57,41,42,0.2)", borderRadius: "4px", padding: "8px 10px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px", color: "#39292a", background: "#fff" }} />
                    <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Confirm or cancel by this date</div>
                    {preview && (
                      <div style={{ fontSize: "11.5px", marginTop: "6px", color: preview.isPast ? "#dc2626" : "#3f6604", fontWeight: 600 }}>
                        {preview.isPast ? `⚠️ In past: ${preview.formatted}` : `↳ ${preview.formatted}`}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div style={{ height: "1px", background: "rgba(57,41,42,0.12)" }}></div>

          {/* DESCRIPTION */}
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "14px" }}>The words members read</div>
            <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "6px" }}>Description <span style={{ color: "#7b1f2c" }}>*</span></label>
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (English). What happens, who it suits, what to bring." style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", lineHeight: 1.6, color: "#39292a", background: "#fff", resize: "vertical", marginBottom: "8px" }}></textarea>
            <textarea rows={4} value={descriptionEs} onChange={(e) => setDescriptionEs(e.target.value)} placeholder="Description (Spanish) - optional." style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", lineHeight: 1.6, color: "#39292a", background: "#fff", resize: "vertical", marginBottom: "8px" }}></textarea>
            <textarea rows={4} value={descriptionFr} onChange={(e) => setDescriptionFr(e.target.value)} placeholder="Description (French) - optional." style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.25)", borderRadius: "4px", padding: "11px 13px", fontFamily: "'Lora', Georgia, serif", fontSize: "14.5px", lineHeight: 1.6, color: "#39292a", background: "#fff", resize: "vertical" }}></textarea>
            <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "6px" }}>Spanish version can be added after publishing — the page falls back to English until it exists.</div>
          </div>

          {/* COVER PHOTO (AD-16) */}
          <div style={{ marginTop: "8px" }}>
            <label style={{ display: "block", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", marginBottom: "4px" }}>Cover photo</label>
            <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginBottom: "10px" }}>Shown on the event card, the event page and Home. JPG, PNG or WebP, up to 10 MB. Landscape works best.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "14px", alignItems: "start" }}>
              <div style={{ border: "1px solid rgba(57,41,42,0.18)", borderRadius: "8px", overflow: "hidden", background: "#ffffff" }}>
                {imageUrl ? (
                  <div role="img" aria-label="Cover photo preview" style={{ height: "150px", backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                ) : (
                  <div style={{ height: "150px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", background: "#ecdcd0", color: "rgba(57,41,42,0.62)", fontSize: "12.5px" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
                    </svg>
                    <span>No photo yet</span>
                  </div>
                )}
                <div style={{ padding: "10px 14px", fontSize: "12px", color: "rgba(57,41,42,0.62)", borderTop: "1px solid rgba(57,41,42,0.1)" }}>Card preview</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <label style={{ border: "1px solid #7b1f2c", color: "#7b1f2c", borderRadius: "4px", padding: "9px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: uploadingPhoto ? "wait" : "pointer", background: "transparent" }}>
                    {uploadingPhoto ? "Uploading..." : imageUrl ? "Change photo" : "Upload photo"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} disabled={uploadingPhoto} style={{ display: "none" }} />
                  </label>
                  {imageUrl && (
                    <button type="button" onClick={handleRemovePhoto} style={{ border: "1px solid rgba(57,41,42,0.28)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 16px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                      Remove
                    </button>
                  )}
                </div>
                {photoError && <div style={{ fontSize: "12.5px", color: "#993842" }}>{photoError}</div>}
              </div>
            </div>
          </div>

        </div>

        <div style={{ padding: "18px clamp(22px,3vw,32px) clamp(22px,3vw,28px)", borderTop: "1px solid rgba(57,41,42,0.14)", background: "rgba(57,41,42,0.02)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57,41,42,0.65)", maxWidth: "44ch", textWrap: "pretty" }}>{validationLine}</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" onClick={() => handleSave("draft")} disabled={!!loadingAction} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "11px 18px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
              {loadingAction === "draft" ? "Saving..." : "Save as draft"}
            </button>
            <button type="button" onClick={() => handleSave("published_pending")} disabled={!!loadingAction} style={{ border: "1px solid #7b1f2c", background: "transparent", color: "#7b1f2c", borderRadius: "4px", padding: "11px 20px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
              {loadingAction === "published_pending" ? "Publishing..." : <>Publish to the calendar <ForwardArrow /></>}
            </button>
          </div>
        </div>

      </div>

      <div style={{ maxWidth: "880px", margin: "24px auto 0", background: "#fffdfa", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "10px", overflow: "hidden", padding: "clamp(22px,3vw,32px)" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)", marginBottom: "16px" }}>Where this goes when you publish</div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 350px), 1fr))", gap: "24px 32px" }}>
          
          <div>
            <div style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", textWrap: "pretty" }}>
              <strong style={{ fontWeight: 600, color: "#39292a" }}>The public calendar</strong> — <span style={{ color: "#7b1f2c" }}>Events</span> shows it under its category, in its month, with its credit cost and the to be confirmed line if it has a minimum.
            </div>
          </div>

          <div>
            <div style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", textWrap: "pretty" }}>
              <strong style={{ fontWeight: 600, color: "#39292a" }}>The admin calendar</strong> — <span style={{ color: "#7b1f2c" }}>Admin Events</span> lists it with live booked-against-minimum counts as members book.
            </div>
          </div>

          <div>
            <div style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", textWrap: "pretty" }}>
              <strong style={{ fontWeight: 600, color: "#39292a" }}>The dashboard</strong> — it enters the T-10 and T-7 queues on <span style={{ color: "#7b1f2c" }}>the dashboard</span> by date, and This week when it is within seven days.
            </div>
          </div>

          <div>
            <div style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.7)", textWrap: "pretty" }}>
              <strong style={{ fontWeight: 600, color: "#39292a" }}>The audit log</strong> — creating, confirming and cancelling are all written down with what changed.
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
