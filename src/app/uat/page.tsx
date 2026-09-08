"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const WINE = '#7b1f2c', GREEN = '#3f6604', GREY = 'rgba(57,41,42,0.45)';
const KEY = 'tm_uat_state_v2';

interface ChecklistItem {
  sub?: string;
  ref: string;
  do: string;
  expect: string;
}

interface ChecklistSection {
  num: string;
  title: string;
  blurb: string;
  items: ChecklistItem[];
}

const RAW_SECTIONS: [string, string, string, [string, string, string, string][]][] = [
  [
    "00",
    "Before you start",
    "Five things to settle before the first click, so you are not guessing later.",
    [
      ["", "0.1", "Open the test link and look at the address bar.", "https with a padlock, no browser warning, and no password prompt you were not given."],
      ["", "0.2", "Open the browser console and leave it open for the whole run.", "No red errors on any page in this list."],
      ["", "0.3", "Ask the dev whether this environment actually sends email.", "A written answer — a mail catcher, or real mail to your inbox. Section 07 depends on knowing."],
      ["", "0.4", "Ask how the test data is reset, and by whom.", "Either a reset control in the admin, or a named person who does it."],
      ["", "0.5", "Reset the data, then reload the admin dashboard.", "Applications, events and money all fall back to empty states with a sentence — not blank panels or spinners."]
    ]
  ],
  [
    "01",
    "Everywhere — carry these with you",
    "Do not run this section on its own. Each time you land on a new page, glance at these seven.",
    [
      ["", "1.1", "Switch the language to Spanish, then back to English.", "Every visible string changes both ways — no English left in the Spanish view, no Spanish in the English one."],
      ["", "1.2", "Click through to another page, then reload.", "The language you chose survives both. It does not snap back to English."],
      ["", "1.3", "Look at the type.", "Cormorant Garamond headings over Lora body. No fallback serif, no flash of the wrong font."],
      ["", "1.4", "Scroll down a long page.", "The header stays put with the page passing underneath it — nothing showing through, no jump when it sticks."],
      ["", "1.5", "Drag the window from 1920px down to 320px.", "Nothing overlaps, nothing is cut off, and the page never scrolls sideways."],
      ["", "1.6", "Tab through the page with the keyboard only.", "Every field and button reachable, in a sane order, with a visible wine focus ring — never the browser default blue, never nothing."],
      ["", "1.7", "Read the browser tab and check the images.", "The tab names the page, not React App. Every image loads, none stretched out of proportion."]
    ]
  ],
  [
    "02",
    "The public site, as a stranger",
    "What someone sees before she is a member. Every public page, every state of every card.",
    [
      ["Home", "2.1", "Read from the top to the footer.", "The whole page renders in order, no section half-built, every footer link opening a real page."],
      ["", "2.2", "Compare the events shown on Home against the Events page.", "The same events, dates and times — not a separate hardcoded list."],
      ["", "2.3", "Click every call to action.", "Join goes to Membership, events go to Events."],
      ["Membership", "2.4", "Read the price block, and the sentences around it.", "Joining fee, monthly and quarterly rates all match Admin Settings — inside the prose too, not just the big numbers."],
      ["", "2.5", "Read what the page says about the joining fee.", "€39/month and €99/quarter, plus the first-50 no-joining-fee offer stated — without a live counter."],
      ["", "2.6", "Read the credit explanation.", "The monthly grant and the credit life in months match Settings."],
      ["", "2.7", "Read what happens if she cancels, and when she is charged.", "Stated plainly, and the same as what Legal says."],
      ["Events", "2.8", "Open Events as a non-member and try to book.", "You can see the events; you cannot book. Every button either invites you to join or explains a pass — never a silent failure."],
      ["", "2.9", "Use each filter in turn: category, stage, language, kids.", "Each returns only its own events, the count updates, and the empty case says something rather than showing nothing."],
      ["", "2.10", "Combine two filters, then clear them.", "The combination narrows correctly, and clearing brings every event back."],
      ["", "2.11", "Read every card on the page.", "Date, 24-hour time, neighbourhood, credit cost and a state — with places remaining where the event is capped."],
      ["", "2.12", "Find an uncapped event.", "It says unlimited places, not a blank and not a zero."],
      ["", "2.13", "Read a free event card and a Signature moment card.", "The free one shows no credit cost; neither offers a guest pass."],
      ["", "2.14", "Read the guest pass price everywhere it appears — card, event page, checkout, prose.", "The same figure, and it is the one in Admin Settings."],
      ["Event page", "2.15", "Open one event.", "Title, date, 24-hour time, meeting point, neighbourhood, what to bring and the credit cost."],
      ["", "2.16", "Open an event that is not yet confirmed.", "The words TO BE CONFIRMED facing the public, with its minimum — never filling."],
      ["", "2.17", "Open a confirmed event, a full one, a cancelled one and a past one.", "Four visibly different states, each explaining what you can do now. The past one offers no booking."],
      ["", "2.18", "Check the event page against its admin record, field by field.", "Every field identical — title, time, meeting point, cost, places."],
      ["The quieter pages", "2.19", "Open Journal — the index and one post.", "Posts in date order, images loading, the body readable at a comfortable measure."],
      ["", "2.20", "Open FAQ and expand several questions.", "Groups in a deliberate order; every answer opens and closes."],
      ["", "2.21", "Open Partners.", "Each partner has a perk and how to claim it."],
      ["", "2.22", "Open Legal and read the fees clause.", "Every euro figure in the prose matches Admin Settings. Change a fee in Settings, reload, and the sentence follows."],
      ["", "2.23", "Read the rest of Legal.", "Cancellation, refunds, data and contact all present, with a last-updated date that is not years old."]
    ]
  ],
  [
    "03",
    "Applying for membership",
    "The join flow end to end, and where it lands in the admin.",
    [
      ["", "3.1", "Submit a complete application with your own name, email and a neighbourhood.", "A confirmation naming the 72-hour promise."],
      ["", "3.2", "Check the address you used.", "The Application Received email, in the language you applied in, with your name in it."],
      ["", "3.3", "Open Admin Applications.", "Your application at the top with everything you typed — accents and n-tilde intact — and a live countdown against the 72 hours."],
      ["", "3.4", "Accept it.", "She becomes a member, the joining fee appears in Finance, and the audit log says who accepted and when in a human sentence."],
      ["", "3.5", "Find her in Admin Members.", "She is in the directory with her real details, joined today."],
      ["", "3.6", "Check her inbox.", "The Accepted email, with a way to set a password or pay."],
      ["", "3.7", "Submit a second application and decline it, with a reason.", "It leaves the waiting list, the reason is recorded, and the Not Accepted email is kind and final."],
      ["", "3.8", "Apply twice with the same email.", "The second is refused or flagged — never two identical rows in the admin."],
      ["", "3.9", "Submit with a required field empty.", "It names the field and keeps everything else you typed."],
      ["", "3.10", "Submit with a malformed email — belen@, belen, one with spaces.", "Refused with a plain-language reason."],
      ["", "3.11", "Leave the form half-filled for twenty minutes, then submit.", "It either still works or tells you to start again. It does not fail silently."],
      ["", "3.12", "Watch one application pass the 72-hour mark without a decision.", "It is flagged as overdue on the dashboard, not quietly forgotten."]
    ]
  ],
  [
    "04",
    "Payment and the first charge",
    "Where money changes hands. Read every figure twice.",
    [
      ["", "4.1", "Arrive at payment from the acceptance email.", "It knows who you are — her name and rate already chosen, nothing to re-enter."],
      ["", "4.2", "Read every figure on the page.", "The rate, the joining fee and the total all match Admin Settings and each other, and the total is actually the sum."],
      ["", "4.3", "Switch between monthly and quarterly.", "Both prices come from Settings, and the saving, if stated, is arithmetically true."],
      ["", "4.4", "Read the joining fee line as one of the first fifty, and again as member fifty-one.", "Zero for the first, €19 for the second, and the total moves with it."],
      ["", "4.5", "Pay with the dev test card.", "A success screen, and a receipt or confirmation email."],
      ["", "4.6", "Open Admin Finance.", "The joining fee and the first period both recorded, dated today, attributed to her."],
      ["", "4.7", "Pay with a declining test card.", "A clear failure saying what to try, her details kept, and she is not marked paid in the admin."],
      ["", "4.8", "Submit the card form with a field missing.", "Field-level errors, and no charge attempted."],
      ["", "4.9", "Double-click the pay button, then check Finance.", "One charge."],
      ["", "4.10", "Check whether the joining fee was waived where it should be.", "Waived if she took an Event Pass in the last 30 days, charged otherwise — and the page says which."],
      ["", "4.11", "Ask the dev in writing where card data goes.", "A written statement that card numbers never touch their server. If they cannot give it, stop and escalate."]
    ]
  ],
  [
    "05",
    "Booking, as a member",
    "The part the members actually use, including every way it should refuse.",
    [
      ["Booking a place", "5.1", "Log in as a member with credits.", "Her account shows her real balance, not a demo number."],
      ["", "5.2", "Book a place on a confirmed event.", "A confirmation, and the credit cost taken from her balance immediately."],
      ["", "5.3", "Open her Account, then her Activity Statement.", "The booking listed with the event real title and time, and the credit spend as a row dated today at the right cost."],
      ["", "5.4", "Read the Booking Confirmed email.", "Event, date, 24-hour time and meeting point, all matching the event page."],
      ["", "5.5", "Open her Ticket.", "The real event title, date, time and meeting point — not a demo booking — and the name it is booked under."],
      ["", "5.6", "Book a place on an event still gathering.", "It says the credits are held, not spent, until the event is confirmed."],
      ["", "5.7", "Open Admin Roster for that event.", "She is on the list, and the booked count went up by one."],
      ["Where it must refuse", "5.8", "Try to book the same event twice.", "Refused, with no second credit taken."],
      ["", "5.9", "Book an event costing more credits than she holds.", "Refused before any charge, with what she would need."],
      ["", "5.10", "Book onto a full event.", "The waitlist, with her position stated."],
      ["", "5.11", "Have someone release a place on that event.", "The waitlist moves and she is told. The roster shows the place as released, not deleted."],
      ["", "5.12", "Try to book an event that has already happened.", "Refused."],
      ["Cancelling", "5.13", "Cancel a booking inside the free window.", "The credits return, the balance updates, and the admin roster drops her."],
      ["", "5.14", "Cancel outside the free window.", "The rule is stated before she confirms, and applied exactly as stated."],
      ["Guest passes", "5.15", "Buy a guest pass inside the window, T-14 to T-2.", "Allowed, at the Settings price, taking one of the event guest places."],
      ["", "5.16", "Try a guest pass outside that window.", "Refused, with the window stated in days."],
      ["", "5.17", "Try more guest passes than the per-person limit.", "Refused at the limit from Settings."],
      ["", "5.18", "Buy guest passes until the event guest places run out.", "The last one is refused, and the card stops offering passes."],
      ["", "5.19", "Try a guest pass on a free event, a Signature moment, an uncapped event, and one above the credit ceiling.", "All four refuse, each with its own reason."],
      ["", "5.20", "Read the Guest Place Booked email.", "It goes to the right person, names the guest, and states the meeting point."],
      ["Credits", "5.21", "Check the balance maths on her statement.", "Opening balance, grants, spends, refunds and expiries reconcile to the number shown. Nothing negative."],
      ["", "5.22", "Check the expiry order.", "Oldest credits spend first, and expired ones show as their own absorbed row."],
      ["", "5.23", "Buy a credit top-up.", "The per-credit price from Settings, the credits arrive, and the expiry is set by the Settings credit life."],
      ["", "5.24", "Read the Godmother panel.", "The on-join bonus and the milestone bonus both match Settings, and the referral code is hers."],
      ["", "5.25", "Use her referral code as a new applicant.", "The referral is attributed to her, and the on-join bonus lands when the friend is accepted."]
    ]
  ],
  [
    "06",
    "The admin platform",
    "Every page the team will live in, and every action on each. Settings is the one that matters most.",
    [
      ["Dashboard", "6.1", "Open it cold.", "Today date, no blank panels, no placeholder text."],
      ["", "6.2", "Read the queues — applications nearing 72 hours, events at T-10 and T-7, anything overdue.", "Each count matches the list behind it."],
      ["", "6.3", "Click into each queue.", "It lands on the right filtered page, not a general list."],
      ["", "6.4", "Read the audit log.", "Human sentences — who, what, and the before and after values. No raw codes, no IDs."],
      ["Members", "6.5", "Filter by each state: needs a word, paused, past due.", "The pill count matches the rows shown."],
      ["", "6.6", "Search by name and by email, including an accented name.", "Both find her; nonsense returns a quiet empty line, not a broken table."],
      ["", "6.7", "Open three different member records.", "Each is her own — her details, credits, bookings, payments and notes, matching her own Account page exactly."],
      ["", "6.8", "Pause her membership, then resume it.", "Each saves, survives a reload, explains what happens to her bookings and credits, and lands in the audit log with both values."],
      ["", "6.9", "End a membership.", "It explains the consequence, asks for a reason, and she leaves the active directory without her history being erased."],
      ["", "6.10", "Adjust her credits by hand, with a reason.", "The balance moves, the reason is stored, and her Activity Statement shows the adjustment."],
      ["", "6.11", "Add a note, and write to her.", "The note saves with author and timestamp; the draft opens addressed to her by first name and closes without sending."],
      ["", "6.12", "Click Export CSV.", "A file with the currently filtered rows, accents intact, opening cleanly in a spreadsheet."],
      ["Events", "6.13", "Read the calendar.", "Every event with its date, 24-hour time, booked count against the minimum, and a state."],
      ["", "6.14", "Create an event using every field.", "The ten Barcelona districts offered, and nothing required accepted as blank."],
      ["", "6.15", "Save it, then open the public Events page.", "It is there, in the right category, with the same time, place and credit cost."],
      ["", "6.16", "Create one with member places left empty.", "It publishes as uncapped, and the form warned you that uncapped sells no guest passes."],
      ["", "6.17", "Create one costing more than the credit ceiling.", "The form says it will sell no guest passes, and the saved event does not."],
      ["", "6.18", "Create a free event, and a Signature moment.", "Both save with zero guest places, without you having to remember."],
      ["", "6.19", "Create one with a minimum higher than its places.", "Refused or flagged — it could never confirm otherwise."],
      ["", "6.20", "Create one with a date in the past.", "Refused or flagged."],
      ["", "6.21", "Confirm an event that has met its minimum.", "The state changes publicly, and everyone booked is emailed."],
      ["", "6.22", "Try to confirm one that has not met its minimum.", "It warns you, and if it lets you, it says so plainly in the audit log."],
      ["", "6.23", "Cancel an event that has bookings.", "Credits return to every member, guests are refunded, both cancellation emails go out, and Finance records the refunds."],
      ["", "6.24", "Edit a confirmed event time or meeting point.", "The public page and the tickets both update, and everyone booked is told."],
      ["", "6.25", "Check the count shown against the minimum to run.", "It counts members and guest passes together, and the field says so."],
      ["", "6.26", "Open the Roster for an event with bookings, and print it.", "Names, guests, waitlist, released places and the meeting point — on one page."],
      ["Finance", "6.27", "Read the totals.", "Joining fees, subscriptions, pass sales and refunds, each reconciling to the transactions listed."],
      ["", "6.28", "Cross-check one member payments against her record.", "Identical."],
      ["", "6.29", "Open every name in the needing-attention list.", "Each opens her own record."],
      ["", "6.30", "Change the date range.", "The totals change with it, and the range is stated."],
      ["", "6.31", "Export.", "A file matching what is on screen."],
      ["Settings — the important one", "6.32", "Read every field.", "Each holds a real saved value, not a greyed-out example."],
      ["", "6.33", "Change the joining fee, save, reload.", "It persists, and Membership, Payment and Legal all quote the new figure — inside sentences too."],
      ["", "6.34", "Change the guest pass price.", "Events, the event page, checkout and the Ticket all follow."],
      ["", "6.35", "Change the monthly credit grant.", "Activity Statement and the member record credit rows follow."],
      ["", "6.36", "Change the credit life in months.", "Newly granted or purchased credits expire on the new schedule."],
      ["", "6.37", "Change the Godmother bonuses.", "The account panel and Activity Statement both follow."],
      ["", "6.38", "Change the credit ceiling, the guest window, guest places per event, and passes per person.", "The booking rules on the public site change accordingly. This is the whole point of the page."],
      ["", "6.39", "Set the four membership rates.", "Payment offers exactly those four and no others."],
      ["", "6.40", "Set the joining-fee-free places, then fill them.", "Member 50 is charged no joining fee and member 51 is charged €19 — with no public counter on the site."],
      ["", "6.41", "Enter something invalid — a negative fee, a word, a blank.", "Refused with a reason, and the old value survives."],
      ["", "6.42", "Change one setting and read the audit log.", "The change recorded as a sentence with before and after values."],
      ["CMS", "6.43", "In Admin Journal, add a post, edit it, unpublish it.", "All three reflected on the public Journal."],
      ["", "6.44", "In Admin FAQ, add a question in a group, reorder, delete.", "The public FAQ follows, in the right group and order."],
      ["", "6.45", "In Admin Partners, change a perk, and add a partner.", "The public Partners page shows both."],
      ["", "6.46", "Enter Spanish and English for one CMS item.", "Each language shows its own text, and neither falls back to the wrong one."],
      ["", "6.47", "Paste text with an apostrophe, an accent and an em dash.", "It renders as typed — no escaped entities, no mojibake."],
      ["", "6.48", "Save a CMS item with a required field empty.", "Refused, and nothing half-saved appears on the public page."]
    ]
  ],
  [
    "07",
    "The ten emails",
    "Trigger each one and read it in a real inbox — Gmail on desktop and Mail on iPhone at minimum. Then run the eight checks below on every one of them.",
    [
      ["Trigger each", "7.1", "Application Received.", "Arrives on submitting the membership form."],
      ["", "7.2", "Accepted.", "Arrives on accepting an application."],
      ["", "7.3", "Application Not Accepted.", "Arrives on declining one."],
      ["", "7.4", "Password Reset.", "Arrives on asking to reset, and the link works once and then expires."],
      ["", "7.5", "Booking Confirmed.", "Arrives on booking a place."],
      ["", "7.6", "Guest Place Booked.", "Arrives on buying a guest pass."],
      ["", "7.7", "Window Is Open.", "Arrives when the guest window opens at T-14."],
      ["", "7.8", "Event Cancelled, member version.", "Arrives on cancelling an event, to everyone booked."],
      ["", "7.9", "Event Cancelled, guest version.", "Arrives to the guest, worded for someone who is not a member."],
      ["", "7.10", "After Your Event.", "Arrives after the event has passed."],
      ["On every one of the ten", "7.11", "Check it arrives within a minute, and not in spam.", "In the inbox, promptly."],
      ["", "7.12", "Check the from-name and reply-to, and send a reply.", "Both are ours, and the reply reaches a real inbox."],
      ["", "7.13", "Read the subject line.", "The one that was written, with no placeholder braces left in it."],
      ["", "7.14", "Check the names, dates, times, amounts and meeting points.", "All real. No test data, no blanks."],
      ["", "7.15", "Check the language.", "It arrives in the recipient own language."],
      ["", "7.16", "Click every link.", "All work, and all go to the live site — never localhost."],
      ["", "7.17", "Read it on a phone, and again with images blocked.", "Legible and complete both ways."],
      ["", "7.18", "Check the times and the money.", "24-hour times, and amounts matching Admin Settings."]
    ]
  ],
  [
    "08",
    "The awkward cases",
    "Where software usually breaks, and where it must refuse.",
    [
      ["State and navigation", "8.1", "Reload every page mid-flow.", "No crash, and nothing lost without warning."],
      ["", "8.2", "Use the back button through the booking flow.", "No double booking, no stale price."],
      ["", "8.3", "Open the same event in two tabs and book in both.", "One booking, one charge."],
      ["", "8.4", "Change something in the admin in one tab and reload the other.", "The second tab shows the change."],
      ["", "8.5", "Type a URL for a member, event or post that does not exist.", "A real not-found page with a way back — not a crash, not a blank screen."],
      ["Access", "8.6", "Open a member-only page while logged out.", "Sent to log in, then returned to where you were going."],
      ["", "8.7", "Open an admin URL as a member, and again logged out.", "Refused. Not merely hidden — refused."],
      ["", "8.8", "Open another member record by editing the ID in the URL, as a member.", "Refused."],
      ["", "8.9", "Log out, then press back.", "You are out, and the page does not show her data from cache."],
      ["Input", "8.10", "Paste a very long name, and a very long note.", "Stored, or truncated with a limit stated. Never a broken layout."],
      ["", "8.11", "Paste a script tag into a free-text field.", "It appears as literal text and executes nowhere."],
      ["", "8.12", "Enter a negative number, a decimal and a word in every numeric field.", "Refused with a reason, in every one."],
      ["Conditions", "8.13", "Throttle to slow 3G and load Events.", "A loading state, then the page. No permanent spinner."],
      ["", "8.14", "Go offline and try to book.", "A plain message, and no phantom booking when you come back."],
      ["", "8.15", "Set the device clock forward a day and reload the events list.", "Past events move to past, and windows open and close correctly."],
      ["", "8.16", "Test the guest window at exactly T-14 and exactly T-2.", "The boundaries behave as written, not one day off."],
      ["", "8.17", "Zoom the browser to 200 per cent.", "Everything still usable, nothing clipped."],
      ["", "8.18", "Walk the whole admin at phone width.", "Tables become readable stacks, and the page never scrolls sideways."]
    ]
  ],
  [
    "09",
    "The rule book, one rule at a time",
    "The rules the whole thing stands on. Do not infer these from the pages you have already tested — check each one on purpose, because this is the section that catches a dev who guessed.",
    [
      ["Membership", "9.1", "There is one membership rate: €39 a month, or €99 every three months.", "No second tier and no launch rate anywhere — site, admin or emails."],
      ["", "9.2", "The first 50 accepted members are charged no joining fee.", "Member 50 pays nothing, member 51 pays €19. The count is admin-only — no public gauge."],
      ["", "9.3", "The joining fee is €19, once, charged with the first payment — and waived entirely if an Event Pass was taken in the last 30 days.", "Waived at 30 days, charged at 31. Never charged twice, never on renewal."],
      ["", "9.4", "The joining-fee-free places come from Settings.", "Change the number and the cut-off moves with it."],
      ["", "9.5", "Every application is answered within 72 hours.", "The countdown is real, and overdue ones are flagged."],
      ["", "9.6", "One application per email address.", "The second is refused or flagged."],
      ["Credits", "9.7", "The monthly grant is deposited on each successful renewal.", "On success only — never on a failed payment."],
      ["", "9.8", "Credits live for the number of months in Settings, from the day each one arrives.", "Each batch expires on its own date, not all together."],
      ["", "9.9", "Oldest credits are always spent first.", "Check a spend against a member holding two batches."],
      ["", "9.10", "A balance can never go below zero.", "No page anywhere shows a negative balance."],
      ["", "9.11", "Bought credits behave like any other.", "Same expiry rule, same spend order."],
      ["", "9.12", "Credits are held, not spent, until an event is confirmed.", "Her spendable balance reflects the hold, and a cancellation releases it."],
      ["", "9.13", "The Godmother bonus is the on-join figure, then the milestone figure at three months.", "Both from Settings, both landing at the right moment."],
      ["Events", "9.14", "Every time on every page and every email is 24-hour.", "No am, no pm, anywhere."],
      ["", "9.15", "TO BE CONFIRMED is the phrase facing the public; filling is internal only.", "The public phrase never appears in the admin sense, and the internal word never reaches a member."],
      ["", "9.16", "The minimum to run counts members and guest passes together.", "And the field says so."],
      ["", "9.17", "An uncapped event sells no guest passes.", "And the form said so when you created it."],
      ["", "9.18", "An event costing more than the credit ceiling sells no guest passes.", "Test at the ceiling and one above it."],
      ["", "9.19", "Free events and Signature moments sell no guest passes.", "Both, without the admin having to remember."],
      ["", "9.20", "Guest passes are on sale only from T-14 to T-2.", "Both boundaries exact."],
      ["", "9.21", "Guest places per event and passes per person come from Settings.", "Change each and watch the site follow."],
      ["", "9.22", "Cancelling an event returns credits to every member and refunds every guest.", "All of them, and recorded in Finance."],
      ["", "9.23", "A released place shows as released, not deleted.", "And it goes back into the event."],
      ["", "9.24", "Neighbourhoods are the ten Barcelona districts.", "No free text, no eleventh option."],
      ["Money and data", "9.25", "Every euro figure on the site comes from Admin Settings.", "Change each one and find it everywhere. None typed into a page."],
      ["", "9.26", "Card numbers never touch our server.", "In writing from the dev."],
      ["", "9.27", "Every admin action that changes a value is in the audit log.", "With who, what, and before and after."],
      ["", "9.28", "Both languages are complete everywhere.", "No English in the Spanish site, no Spanish in the English one, emails included."]
    ]
  ],
  [
    "10",
    "Sign-off",
    "The defined end. Do not sign until every line here is true.",
    [
      ["", "10.1", "Confirm every section above is ticked, or its exceptions written in the notes.", "No silent gaps."],
      ["", "10.2", "Confirm no red console errors anywhere in the run.", "A clean console."],
      ["", "10.3", "Confirm sections 02 to 06 were run on a real phone, not a narrowed window.", "Both done."],
      ["", "10.4", "Confirm section 09 was run on purpose, rule by rule.", "Not inferred from the earlier sections."],
      ["", "10.5", "Confirm all ten emails were received and read on a phone.", "All ten."],
      ["", "10.6", "Get the dev written confirmation on two points.", "Card data never touches their server, and admin routes are refused to non-admins."],
      ["", "10.7", "Agree the defect list with the dev, each item marked must-fix or later.", "One list, both agreed."]
    ]
  ]
];

const SECTIONS: ChecklistSection[] = RAW_SECTIONS.map((s) => ({
  num: s[0],
  title: s[1],
  blurb: s[2],
  items: s[3].map((i) => ({
    sub: i[0],
    ref: i[1],
    do: i[2],
    expect: i[3]
  }))
}));

export default function UATPage() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [hideDone, setHideDone] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setChecks(saved.checks || {});
        setNotes(saved.notes || {});
      }
    } catch (e) {}
  }, []);

  const persist = (nextChecks: Record<string, boolean>, nextNotes: Record<string, string>) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ checks: nextChecks, notes: nextNotes }));
    } catch (e) {}
  };

  const handleToggle = (ref: string) => {
    const nextChecks = { ...checks, [ref]: !checks[ref] };
    setChecks(nextChecks);
    persist(nextChecks, notes);
  };

  const handleNote = (num: string, value: string) => {
    const nextNotes = { ...notes, [num]: value };
    setNotes(nextNotes);
    persist(checks, nextNotes);
  };

  const handleClear = () => {
    if (!confirm("Clear all checks and notes?")) return;
    setChecks({});
    setNotes({});
    setCleared(true);
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
    setTimeout(() => setCleared(false), 2200);
  };

  if (!isClient) return null;

  const totalItems = SECTIONS.reduce((t, s) => t + s.items.length, 0);
  const doneItems = SECTIONS.reduce((t, s) => t + s.items.filter((i) => checks[i.ref]).length, 0);
  const progressPct = Math.round((doneItems / totalItems) * 100);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8efe2", color: "#39292a", fontFamily: "'Lora', Georgia, serif", WebkitFontSmoothing: "antialiased" }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body { background: #fff !important; }
            .no-print { display: none !important; }
          }
        `
      }} />

      {/* Top Bar */}
      <div style={{ borderBottom: "1px solid rgba(57,41,42,0.16)" }} className="no-print">
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "14px clamp(18px,3vw,30px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <Image src="/assets/logo-mark-alpha.png" alt="The Mothers" width={56} height={56} style={{ height: "56px", width: "auto", display: "block" }} />
            <span aria-hidden="true" style={{ width: "1px", height: "26px", background: "rgba(57,41,42,0.28)", flex: "none" }} />
            <Image src="/assets/logo-wordmark-alpha.png" alt="The Mothers" width={110} height={14} style={{ height: "14px", width: "auto", display: "block" }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "22px", flexWrap: "wrap", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "14px" }}>
            <Link href="/events" style={{ color: "#39292a", textDecoration: "none" }}>Events</Link>
            <Link href="/membership" style={{ color: "#39292a", textDecoration: "none" }}>Membership</Link>
            <Link href="/admin" style={{ border: "1px solid #7b1f2c", color: "#7b1f2c", borderRadius: "4px", padding: "6px 14px", textDecoration: "none" }}>Admin</Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "clamp(26px,3.4vw,40px) clamp(18px,3vw,30px) 70px" }}>
        
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: WINE, marginBottom: "10px" }}>
          User acceptance testing
        </div>
        
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, fontSize: "clamp(30px,4.4vw,44px)", lineHeight: 1.1, margin: "0 0 12px", maxWidth: "26ch" }}>
          Everything to check before you call it done
        </h1>
        
        <p style={{ fontSize: "15px", lineHeight: 1.7, color: "rgba(57,41,42,0.75)", margin: "0 0 6px", maxWidth: "74ch", textWrap: "pretty" }}>
          Every function of the website and the admin, and every rule each one has to respect. Work top to bottom in one sitting per section, with the browser console open. Each line is one action and the one thing that should happen. Tick it only if what you see matches — not close enough.
        </p>
        <p style={{ fontSize: "14px", lineHeight: 1.7, color: "rgba(57,41,42,0.65)", margin: "0 0 6px", maxWidth: "74ch", textWrap: "pretty" }}>
          Anything that does not match goes in the box at the end of that section, with its number, so the dev can find it without a conversation. Section 01 is carried, not run: those seven are what you glance at each time you land on a new page. Sections 02 to 06 should be run on a real phone as well as a desktop. Section 09 is the rule book — run it on purpose, not by memory of the sections above.
        </p>
        <p style={{ fontSize: "14px", lineHeight: 1.7, color: "rgba(57,41,42,0.65)", margin: "0 0 24px", maxWidth: "74ch", textWrap: "pretty" }}>
          Your ticks and notes are saved in this browser, so you can stop and come back. Open every page in a new tab so you keep this list.
        </p>

        {/* Sticky Progress Bar */}
        <div style={{ border: "1px solid rgba(57,41,42,0.18)", borderRadius: "8px", background: "#fffdfa", padding: "18px 22px", marginBottom: "26px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "18px", flexWrap: "wrap", position: "sticky", top: 0, zIndex: 20, boxShadow: "0 4px 12px rgba(57,41,42,0.06)" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "26px", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {doneItems} of {totalItems} checked
            </div>
            <div style={{ fontSize: "12.5px", color: "rgba(57,41,42,0.62)", marginTop: "5px" }}>
              {doneItems === totalItems ? "Everything on this list behaves." : `${totalItems - doneItems} left · saved in this browser`}
            </div>
          </div>
          <div style={{ flex: "1 1 220px", minWidth: "160px", height: "6px", background: "rgba(57,41,42,0.12)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ height: "100%", background: WINE, width: `${progressPct}%`, transition: "width 0.2s ease" }}></div>
          </div>
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }} className="no-print">
            <button
              type="button"
              onClick={() => setHideDone(!hideDone)}
              style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              {hideDone ? "Show checked" : "Hide checked"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              style={{ border: "1px solid rgba(57,41,42,0.3)", background: "transparent", color: "#39292a", borderRadius: "4px", padding: "9px 15px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              {cleared ? "Cleared" : "Start again"}
            </button>
          </div>
        </div>

        {/* Section Cards */}
        {SECTIONS.map((s) => {
          const doneHere = s.items.filter((i) => checks[i.ref]).length;
          const isAllDone = doneHere === s.items.length;
          const badgeColor = isAllDone ? GREEN : doneHere > 0 ? WINE : GREY;

          let pendingSub: string | null = null;
          const renderedItems: Array<ChecklistItem & { showSub: boolean; subText: string }> = [];

          s.items.forEach((item) => {
            if (item.sub) pendingSub = item.sub;
            if (hideDone && checks[item.ref]) return;

            renderedItems.push({
              ...item,
              showSub: !!pendingSub,
              subText: pendingSub || ""
            });
            pendingSub = null;
          });

          return (
            <div key={s.num} style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "clamp(18px,2.4vw,24px)", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "6px", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.14em", color: "rgba(57,41,42,0.42)", fontVariantNumeric: "tabular-nums" }}>
                  {s.num}
                </span>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500, fontSize: "24px", lineHeight: 1.2, margin: 0 }}>
                  {s.title}
                </h2>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", color: badgeColor, border: `1px solid ${badgeColor}`, borderRadius: "4px", padding: "3px 9px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {doneHere} of {s.items.length}
                </span>
              </div>
              <p style={{ fontSize: "13.5px", lineHeight: 1.65, color: "rgba(57,41,42,0.7)", margin: "0 0 14px", maxWidth: "76ch", textWrap: "pretty" }}>
                {s.blurb}
              </p>

              {renderedItems.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {renderedItems.map((item) => (
                    <div key={item.ref}>
                      {item.showSub && (
                        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: WINE, padding: "18px 0 2px" }}>
                          {item.subText}
                        </div>
                      )}
                      <label style={{ display: "grid", gridTemplateColumns: "22px 46px 1fr", gap: "12px", padding: "12px 0", borderBottom: "1px solid rgba(57,41,42,0.1)", cursor: "pointer", alignItems: "start" }}>
                        <input
                          type="checkbox"
                          checked={!!checks[item.ref]}
                          onChange={() => handleToggle(item.ref)}
                          style={{ width: "17px", height: "17px", marginTop: "2px", accentColor: WINE }}
                        />
                        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.08em", color: "rgba(57,41,42,0.5)", fontVariantNumeric: "tabular-nums", paddingTop: "3px" }}>
                          {item.ref}
                        </span>
                        <span>
                          <span style={{ display: "block", fontSize: "14px", lineHeight: 1.6, color: checks[item.ref] ? "rgba(57,41,42,0.45)" : "#39292a" }}>
                            {item.do}
                          </span>
                          <span style={{ display: "block", fontSize: "13px", lineHeight: 1.6, color: "rgba(57,41,42,0.62)", marginTop: "3px" }}>
                            <em>Should:</em> {item.expect}
                          </span>
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {isAllDone && (
                <div style={{ fontSize: "13.5px", color: GREEN, padding: "4px 0" }}>
                  All checked.
                </div>
              )}

              <div style={{ marginTop: "14px" }} className="no-print">
                <textarea
                  rows={2}
                  value={notes[s.num] || ""}
                  onChange={(e) => handleNote(s.num, e.target.value)}
                  placeholder="Anything that did not behave — the number, what you did, what you saw"
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid rgba(57,41,42,0.22)", borderRadius: "4px", padding: "10px 12px", fontFamily: "'Lora', Georgia, serif", fontSize: "13.5px", lineHeight: 1.6, background: "#fff", resize: "vertical" }}
                />
              </div>
            </div>
          );
        })}

        {/* Footnote card */}
        <div style={{ border: "1px dashed rgba(57,41,42,0.3)", borderRadius: "8px", padding: "18px 22px", marginTop: "22px" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", color: WINE, marginBottom: "7px" }}>
            Testing notes
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px", fontSize: "13.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.75)" }}>
            <div>Every rule in Section 09 is enforced dynamically against the database and Admin Settings.</div>
            <div>All ten Brevo transactional emails can be triggered through the respective flows.</div>
            <div>Card checkout processes through Stripe with zero server card handling.</div>
          </div>
        </div>

      </div>
    </div>
  );
}
