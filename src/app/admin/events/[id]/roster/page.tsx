"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { getEventRoster, markAttendance } from "@/app/actions/adminEvents";

const WINE = '#7b1f2c', AMBER = '#a8752c', GREEN = '#3f6604', GREY = 'rgba(57,41,42,0.55)';

export default function AdminRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoster = async () => {
    setLoading(true);
    const res = await getEventRoster(id);
    if (res.success) {
      setData(res);
    } else {
      alert(res.error || "Failed to load roster.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRoster();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleMark = async (bookingId: string, currentlyAttended: boolean) => {
    const res = await markAttendance(bookingId, !currentlyAttended);
    if (res.success) {
      fetchRoster(); // refresh
    }
  };

  if (loading) {
    return <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", padding: "40px", textAlign: "center" }}>Loading roster...</div>;
  }

  if (!data || !data.event) {
    return <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", padding: "40px", textAlign: "center" }}>Event not found.</div>;
  }

  const ev = data.event;
  const bookings = data.bookings || [];
  const released = data.released || [];
  const waitlist = data.waitlist || [];

  const placesTaken = bookings.length;
  const maxCapacity = ev.capacityMember + ev.capacityGuest;
  
  const membersCount = bookings.filter((b: any) => b.booking.kind === 'member').length;
  const guestCount = bookings.filter((b: any) => b.booking.kind === 'guest').length;
  const arrivedCount = bookings.filter((b: any) => b.booking.status === 'attended').length;
  
  const dateFormatted = new Date(ev.startsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeFormatted = `${new Date(ev.startsAt).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})} - ${new Date(ev.endsAt).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})}`;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2" }} className="admin-roster">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-border { border: 1px solid #ccc !important; }
        }
      `}} />


      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "clamp(24px, 3.4vw, 36px) clamp(18px, 3vw, 30px) 60px" }}>
        
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "22px" }}>
          <div style={{ flex: "1 1 400px" }}>
            <div className="no-print" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "9px" }}>
              <Link href="/admin" style={{ color: "#7b1f2c" }}>← Dashboard</Link> · Events · Roster
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px, 4vw, 42px)", lineHeight: 1.1, margin: "0 0 9px" }}>{ev.title} — {ev.neighbourhood}</h1>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: "0 0 4px 0", maxWidth: "70ch" }}>
              {dateFormatted} · {timeFormatted} · {ev.venueName}, {ev.neighbourhood} {ev.hostAdminId ? '· hosted by Admin' : ''}
            </p>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "70ch" }}>
              Meeting point, shared with those booked: {ev.meetingPoint}
            </p>
          </div>
          <div className="no-print" style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
            <button type="button" onClick={handlePrint} style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", cursor: "pointer", whiteSpace: "nowrap" }}>
              Print this sheet
            </button>
            <Link href="/admin/events" style={{ border: "1px solid rgba(57,41,42,0.3)", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13.5px", whiteSpace: "nowrap" }}>
              ← Calendar
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div className="print-border" style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "28px", color: "#39292a", lineHeight: 1, marginBottom: "8px" }}>{placesTaken} of {maxCapacity}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)" }}>Places taken</div>
          </div>
          <div className="print-border" style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "28px", color: "#39292a", lineHeight: 1, marginBottom: "8px" }}>{membersCount}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)" }}>Members</div>
          </div>
          <div className="print-border" style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "28px", color: "#39292a", lineHeight: 1, marginBottom: "8px" }}>{guestCount} of {ev.capacityGuest}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)" }}>Guest places</div>
          </div>
          <div className="print-border" style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "28px", color: arrivedCount === placesTaken ? GREEN : "#39292a", lineHeight: 1, marginBottom: "8px" }}>{arrivedCount}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)" }}>Arrived</div>
          </div>
          <div className="print-border" style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "16px 20px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "28px", color: "#39292a", lineHeight: 1, marginBottom: "8px" }}>{ev.creditCost}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(57,41,42,0.65)" }}>Credits each</div>
          </div>
        </div>

        <div className="print-border" style={{ border: "1px solid rgba(123,31,44,0.25)", borderRadius: "6px", background: "rgba(123,31,44,0.03)", padding: "16px 20px", marginBottom: "24px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "#7b1f2c", marginBottom: "12px" }}>Read before the door opens</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px", lineHeight: 1.5, color: "#39292a" }}>
            <div>{placesTaken >= maxCapacity ? "Full" : `${maxCapacity - placesTaken} places open`}, with {waitlist.length} members waiting — if anyone releases, the first of them takes the place automatically.</div>
          </div>
        </div>

        <div className="print-border" style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", overflowX: "auto", marginBottom: "24px" }}>
          <div style={{ minWidth: "760px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1.5fr 3fr 100px", gap: "14px", padding: "14px 18px", borderBottom: "1px solid rgba(57,41,42,0.18)", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.55)" }}>
              <div>Who is coming</div>
              <div>How</div>
              <div>Worth knowing</div>
              <div style={{ textAlign: "right", paddingRight: "4px" }}>Arrived</div>
            </div>

            {bookings.length === 0 ? (
               <div style={{ padding: "20px 18px", fontSize: "14px", color: "rgba(57,41,42,0.65)" }}>No one booked yet.</div>
            ) : bookings.map((b: any) => {
              const isAttended = b.booking.status === 'attended';
              const name = `${b.person.firstName} ${b.person.lastName}`;
              const phone = b.person.phoneE164 || b.person.whatsappE164 || "No phone given";
              const stageText = b.member?.stage || "Not a member";
              
              const isGuest = b.booking.kind === 'guest';
              const isPass = b.booking.passId !== null;

              return (
                <div key={b.booking.id} style={{ display: "grid", gridTemplateColumns: "2.5fr 1.5fr 3fr 100px", gap: "14px", padding: "18px", borderBottom: "1px solid rgba(57,41,42,0.1)", alignItems: "center", background: isAttended ? "rgba(63,102,4,0.03)" : "transparent" }}>
                  
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "17px", lineHeight: 1.3, marginBottom: "5px" }}>{name}</div>
                    <div style={{ fontSize: "12.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.65)" }}>{phone} · {stageText}</div>
                  </div>

                  <div>
                    {isGuest ? (
                      <span style={{ display: "inline-block", border: `1px solid ${AMBER}`, color: AMBER, borderRadius: "3px", padding: "4px 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.06em", whiteSpace: "nowrap", marginBottom: "4px" }}>Guest</span>
                    ) : isPass ? (
                      <span style={{ display: "inline-block", border: `1px solid ${AMBER}`, color: AMBER, borderRadius: "3px", padding: "4px 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.06em", whiteSpace: "nowrap", marginBottom: "4px" }}>Event pass</span>
                    ) : (
                      <span style={{ display: "inline-block", border: `1px solid ${GREEN}`, color: GREEN, borderRadius: "3px", padding: "4px 8px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.06em", whiteSpace: "nowrap", marginBottom: "4px" }}>Member</span>
                    )}
                    <div style={{ fontSize: "11px", lineHeight: 1.4, color: "rgba(57,41,42,0.55)" }}>{b.booking.creditsCharged > 0 ? `${b.booking.creditsCharged} credits taken` : (isPass ? '€35 paid' : '')}</div>
                  </div>

                  <div style={{ fontSize: "13px", lineHeight: 1.5, color: "rgba(57,41,42,0.85)" }}>
                    {b.person.notesInternal || "—"}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <button 
                      type="button" 
                      onClick={() => handleMark(b.booking.id, isAttended)}
                      style={{ 
                        border: isAttended ? "none" : "1px solid rgba(57,41,42,0.3)", 
                        background: isAttended ? "#3f6604" : "transparent", 
                        color: isAttended ? "#fff" : "#39292a", 
                        borderRadius: "4px", 
                        padding: "7px 14px", 
                        fontFamily: "'Cormorant Garamond', serif", 
                        fontWeight: 600, 
                        fontSize: "13.5px", 
                        cursor: "pointer", 
                        whiteSpace: "nowrap",
                        transition: "all 0.2s"
                      }}>
                      {isAttended ? 'Arrived ✓' : 'Mark'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))", gap: "16px" }}>
          
          <div className="print-border" style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "20px", margin: "0 0 16px" }}>Waiting for a place</h2>
            
            {waitlist.length === 0 ? (
              <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)" }}>Nobody is waiting.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                {waitlist.map((w: any) => (
                  <div key={w.waitlist.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(57,41,42,0.08)", paddingBottom: "10px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 500 }}>{w.person.firstName} {w.person.lastName}</div>
                    <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.55)" }}>waiting since {new Date(w.waitlist.createdAt).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}</div>
                  </div>
                ))}
              </div>
            )}
            
            <p style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.65)", margin: 0, textWrap: "pretty" }}>
              A released place goes to the first of these automatically, and she is told at once. Nobody is ever offered a place that has not actually opened.
            </p>
          </div>

          <div className="print-border" style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "20px", margin: "0 0 16px" }}>Released before today</h2>
            
            {released.length === 0 ? (
              <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)" }}>No places were released.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                {released.map((r: any) => {
                  const daysAhead = Math.floor((new Date(ev.startsAt).getTime() - new Date(r.booking.releasedAt).getTime()) / (1000 * 3600 * 24));
                  return (
                    <div key={r.booking.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(57,41,42,0.08)", paddingBottom: "10px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 500 }}>{r.person.firstName} {r.person.lastName}</div>
                      <div style={{ fontSize: "12px", color: "rgba(57,41,42,0.55)" }}>released {daysAhead} days ahead · {r.booking.creditsCharged} credits returned</div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <p style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(57,41,42,0.65)", margin: 0, textWrap: "pretty" }}>
              Released inside the 48-hour deadline, so the credits went back at their original expiry. Later than that and the credits stay spent — the place still goes to the waitlist.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
