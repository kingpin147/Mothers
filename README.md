# THE Mothers — Private Members Club & Community Platform

A production-grade web platform for **THE Mothers** (Barcelona) — an exclusive private members club, event ecosystem, and curated community for mothers.

Built with **Next.js (App Router)**, **TypeScript**, **Drizzle ORM**, **PostgreSQL (Supabase)**, **Stripe Checkout & Billing**, **Auth.js (NextAuth v5)**, and **Brevo Transactional Email Engine**.

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Core Platform Concepts & Rules](#core-platform-concepts--rules)
   - [1. Membership Mode & Launch Switch](#1-membership-mode--launch-switch)
   - [2. Unified Account & Wallet Economy](#2-unified-account--wallet-economy)
   - [3. Event Booking, Holds & Dynamic Pricing](#3-event-booking-holds--dynamic-pricing)
   - [4. Waitlist Engine & Timings](#4-waitlist-engine--timings)
   - [5. The Circle Community Forum](#5-the-circle-community-forum)
   - [6. Godmother Referral Programme](#6-godmother-referral-programme)
   - [7. Hosting System & Attendance Rules](#7-hosting-system--attendance-rules)
   - [8. Curated Partner Perks](#8-curated-partner-perks)
3. [Database Architecture & Schema](#database-architecture--schema)
4. [Stripe Payment Flow & Webhook Engine](#stripe-payment-flow--webhook-engine)
5. [Transactional Email System (Brevo)](#transactional-email-system-brevo)
6. [Scheduled Background Jobs (Cron API)](#scheduled-background-jobs-cron-api)
7. [Environment Variables & Configuration](#environment-variables--configuration)
8. [Getting Started & Development Guide](#getting-started--development-guide)
9. [Brand & Design Tokens](#brand--design-tokens)

---

## System Architecture Overview

```mermaid
graph TD
    Visitor([Mother / Member / Guest]) -->|Visits Site| WebApp[Next.js App Router]
    WebApp -->|Checks Launch Status| SettingsEngine[Admin Club Settings]
    
    subgraph Pre-Launch & Public Operations
        WebApp -->|Profile Setup & Onboarding| ProfileModal[First-Visit Profile Modal]
        WebApp -->|Browses Schedule| EventsModule[Events & Gathering Calendar]
        WebApp -->|Books Walk / Social| FreeBooking[0-Credit Direct Reservation]
        WebApp -->|Buys Top-up Credits €2/ea| StripeCheckout[Stripe Hosted Checkout]
    end

    subgraph Membership Lifecycle
        WebApp -->|Direct Subscribe from Account| SubCheckout[Stripe Subscription Checkout]
        SubCheckout -->|Applies Wallet Credit Discount| StripeCoupon[Stripe One-Off Discount Coupon]
        StripeCheckout & SubCheckout -->|Webhook Events| WebhookHandler["Stripe Webhook Handler (/api/stripe/webhook)"]
        WebhookHandler -->|Grants Monthly 20 or Quarterly 60 Credits| WalletLedger[FIFO Credit Ledger]
        WebhookHandler -->|Auto-Books Held Reservations| BookingEngine[Booking & Attendance System]
    end

    subgraph Community & Engagement
        WebApp -->|Shares Posts & Discussions| TheCircle[The Circle Forum]
        WebApp -->|Godmother Referral Sharing| GodmotherModule[Unique Godmother Tracking]
        WebApp -->|Discounts & Access| PartnerPerks[Curated Partner Directory]
    end

    WebhookHandler & BookingEngine --> Brevo[Brevo Transactional Email Engine]
    WebhookHandler & BookingEngine & TheCircle --> DB[(PostgreSQL Database)]
```

---

## Core Platform Concepts & Rules

### 1. Membership Mode & Launch Switch
- **Pre-Launch Mode (`membership_live = false`)**:
  - The club operates in open pre-launch mode.
  - Every mother who registers before launch has `createdBeforeLaunch = true`, permanently waiving the €19 one-time joining fee when membership launches.
  - The €19 joining fee is **never advertised** publicly.
  - Free walks and park socials are €0 for everyone; paid gatherings charge €2 per credit via top-up.
  - The `/partners` directory and partner links remain hidden until launch.
  - Sticky announcement banner is visible across the site.
- **Post-Launch Mode (`membership_live = true`)**:
  - Memberships are active: Monthly (€39/month for 20 credits) and Quarterly (€99/quarter for 60 credits).
  - Members book at standard credit rates; non-members pay a 1.5× credit markup.
  - Partners page and partner links are publicly accessible.

---

### 2. Unified Account & Wallet Economy
- **Single Wallet Model**: Every signed-up mother (member or non-member) has a unified wallet ledger (`credit_entry`).
- **Credit Purchases & Top-Ups**:
  - Credits cost **€2 per credit** with a **5-credit minimum** purchase requirement.
  - Any credit shortfall on booking is automatically rounded up to the 5-credit minimum.
  - Purchased credits expire after **6 months** under strict **FIFO (First-In, First-Out)** consumption.
- **First Membership Payment Discount**:
  - When a non-member with an existing credit balance subscribes to membership, her unused credits can be applied as a discount on the first payment.
  - The discount is applied as a one-off Stripe coupon at checkout *before* credits are consumed upon webhook confirmation.

---

### 3. Event Booking, Holds & Dynamic Pricing
- **10-Minute Hold Window**:
  - When initiating a top-up checkout to book an event, the system creates a temporary `held` booking with `heldUntil = now + 10 minutes`.
  - The spot is temporarily reserved. If payment succeeds, the webhook confirms the booking; if abandoned, the hold expires and is excluded from capacity calculations.
- **Credit Escrow for Gatherings**:
  - Events with a minimum attendee threshold (`minToConfirm`) hold member credits in escrow until confirmed.
  - Threshold evaluation crons send a single deduplicated warning alert once the decision window is reached.
- **Cancellation & Refunds**:
  - Free cancellation with immediate credit refund up to the event cancellation deadline (default 24h/48h).
  - Late cancellations place the credit in a pending state until a replacement attendee claims the seat.

---

### 4. Waitlist Engine & Timings
- When an event is full, mothers can join the FIFO waitlist (`event_waitlist`).
- **> 24 hours before event**: The system offers the open seat to position #1 on the waitlist with a **12-hour claim window**.
- **< 24 hours before event**: The system broadcasts an immediate availability notification to all waitlisted mothers simultaneously (**first to claim wins** with real-time capacity validation).
- Waitlist claims check account status, verify suspension rules, and deduct credits at the appropriate member vs. non-member rate.

---

### 5. The Circle Community Forum
- Private community forum located at `/circle`:
  - **Topic Categories**: Postpartum, Pregnancy, Toddlers, Life & Work, Barcelona Recommendations, General.
  - **Parental Consent**: Explicit checkbox confirmation required when attaching photos of children.
  - **Photo Limits & Validation**: Up to 4 photos per post, strictly validated on the server for supported MIME types (`image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/gif`) and maximum size of 10MB per image.
  - **Rate Limiting**: Maximum 5 posts and 20 replies per 24 hours with a 30-second post cooldown.
  - **Anonymous Posting**: Members can post anonymously (displaying e.g. *"A mother in Gràcia"*), while posts remain securely linked to their account in the backend for host moderation.
  - **Trending Tag Algorithm**: Tags ranked dynamically based on `posts * 3 + replies * 2 + hearts * 1` over the trailing 7-day window.

---

### 6. Godmother Referral Programme
- Each registered mother is assigned a unique, immutable Godmother code (`godmotherCode` in `person`).
- When an invited mother completes her first-visit profile setup or subscribes:
  - The referral is recorded (`referredByPersonId`).
  - Upon subscription activation, the Godmother automatically receives **+5 bonus credits** (6-month validity).

---

### 7. Hosting System & Attendance Rules
- **Host Privileges & Rules**:
  - Hosts can create gatherings, manage rosters, and check in attendees.
  - Late host cancellation penalty: A host who cancels late must attend 3 community events *after* the cancellation before being permitted to host again.
- **Suspension Enforcement**:
  - Suspended accounts are immediately barred from booking, waitlist claiming, and posting in The Circle.

---

### 8. Curated Partner Perks
- Exclusive local discounts organized under 5 umbrellas:
  1. *Wellness & Movement*
  2. *Expert Care & Support*
  3. *Baby & Child Activities*
  4. *Places & Hospitality*
  5. *Brands & Retail*
- Access is gated based on the `membership_live` status.

---

## Database Architecture & Schema

Key tables defined in [`src/db/schema.ts`](file:///d:/downloads%206-11-2025/Mothers/src/db/schema.ts):

| Table | Purpose |
| :--- | :--- |
| `person` | Core individual entity (name, email, phone, locale, motherhood stage, `createdBeforeLaunch`, `godmotherCode`, `lateHostCancelledAt`). |
| `member` | Active subscription records, billing frequency (monthly/quarterly), Stripe customer & subscription IDs. |
| `member_credential` | Secure Bcrypt password hashes for authentication. |
| `admin_user` | Administrative and host accounts with role-based access control (`owner`, `manager`, `host`, `super_admin`). |
| `event` | Event catalog with capacity, credit cost, minimum confirmation thresholds, status, and `thresholdAlertSentAt`. |
| `booking` | Event reservations with status (`confirmed`, `held`, `cancelled`, `attended`, `no_show`), `heldUntil`, and price kind. |
| `event_waitlist` | FIFO waitlist queue with offer windows (`offeredAt`, `expiresAt`) and claim states. |
| `credit_entry` | Append-only ledger of all credit grants, spends, refunds, top-ups, and expirations. |
| `payment` | Immutable financial log of all Stripe checkouts, subscription invoices, and top-up transactions. |
| `circle_post` & `circle_reply` | Community discussions, anonymous flags, parental photo consent, and moderation status. |
| `circle_reaction` | Heart reactions on Circle posts and replies. |
| `partner` | Curated local business directory, discount codes, and category classifications. |
| `setting` | Global system settings (`membership_live`, pricing, grant defaults, schedule rules). |
| `stripe_event` | Webhook idempotency ledger preventing duplicate event processing. |
| `audit_log` | System-wide audit trail for administrative, billing, and membership actions. |

---

## Stripe Payment Flow & Webhook Engine

Webhooks are received at `/api/stripe/webhook` with signature verification and idempotency protection via `stripe_event`.

### Webhook Handlers (`src/lib/stripe-webhook-handler.ts`):
1. **`checkout.session.completed`**:
   - **`purpose: "membership"`**:
     - Activates or creates member record.
     - Grants **20 credits** for Monthly or **60 credits** for Quarterly.
     - Consumes any wallet credits that were discounted at checkout.
     - Awards +5 referral credits to the Godmother if referred.
     - Sends bilingual Welcome & Confirmation email.
   - **`purpose: "topup"`**:
     - Grants purchased credits in an isolated transaction to prevent rollback on downstream booking steps.
     - Sends payment receipt email.
     - If the top-up was initiated with an `eventId`, checks suspension, dynamic pricing, and automatically confirms the held booking with a booking confirmation email.
2. **`invoice.payment_succeeded` / `invoice.paid`**:
   - Handles recurring subscription renewals and grants the recurring monthly (20) or quarterly (60) credits.
3. **`invoice.payment_failed`**:
   - Updates status to `past_due` and dispatches recovery notification.
4. **`customer.subscription.deleted`**:
   - Updates member status to `lapsed`.

---

## Transactional Email System (Brevo)

Transactional email engine located in [`src/lib/brevo.ts`](file:///d:/downloads%206-11-2025/Mothers/src/lib/brevo.ts) with full English and Spanish localisation:

- `booking_confirmed`: Event booking confirmation with date, meeting location, and calendar details.
- `payment_receipt`: Top-up purchase receipt with order reference and credit expiry date.
- `membership_welcome`: Member welcome email detailing credit balance and club access.
- `waitlist_offer`: Notification of an open seat with a 12h decision window.
- `waitlist_broadcast`: Real-time notification for seats opening under 24 hours.
- `event_threshold_alert`: Admin alert for events reaching the decision point below minimum capacity.
- `abandoned_checkout_reminder`: Automated reminder for incomplete checkouts.

---

## Scheduled Background Jobs (Cron API)

All background routes are located under `/api/cron/*` and protected by the `Authorization: Bearer <CRON_SECRET>` header:

| Route | Schedule | Purpose |
| :--- | :--- | :--- |
| `/api/cron/threshold-decisions` | Every 6 hours | Evaluates events near decision point, counts all active bookings, and sends single alert if below minimum. |
| `/api/cron/minimum-not-reached` | Daily | Flags under-capacity events for admin decision. |
| `/api/cron/expire-offers` | Every 15 mins | Expires unclaimed 12h waitlist offers and advances queue. |
| `/api/cron/expire-credits` | Daily | Expires credit batches older than 6 months. |
| `/api/cron/abandoned-checkout` | Hourly | Sends recovery reminder for abandoned checkout sessions. |
| `/api/cron/quarterly-tranche` | Daily | Active only when `membership_live = true`; grants scheduled tranches. |
| `/api/cron/event-reminders` | Daily | Sends 48h and 2h pre-event reminders to confirmed attendees. |
| `/api/cron/complete-events` | Hourly | Marks concluded events as completed and triggers attendance reconciliations. |
| `/api/cron/resume-pauses` | Daily | Automatically resumes memberships reaching the end of their pause duration. |

---

## Environment Variables & Configuration

Create a `.env` or `.env.local` file in the project root:

```env
# Database (PostgreSQL / Supabase)
DATABASE_URL="postgresql://user:password@host:5432/mothers?sslmode=require"

# NextAuth / Auth.js v5
AUTH_SECRET="your-32-character-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Brevo (Transactional Email)
BREVO_API_KEY="xkeysib-..."
BREVO_SENDER_EMAIL="hello@themothers.cc"
BREVO_SENDER_NAME="THE Mothers"

# Supabase Storage (Media & Photos)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

# Background Task Security
CRON_SECRET="your-cron-secret-token"

# Base Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Getting Started & Development Guide

### Prerequisites
- Node.js 18.x or 20.x
- PostgreSQL database
- Stripe Account & Stripe CLI (for webhook forwarding)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kingpin147/Mothers.git
   cd Mothers
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run database migrations**:
   ```bash
   npm run db:push
   ```

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Forward Stripe Webhooks locally**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

6. **Validate Type Safety & Build**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```

---

## Brand & Design Tokens

- **Primary Brand Color (Wine/Burgundy)**: `#7b1f2c`
- **Secondary Accent (Olive Green)**: `#568b05` / `#456f04`
- **Warm Canvas Background**: `#fdf8f2` / `#FEFDF9`
- **Typography**: *Cormorant Garamond* (display/headings) & *Lora* / *Inter* (body copy).
