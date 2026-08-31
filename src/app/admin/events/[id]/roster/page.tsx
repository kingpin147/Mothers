"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { getEventRosterDetail, adminMarkAttendance } from "@/app/actions/adminEventsControl";

export default function AdminEventRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const res = await getEventRosterDetail(resolvedParams.id);
      if (res.success && res.event) {
        setData(res);
      }
      setLoading(false);
    }
    loadData();
  }, [resolvedParams.id]);

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#f8efe2", padding: "40px", textAlign: "center" }}>Loading roster...</div>;
  }

  if (!data || !data.event) {
    return <div style={{ minHeight: "100vh", background: "#f8efe2", padding: "40px", textAlign: "center" }}>Event not found.</div>;
  }

  const handleMark = async (type: "member" | "guest" | "host", id: string, status: "attended" | "confirmed" | "released" | "no_show") => {
    setActionLoading(id);
    const res = await adminMarkAttendance(type as "member" | "guest", id, status);
    if (res.success) {
      setData((prev: any) => {
        const newData = { ...prev };
        if (type === 'member') {
          const idx = newData.memberBookings.findIndex((b: any) => b.id === id);
          if (idx > -1) newData.memberBookings[idx].status = status;
        } else {
          const idx = newData.guestPasses.findIndex((p: any) => p.id === id);
          if (idx > -1) newData.guestPasses[idx].status = status === 'attended' ? 'used' : 'paid';
        }
        return newData;
      });
    }
    setActionLoading(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const eventData = data.event;
  const { hostUser, memberBookings, guestPasses, waitlist } = data;

  const WINE = '#7b1f2c', AMBER = '#a8752c', GREEN = '#3f6604', GREY = 'rgba(57,41,42,0.55)';

  const members = memberBookings.map((b: any) => ({
    id: b.id,
    type: 'member',
    name: `${b.firstName} ${b.lastName}`,
    contact: b.phone || b.email,
    kind: 'Member',
    kindNote: `${b.creditsCharged} credits taken`,
    note: '—',
    status: b.status, 
  }));

  const guests = guestPasses.map((p: any) => ({
    id: p.id,
    type: 'guest',
    name: `${p.firstName} ${p.lastName}`,
    contact: p.email,
    kind: 'Guest · pass',
    kindNote: `€${(p.pricePaidCents / 100).toFixed(2)} paid`,
    note: '—',
    status: p.status === 'used' ? 'attended' : (p.status === 'refunded' ? 'released' : p.status),
  }));

  const rows = [];
  
  if (hostUser) {
    rows.push({
      id: 'host',
      type: 'host',
      name: hostUser.email.split('@')[0],
      contact: 'Host · The Mothers',
      kind: 'Host',
      kindNote: 'us',
      note: '—',
      status: 'confirmed',
    });
  }

  rows.push(...members, ...guests);

  const waitlistUsers = waitlist.map((w: any) => ({
    name: `${w.firstName} ${w.lastName}`,
    contact: w.email,
    joined: new Date(w.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  }));

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const arrivedCount = rows.filter(r => r.status === 'attended').length;
  const totalPlaces = members.length + guests.length;

  const stats = [
    { value: `${totalPlaces} of ${eventData.capacityMember + eventData.capacityGuest}`, label: 'Places taken', color: '#39292a' },
    { value: String(members.length), label: 'Members', color: '#39292a' },
    { value: `${guests.length} of ${eventData.capacityGuest}`, label: 'Guest places', color: '#39292a' },
    { value: String(arrivedCount), label: 'Arrived', color: arrivedCount ? GREEN : GREY },
    { value: String(eventData.creditCost || 0), label: 'Credits each', color: '#39292a' }
  ];

  const notes = [
    waitlist.length > 0 ? `Full, with ${waitlist.length} members waiting — if anyone releases, the first of them takes the place automatically.` : `Spaces available. No members currently on the waitlist.`
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", WebkitFontSmoothing: "antialiased" }}>
      <style dangerouslySetInnerHTML={{__html: `
        a { color:#7b1f2c; text-decoration:none; }
        a:hover { color:#5d1620; text-decoration:underline; }
        button:focus-visible, a:focus-visible { outline:2px solid #7b1f2c; outline-offset:2px; }
        @media print { .no-print { display:none !important; } body { background:#fff !important; } }
      `}} />

      <div className="no-print" style={{ borderBottom: "1px solid rgba(57,41,42,0.16)" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "14px clamp(18px,3vw,30px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" }}>
          <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#7b1f2c" }}>Mothers</span>
            <span aria-hidden="true" style={{ width: "1px", height: "26px", background: "rgba(57,41,42,0.28)", flex: "none" }}></span>
            <span style={{ fontSize: "14px", color: "#39292a" }}>Admin</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "22px", flexWrap: "wrap", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px" }}>
            <Link href="#" style={{ color: "#39292a" }}>Membership</Link>
            <Link href="/admin/events" style={{ color: "#39292a" }}>Events</Link>
            <Link href="/admin" style={{ border: "1px solid #7b1f2c", color: "#7b1f2c", borderRadius: "4px", padding: "6px 14px" }}>Admin</Link>
            <button type="button" onClick={() => signOut({ callbackUrl: "/super-admin/login" })} style={{ border: "none", background: "none", padding: 0, color: "rgba(57,41,42,0.55)", fontFamily: "inherit", fontWeight: "inherit", fontSize: "inherit", cursor: "pointer" }}>Log out</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "clamp(24px,3.4vw,36px) clamp(18px,3vw,30px) 60px" }}>
        
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>
          <div style={{ flex: "1 1 400px" }}>
            <div className="no-print" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>
              <Link href="/admin/events">← Events</Link> · Roster
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(28px,3.8vw,38px)", lineHeight: 1.12, margin: "0 0 8px" }}>{eventData.title}</h1>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.74)", margin: 0, maxWidth: "70ch", textWrap: "pretty" }}>
              {formatDate(eventData.startsAt)} · {eventData.venueName}
            </p>
            <p style={{ fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.68)", margin: "6px 0 0", maxWidth: "70ch", textWrap: "pretty" }}>
              Meeting point, shared with those booked: {eventData.meetingPoint}
            </p>
          </div>
          <div className="no-print" style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <button type="button" onClick={handlePrint} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer", whiteSpace: "nowrap" }}>Print this sheet</button>
            <Link href="/admin/events" style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap" }}>← Calendar</Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))", gap: "12px", marginBottom: "18px" }}>
          {stats.map((s, i) => (
            <div key={i} style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "6px", background: "#fffdfa", padding: "14px 16px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "23px", lineHeight: 1.1, fontVariantNumeric: "tabular-nums", color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)", marginTop: "6px", lineHeight: 1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {notes.length > 0 && (
          <div style={{ border: "1px solid rgba(123,31,44,0.4)", borderRadius: "8px", background: "#fdf6f2", padding: "18px 20px", marginBottom: "18px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "8px" }}>Read before the door opens</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px", fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.8)" }}>
              {notes.map((n, i) => (
                <div key={i}>{n}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", overflow: "hidden", marginBottom: "18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.3fr 1.5fr 1fr", gap: "14px", padding: "13px 18px", borderBottom: "1px solid rgba(57,41,42,0.18)", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)" }}>
            <div>Who is coming</div>
            <div>How</div>
            <div>Worth knowing</div>
            <div className="no-print" style={{ textAlign: "right" }}>Arrived</div>
          </div>
          {rows.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "rgba(57,41,42,0.55)" }}>No attendees booked yet.</div>
          ) : (
            rows.map(p => {
                const here = p.status === 'attended';
                const released = p.status === 'released' || p.status === 'refunded';
                const rowBg = here ? 'rgba(86,139,5,0.05)' : p.kind === 'Host' ? 'rgba(57,41,42,0.03)' : 'transparent';
                const kindColor = p.kind === 'Host' ? GREY : AMBER;
                
                return (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.3fr 1.5fr 1fr", gap: "14px", padding: "14px 18px", borderBottom: "1px solid rgba(57,41,42,0.1)", alignItems: "center", background: rowBg }}>
                    <div>
                      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "16px", lineHeight: 1.3, marginBottom: "3px" }}>{p.name}</div>
                      <div style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.62)" }}>{p.contact}</div>
                    </div>
                    <div>
                      <span style={{ display: "inline-block", border: `1px solid ${kindColor}`, color: kindColor, borderRadius: "3px", padding: "3px 9px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", whiteSpace: "nowrap" }}>{p.kind}</span>
                      <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.6)", marginTop: "4px" }}>{p.kindNote}</div>
                    </div>
                    <div style={{ fontSize: "12.5px", lineHeight: 1.55, color: "rgba(57,41,42,0.78)" }}>{p.note}</div>
                    <div className="no-print" style={{ display: "flex", gap: "6px", marginLeft: "auto", textAlign: "right" }}>
                      {p.kind !== 'Host' && !released && !here && (
                        <button type="button" onClick={() => handleMark(p.type as any, p.id, 'attended')} disabled={actionLoading === p.id} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "8px 12px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                          {actionLoading === p.id ? "..." : "Here"}
                        </button>
                      )}
                      {p.kind !== 'Host' && here && (
                        <button type="button" onClick={() => handleMark(p.type as any, p.id, 'confirmed')} disabled={actionLoading === p.id} style={{ border: "1px solid #3f6604", background: "rgba(86,139,5,0.05)", color: "#3f6604", borderRadius: "4px", padding: "8px 12px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
                          {actionLoading === p.id ? "..." : "Mark absent"}
                        </button>
                      )}
                    </div>
                  </div>
                );
            })
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "16px" }}>
          
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "18px 20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "19px", margin: "0 0 10px" }}>Waiting for a place</h2>
            <div>
              {waitlist.length === 0 ? (
                <div style={{ padding: "10px 0", fontSize: "13.5px", color: "rgba(57,41,42,0.6)" }}>Waitlist is empty.</div>
              ) : (
                waitlistUsers.map((w: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px 0", borderBottom: "1px solid rgba(57,41,42,0.1)", fontSize: "13.5px", lineHeight: 1.5 }}>
                    <span>{w.name}</span>
                    <span style={{ color: "rgba(57,41,42,0.6)", fontSize: "12.5px" }}>waiting since {w.joined}</span>
                  </div>
                ))
              )}
            </div>
            <p style={{ fontSize: "12.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.66)", margin: "12px 0 0", textWrap: "pretty" }}>A released place goes to the first of these automatically, and she is told at once. Nobody is ever offered a place that has not actually opened.</p>
          </div>

        </div>

      </div>
    </div>
  );
}
