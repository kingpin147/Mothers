"use client";

import React, { useState } from "react";
import Link from "next/link";

const WINE = "#7b1f2c";
const AMBER = "#a8752c";
const GREEN = "#3f6604";

// ─── EMAIL TEMPLATES ─────────────────────────────────────────────────────────

const BASE_WRAPPER = (body: string) => `
  <div style="font-family: 'Lora', Georgia, serif; color: #39292a; max-width: 600px; margin: 0 auto; padding: 32px; background: #fdf9f2; border: 1px solid rgba(57,41,42,0.16); border-radius: 8px; line-height: 1.65;">
    <div style="margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid rgba(57,41,42,0.12);">
      <span style="font-family: 'Cormorant Garamond', Georgia, serif; font-size: 20px; font-weight: 600; color: #7b1f2c; letter-spacing: 0.05em;">The Mothers</span>
    </div>
    ${body}
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(57,41,42,0.1); font-size: 12px; color: rgba(57,41,42,0.5);">
      The Mothers · Barcelona · hello@themothers.cc
    </div>
  </div>
`;

const CTA_BUTTON = (href: string, label: string) =>
  `<div style="text-align: center; margin: 28px 0;"><a href="${href}" style="background-color: #7b1f2c; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 16px; display: inline-block;">${label}</a></div>`;

const TEMPLATES = [
  {
    key: "application_received",
    tone: "Warm, acknowledgement — no promises made",
    subject: "We have your application — The Mothers",
    trigger: "Sent immediately when a member applies through the Apply form",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">We have your application, Sofia.</h2>
      <p style="font-size: 15px;">We read every application ourselves — this is not a queue managed by an algorithm. You will hear from us within 72 hours of this window closing.</p>
      <p style="font-size: 15px;">If you have any questions in the meantime, reply to this email and it will reach us directly.</p>
    `),
  },
  {
    key: "application_accepted",
    tone: "Celebratory but calm — clear urgency without pressure",
    subject: "Your place at The Mothers — complete your membership (72h)",
    trigger: "Sent when admin clicks 'Accept' on an application",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">Your application has been accepted, Sofia.</h2>
      <p style="font-size: 15px;">We would love to welcome you into The Mothers. Your founding rate of <strong>€29/month</strong> is held for you for the next 72 hours — completing membership locks it in for your first year.</p>
      ${CTA_BUTTON("https://themothers.cc/membership/activate/TOKEN", "Complete My Membership (72h)")}
      <p style="font-size: 13px; color: rgba(57,41,42,0.6);">This link expires in 72 hours. If uncompleted, the spot passes to the next person on the waitlist.</p>
    `),
  },
  {
    key: "application_not_accepted",
    tone: "Gracious, honest — no hollow consolations",
    subject: "Your application at The Mothers",
    trigger: "Sent when admin clicks 'Decline' on an application",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">Thank you, Sofia.</h2>
      <p style="font-size: 15px;">For this window, we have reached the membership limit we set to keep the circle the right size. Your application has been placed on our priority waitlist for the next opening.</p>
      <p style="font-size: 15px;">We will write to you as soon as a new window opens. You do not need to do anything.</p>
    `),
  },
  {
    key: "payment_reminder_48h",
    tone: "Gentle nudge — no scolding, just practical",
    subject: "Your place is still held — 48 hours remain",
    trigger: "Sent by the expire-offers cron 24 hours before a payment link expires",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">Your place is still waiting, Sofia.</h2>
      <p style="font-size: 15px;">A quick note — the link to complete your membership expires in <strong>48 hours</strong>. After that, the spot will be offered to the next person on the waitlist.</p>
      ${CTA_BUTTON("https://themothers.cc/membership/activate/TOKEN", "Complete My Membership")}
      <p style="font-size: 13px; color: rgba(57,41,42,0.6);">If you have changed your mind, no action is needed — the place will be automatically released.</p>
    `),
  },
  {
    key: "booking_confirmed",
    tone: "Practical and warm — every detail the member needs",
    subject: "You are in — Morning Yoga at Nàutic · Thu 12 Sep",
    trigger: "Sent when a member's booking is confirmed after Stripe payment",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">You are in.</h2>
      <div style="background: #fff; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px; padding: 20px 24px; margin: 20px 0;">
        <div style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 19px; margin-bottom: 6px;">Morning Yoga at Nàutic</div>
        <div style="font-size: 14px; color: rgba(57,41,42,0.7); line-height: 1.8;">
          Thursday 12 September · 10:00<br/>
          Nàutic Barcelona, Moll d'Espanya<br/>
          4 credits charged · 16 credits remaining
        </div>
      </div>
      <p style="font-size: 14px; color: rgba(57,41,42,0.7);">We'll remind you 3 days before and again the day before. If you can no longer make it, cancel from your account at least 24 hours ahead so your credits are returned.</p>
    `),
  },
  {
    key: "event_reminder_t3",
    tone: "Brief, helpful — 3 days out reminder",
    subject: "Reminder: Morning Yoga at Nàutic on Thursday",
    trigger: "Sent by the event-reminders cron 3 days before a confirmed event",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">Three days to go.</h2>
      <div style="background: #fff; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px; padding: 20px 24px; margin: 20px 0;">
        <div style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 19px; margin-bottom: 6px;">Morning Yoga at Nàutic</div>
        <div style="font-size: 14px; color: rgba(57,41,42,0.7); line-height: 1.8;">
          Thursday 12 September · 10:00<br/>
          Nàutic Barcelona, Moll d'Espanya
        </div>
      </div>
      <p style="font-size: 14px; color: rgba(57,41,42,0.7);">If you can no longer come, please cancel from your account before Wednesday 10:00 so your credits are returned and a place opens for someone else.</p>
    `),
  },
  {
    key: "event_reminder_t1",
    tone: "Very brief — day-before summary",
    subject: "Tomorrow: Morning Yoga at Nàutic · 10:00",
    trigger: "Sent by the event-reminders cron 1 day before a confirmed event",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">Tomorrow morning.</h2>
      <div style="background: #fff; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px; padding: 20px 24px; margin: 20px 0;">
        <div style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 19px; margin-bottom: 6px;">Morning Yoga at Nàutic</div>
        <div style="font-size: 14px; color: rgba(57,41,42,0.7); line-height: 1.8;">
          10:00 · Nàutic Barcelona, Moll d'Espanya<br/>
          Look for the group by the main entrance.
        </div>
      </div>
      <p style="font-size: 14px; color: rgba(57,41,42,0.7);">See you there.</p>
    `),
  },
  {
    key: "event_cancelled",
    tone: "Apologetic but clear — credits returned automatically",
    subject: "Morning Yoga on Thursday has been cancelled",
    trigger: "Sent to all booked members when an admin cancels a confirmed event",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">Morning Yoga on Thursday has been cancelled.</h2>
      <p style="font-size: 15px;">We are sorry for the inconvenience. The 4 credits you used to book have been returned to your account automatically — you will see them there now.</p>
      <p style="font-size: 15px;">We hope to run a similar event again soon. Thank you for understanding.</p>
    `),
  },
  {
    key: "password_reset",
    tone: "Secure, clear and functional",
    subject: "Reset your password — The Mothers",
    trigger: "Sent when member requests password reset",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">Reset your password</h2>
      <p style="font-size: 15px;">We received a request to reset your password for The Mothers. Click below to set a new password:</p>
      ${CTA_BUTTON("https://themothers.cc/account/reset-password?token=TOKEN", "Set New Password")}
      <p style="font-size: 13px; color: rgba(57,41,42,0.6);">This link works once and expires in 1 hour. If you did not ask for this, you can safely ignore this email.</p>
    `),
  },
  {
    key: "guest_place_booked",
    tone: "Welcoming and precise for non-members",
    subject: "Your guest pass — Morning Yoga at Nàutic · Thu 12 Sep",
    trigger: "Sent immediately upon purchasing an Event Pass",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">Your guest pass is confirmed, Sofia.</h2>
      <div style="background: #fff; border: 1px solid rgba(57,41,42,0.16); border-radius: 6px; padding: 20px 24px; margin: 20px 0;">
        <div style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; font-size: 19px; margin-bottom: 6px;">Morning Yoga at Nàutic</div>
        <div style="font-size: 14px; color: rgba(57,41,42,0.7); line-height: 1.8;">
          Thursday 12 September · 10:00<br/>
          Nàutic Barcelona, Moll d'Espanya · €35 Pass<br/>
          Meeting Point: Look for the group by the pergola on the north terrace.
        </div>
      </div>
      <p style="font-size: 14px; color: rgba(57,41,42,0.7);">If you join The Mothers within 30 days, your €19 joining fee is waived entirely.</p>
    `),
  },
  {
    key: "window_is_open",
    tone: "Announcing guest pass availability",
    subject: "Guest places are now open for Morning Yoga at Nàutic",
    trigger: "Sent at T-14 when guest bookings open for an event",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">Guest places are now open.</h2>
      <p style="font-size: 15px;">Guest passes for <strong>Morning Yoga at Nàutic</strong> are on sale from today until two days before the gathering (T-2).</p>
      ${CTA_BUTTON("https://themothers.cc/events/morning-yoga", "Book a Guest Pass (€35)")}
    `),
  },
  {
    key: "event_cancelled_guest",
    tone: "Empathetic, clear refund notice for guests",
    subject: "Morning Yoga at Nàutic has been cancelled — refund issued",
    trigger: "Sent to guest pass purchasers when an event is cancelled",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">Morning Yoga has been cancelled.</h2>
      <p style="font-size: 15px;">We are sorry to let you know that we've had to cancel Thursday's gathering.</p>
      <p style="font-size: 15px;">A full refund of <strong>€35</strong> has been automatically processed to your original payment card and will appear within 3–5 business days. Your pass allowance has also been restored.</p>
    `),
  },
  {
    key: "event_details_updated",
    tone: "Direct, courteous update on venue or time changes",
    subject: "Important update regarding Morning Yoga at Nàutic",
    trigger: "Sent when an admin updates the date, time, venue, or meeting point of a booked event",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">Update for Morning Yoga at Nàutic</h2>
      <p style="font-size: 15px;">We have updated the schedule or location details for this gathering:</p>
      <div style="background: #ffffff; padding: 16px; border-radius: 4px; border-left: 3px solid #7b1f2c; margin: 16px 0;">
        <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>New Date & Time:</strong> Thursday 12 September · 10:30</p>
        <p style="margin: 0 0 6px 0; font-size: 14px;"><strong>Venue:</strong> Nàutic Barcelona, Moll d'Espanya</p>
        <p style="margin: 0; font-size: 14px;"><strong>Meeting Point:</strong> Main Lobby Entrance</p>
      </div>
      <p style="font-size: 14px; line-height: 1.5; color: rgba(57,41,42,0.8);">If the new schedule no longer works for you, you can release your place anytime from your account without penalty, and all credits will be returned to your balance.</p>
    `),
  },
  {
    key: "after_your_event",
    tone: "Warm, brief — invites feedback without demanding it",
    subject: "How was Morning Yoga yesterday?",
    trigger: "Sent by the complete-events cron the day after a confirmed event ends",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">How was yesterday?</h2>
      <p style="font-size: 15px;">We hope Morning Yoga was everything you needed. If you have a minute, we would love to hear how it went — what worked, what did not, and what you would want more of.</p>
      <p style="font-size: 15px;">Reply to this email with anything on your mind. Every note reaches us and shapes what we plan next.</p>
    `),
  },
  {
    key: "payment_failed",
    tone: "Matter-of-fact, helpful — no blame",
    subject: "Payment could not be taken — action needed",
    trigger: "Sent via Stripe webhook when a subscription renewal charge fails",
    html: BASE_WRAPPER(`
      <h2 style="font-family: 'Cormorant Garamond', Georgia, serif; color: #7b1f2c; font-size: 26px; font-weight: 400; margin: 0 0 16px;">Your payment did not go through.</h2>
      <p style="font-size: 15px;">We tried to take your monthly membership payment of <strong>€29</strong> today, but it was declined. This does not affect your membership immediately — we will try again in two days.</p>
      <p style="font-size: 15px;">To avoid any interruption, please check that your card details are up to date in your account.</p>
      ${CTA_BUTTON("https://themothers.cc/account", "Update Payment Details")}
      <p style="font-size: 13px; color: rgba(57,41,42,0.6);">If you have any questions, reply to this email and we will sort it together.</p>
    `),
  },
];

export default function AdminEmailsPage() {
  const [selected, setSelected] = useState<string>(TEMPLATES[0].key);

  const current = TEMPLATES.find((t) => t.key === selected) || TEMPLATES[0];

  return (
    <div style={{ minHeight: "100vh", background: "#f8efe2" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "clamp(24px,3.4vw,36px) clamp(18px,3vw,30px) 60px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", marginBottom: "28px" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "12px", letterSpacing: "0.16em", textTransform: "uppercase", color: WINE, marginBottom: "9px" }}>
              <Link href="/admin" style={{ color: WINE }}>← Dashboard</Link> · Emails
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 400, fontSize: "clamp(30px,4vw,42px)", lineHeight: 1.1, margin: "0 0 9px" }}>Email previews</h1>
            <p style={{ fontSize: "14.5px", lineHeight: 1.6, color: "rgba(57,41,42,0.72)", margin: 0, maxWidth: "70ch" }}>
              Every automated email the platform sends. Each one has a subject line, a clear trigger, and a tone note. Select one to see a rendered preview.
            </p>
          </div>
        </div>

        {/* 2-col layout */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "20px", alignItems: "start" }}>

          {/* Sidebar list */}
          <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(57,41,42,0.12)", fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(57,41,42,0.5)" }}>
              {TEMPLATES.length} templates
            </div>
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelected(t.key)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 16px",
                  border: "none",
                  borderBottom: "1px solid rgba(57,41,42,0.08)",
                  background: selected === t.key ? "rgba(123,31,44,0.06)" : "transparent",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  borderLeft: selected === t.key ? `3px solid ${WINE}` : "3px solid transparent",
                }}
              >
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "14px", color: selected === t.key ? WINE : "#39292a", lineHeight: 1.35, marginBottom: "3px" }}>
                  {t.key.replace(/_/g, " ")}
                </div>
                <div style={{ fontSize: "11.5px", lineHeight: 1.5, color: "rgba(57,41,42,0.55)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {t.subject}
                </div>
              </button>
            ))}
          </div>

          {/* Preview pane */}
          <div>
            {/* Meta card */}
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", background: "#fffdfa", padding: "20px 24px", marginBottom: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: "13.5px", lineHeight: 1.7 }}>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.45)", paddingTop: "3px" }}>Key</span>
                <span style={{ fontFamily: "monospace", fontSize: "12.5px", background: "rgba(57,41,42,0.06)", padding: "1px 8px", borderRadius: "4px", color: "#39292a", alignSelf: "start" }}>{current.key}</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.45)", paddingTop: "3px" }}>Subject</span>
                <span style={{ fontWeight: 600 }}>{current.subject}</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.45)", paddingTop: "3px" }}>Trigger</span>
                <span style={{ color: "rgba(57,41,42,0.7)" }}>{current.trigger}</span>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 600, fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(57,41,42,0.45)", paddingTop: "3px" }}>Tone</span>
                <span style={{ color: "rgba(57,41,42,0.7)", fontStyle: "italic" }}>{current.tone}</span>
              </div>
            </div>

            {/* Rendered email */}
            <div style={{ border: "1px solid rgba(57,41,42,0.16)", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ background: "#e8e0d8", padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#c0a090" }} />
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#c0a090" }} />
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#c0a090" }} />
                <span style={{ fontFamily: "monospace", fontSize: "12px", color: "rgba(57,41,42,0.5)", marginLeft: "8px" }}>email preview</span>
              </div>
              <div
                style={{ padding: "28px", background: "#f5eedd" }}
                dangerouslySetInnerHTML={{ __html: current.html }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
