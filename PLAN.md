# The Mothers — Master Technical Specification & Implementation Plan

> **Document Status:** Comprehensive Master Blueprint (Planning Phase — Zero Code Executed)  
> **Operational Phase:** Pre-Membership Mode (Active) → Full Membership Launch (January 2027)  
> **Source References:** `Tech Brief.dc.html`, `UAT Checklist.dc.html`, `Booking Scenarios.dc.html`, `Event Cards - Every State.dc.html`, `Pre-membership website pages (2)` prototype files, and Client Feedback Tickets 1 through 2.10.

---

## 1. System Overview & Pre-Membership Operating Model

**The Mothers** operates in a distinct **Pre-Membership Mode** leading up to full membership launch in January 2027.

### Core Strategic Tenets:
1. **No Membership Gate Yet:** Membership subscriptions and joining fees exist in the codebase but stay dormant. Any mother can open an account, purchase credits (€2/credit), and book events.
2. **Permanent Fee Waiver for Early Adopters:** Any account created before the launch switch is activated gets `createdBeforeLaunch = true`. When membership opens, their €19 joining fee is permanently waived.
3. **Pure Credit Currency & Single Pricing:** No Event Passes. Every event has a flat credit price (Walks are 0 credits; coffees 1 credit; workshops 6–9 credits; suppers 7–12 credits).
4. **Manual Admin Launch Switch:** Membership activation is controlled exclusively by the Admin in `Admin Settings` (`settings.membershipLive = true`), never by an automatic calendar timer.

---

## 2. Complete Client Feedback Directives (Tickets 1 – 2.10)

### 🍪 Feedback 2.1: Cookie Consent Banner
* **UI Position:** Floating card at the bottom-left of the viewport on initial visit.
* **Copy:**
  > **Cookies**  
  > We use essential storage to keep you signed in and remember your wallet. With your permission we also use analytics to see which pages help mothers most. [Privacy Policy](/privacy)
* **Actions:** `[Accept all]` (solid wine button), `[Essential only]` (outline button), `[Choose]` (granular modal link).
* **Storage & Persistence:** Saved in `tmp_cookie_consent` (`{ essential: true, analytics: boolean, at: timestamp, version: 1 }`).
* **Footer Reopen:** Site footer includes a `"Cookie settings"` link to modify preferences at any time.

### ⚙️ Feedback 2.2: Admin Operational Model, Event Pricing & Event Pass Purge
* **Member vs Non-Member Distinction:** Admin clearly distinguishes pre-launch credit accounts from subscribed members.
* **Dual Event Pricing System:**
  * Every event stores `memberCredits` and `nonMemberCredits`.
  * `priceDisplay` toggle in Admin Settings controls whether public cards show single price (*"4 credits"*) or dual prices (*"Members 4 credits · Non-members 6 credits"*).
* **Event Pass Deprecation:** Completely deleted from backend schemas, frontend UI, and database entities.
* **Admin Manual Activation:** Admin triggers launch in `Admin Settings` (`Admin Settings.dc.html`).

### 📜 Feedback 2.3: Terms & Privacy Synchronization (`/legal`)
* **16 Terms Sections:** Covers account creation at first booking, €2 flat credit rate, 6-month validity, cancellation windows, gatherings with minimums, community standards, hosting rules (+2 credits & 50% discount refund), account suspension (freeze), and GDPR erasure.
* **10 Privacy Sections:** Covers data collection, Brevo/Stripe processors, no child identifying data, GDPR rights, and cookie/local storage transparency.

### 💬 Feedback 2.4: The Circle Forum Avatar & Privacy
* **Avatar Generation:** Circle badge displays the initial letter of the mother's first name (e.g. **"M"** for *Marta*).
* **Anonymous Posting:** When *"Post anonymously"* is ticked, the public author displays as *"A mother in Barcelona"*, while internal account ID is retained for admin safety/moderation.

### 🌟 Feedback 2.5: Hosting Workflow (My Account & Admin)
* **Eligibility Rules:** Account active + **2+ attended events** + **0 no-shows** in 90 days.
* **Host Only Booked Events:** A mother must have booked an event before she can apply to host it.
* **Late Host Cancellation Penalty:** Confirmed host cancelling `<48h` before or no-showing loses hosting privileges until attending **3 more events**.
* **Helper Banner for Ineligible Users:** *"You have been to N event(s). Come to (2 - N) more and you can host."*
* **Where to Apply:** `/host` ("Become a host" page) and `/account?tab=hosting`.
* **Admin Pre-launch Desk Review:** Team reviews pending requests with applicant stats → `[Accept & send email]` (dispatches `Email - Host Request Accepted.html`) or `[Decline]` (dispatches `Email - Host Request Declined.html`, reopens slot).
* **Event Run & Reward:** Admin marks event as "Run" → Host receives **+2 bonus credits** (6-month batch) + **50% ticket refund** in credits + `Email - Host Thank You.html`.

### 🎨 Feedback 2.6: Header & Footer Logo Sizing and Alignment
* **Scale:** Footer logo (mark + separator + wordmark) is set to the same scale as the header logo (56px mark height).
* **Alignment:** Footer logo is aligned with the header logo along the left container margin (`max-width: 1160px`).

### 🎟️ Feedback 2.7: Event Page & Logged-Out Booking Guard
* **Mandatory Auth Gate:** Logged-out visitors clicking book/join on ANY event (including 0-credit walks) are redirected through account creation/sign-in before booking is recorded.
* **Wallet Display Condition:** When logged out, hide the wallet credit badge and show *"No account yet — you can look before you open one"*.

### 🏰 Feedback 2.8: Membership Page Refinements (`/membership`)
* **Logged-out Hero State:** Defaults to `[Join the list]` waitlist CTA (never permanently stuck on *"You're on the list"*).
* **Membership Card Inclusions Add:** Added bullet: ✔️ **Earn 5 credits for each mother you bring**.
* **Visual "Start meeting mothers now" Module:**
  * 3 icon items: 1) 📅 *Book an event — Your account is created with it*, 2) 👛 *Add the credits you need — No packs, no subscription*, 3) ⏱️ *Keep them into membership — Credits last six months*.
  * Action buttons: `[Book your first event]` and `[See the calendar]`.
  * Right box: Large **€2** / PER CREDIT / *"Each event shows its own credit price on the calendar."*
* **"Five ways to connect" Text Reduction:** Descriptions trimmed to concise summaries.
* **CTA Button Copy:** Changed from *"Read the questions"* to **"FAQ"**.

### ❓ Feedback 2.9: FAQ Header Subtitle Removal (`/faq`)
* **Heading:** Retain *"You wonder, we answer."*
* **Subtitle Removal:** Removed: ~~*"Everything you're wondering before you apply."*~~

### 🏡 Feedback 2.10: Home Page Refinements (`/`)
* **"Where you will meet her" Carousel:** Navigation arrows `(←)` `(→)` appear only when cards overflow viewport; placed neatly above cards on the right; images synchronized with calendar events.
* **Godmother Module:** "How it works" link redirects to `/faq`. Copy updated to: *"You earn 5 credits for each mother you bring, once you become a member (January 2027)"*.
* **"The Letter" (Waitlist) Reset:** Fixed so logged-out users can enter another email after refresh, with a dismissible feedback message.

---

## 3. Deep Technical Architecture (from `Tech Brief.dc.html`)

### 3.1 Credit Engine & FIFO Wallet Architecture
* **Valuation:** €2 per credit. Top-up minimum: 5 credits (€10); shortfalls round up to 5 credits.
* **Batch Model:** Each credit grant/purchase is recorded as a distinct batch with `{ id, personId, amount, remaining, source, expiresAt, createdAt }`.
* **FIFO Consumption:** Event bookings consume remaining credits starting from the earliest expiring batch.
* **Lifecycle & Expiration:**
  * Standard validity: **6 months** from grant date.
  * Cron job sends warnings at **30 days** and **7 days** before expiration (`Email - Credits Expiring.html`).
  * Cancelled event refunds restore credits with their original expiry date (extended to 30 days if `<30 days` remain).
* **Membership Conversion:** Upon subscribing at launch, unused wallet credits discount the initial subscription payment (1 credit = €2, capped at plan price); converted credits leave the wallet (oldest first), and full plan credits (20 or 60) are credited.

### 3.2 First-Visit Profile Mandatory Modal
* **Trigger:** Appears on all public pages via `SiteHeader` when a user is signed in and `account.profileDone === false` (except `/sign-in` and `/topup`).
* **Non-Dismissible:** Blocking modal (no close button, no ESC dismiss).
* **Fields Collected:**
  1. `stages`: Array of child stages (Pregnancy, Babies, Toddlers, Children, Big kids).
  2. `neighbourhood`: Barcelona district.
  3. `hoping`: Goals in joining.
  4. `free`: Availability times.
  5. `heard`: Attribution source.
  6. `referralCode`: Live lookup against Godmother codes (green checkmark or error message).
  7. `social`: Instagram/LinkedIn handle.
  8. `why`: Free text notes.
* **Admin Sync:** Data feeds into `Admin Member Record` under *"Her profile"*.

### 3.3 The Circle (Forum) Architecture & Community Safety
* **Access Level:** Publicly viewable by all. Posting and replying requires attending **≥ 1 event** (`canPost = attended >= 1`).
* **Rate Limits:** 5 posts and 20 replies per 24 hours, 30s cooldown between submissions.
* **Image Uploads:** Up to 4 photos per post, client-side pre-compression (<1000px, WebP), server EXIF metadata sanitization.
* **Moderation Pipeline:**
  * 3 user reports automatically hide a post for moderation with placeholder: *"This post was removed for moderation"*.
  * Admin Pre-launch moderation queue allows **Keep** (clears report), **Hide** (removes everywhere), **Restore** (reinstates post).
* **"Talked About This Week" Trending Engine:**
  * Score = `(new_posts * 3) + (replies * 2) + (hearts * 1)` over past 7 days.
  * Top 6 tags displayed; moderator can pin or block specific tags.

### 3.4 Full-Event Waiting List Engine
* **Entry:** Free to join; no credit hold.
* **Place Clearance (>24h out):** First waitlisted mother is emailed (`Email - Place Still Open.html`) and given **12 hours** to confirm before passing to the next person.
* **Place Clearance (<24h out):** Broadcast email sent to all waitlisters; first mother to click books the spot.
* **Dashboard:** Displays under `Account → Reservations` with real-time queue position and a `[Leave waiting list]` button.

### 3.5 Brevo Transactional Email Engine (23 Templates)
All 23 HTML templates mapped and rendered via Brevo API:
1. `Email - Account Suspended.html`
2. `Email - Account Reinstated.html`
3. `Email - After Your First Event.html`
4. `Email - Booking Confirmation.html` (with attached `.ics` calendar invite)
5. `Email - Credits Expiring.html` (sent at T-30d and T-7d)
6. `Email - Event Cancelled.html` (automatic credit restoration)
7. `Email - Godmother Credited.html` (notifies referrer upon friend's launch subscription)
8. `Email - Host Cancelled.html`
9. `Email - Host Request Received.html`
10. `Email - Host Request Accepted.html` (with meeting point and attendee roster)
11. `Email - Host Request Declined.html`
12. `Email - Host Thank You.html` (+2 credits & 50% refund confirmation)
13. `Email - Meeting-Point Reminder.html` (sent 24h before event)
14. `Email - Membership Cancelled.html`
15. `Email - Membership Is Open.html` (launch announcement)
16. `Email - Membership Paused.html`
17. `Email - Membership Resumed.html`
18. `Email - Minimum Not Reached.html` (alert to team at T-2d)
19. `Email - Password Reset.html` (1-hour single-use token)
20. `Email - Place Still Open.html` (sent 24h after abandoned checkout)
21. `Email - Receipt.html` (Stripe card payment receipt)
22. `Email - Verify Your Email.html` (email verification code before first payment)
23. `Email - Welcome To Membership.html` (post-subscription onboarding)

---

## 4. Complete Database Schema Matrix (`src/db/schema.ts`)

| Table Name | Key Columns & Types | Description |
| :--- | :--- | :--- |
| **`person`** | `id`, `first_name`, `last_name`, `email`, `phone_e164`, `is_suspended`, `suspended_at`, `suspended_reason`, `created_before_launch`, `profile_done`, `profile_data` (jsonb), `deleted_at` | Core user identity & GDPR flag |
| **`member_credential`**| `person_id`, `password_hash`, `reset_token_hash`, `reset_token_expires_at` | Authentication records |
| **`member`** | `person_id`, `status`, `plan` ('monthly'/'quarterly'), `membership_live`, `paused_until`, `no_shows_90d`, `late_host_cancellations` | Subscribed member profile |
| **`credit_batch`** | `id`, `person_id`, `amount`, `remaining`, `source`, `expires_at`, `created_at` | FIFO credit wallet ledger |
| **`event`** | `id`, `title`, `description`, `date`, `start_time`, `end_time`, `venue`, `neighbourhood`, `meeting_point`, `member_credits`, `non_member_credits`, `min_attendees`, `max_capacity`, `status`, `needs_host`, `host_person_id`, `non_member_opens_at`, `cancellation_window_hours`, `image_url` | Events calendar model |
| **`booking`** | `id`, `event_id`, `person_id`, `status` ('held'/'confirmed'/'cancelled'/'attended'/'no_show'), `credits_spent`, `booked_at`, `no_show` (boolean) | Event reservations |
| **`waitlist`** | `id`, `event_id`, `person_id`, `position`, `offered_at`, `expires_at`, `status` | Full-event waiting list |
| **`host_request`** | `id`, `event_id`, `person_id`, `status` ('pending'/'confirmed'/'declined'), `submitted_at`, `decided_at`, `credits_awarded` | Host applications |
| **`circle_post`** | `id`, `person_id`, `title`, `body`, `photos` (jsonb), `tags` (jsonb), `is_anonymous`, `is_hidden`, `report_count`, `created_at` | Forum discussion threads |
| **`circle_reply`** | `id`, `post_id`, `person_id`, `body`, `is_anonymous`, `is_hidden`, `created_at` | Forum responses |
| **`circle_report`** | `id`, `post_id`, `reported_by_person_id`, `reason`, `resolved`, `action_taken` | Moderation queue reports |
| **`faq_item`** | `id`, `group_name`, `question_en`, `question_es`, `answer_en`, `answer_es`, `display_order`, `is_published`, `policy_quote` | Dynamic FAQ CMS |
| **`system_setting`** | `key`, `value` (jsonb), `updated_by`, `updated_at` | Global settings (launch state, prices) |
| **`audit_log`** | `id`, `admin_email`, `action`, `details`, `previous_value`, `new_value`, `created_at` | Immutable security log |
| **`newsletter_list`**| `id`, `email`, `source`, `created_at` | Pre-launch "The Letter" waitlist |

---

## 5. Complete Admin Blueprint

ADMIN pages are marked with `Admin` in their titles and reference files:

```
├── Admin Dashboard (/admin)
│   ├── Priority 01: Decisions (Gatherings <7d out needing confirm/cancel)
│   ├── Priority 02: Early Warnings (T-10 low bookings: hold T-7/T-3 or adjust)
│   ├── Priority 03: Money Needing Attention (Declined cards, expiring accounts)
│   └── Priority 04: This Week's Calendar & Attendance Summary
│
├── Admin Pre-launch Desk (/admin/pre-launch)
│   ├── Tab 1: Host Requests (Review, Accept & Send Email, Decline)
│   ├── Tab 2: Attendance & Host Credits (Record no-shows, "Mark as run" -> +2 credits & 50% refund)
│   ├── Tab 3: The Circle Reports (Reports queue: Keep, Hide, Restore, Pause account)
│   └── Tab 4: Accounts & The List (Pre-launch fee-waived accounts & newsletter subscribers)
│
├── Admin Members (/admin/members)
│   └── Admin Member Record (/admin/members/[id])
│       ├── Dual View: Pre-launch Credit Account vs Subscribed Member
│       ├── Credit Ledger Reconciliation (Opening, grants, spent, expired, net balance)
│       ├── House Rules Suspension Modal (Freeze bookings/credits, block booking/posting)
│       ├── GDPR Permanent Erasure Flow (Anonymize posts, forfeit credits, cancel future bookings)
│       ├── Profile View ("Her profile" answers from first-visit modal)
│       └── Godmother Referral & Hosting Statistics
│
├── Admin Events (/admin/events)
│   ├── Create/Edit Event (Dual pricing, cancellation windows, minimums, needsHost toggle)
│   └── Admin Printable Roster (/admin/events/[id]/roster) (Print-only CSS, arrival checkboxes)
│
├── Admin FAQ CMS (/admin/faq)
│   ├── Grouped accordions ("Coming to an event now", "Credits & wallet", "Membership", "Club")
│   ├── Arrow reordering, missing Spanish flags, draft/publish status, policy quote markers
│
├── Admin Settings (/admin/settings)
│   ├── Membership plan activation switch (Pre-launch vs Live)
│   ├── Price display mode toggle (Single vs Dual)
│   ├── Pricing & policy figures with "Quoted publicly" flags
│   └── Review & Save modal listing affected public pages with audit logging
│
├── Admin Finance (/admin/finance) (Top-up revenue, credit liability, refunds)
├── Admin Partners (/admin/partners) (Partner listings, perks, contract renewals)
├── Admin Journal (/admin/journal) (Articles CMS, publishing, drafts)
└── Admin Emails (/admin/emails) (Interactive previewer for 23 Brevo email templates)
```

---

## 6. Comprehensive Phased Implementation Roadmap

- [x] **Phase 1: Database Schemas, Enums & Seed Foundation**
  - Refine Drizzle schemas for `person`, `member`, `credit_batch`, `event`, `booking`, `waitlist`, `host_request`, `circle_post`, `circle_reply`, `circle_report`, `faq_item`, `system_setting`, `audit_log`, `newsletter_list`.
  - Purge all remaining legacy Event Pass schema columns and enums.
  - Run database migration and populate seed configurations (`membershipLive: false`, `priceDisplay: 'single'`).

- [x] **Phase 2: Core Server Actions & Backend API Engine**
  - Implement wallet FIFO engine (`addCredits`, `spendCredits`, `getWalletBalance`, `getExpiringCredits`).
  - Implement first-visit profile server action (`saveFirstVisitProfile`).
  - Implement Admin member actions (`suspendMember`, `reinstateMember`, `deleteMemberGdpr`, `adjustCredits`).
  - Implement host request actions (`submitHostRequest`, `decideHostRequest`, `withdrawHostRequest`).
  - Implement event execution action (`markEventAsRun` with host bonus calculation).
  - Implement Circle moderation actions (`reportPost`, `moderateReport`, `togglePinTag`).
  - Implement FAQ CMS server actions (`saveFaqItem`, `reorderFaqItem`, `togglePublishFaq`).
  - Implement Settings review & save action with immutable audit logging.

- [x] **Phase 3: Public Shared Components (Header, Footer, Cookie Banner, Legal)**
  - Implement **Cookie Consent Banner** floating card with preferences modal and footer link.
  - Align **Footer Logo** dimensions (56px) and grid left-alignment with Header Logo.
  - Fix newsletter/waitlist subscription lifecycle in footer and hero (reset on page refresh for logged-out users, dismissible feedback).
  - Update `/legal` and `/terms` with full tabbed 16 Terms & 10 Privacy Policy sections.
  - Build non-dismissible First-Visit Profile Modal in `SiteHeader` / `ConditionalShell`.

- [x] **Phase 4: Public Home & FAQ Pages**
  - Update `/faq`: Remove subtitle sentence (*"Everything you're wondering before you apply"*); connect items dynamically to DB.
  - Update `/` (Home):
    - Refine *"Where you will meet her"* carousel (conditional arrows, top-right positioning, synced event images).
    - Update Godmother module copy (*"each mother you bring"*) and link *"How it works"* to `/faq`.

- [x] **Phase 5: Public Membership Page (`/membership`)**
  - Fix logged-out hero state (default to `[Join the list]`, hide *"You're on the list"* unless signed in/registered).
  - Add Godmother bullet point to membership card: ✔️ *Earn 5 credits for each mother you bring*.
  - Build redesigned 3-item visual module for *"Start meeting mothers now"*.
  - Shorten descriptions on *"Five ways to connect"* cards and rename button to *"FAQ"*.

- [x] **Phase 6: Events Calendar & Booking Authentication Gate (`/events`)**
  - Hide wallet credit indicator for logged-out visitors; show *"No account yet — you can look before you open one"*.
  - Enforce mandatory auth gate: clicking book on ANY event redirects through signup/login before booking.
  - Implement Single vs Dual pricing display on event cards based on `system_settings`.
  - Implement full-event waiting list joining and cancellation flows.

- [x] **Phase 7: Hosting Flow (`/host` & `/account?tab=hosting`)**
  - Build `/account?tab=hosting` with eligibility counters (*"Come to N more..."*).
  - Build `/host` page with 10-minute early arrival commitment checkbox.
  - Enforce constraint: mothers can only apply to host events they have already booked.
  - Handle application submission, withdrawal, and pending state UI.

- [x] **Phase 8: The Circle Community Forum (`/circle`)**
  - Implement avatar initial resolver (first letter of first name) and anonymous mode (*"A mother in Barcelona"*).
  - Implement posting gate: users must have attended ≥ 1 event to post/reply.
  - Build 3-report auto-hide pipeline and moderation placeholder.
  - Build *"Talked about this week"* trending tag bar with tag filter.

- [x] **Phase 9: Admin Pre-launch Desk (`/admin/pre-launch`)**
  - Tab 1: Host Requests (Review cards with verified attendance stats, Accept/Decline actions).
  - Tab 2: Attendance & Host Credits (Record no-shows, "Mark as run" button awarding +2 credits and 50% refund).
  - Tab 3: The Circle Reports (Report cards with Keep, Hide, Restore actions).
  - Tab 4: Accounts & The List (Fee-waived pre-launch accounts table and newsletter list).

- [x] **Phase 10: Admin Members & 360° Member Record (`/admin/members`)**
  - Build `/admin/members` list with stage, neighbourhood, risk filters, and export.
  - Build `/admin/members/[id]` dual record:
    - Pre-launch Account vs Subscribed Member display.
    - Real-time FIFO credit ledger table.
    - House Rules Suspension modal with email dispatch and audit logging.
    - GDPR Permanent Erasure confirmation workflow.
    - "Her profile" card rendering first-visit questionnaire responses.

- [x] **Phase 11: Admin FAQ CMS (`/admin/faq`)**
  - Grouped FAQ editor with 4 canonical sections.
  - Up/Down order controls, draft/publish status toggle, policy quote markers, missing Spanish gap indicator.

- [x] **Phase 12: Admin Settings, Events & Printable Rosters**
  - Build `/admin/settings` with Pre-launch/Live switch, pricing policy fields, and Review & Save modal with audit log.
  - Build `/admin/events/create` with dual pricing, cancellation windows, minimums, and needsHost toggle.
  - Build `/admin/events/[id]/roster` with print stylesheet, arrival checkboxes, and dietary/notes display.

- [x] **Phase 13: Admin Finance, Partners, Journal & Email Previewer**
  - Build `/admin/finance` (top-up revenue, credit liability, refunds).
  - Build `/admin/partners` and `/admin/journal`.
  - Build `/admin/emails` with interactive iframe previews for all 23 Brevo templates.

- [x] **Phase 14: Automated Cron Jobs & Background Tasks**
  - 30-day and 7-day credit expiration warning job (`Email - Credits Expiring.html`).
  - 24-hour abandoned checkout reminder job (`Email - Place Still Open.html`).
  - 24-hour pre-event meeting point reminder job (`Email - Meeting-Point Reminder.html`).
  - Morning-after first attended event check-in job (`Email - After Your First Event.html`).

- [x] **Phase 15: End-to-End QA, Scenarios & UAT Verification**
  - Validate all test cases from `UAT Checklist.dc.html` and `Booking Scenarios.dc.html`.
  - Verify complete Pre-launch to Live switch transition and fee-waiver preservation.



write a reply to client that what we have changed according to plan md and notion feedback