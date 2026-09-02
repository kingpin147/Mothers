"use client";

import React, { useState, useEffect } from "react";

const WINE = '#7b1f2c', GREY = 'rgba(57,41,42,0.55)';

type ChecklistItem = {
  id: string;
  action: string;
  should: string;
};

type ChecklistSection = {
  id: string;
  title: string;
  desc: string;
  items: ChecklistItem[];
};

const SECTIONS: ChecklistSection[] = [
  {
    id: "01",
    title: "Start from a clean slate",
    desc: "So nothing you see later is left over from an earlier run.",
    items: [
      { id: "1.1", action: "Open Admin Dashboard and click “Clear the test data” at the bottom.", should: "The button reads “Cleared”, and the applications, events and money sections fall back to the seeded examples only." },
      { id: "1.2", action: "Reload the dashboard.", should: "It loads with no blank panels and no error box; the date line under the title is today." },
      { id: "1.3", action: "Open the browser console and leave it open for the whole run.", should: "No red errors on any page you visit." },
    ]
  },
  {
    id: "02",
    title: "The public site, as a stranger",
    desc: "What someone sees before she is a member.",
    items: [
      { id: "2.1", action: "Open Home and read down to the footer.", should: "Images all load, nothing overlaps, every footer link opens a real page." },
      { id: "2.2", action: "Switch the language to Spanish, then back to English.", should: "Every visible string changes both ways — no English left in the Spanish view." },
      { id: "2.3", action: "Open Events and use each filter: stage, category, language, kids.", should: "The count updates, and clearing the filters brings every event back." },
      { id: "2.4", action: "Look at an event that is still gathering and one that is confirmed.", should: "One says GATHERING with a minimum, the other says confirmed. Times read as 24-hour, e.g. 13:00." },
      { id: "2.5", action: "Open an event page and try to book without being a member.", should: "It asks you to apply or buy a pass — never a silent failure." },
      { id: "2.6", action: "Open Journal, Partners, FAQ and Legal.", should: "Each loads with real content and the same header and footer." },
      { id: "2.7", action: "Narrow the window to phone width on Home and Events.", should: "One column, nothing cut off, tap targets still comfortable." },
    ]
  },
  {
    id: "03",
    title: "Applying for membership",
    desc: "The join flow, end to end, and where it lands in the admin.",
    items: [
      { id: "3.1", action: "On Membership, read the price and what is included.", should: "€19 joining fee, and the monthly and quarterly rates match Admin Settings." },
      { id: "3.2", action: "Submit an application with your own name and a neighbourhood.", should: "A confirmation that says you will hear within 72 hours." },
      { id: "3.3", action: "Open Admin Applications.", should: "Your application is at the top with status “waiting” and a live countdown against the 72 hours." },
      { id: "3.4", action: "Accept it.", should: "The row moves to accepted and the payment hold appears." },
      { id: "3.5", action: "Open Admin Members.", should: "You are in the directory, newest first, with today as the join date." },
      { id: "3.6", action: "Open Admin Finance.", should: "A €19 joining-fee entry for you, dated today." },
      { id: "3.7", action: "Go back to Admin Applications and decline a different one.", should: "It moves out of the waiting list and says so in the audit log." },
    ]
  },
  {
    id: "04",
    title: "Member records",
    desc: "One person, one truthful page.",
    items: [
      { id: "4.1", action: "In Admin Members, filter by “Needs a word”, then by Paused and Past due.", should: "The counts in the pills match the rows shown." },
      { id: "4.2", action: "Search a member by name and by email.", should: "Both find her; a nonsense search shows a quiet empty line, not a broken table." },
      { id: "4.3", action: "Click “Record” on three different members.", should: "Each opens her own record — her name, email, stage, plan and status, not the same person three times." },
      { id: "4.4", action: "On each record, read the credits card.", should: "The rows add up to the balance printed above them, and no row shows a negative balance." },
      { id: "4.5", action: "Open a member with no flag against her.", should: "No red “needs a word” banner, but “Write to her” is still there in the header." },
      { id: "4.6", action: "Click “Write to her”, then “Not now”.", should: "A draft opens addressed to her by first name, and closes without sending." },
      { id: "4.7", action: "Try “Pause her membership” and “End her membership”, then “Not now”.", should: "Each explains what happens to her bookings and credits, and asks for a reason." },
      { id: "4.8", action: "Click “Export CSV”.", should: "A file downloads with the rows currently filtered, accents intact." },
    ]
  },
  {
    id: "05",
    title: "Events, as the admin",
    desc: "Creating, confirming and cancelling.",
    items: [
      { id: "5.1", action: "Open Admin Events and read the calendar.", should: "Every event shows its date, 24-hour time, booked count against the minimum, and a state." },
      { id: "5.2", action: "Create an event: title, category, neighbourhood, venue, meeting point, time, minimum, places, credits.", should: "The neighbourhood list offers the ten Barcelona districts; nothing required can be left empty." },
      { id: "5.3", action: "Publish it.", should: "It appears at the top of Admin Events as gathering." },
      { id: "5.4", action: "Open the public Events page.", should: "Your new event is there with the same time, place and credit cost." },
      { id: "5.5", action: "Back in the admin, confirm an event that has met its minimum.", should: "The state becomes confirmed and the audit log records who did it and the numbers." },
      { id: "5.6", action: "Cancel an event with a reason.", should: "It disappears from the public list and the reason is kept in the admin." },
      { id: "5.7", action: "Open Admin Roster for an event with bookings.", should: "Names, guests, waitlist and released places, plus the meeting point, ready to print." },
    ]
  },
  {
    id: "06",
    title: "Booking, as a member",
    desc: "The part the members actually use.",
    items: [
      { id: "6.1", action: "From Events, book a place on a confirmed event.", should: "A confirmation, and the credit cost taken from your balance." },
      { id: "6.2", action: "Open Account and Activity Statement.", should: "The booking and the credit spend both appear, dated today." },
      { id: "6.3", action: "Open Admin Roster for that event.", should: "You are on the list, and the booked count went up by one." },
      { id: "6.4", action: "Release the place from the member side.", should: "The place returns to the event and the roster shows it as released, not deleted." },
      { id: "6.5", action: "Book a place on an event still gathering.", should: "It says the credits are held, not spent, until the event is confirmed." },
      { id: "6.6", action: "Book a guest place where guests are allowed.", should: "The guest is counted separately and appears on the roster as a guest." },
      { id: "6.7", action: "Open a Ticket.", should: "Meeting point, time, what to bring, and the name it is booked under." },
    ]
  },
  {
    id: "07",
    title: "Money and settings",
    desc: "The numbers must agree everywhere they appear.",
    items: [
      { id: "7.1", action: "Open Admin Settings and read all three: joining fee, rollover ceiling, Godmother bonus.", should: "€19, no ceiling, 5 credits plus 15 at the milestone." },
      { id: "7.2", action: "Open the public Membership page and FAQ.", should: "The same three numbers are quoted exactly." },
      { id: "7.3", action: "Back in Settings, change all three.", should: "Both changes are recorded as sentences with before and after values." },
      { id: "7.4", action: "Open Admin Finance and switch between its tabs.", should: "Each tab has real rows; the “needing attention” names all open their own record." },
      { id: "7.5", action: "Read the audit log at the bottom of the dashboard.", should: "Human sentences with who, what and the values that changed — no raw codes." },
    ]
  },
  {
    id: "08",
    title: "The CMS pages",
    desc: "What the team edits without you.",
    items: [
      { id: "8.1", action: "Open Admin Journal and edit a post.", should: "The change shows on the public Journal." },
      { id: "8.2", action: "Open Admin FAQ and add a question.", should: "It appears on the public FAQ in the right group." },
      { id: "8.3", action: "Open Admin Partners and change a perk.", should: "The public Partners page shows it." },
    ]
  },
  {
    id: "09",
    title: "The awkward cases",
    desc: "Where software usually breaks.",
    items: [
      { id: "9.1", action: "Submit the membership form with a required field empty.", should: "It tells you which field, and keeps everything you already typed." },
      { id: "9.2", action: "Apply twice with the same email.", should: "It does not create two identical applications without a word about it." },
      { id: "9.3", action: "Reload every admin page once with data in it.", should: "Everything you did is still there — nothing lives only in memory." },
      { id: "9.4", action: "Open the same page in two tabs, change something in one, reload the other.", should: "The second tab shows the change." },
      { id: "9.5", action: "Walk the whole admin at phone width.", should: "Tables become readable stacks, no horizontal scrolling of the page." },
      { id: "9.6", action: "Tab through a form with the keyboard only.", should: "Every field and button is reachable, with a visible wine focus ring." },
      { id: "9.7", action: "Open the ten email previews.", should: "Each has a subject, the right tone, and no placeholder text left in it." },
    ]
  }
];

export default function UATPage() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [hideChecked, setHideChecked] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem("mothers_uat_checks");
    if (saved) {
      try {
        setCheckedItems(JSON.parse(saved));
      } catch (e) {}
    }
    const savedNotes = localStorage.getItem("mothers_uat_notes");
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {}
    }
  }, []);

  const totalItems = SECTIONS.reduce((acc, s) => acc + s.items.length, 0);
  const checkedCount = Object.keys(checkedItems).filter(k => checkedItems[k]).length;

  const handleToggle = (id: string) => {
    const next = { ...checkedItems, [id]: !checkedItems[id] };
    setCheckedItems(next);
    localStorage.setItem("mothers_uat_checks", JSON.stringify(next));
  };

  const handleNote = (sectionId: string, val: string) => {
    const next = { ...notes, [sectionId]: val };
    setNotes(next);
    localStorage.setItem("mothers_uat_notes", JSON.stringify(next));
  };

  const handleStartAgain = () => {
    if (!confirm("Clear all checks and notes?")) return;
    setCheckedItems({});
    setNotes({});
    localStorage.removeItem("mothers_uat_checks");
    localStorage.removeItem("mothers_uat_notes");
  };

  if (!isClient) return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", WebkitFontSmoothing: "antialiased" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "clamp(40px, 6vw, 80px) clamp(20px, 4vw, 40px)" }}>
        
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: WINE, marginBottom: "16px" }}>
          USER ACCEPTANCE TESTING
        </div>
        
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(34px, 4.5vw, 48px)", lineHeight: 1.1, margin: "0 0 20px" }}>
          Everything to check before you<br/>call it done
        </h1>
        
        <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57,41,42,0.8)", margin: "0 0 12px", maxWidth: "70ch" }}>
          Work top to bottom in one sitting. Each line is one action and the one thing that should happen. Tick it if it does; if it does not, write what you saw in the box at the end of that section and send me the section number.
        </p>
        <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(57,41,42,0.8)", margin: "0 0 40px", maxWidth: "70ch" }}>
          Your ticks are saved in this browser, so you can stop and come back. Open every page in a new tab so you keep this list.
        </p>

        {/* Progress Bar */}
        <div style={{ background: "#fff", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px", marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px", flex: "1 1 auto" }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "28px", lineHeight: 1, marginBottom: "6px" }}>
                {checkedCount} of {totalItems} checked
              </div>
              <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.6)" }}>
                {totalItems - checkedCount} left · saved in this browser
              </div>
            </div>
            <div style={{ flex: 1, minWidth: "120px", maxWidth: "400px", height: "4px", background: "rgba(57,41,42,0.1)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${(checkedCount / totalItems) * 100}%`, height: "100%", background: WINE, transition: "width 0.3s ease" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={() => setHideChecked(!hideChecked)} style={{ border: "1px solid rgba(57,41,42,0.25)", background: "transparent", borderRadius: "4px", padding: "8px 14px", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", cursor: "pointer", color: "#39292a" }}>
              {hideChecked ? "Show checked" : "Hide checked"}
            </button>
            <button onClick={handleStartAgain} style={{ border: "1px solid rgba(57,41,42,0.25)", background: "transparent", borderRadius: "4px", padding: "8px 14px", fontFamily: "'Lora', Georgia, serif", fontSize: "13px", cursor: "pointer", color: "#39292a" }}>
              Start again
            </button>
          </div>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "40px" }}>
          {SECTIONS.map((section) => {
            const sectionChecks = section.items.filter(i => checkedItems[i.id]).length;
            const sectionTotal = section.items.length;
            const allChecked = sectionChecks === sectionTotal;
            
            if (hideChecked && allChecked && !notes[section.id]) return null;

            return (
              <div key={section.id} style={{ background: "#fff", border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", padding: "32px 32px 24px" }}>
                
                <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "8px" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "14px", color: "rgba(57,41,42,0.5)" }}>{section.id}</div>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "28px", margin: 0 }}>{section.title}</h2>
                  <div style={{ border: "1px solid rgba(57,41,42,0.2)", borderRadius: "4px", padding: "2px 6px", fontSize: "11px", color: "rgba(57,41,42,0.5)", fontFamily: "sans-serif" }}>
                    {sectionChecks} of {sectionTotal}
                  </div>
                </div>
                <p style={{ fontSize: "14px", color: "rgba(57,41,42,0.65)", margin: "0 0 32px" }}>{section.desc}</p>
                
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {section.items.map((item) => {
                    const checked = !!checkedItems[item.id];
                    if (hideChecked && checked) return null;
                    
                    return (
                      <label key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "16px", padding: "16px 0", borderBottom: "1px solid rgba(57,41,42,0.08)", cursor: "pointer", opacity: checked ? 0.5 : 1, transition: "opacity 0.2s" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "50px", marginTop: "2px" }}>
                          <input 
                            type="checkbox" 
                            checked={checked} 
                            onChange={() => handleToggle(item.id)}
                            style={{ width: "18px", height: "18px", accentColor: WINE, cursor: "pointer" }}
                          />
                          <span style={{ fontSize: "11px", fontFamily: "sans-serif", color: "rgba(57,41,42,0.4)" }}>{item.id}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "14px", color: "#39292a", marginBottom: "4px" }}>{item.action}</div>
                          <div style={{ fontSize: "13px", color: "rgba(57,41,42,0.55)" }}>Should: {item.should}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div style={{ marginTop: "24px" }}>
                  <textarea 
                    placeholder="Anything that did not behave — what you did, what you saw"
                    value={notes[section.id] || ""}
                    onChange={(e) => handleNote(section.id, e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.2)", borderRadius: "4px", padding: "14px", fontFamily: "'Lora', Georgia, serif", fontSize: "14px", color: "#39292a", background: "#fff", resize: "vertical", minHeight: "80px" }}
                  />
                </div>

              </div>
            );
          })}
        </div>

        {/* Known and Intentional */}
        <div style={{ border: "1px dashed rgba(123,31,44,0.4)", borderRadius: "8px", background: "rgba(123,31,44,0.03)", padding: "24px 32px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: WINE, marginBottom: "16px" }}>
            KNOWN AND INTENTIONAL
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", fontSize: "14px", lineHeight: 1.6, color: "rgba(57,41,42,0.8)" }}>
            <p style={{ margin: 0 }}>The demo data is always on — there is no switch to hide the seeded people and events yet, only “Clear the test data” on the dashboard.</p>
            <p style={{ margin: 0 }}>The activity statement shows one fixed member whichever record you open it from.</p>
            <p style={{ margin: 0 }}>The <em>admin/</em> folder holds older copies of five admin pages. Test the ones at the top level; say the word and I will delete the duplicates.</p>
            <p style={{ margin: 0 }}>Emails are static previews — nothing is actually sent.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
