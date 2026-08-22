# The Mothers — Private Members Club Platform & Operator Control Suite

> **Barcelona · 2026**  
> *Production Domain:* [themothers.cc](https://themothers.cc) · *Contact:* `hello@themothers.cc`

---

## 1. Platform Overview

**The Mothers** is a private, curated members club for mothers in Barcelona, structured around intimate gatherings, neighborhood circles, credit-based event bookings, and an operational care back office.

The platform is built on modern web technologies:
- **Framework:** Next.js 15 (App Router, Server Components & Server Actions)
- **Database & ORM:** PostgreSQL  with Drizzle ORM 
- **Styling:** Vanilla Design System with custom luxury typography (`Playfair Display`, `Inter`, `Outfit`)
- **Authentication:** NextAuth.js (Unified multi-role credentials for Members and Administrators)
- **Payments:** Stripe API (Recurring membership subscriptions, €35 guest passes, webhook reconciliation)
- **Email Delivery:** Brevo (Transactional applicant acceptances, password recovery tokens, and invitations)

---

## 2. Platform Objects & Data Model

The platform expresses strict data integrity principles:
1. **Credits are money:** Immutable append-only ledger (`credit_entry`), never a mutable balance integer.
2. **Nothing is destroyed:** Soft deletes and audited state transitions preserve full history.
3. **Time-bound queues:** Built around operational queues (72h application countdowns, T-7 event thresholds).

```mermaid
erDiagram
    PERSON ||--o| MEMBER : "becomes"
    PERSON ||--o{ APPLICATION : "submits"
    PERSON ||--o{ BOOKING : "holds"
    PERSON ||--o{ EVENT_PASS : "purchases"
    MEMBER ||--o{ CREDIT_ENTRY : "ledger balance"
    EVENT ||--o{ BOOKING : "reserves"
    EVENT ||--o{ EVENT_PASS : "issues"
    EVENT_CATEGORY ||--o{ EVENT : "categorizes"
    WINDOW ||--o{ APPLICATION : "intake cohort"
    ADMIN_USER ||--o{ AUDIT_LOG : "records"
```

### 2.1 People & Access Objects
| Object / Table | Purpose & Details |
| :--- | :--- |
| `person` | Root identity table. Holds `firstName`, `lastName`, `email` (unique, normalized lowercased), `phoneE164`, `isMother`, `locale` (en/es), and marketing consent. |
| `member` | Active membership entity linked 1:1 to `person`. Stores `status` (`active`, `paused`, `past_due`, `cancelled_at_period_end`, `lapsed`), motherhood `stage`, `neighbourhood`, `stripeCustomerId`, `stripeSubscriptionId`, `monthlyPriceCents`, and `atRiskSince` (inactivity >60d flag). |
| `admin_user` | Distinct operator identity. Stores administrative `role` (`owner`, `manager`, `host`), `email`, and `passwordHash`. |
| `waitlist_entry` | General club waitlist for mothers joining outside active launch windows. |
| `consent_record` | GDPR-compliant immutable log of marketing and terms consent with exact text shown, version, and client IP. |

### 2.2 Intake & Membership Objects
| Object / Table | Purpose & Details |
| :--- | :--- |
| `window` | Cohort launch window (e.g. *Opening Circle*). Stores `status` (`draft`, `open`, `closed`), `placesOffered` (50), `monthlyPriceCents` (€29/mo), and `joiningFeeCents` (€58). Enforced with partial unique index `idx_unique_open_window`. |
| `application` | 11-step membership submission. Stores serialized questionnaire answers, `status` (`draft`, `submitted`, `accepted`, `waitlisted`, `declined`), 72h countdown `acceptExpiresAt`, and secure `paymentLinkToken`. |
| `application_form_version` | Versioned questionnaire structure preserving readability of legacy submissions. |

### 2.3 Events, Attendance & Ticketing Objects
| Object / Table | Purpose & Details |
| :--- | :--- |
| `event` | Dynamic gathering entity. Stores `title`, `slug`, `categoryId`, `venueName`, withheld private `meetingPoint`, `startsAt`, `endsAt`, `creditCost`, `capacityMember`, `capacityGuest`, `minToConfirm`, and `status` (`draft`, `published_pending`, `confirmed`, `cancelled`). |
| `event_category` | Dynamic event categories (e.g. *Walks & Nature*, *Movement & Somatics*, *Workshops & Talks*). |
| `booking` | Confirmed seat reservation. Links `event` and `person` with `status` (`held`, `confirmed`, `attended`, `no_show`, `released`) and snapshot of `creditsCharged`. |
| `event_waitlist` | Ordered queue for sold-out events with expiring seat offers. |
| `event_change_log` | Field-level history of gathering modifications triggering attendee notifications. |

### 2.4 Passes, Credits & Money Objects
| Object / Table | Purpose & Details |
| :--- | :--- |
| `event_pass` | Non-member €35 guest ticket. Contains 32-byte cryptographic `ticketTokenHash`, `priceCents`, single-purpose access portal `/ticket/[token]`, and 30-day conversion credit. |
| `credit_entry` | Append-only ledger recording every credit movement: `grant` (+20/mo), `spend` (-18), `return_cancellation`, `return_release`, `adjustment`, and `expiry`. |
| `payment` | Financial transaction ledger recording Stripe charges, amounts in cents, currency, and invoice IDs. |
| `order_mirror` | Read-only ledger mirroring physical boutique purchases. |

### 2.5 CMS & Editorial Objects
| Object / Table | Purpose & Details |
| :--- | :--- |
| `partner` | Curated wellness & maternity partner directory. Stores specialty, member offer perks, links, and category exclusivity windows (`exclusiveFrom`, `exclusiveUntil`). |
| `faq_item` | Bilingual FAQ repository with questions and answers in English (`questionEn`, `answerEn`) and Spanish (`questionEs`, `answerEs`). |
| `journal_post` | Editorial publishing platform with bilingual articles, slugs, tags, and reading times. |
| `setting` | Key-value store for global club parameters (e.g. monthly credit grants, rollover caps, guest limits). |

### 2.6 System & Background Automation Objects
| Object / Table | Purpose & Details |
| :--- | :--- |
| `audit_log` | Immutable append-only audit trail logging `actorType`, `actorId`, `action`, `entity`, `entityId`, `before`, `after`, and timestamp. |
| `job_run` | Execution log for background cron engines (T-7 threshold evaluators, credit expiration workers). |
| `stripe_event` | Idempotent webhook ledger preventing duplicate event execution. |

---

## 3. Application Routes

### Public Pages
- `/` — Homepage with Hero, Philosophy, Opening Circle launch callout, dynamic Journal, and bilingual toggle.
- `/membership` — Membership breakdown, 20 monthly credits explanation, partner benefits, and FAQ preview.
- `/membership/apply` — Interactive 11-step membership intake questionnaire.
- `/membership/activate/[token]` — 72-hour secure payment & Stripe checkout activation portal.
- `/events` — 100% dynamic event calendar with dynamic category filter pills.
- `/events/[id]` — Event detail page with seat countdown, booking desk, and guest pass purchase.
- `/ambassadors` — Godmothers referral program and ambassador philosophy.
- `/partners` — Verified partner directory with exclusive member perks.
- `/journal` & `/journal/[slug]` — Editorial publication articles.
- `/faq` — Bilingual FAQ accordion directory.
- `/terms` & `/privacy` — Legal terms and GDPR privacy policies.
- `/ticket/[token]` — Single-purpose guest ticket page with live QR and meeting point details.

### Member Portal
- `/account/login` — Smart unified sign-in form for both Members and Admins.
- `/account` — Member dashboard showing live credit balance, Godmother referral code, and Stage circles.
- `/account/statement` — Itemized FIFO credit ledger statement and activity history.
- `/account/forgot-password` — Anti-enumeration password reset email request.
- `/account/reset-password/[token]` — Secure sha256 token password reset handler.

### Operator Command Suite (`/admin`)
- `/admin` — Real-time command center with live KPIs, Founding Quota progress, urgent T-7 alerts, and audit feed.
- `/admin/applications` — **Queue 01:** Application review queue, 72h payment link issuance, and waitlist routing.
- `/admin/events` — **Queue 02:** Event scheduler, dynamic category creator, attendee rosters, check-in desk, and guest pass generator.
- `/admin/members` — **Queue 03:** Member directory with live search, status filter tabs, profile editor, CSV export, and credit ledger history.
- `/admin/finance` — **Queue 04:** Processed revenue volume, invoice records, and accounting transactions.
- `/admin/partners` — Partner directory CMS and exclusivity lock manager.
- `/admin/faq` — Bilingual English/Spanish FAQ manager.
- `/admin/journal` — Journal editorial publisher and article drafts.
- `/admin/settings` — Global club policies, rollover caps, and membership pricing configurator.

---

## 4. Getting Started & Development

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase IPv4 Pooler recommended)

### Environment Configuration (`.env.local`)
```bash
DATABASE_URL="postgresql://postgres.[ref]:[encoded_password]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"
NEXTAUTH_SECRET="your-32-byte-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
BREVO_API_KEY="xkeysib-..."
BREVO_SENDER_EMAIL="hello@themothers.cc"
BREVO_SENDER_NAME="The Mothers"
```

### Database Setup & Seeding
```bash
# Push schema migrations to Supabase
npm run db:push

# Seed initial categories, events, launch window, admin, and test member
npm run db:seed
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build Validation
```bash
npm run build
```

---

