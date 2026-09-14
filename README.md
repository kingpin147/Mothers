# THE Mothers — Private Members Club & Community Platform

A full-stack, production-grade web platform for **THE Mothers** (Barcelona) — an exclusive private members club, event ecosystem, and curated community for mothers.

Built with **Next.js (App Router)**, **TypeScript**, **Drizzle ORM**, **PostgreSQL**, **Stripe Checkout & Billing**, **Auth.js (NextAuth v5)**, and **Brevo Transactional Email Engine**.

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Key Modules & How the System Works](#key-modules--how-the-system-works)
   - [1. Membership Application & Onboarding Lifecycle](#1-membership-application--onboarding-lifecycle)
   - [2. Stripe Secure Payment Gateway & Branding](#2-stripe-secure-payment-gateway--branding)
   - [3. Credit Economy & Financial Ledger (FIFO)](#3-credit-economy--financial-ledger-fifo)
   - [4. Events, Ticketing & Guest Pass System](#4-events-ticketing--guest-pass-system)
   - [5. Waitlist & Dynamic Auto-Promotion Engine](#5-waitlist--dynamic-auto-promotion-engine)
   - [6. Godmother Referral Programme](#6-godmother-referral-programme)
   - [7. Curated Partner Perks System](#7-curated-partner-perks-system)
   - [8. Admin Management & Operations Suite](#8-admin-management--operations-suite)
3. [Database Architecture & Schema](#database-architecture--schema)
4. [Stripe Webhooks & Idempotency](#stripe-webhooks--idempotency)
5. [Email Templates & Notifications (Brevo)](#email-templates--notifications-brevo)
6. [Environment Variables & Configuration](#environment-variables--configuration)
7. [Getting Started & Development Guide](#getting-started--development-guide)
8. [Automated Scheduled Tasks (Cron Jobs)](#automated-scheduled-tasks-cron-jobs)

---

## System Architecture Overview

```mermaid
graph TD
    User([Prospective Member / Guest]) -->|Applies for Membership| AppModal[Application Modal]
    AppModal -->|Store Application| DB[(PostgreSQL Database)]
    Admin([Admin / Host]) -->|Accept Application in Admin Suite| AdminPortal[Admin Dashboard]
    AdminPortal -->|Generates 72h Token & Email| Brevo[Brevo Email Engine]
    Brevo -->|Sends Invitation Link| MemberEmail[Member Email Inbox]
    MemberEmail -->|Opens Activation Link| ActivationPage["Activation Page (/membership/activate/[token])"]
    ActivationPage -->|Sets Password & Redirects| StripeCheckout[Stripe Hosted Checkout]
    StripeCheckout -->|Webhook: checkout.session.completed| StripeWebhook["Stripe Webhook Handler (/api/stripe/webhook)"]
    StripeWebhook -->|Activates Member & Grants 20 Credits| DB
    StripeWebhook -->|Sends Welcome Ticket/Receipt| Brevo
    User -->|Logs In| MemberPortal["Member Account Portal (/account)"]
    MemberPortal -->|Books Events, Top-up Credits, Perks| EventBooking[Booking & Ledger Engine]
```

---

## Key Modules & How the System Works

### 1. Membership Application & Onboarding Lifecycle

1. **Submission**:
   - Prospective mothers submit an application through the 4-step modal on `/membership`.
   - The application is linked to an active cohort application window (`window` table) with customizable pricing and joining fees.
2. **Admin Review**:
   - Applications appear in `/admin` and `/admin/members` under the `Pending Review` queue.
   - Admins can inspect personal details, stage of motherhood, neighborhood, and reasons for joining before clicking **Accept** or **Decline**.
3. **Acceptance & Cryptographic Token Generation**:
   - When an admin accepts an applicant, the system generates a secure cryptographic activation token (`paymentLinkToken`) with a 72-hour expiry window (`acceptExpiresAt`).
   - A personalized transactional invitation email is dispatched via Brevo with a direct link to `/membership/activate/[token]`.
4. **Token-based Activation & Password Setup**:
   - On `/membership/activate/[token]`, the member configures their password with real-time strength and match indicators.
   - The password hash is securely saved in `member_credential` immediately so that if the user goes to Stripe and clicks "Back", their password remains saved and ready.
   - The user proceeds to **Stripe Hosted Checkout** to complete their subscription.
5. **Joining Fee Waiver Logic (§6.1)**:
   - The €19 one-time joining fee is automatically waived if:
     1. The applicant is among the first 50 active members.
     2. The applicant purchased an Event Pass within the last 30 days.

---

### 2. Stripe Secure Payment Gateway & Branding

All payments across the platform run through **Stripe Hosted Checkout** (PCI-DSS compliant):

- **Membership Subscriptions**: Monthly (€39/mo) and Quarterly (€99/qtr).
- **Extra Event Credits Top-up**: Instant purchase of additional credits (€1 per credit) directly from `/account` or directly on event detail pages when a member faces a credit shortfall.
- **Guest Passes**: Single-entry event tickets (€35) for non-members.
- **Official Authentication Branding**:
  - Every checkout session and invoice line item is explicitly branded under **`THE Mothers`** and **`THE Mothers — Barcelona`**.
  - Includes custom security guarantee messages (`custom_text.submit.message: "Official checkout for THE Mothers Barcelona."`) and metadata tags for brand trust and authentication.

---

### 3. Credit Economy & Financial Ledger (FIFO)

- **Credit Grants**:
  - **Monthly Membership**: 20 credits granted on each monthly billing cycle.
  - **Quarterly Membership**: 20 credits granted per month in automated monthly tranches.
  - **Godmother Referrals**: +5 credits upon referral signup + +15 credits at month 3.
  - **Extra Purchases**: Granular top-up at €1/credit.
- **FIFO (First-In, First-Out) Consumption**:
  - Credits expire 6 months after being granted.
  - The ledger engine (`src/lib/ledger.ts`) automatically consumes the oldest unexpired credits first when booking events.
- **Rollover Protection**:
  - Monthly subscription balances allow rollover up to a 40-credit ceiling.
- **Ledger Auditability**:
  - Every transaction (grant, spend, refund, expiration) is immutably logged in the `credit_entry` and `payment` tables.
  - Members can download a complete PDF statement of their credit history at `/account/statement`.

---

### 4. Events, Ticketing & Guest Pass System

- **Member Reservations**:
  - Members book events using their credit balance.
  - Free walks and park socials are included with 0 credit deduction.
- **Guest Event Passes**:
  - Non-members can purchase up to 2 lifetime guest passes (€35 each) for eligible events.
  - Upon checkout, a secure tokenized ticket is issued (`/ticket/[token]`) with meeting point access, directions, and seat release options.
- **Gathering Events (Pending Confirmation)**:
  - Events with a minimum attendee requirement (`minToConfirm`) hold member credits in escrow rather than deducting them.
  - Once the threshold is met, the event confirms and credits are settled. If the event does not confirm, held credits return to members' balances automatically.
- **Cancellation & Refund Policy**:
  - **> 24 hours before event**: Immediate credit refund to the member's balance.
  - **< 24 hours before event**: Credits enter `pendingReturnState = 'awaiting_replacement'` and are refunded automatically when a waitlisted member claims the released seat.

---

### 5. Waitlist & Dynamic Auto-Promotion Engine

1. When an event hits maximum capacity, members can join the FIFO waitlist (`event_waitlist` table).
2. When a booked attendee cancels, the system automatically offers the open seat to position #1 on the waitlist with a 2-hour decision window.
3. The automated background cron (`/api/events/[eventId]/promote-waitlist`) advances the queue if the offer window expires without acceptance.

---

### 6. Godmother Referral Programme

- Every member is assigned a unique Godmother code (`referralCode` in `member` table).
- When a friend applies and activates their membership using the code:
  1. The Godmother immediately receives **+5 credits**.
  2. An automated milestone job grants **+15 credits** once the referred member has been active for 3 months (total **+20 credits**).

---

### 7. Curated Partner Perks System

- Curated local business discounts and member-exclusive benefits categorized under 5 canonical umbrellas:
  1. **Wellness & Movement**
  2. **Expert Care & Support**
  3. **Baby & Child Activities**
  4. **Places & Hospitality**
  5. **Brands & Retail**
- Displayed with revealable discount codes or door-access instructions in `/account` under the **Perks** tab.
- Full CRUD management in `/admin/partners` with live/draft status toggling.

---

### 8. Admin Management & Operations Suite

Located under `/admin`:

- **Dashboard Overview** (`/admin`): Live member statistics, pending applications, upcoming events, and quick metrics.
- **Members Management** (`/admin/members`): Review applications, manage member statuses (active, paused, lapsed), and inspect credit ledgers.
- **Event Roster & Management** (`/admin/events`, `/admin/events/[id]/roster`): Create/edit events, track RSVPs, manage capacity, and perform manual member removals with automated credit refunds.
- **Partner Directory** (`/admin/partners`): Add and manage local business perk partnerships.
- **Financial Ledger & Audit** (`/admin/finance`): Track all payments, subscription invoices, and credit ledger journals.
- **System Settings** (`/admin/settings`): Configure credit pricing, joining fees, default cohort windows, and email notifications.

---

## Database Architecture & Schema

Key tables defined in [`src/db/schema.ts`](file:///d:/downloads%206-11-2025/Mothers/src/db/schema.ts):

| Table | Purpose |
| :--- | :--- |
| `person` | Core individual entity (names, emails, phone numbers, locale, mother status). |
| `member` | Member subscription state, billing frequency, Stripe customer/subscription IDs, godmother code. |
| `member_credential` | Bcrypt password hashes for member authentication. |
| `admin_user` | Administrative user accounts with role-based access control (`owner`, `manager`, `host`). |
| `application` | Membership applications, answers, review states, payment link tokens, and expiry dates. |
| `window` | Cohort application intake windows with dynamic pricing rules. |
| `event` | Event catalog with dates, locations, credit costs, guest pass limits, and gathering thresholds. |
| `booking` | Event reservations (member & guest), attendance status, and cancellation return states. |
| `event_pass` | Purchased guest passes with ticket token hashes and 30-day joining fee waiver credit windows. |
| `event_waitlist` | FIFO event waitlist with claim offers and expiry timestamps. |
| `credit_entry` | Append-only ledger of all credit grants, spends, refunds, and expirations. |
| `payment` | Financial records of subscription invoices, joining fees, guest passes, and credit purchases. |
| `partner` | Curated partner directory, member offers, discount codes, and category umbrellas. |
| `stripe_event` | Idempotency log recording all processed Stripe webhook events to prevent duplicate executions. |
| `audit_log` | System-wide audit trail for critical member, financial, and event actions. |

---

## Stripe Webhooks & Idempotency

Stripe webhooks are received at `/api/stripe/webhook` and `/api/webhooks/stripe`.

### Handled Events:
- `checkout.session.completed`:
  - `type: "membership"`: Activates member, marks application paid, and issues the first month's 20 credits.
  - `type: "extra_credits"`: Credits purchased credits to member's ledger and auto-books the event if initiated from shortfall.
  - `type: "guest_pass"`: Generates cryptographic ticket token, creates `event_pass` and confirmed booking, and sends confirmation email.
- `invoice.payment_succeeded` / `invoice.paid`: Handles recurring subscription cycles and grants monthly credits.
- `invoice.payment_failed`: Marks membership `past_due` and sends payment recovery email.
- `customer.subscription.deleted`: Updates member status to `lapsed`.

---

## Email Templates & Notifications (Brevo)

Transactional email engine located in [`src/lib/brevo.ts`](file:///d:/downloads%206-11-2025/Mothers/src/lib/brevo.ts) with multi-language support (**English** & **Spanish**):

- `membership_invitation`: 72-hour onboarding payment link with secure token.
- `guest_place_booked` / `event_pass_ticket`: Confirmed guest pass with meeting point and ticket release link.
- `booking_confirmed`: Member event confirmation with date and location details.
- `payment_failed`: Graceful notification to update billing details.
- `application_submitted`: Confirmation that the application is under review.

---

## Environment Variables & Configuration

Create a `.env` or `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/mothers?sslmode=require"

# NextAuth / Auth.js
AUTH_SECRET="your-32-character-random-secret"
NEXTAUTH_SECRET="your-32-character-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Brevo (Transactional Email)
BREVO_API_KEY="xkeysib-..."
BREVO_SENDER_EMAIL="hello@themothers.cc"
BREVO_SENDER_NAME="The Mothers"

# Cron Security
CRON_SECRET="your-cron-secret-token"
```

---

## Getting Started & Development Guide

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Stripe CLI (optional, for local webhook forwarding)

### Installation & Setup

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
   # or
   npx drizzle-kit push
   ```

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Listen to Stripe Webhooks locally**:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

---

## Automated Scheduled Tasks (Cron Jobs)

The system exposes secure cron API routes protected by the `CRON_SECRET` header:

1. **Quarterly Subscription Tranche Grant** (`/api/cron/quarterly-tranche`):
   - Runs daily to check for quarterly members entering month 2 and month 3 of their cycle to grant their 20 credits per month.
2. **Expired Activation Link Cleanup**:
   - Reverts accepted applications whose 72-hour window lapsed without payment.
3. **Waitlist Offer Timeout**:
   - Automatically releases expired 2-hour waitlist seat offers and advances to the next member in line.

---

## Brand & Design Tokens

- **Primary Brand Color (Wine/Burgundy)**: `#7b1f2c`
- **Secondary Accent (Olive Green)**: `#568b05` / `#456f04`
- **Warm Canvas Background**: `#f8efe2` / `#FEFDF9`
- **Primary Text Color**: `#39292a`
- **Typography**: *Cormorant Garamond* (headings) & *Lora* (body text).
