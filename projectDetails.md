# The Mothers — Backend Brief

> **Confidential · v1.0**  
> **Engineering Brief · Barcelona · 2026**  
> *Domain:* [themothers.cc](https://themothers.cc) · *Contact:* hello@themothers.cc

---

## Backend & Data Architecture

The server side of The Mothers: schema, state machines, the credit ledger, money, the booking engine, scheduled jobs, the API surface, security and acceptance tests. Written to be implemented without further interpretation.

> [!NOTE]
> **Document Hierarchy:** Third of three. The **Developer Brief** specifies the public product screen by screen; the **Admin & CMS Brief** specifies the back office. This document specifies what runs underneath both. Where they describe behaviour, this describes structure — and where a rule appears in more than one document, **this one is authoritative on how it is stored and enforced**.

---

## 1. Principles the Schema Must Express

Six rules decide almost every design choice below. If an implementation detail contradicts one of them, the detail is wrong.

1. **Credits are money.** Append-only ledger, never a mutable balance column. Every movement has a cause, an actor and a reversal path.
2. **Nothing is deleted.** Soft-delete and status transitions only. Members, bookings, applications and orders are historical records; the business needs to explain what happened eight months later.
3. **Every state-changing write is idempotent.** Assume every webhook arrives twice and every button is double-clicked on a phone with bad signal.
4. **Money and access move in one transaction.** A credit is never spent unless a booking exists; a booking never exists unless the credit is spent.
5. **Time is explicit.** Store UTC, render `Europe/Madrid`. Every scheduled behaviour derives from a stored timestamp, never from a value computed at read time.
6. **No implicit pricing.** Credit costs and money amounts are set per record and copied — never inherited from a category or recomputed from a live setting.

---

## 2. Architecture and Environments

| Component | Specification |
| :--- | :--- |
| **Runtime** | Next.js App Router on Vercel. Server Actions and Route Handlers for writes; RSC for reads. Node runtime (not Edge) for anything touching the database, Stripe or email. |
| **Database** | PostgreSQL 15+ (Supabase or Neon), one schema, migrations in version control. Prisma or Drizzle — pick one and use it everywhere, including in jobs. |
| **Jobs** | Vercel Cron hitting authenticated route handlers, plus a durable `job_run` table so a missed or duplicated invocation is detectable. No in-memory timers. |
| **Email** | Resend or Postmark, on a subdomain with SPF, DKIM and DMARC. Templates are the eleven supplied HTML files, tokenised. |
| **Files** | Supabase Storage or S3 + CloudFront. Images resized on upload; originals retained. Never hotlink Wix assets. |
| **Environments** | `local`, `staging` (own database, Stripe test keys, email sink), `production`. Staging is seeded from an anonymised production dump — never a live copy with real emails. |
| **Secrets** | Vercel environment variables only. Nothing in the repository, no shared password documents. Client hands over a written inventory of every key at handover. |

> [!IMPORTANT]
> **Boundary:** The boutique is Wix, on a subdomain. Nothing in this schema stores products, stock, carts or orders. The one exception is the read-only order mirror in [§14](#14-the-wix-boundary), and it exists only so the member can see her purchases in her account.

---

## 3. Data Model

Tables below are the required minimum. Every table gets `id` (UUID v7 or cuid), `created_at`, `updated_at`. Money is stored as integer cents plus a currency column — never a float. Credits are integers. Enumerated values are Postgres enums or check-constrained text, never free text.

### 3.1 People and Access

| Table | Fields & Details |
| :--- | :--- |
| `person` | The identity root, and the only place email lives. `first_name`, `last_name`, `email` (unique, lowercased), `phone_e164`, `whatsapp_e164`, `locale`, `is_mother` (boolean, confirmed at first entry point), `marketing_opt_in`, `source`, `notes_internal`, `deleted_at`.<br>*A guest, a waitlist subscriber and a member are all persons; membership is a state on top, not a separate identity.* |
| `member` | `person_id` (unique), `status` ([§4.1](#41-member)), `stage`, `neighbourhood`, `children` (jsonb: birth month/year, no names required), `joined_at`, `monthly_price_cents`, `price_locked_until`, `joining_fee_paid_cents`, `stripe_customer_id`, `stripe_subscription_id`, `current_period_end`, `cancel_at_period_end`, `paused_until`, `at_risk_since`. |
| `admin_user` | Separate from `person`. `role` (owner, manager, host), `email`, `last_login_at`, `mfa_enrolled_at`, `disabled_at`. |
| `session`, `credential` | Whatever the auth library requires, but sessions must be revocable per person and listed in the admin record. |
| `waitlist_entry` | `person_id`, `joined_at`, `stage_at_signup`, `source`, `removed_at`, `removed_reason`. One active entry per person. |

### 3.2 Joining

| Table | Fields & Details |
| :--- | :--- |
| `window` | `opens_at`, `closes_at`, `places_offered`, `joining_fee_cents`, `monthly_price_cents`, `launch_rate` (boolean), `lock_months`, `status` (draft, open, closed). Only one window may be open at a time — enforce with a partial unique index. |
| `application` | `window_id`, `person_id`, `answers` (jsonb, versioned against `application_form_version`), `status` ([§4.2](#42-application)), `submitted_at`, `decided_at`, `decided_by`, `decline_reason_code`, `decline_note`, `accept_expires_at`, `payment_link_token`. |
| `application_form_version` | The question set as it stood when she answered, so old applications stay readable after the form changes. |

### 3.3 Events and Attendance

| Table | Fields & Details |
| :--- | :--- |
| `event` | `title`, `slug`, `category_id`, `description`, `starts_at`, `ends_at`, `venue_name`, `meeting_point` (withheld until confirmed), `neighbourhood`, `capacity_member`, `capacity_guest`, `min_to_confirm`, `credit_cost` (required, no default), `guest_price_cents`, `is_signature`, `is_free_walk`, `partner_id`, `host_admin_id`, `image_id`, `status` ([§4.3](#43-event)), `confirmed_at`, `cancelled_at`, `cancel_reason`, `guest_open_at`, `guest_close_at`, `decision_at`, `published_at`. |
| `event_category` | `name`, `slug`, `stage_affinity`, `sort_order`, `active`. Carries no price — see [§1.6](#1-principles-the-schema-must-express). |
| `booking` | `event_id`, `person_id`, `member_id` (null for guests), `kind` (member, guest, rsvp), `status` ([§4.4](#44-booking)), `credits_charged` (snapshot at booking time), `money_paid_cents`, `pass_id`, `booked_at`, `released_at`, `cancelled_at`, `attended_at`, `no_show`. **Unique index on `(event_id, person_id)` where status is active** — one place per person per event, at the database level. |
| `event_waitlist` | `event_id`, `person_id`, `position`, `offered_at`, `offer_expires_at`, `accepted_at`, `expired_at`. Offers are made in position order and expire — see [§7.4](#74-waitlist-offers). |
| `event_change_log` | Field-level history of a published event, because attendees must be told what changed and offered a release. |

### 3.4 Passes, Credits, Money

| Table | Fields & Details |
| :--- | :--- |
| `event_pass` | `person_id`, `event_id`, `price_cents` (3500), `status` ([§4.5](#45-event-pass)), `purchased_at`, `ticket_token_hash`, `released_at`, `refunded_at`, `credit_applied_to_member_id`, `credit_expires_at` (`purchased_at` + 30 days). **Lifetime limit of two per person** — enforced in the purchase transaction against a count, not in the UI alone. |
| `credit_entry` | `member_id`, `amount` (signed integer), `type` (`grant`, `joining_bonus`, `spend`, `return_release`, `return_cancellation`, `expiry`, `adjustment`, `correction`), `expires_at` (grants only), `source_type` + `source_id` (polymorphic: booking, event, window, admin_user), `reason` (required on adjustment), `actor_admin_id`, `created_at`. **Append-only: no updates, no deletes.** A mistake is corrected by a *correction* entry. |
| `payment` | `person_id`, `purpose` (`joining_fee`, `subscription`, `event_pass`), `amount_cents`, `currency`, `status`, `stripe_payment_intent_id` (unique), `stripe_invoice_id`, `refunded_cents`, `failure_code`, `occurred_at`. |
| `godmother_referral` | `referrer_member_id`, `referred_person_id`, `code`, `status` (`pending`, `qualified`, `paid`), `qualified_at`, `payout_credit_entry_id`. Payout is manual and lands as a credit entry — never a cash transfer from this system. |

### 3.5 Content, Partners, Plumbing

- `journal_post` (`title`, `slug`, `excerpt`, `body`, `author`, `hero_image_id`, `status`, `published_at`, SEO fields)
- `partner` (`name`, `umbrella`, `specialty`, `description`, `offer_for_members`, `links`, `logo_image_id`, `status`, `exclusive_from/until`)
- `page_content` (key-addressed blocks for the pages the client edits)
- `faq_item`
- `media_asset` (alt text required)
- `setting` (typed key/value: shipping price, returns window, credit cap, guest window offsets)
- `email_log` ([§11](#11-email-delivery))
- `audit_log` (`actor`, `action`, `entity`, `before`, `after`, `ip`, `at` — append-only)
- `consent_record` ([§16](#16-data-protection))
- `job_run` (`job key`, `started_at`, `finished_at`, `outcome`, `counts`)

**Indexes you will need on day one:**
- `event(status, starts_at)`
- `booking(event_id, status)`
- `booking(person_id, status)`
- `credit_entry(member_id, created_at)`
- `credit_entry(member_id, expires_at)` where `type = 'grant'`
- `person(email)`
- `application(window_id, status)`
- `email_log(person_id, sent_at)`

---

## 4. State Machines

These are the only legal transitions. Anything else is a bug, and the code should refuse it rather than record it. Every transition writes to `audit_log`.

### 4.1 Member
- `applicant` → `accepted_awaiting_payment` → `active`
- From `active`:
  - `past_due` (payment failed) → `active` (on recovery) OR `lapsed` (after dunning sequence)
  - `paused`
  - `cancelled_at_period_end` → `lapsed` (at period end)
  - `banned`
- `lapsed` → `active` (only through a new window, without a second joining fee if left in good standing)
- `accepted_awaiting_payment` → `declined` (when the 72-hour link expires)

> [!IMPORTANT]
> **Access is a function of status and current_period_end, computed in one place.**  
> A single `hasMemberAccess(member, at)` helper is used by every route, every page and every job. `cancelled_at_period_end` and `paused` keep access until the date; credits and existing bookings survive with it and stop together.

### 4.2 Application
- `submitted` → `accepted` → `paid` (becomes a member)
- `accepted` → `expired` (at 72 hours)
- `submitted` → `declined` (declining offers the Letter and the waitlist)
- `withdrawn` is a fourth terminal state for the woman who asks to be removed.

### 4.3 Event
- `draft` → `published(pending)` → `confirmed` → `completed`
- `cancelled` (reachable from `published` or `confirmed`)
- Only `confirmed` reveals the meeting point and opens guest sales.
- Only `confirmed` can be `completed`, and completion is what makes attendance markable and triggers the *After Your Event* email.
- An event with `min_to_confirm = 0` is created *confirmed* and skips the pending state entirely.
- An event with a minimum that is unmet at `decision_at` is cancelled by the scheduled job in [§8](#8-scheduled-jobs), releasing every hold.

### 4.4 Booking
- `held` (pending event, credits reserved) → `confirmed`
- `held` | `confirmed` → `released` (member's own choice)
- `held` | `confirmed` → `cancelled_event` (we cancelled)
- `confirmed` → `attended` | `no_show` (after completion)

*Released and cancelled bookings both return credits; the distinction matters for reporting and for what the member is told.*

### 4.5 Event Pass
- `paid` → `used` (attended)
- `paid` → `released` (she gave up the place; **no refund**)
- `paid` → `refunded` (we cancelled the event)
- `paid` | `used` | `released` → `credited` (when she joins within 30 days and the €35 is applied against the €19 joining fee)
- After 30 days the credit window closes and the pass is terminal.

---

## 5. The Credit Ledger

Balance is `SUM(amount)` over non-expired entries. If you cache it, cache it as a materialised view or a derived column recomputed inside the same transaction that wrote the entry — and add a nightly reconciliation job that compares cache to ledger and alerts on any drift.

| Concept | Rule |
| :--- | :--- |
| **Monthly grant** | 20 credits on each successful subscription payment — driven by the Stripe `invoice.paid` webhook, never by a calendar job, so a failed payment never grants credits. Idempotent on invoice ID. |
| **Cap** | Unspent credits cap at 40. The grant is trimmed at write time — grant `min(20, 40 − balance)` — and the trim is recorded on the entry so the member's history explains the smaller number. |
| **Spend order** | FIFO by `expires_at`, then by `created_at`. A spend may draw from several grants; record the allocation (`credit_allocation`: `spend_entry_id`, `grant_entry_id`, `amount`) so a return puts credits back on the grants they came from with their original expiry. |
| **Returns** | Return `credits_charged` from the booking, not the event's current cost. If a returned grant has since expired, return it as a fresh grant expiring at the next period end and say so in the history line. |
| **Expiry** | A nightly job writes negative `expiry` entries for grants past `expires_at`. Expiry is a ledger event, not a filter — the member can see what expired and when. |

> [!NOTE]
> **Invariants to assert in tests and in a nightly check:**
> - No member's balance is ever negative.
> - The sum of allocations against a grant never exceeds the grant.
> - Every spend has a booking.
> - Every booking in an active status has a spend.
> - No `credit_entry` row has ever been updated (assert with a trigger that raises on `UPDATE` or `DELETE`).

---

## 6. Money — Stripe

Stripe is the source of truth for subscription state; our database is the source of truth for access. They are reconciled by webhook, and the webhook handler is the only code that changes subscription state.

| Stripe Event | Backend Action |
| :--- | :--- |
| `checkout.session.completed` | **Joining:** Mark application paid, create member, write joining bonus, send Booking/Welcome mail.<br>**Pass:** Create pass, create guest booking, mint ticket token, send Guest Place Booked. |
| `invoice.paid` | Extend `current_period_end`, set active, write the monthly grant. |
| `invoice.payment_failed` | Transition to `past_due`, start dunning sequence. Access continues to `current_period_end`; no new grant. |
| `customer.subscription.updated` / `deleted` | Mirror `cancel_at_period_end`, pause, price change and period end. Never infer these from our own UI state. |
| `charge.refunded` | Update `payment.refunded_cents`; move a pass to `refunded`. |

### Handler Rules
- Verify the webhook signature.
- Store the raw event and its ID in `stripe_event` and return `200` immediately on a duplicate ID.
- Process inside a transaction.
- Never trust amounts from the client — the price is looked up server-side from the window or the event.
- Return `5xx` only for genuinely retryable failures.

### Pricing Rules
- **The launch rate:** €29/month is a separate Stripe price, and the lock is ours: `monthly_price_cents` and `price_locked_until` on the member. A price rise applies to a member only after her lock expires, and the migration is an explicit admin action with a warning email — not a silent Stripe update.
- **The €35 credit:** When a pass holder joins within thirty days, the joining fee is charged at €23 (€58 − €35) as a discounted line, and the pass moves to `credited`. Compute the discount server-side from the pass record; never accept it as a query parameter.

---

## 7. The Booking Engine

This is where a small system gets it wrong. Every path below is one database transaction with row locks, not a read-then-write.

### 7.1 Member Books
1. `SELECT … FOR UPDATE` on the event row. Lock first, validate second.
2. Assert: event bookable, member has access, no active booking already, member seats remaining, balance ≥ `credit_cost`.
3. Write the spend entry and its allocations; write the booking with `credits_charged` snapshotted.
4. Commit, then queue the email. **Email sending is never inside the transaction.**

### 7.2 Two Pools
Member and guest capacity are counted separately (`capacity_member`, `capacity_guest`, guest default 2). A full member allocation does not consume guest seats and vice versa. Guest seats are visible to guests only between `guest_open_at` (T-14, or confirmation for threshold events at T-7) and `guest_close_at` (T-2), and never on Signature events or events costing more than 18 credits.

### 7.3 Release
- **Member release:** Returns `credits_charged` and frees the seat in the same transaction, then triggers a waitlist offer.
- **Guest release:** Frees the seat and returns nothing — the pass is spent. The seat freed by a guest release goes back to the guest pool if the guest window is still open, otherwise to members.

### 7.4 Waitlist Offers
When a seat frees on a confirmed full event, offer it to position 1 with a hard expiry (24 hours, or 2 hours inside 48 hours of the event). An offer holds the seat. On expiry the job passes it down the list. A member holding an offer with insufficient credits is skipped with a note, not silently failed.

### 7.5 Cancellation — The Transaction That Must Not Half-Happen
One transaction:
- Event → `cancelled`
- Every member booking → `cancelled_event` with a return entry
- Every guest pass → refund requested
- Write the notification queue

*Stripe refunds are issued after commit, individually retried, and each recorded on its payment. If a refund fails, the event stays cancelled and the failure surfaces in the admin queue — the state never rolls back and the money is never lost track of.*

---

## 8. Scheduled Jobs

All hourly unless noted, all idempotent, all logged to `job_run`, all safe to run twice. An alert fires if any job has not completed in twice its interval.

| Job Name | Schedule & Purpose |
| :--- | :--- |
| `open_guest_windows` | Flip eligible confirmed events to guest-visible at T-14 / on confirmation, and closed at T-2. |
| `resolve_thresholds` | At each event's `decision_at`: confirm if the minimum is met, otherwise cancel and release all holds. |
| `expire_credits` | **Nightly.** Writes expiry entries; never touches balances directly. |
| `expire_offers` | Waitlist offers past expiry, and application payment links past 72 hours (with the 48-hour reminder). |
| `complete_events` | Mark finished events completed; queue *After Your Event* the following morning with next events matched to stage. |
| `event_reminders` | Free-walk WhatsApp confirmation at T-3, meeting point at T-1, general reminder at T-1. |
| `flag_at_risk` | **Nightly.** Sets and clears `at_risk_since` at 60 days without attendance. Never emails anyone — it surfaces a prompt for a human. |
| `reconcile` | **Nightly.** Ledger vs cached balances, seats vs bookings, our subscription state vs Stripe's, pass credit windows about to close. Discrepancies alert; they do not auto-correct. |
| `retention` | **Weekly.** Applies the [§16](#16-data-protection) retention rules and logs what it removed. |

---

## 9. Guest Tickets Without Accounts

A guest has no password and never will. Her ticket link is a signed, single-purpose token: random 32 bytes, stored hashed, scoped to one pass, expiring 48 hours after the event.

It grants exactly three things:
1. View the ticket
2. View the meeting point
3. Release the place

Nothing else in the system accepts it.
- Rate-limit token lookups by IP and token.
- Do not put the email address in the URL.
- If she loses the link, the admin resends it to the address on the pass — there is no "look up my ticket by email" form, because that is an enumeration endpoint.

---

## 10. Access Rules, in One Place

Authorisation is a small number of pure functions, unit-tested, called from route handlers and from the data layer — not a set of conditions repeated in pages. Ten of them cover the product:

```typescript
hasMemberAccess(member, at)
canSeeEvent(viewer, event, at)
canBook(viewer, event, at)
canBuyPass(person, event, at)
canRelease(viewer, booking, at)
canRsvp(person, event)
canApply(person, window, at)
canJoinWaitlist(person, at)
canUseTicketToken(token, at)
adminCan(adminUser, action, entity)
```

Each returns a reason code on refusal, and the reason code is what the UI renders — so *"why can't I book this?"* always has one answer, in one language, from one place.

---

## 11. Email Delivery

Ten templates are ours to send (the eleventh, *Order Confirmed*, belongs to Wix). Each send is queued, not inline: a row in `email_log` (`person_id`, `template_key`, `dedupe_key`, `payload`, `status`, `provider_id`, `sent_at`, `opened_at`, `error`) and a worker that delivers it. The `dedupe_key` — template plus entity plus date — is unique, and that is what stops a retried job from sending a second *Booking Confirmed*.

- **Transactional mail** (bookings, cancellations, passwords, receipts) ignores marketing consent and ignores unsubscribes.
- **Promotional mail** (*Window Is Open*, *The Letter*, *After Your Event*'s suggestions) requires `marketing_opt_in` and honours a one-click unsubscribe.

The distinction is a property of the template, declared in code, not a decision made at the call site.

Every send is visible in the admin against the person, with its status. Bounces and complaints come back by provider webhook and mark the address undeliverable, which shows on the member record — a wrong email address is a support problem, not a silent failure.

---

## 12. Security

- **Credential Separation:** Members and admins are separate credential sets. Admin sessions are shorter, MFA required for owner and manager, and admin routes live behind their own middleware.
- **Rate Limiting:** Login, password reset, application submit, RSVP, pass checkout, ticket token lookup. Per IP and per identifier.
- **Server Validation:** Every input validated server-side with a schema (Zod), including anything that arrives from a Server Action. Client validation is a courtesy, never a control.
- **Privacy in Logs:** No personal data in URLs, logs or analytics. Log identifiers, not emails.
- **Row-Level Auth:** Row-level authorisation on every read of a member's own data — a member ID in a request parameter is never trusted.
- **Upload Security:** Type and size checked, images re-encoded, served from storage and not from the app origin.
- **Standard Headers & Cookies:** HSTS, CSP, frame-ancestors, no-referrer. Cookies `httpOnly`, `secure`, `SameSite=Lax`.

---

## 13. API Surface

Server Actions for form-driven writes; route handlers for webhooks, jobs, tokens and anything Wix calls. The shape matters less than the discipline: one action per business verb, named after the verb, returning either a result or a reason code.

| Scope | Endpoints / Actions |
| :--- | :--- |
| **Public** | `submitApplication` · `joinWaitlist` · `rsvpFreeWalk` · `startPassCheckout` · `viewTicket(token)` · `releaseTicket(token)` · `subscribeLetter` |
| **Member** | `bookEvent` · `releaseBooking` · `joinEventWaitlist` · `acceptWaitlistOffer` · `updateDetails` · `updateChildren` · `pauseMembership` · `cancelAtPeriodEnd` · `openBillingPortal` · `referFriend` |
| **Admin** | `createEvent` · `updateEvent` · `confirmEvent` · `cancelEvent` · `duplicateEvent` · `markAttendance` · `openWindow` · `closeWindow` · `decideApplication` · `adjustCredits` · `setMemberStatus` · `publishPost` · `upsertPartner` · `updateContent` · `resendEmail` · `exportCsv` |
| **Machine** | `POST /api/webhooks/stripe`<br>`POST /api/webhooks/email`<br>`POST /api/wix/verify-member`<br>`POST /api/wix/order`<br>`POST /api/cron/{job}` (secret header, never public) |

---

## 14. The Wix Boundary

Exactly two integration points, both narrow, both ours to secure:

1. **Member verification:** Wix asks us whether an email belongs to an active member, over a signed server-to-server request with a shared secret. We answer `yes` or `no` and nothing else — no name, no plan, no credits. This is what enables members-only pickup and any member discount. It is rate-limited and logged, and a compromised secret leaks a yes/no oracle at worst.
2. **Order mirror:** Wix posts a minimal record on order completion — `email`, `order_number`, `date`, `total`, `item_count`, `fulfilment_method` — which we store read-only so her account can list purchases. We never store card data, addresses or line-item detail, and we never write back. If the mirror is unavailable, orders still complete; a nightly backfill catches what was missed.

> [!CAUTION]
> If either point is not delivered, the boutique copy on our site must change to match what is actually enforceable. That decision belongs to the client and needs making before launch, not after.

---

## 15. Content, Caching and Revalidation

- Public pages are statically rendered and revalidated on write by tag: `events`, `journal`, `partners`, `content`, `faq`. Publishing a post or adding a partner appears within seconds without a deployment.
- Anything member-specific — account, credit balance, her bookings — is dynamic and never cached at the edge.
- Event listings are cached by tag but the availability numbers on them are not: render seats remaining from a live read, or the site will offer places that no longer exist. **This is the one place where correctness beats a fast cache.**

---

## 16. Data Protection

Spanish and EU law applies; the data is unusually sensitive — mothers, babies, health context, home neighbourhoods. Treat it accordingly.

| Aspect | Regulation & Strategy |
| :--- | :--- |
| **Consent** | `consent_record`: `person`, `purpose`, `granted`, `text shown verbatim`, `version`, `timestamp`, `IP`. Marketing consent is a separate, unchecked, explicit action from any form submission. |
| **Children's data** | Birth month and year only, for stage matching. No names, no health notes, no photographs in structured fields. |
| **Access & portability** | A one-click export per person: profile, bookings, credit history, payments, consents, emails sent. JSON plus a readable PDF. |
| **Erasure** | Anonymise, don't drop: replace identifiers, keep the financial and attendance record with a tombstone reference. Legal retention on payment records is 7 years and overrides a deletion request for those rows — the erasure UI must say so. |
| **Retention** | - Declined applications: answers purged at 12 months, decision kept.<br>- RSVP lists: 24 months.<br>- Guest passes: 24 months after the event.<br>- Audit log: 24 months minimum. |
| **Processors** | A written list at handover — host, database, Stripe, email, storage, Wix, analytics — with what each holds and where. The privacy policy is generated from it, not written independently of it. |

---

## 17. Observability and Recovery

- Error tracking (Sentry or equivalent) with releases tagged.
- Structured logs with a request ID that follows a booking from click to email.
- Uptime checks on the site, the webhook endpoint and each cron route.
- **Alerts that reach a human within minutes:**
  - A Stripe webhook failing repeatedly
  - A cron job overdue
  - A refund failure
  - A ledger reconciliation mismatch
  - An email bounce rate above threshold
  - Any 5xx on booking or checkout
- Point-in-time recovery on the database with a tested restore — the restore is tested once during the build and the result written down. Documented RPO of 1 hour and RTO of 4 hours, or a written statement of what is actually achievable on the chosen host.

---

## 18. Acceptance Tests

Automated, in the repository, green at handover. This list is the definition of done for the backend; each line is a test, not a hope.

1. Two members booking the last seat concurrently: one succeeds, one gets a reason code, one credit spend exists.
2. Double-clicked booking creates one booking and one spend.
3. Stripe `invoice.paid` delivered twice grants 20 credits once.
4. A member at 35 credits receives a trimmed grant of 5, and the entry says why.
5. Spend draws from the grant expiring first; release returns to that same grant with its original expiry.
6. Event cancelled with 8 members and 2 guests: 8 returns at the booked cost, 2 refunds of €35, 10 emails, no partial state.
7. Threshold event unmet at `decision_at`: cancelled, all holds released, everyone told.
8. Guest cannot see a Signature event, an event over 18 credits, or any event outside T-14 to T-2.
9. A person who has held two passes cannot buy a third — server-side, with the UI bypassed.
10. Pass holder joining on day 29 pays €23; on day 31 pays €58.
11. Releasing a pass refunds nothing and frees the seat.
12. A ticket token cannot read any other pass, and expires 48 hours after the event.
13. Member who cancels at period end keeps bookings and credits until that date and loses both after it.
14. Past-due member keeps access to period end and receives no new grant.
15. A launch-rate member's price is unchanged by a global price rise inside her lock.
16. Accepted application unpaid at 72 hours expires and frees its place.
17. Waitlist offer expiring passes down the list without losing the seat.
18. Event edited after booking: attendees notified, release offered, full credits returned if taken.
19. Every credit adjustment carries a reason and appears in the member's own history.
20. An `UPDATE` on `credit_entry` raises.
21. Non-member is refused member pickup by the Wix verification endpoint, and the endpoint leaks nothing else.

---

## 19. What the Operator Must Be Able to Do

Everything in this table is done by the client herself, in the back office, with no developer and no deployment. If any row requires a code change, the build is not finished. The Admin & CMS Brief describes the screens; this is the contract.

| Section | Back Office Capabilities |
| :--- | :--- |
| **Applications** | Read the full answers one at a time · **accept** (sends the Accepted email with a 72-hour payment link and starts the countdown) · **decline** (sends Not Accepted, offers the Letter, adds to the waitlist unless she opts out) · skip and return later · record an internal reason and a private note · resend or extend a payment link · withdraw an application on request · see the live count of places left in the window. |
| **Windows** | Create, edit, **open** (which sends Window Is Open to the waitlist and opens applications and bookings), **close early** (which opens the waitlist and the freebies), set places offered, joining fee, monthly price, and whether the launch rate applies. |
| **Partners** | **Add** a partner (live on the public Partners page immediately) · edit every field · **remove** (unpublished immediately, record retained) · add and rename umbrellas and specialties · upload a logo · set the member offer · **exclusivity is enforced by the system**: one active partner per specialty, and a second is refused with the conflict named. |
| **Events** | Create, duplicate in one click, edit after publishing and after bookings exist (attendees notified, release offered, full credits back), **set the credit price by hand on every event**, set capacity and guest seats, set the minimum to confirm and the decision date, confirm, cancel, mark attendance on a phone, manage the per-event waiting list. |
| **Members** | Search and filter, open a record mirroring her own account, edit details, **adjust credits with a mandatory reason**, pause, cancel at period end, cancel immediately with or without pro-rata refund, reinstate, ban, book or release on her behalf, resend any email, see the at-risk flag. |
| **Journal & pages** | Write, edit, schedule, publish and unpublish posts · edit the copy on Home, Membership, FAQ, Partners and Legal · manage FAQ items and their order · upload images with alt text · change any price or number quoted in copy. |
| **Boutique** | Products, stock, prices and orders are managed **in Wix**. In this system she manages only the two numbers our copy quotes — €5.95 Spain shipping and the returns period — and reads the order mirror. |
| **Emails & lists** | Edit the copy of all ten templates, preview with real data, send a test, resend any past send, see delivery status per person, export the waitlist and RSVP lists, send the Letter to consenting subscribers. |
| **Godmother** | See referrals and their status, mark one qualified, record the payout — which lands as a tracked credit adjustment, never a cash transfer from this system. |
| **Settings & people**| Credit cap, monthly grant, guest window offsets, pass price and lifetime limit, prices — all editable values, not constants. Invite and remove admin users, set roles, read the audit log. |

> [!IMPORTANT]
> **Two standing rules for all operator actions:**
> 1. Every action that touches money or access confirms in words, naming the person and the consequence.
> 2. Every state change is written to the audit log with who, what, before, after and when.

---

## 20. Rules Register — The Complete List

Every hard rule in the product, in one place, so nothing is discovered late. All of them are enforced server-side. All of the numbers are editable settings, not constants in code.

### 20.1 Membership and Money
- **€39/month** standard. **€29/month** launch rate, **locked per member for twelve months**, maximum 50 members at launch.
- Joining fee **€58**, or **€23 for a pass holder joining within thirty days** of her €35 pass.
- Membership is by application only, and only while a Window is open. One Window open at a time.
- An accepted applicant has **72 hours** to pay, with a reminder at 48. After that the place is released.
- A declined applicant is offered the Letter and the waitlist. Nothing else is sent to her.
- A member who cancels keeps access, credits and bookings **through the end of the paid period** — they stop together, on that date.

### 20.2 Credits
- **20 credits** on each successful monthly payment. No payment, no credits.
- Unspent credits **cap at 40**; the grant is trimmed rather than refused, and the trim is explained.
- Spending is **FIFO by expiry**. Returns go back to the grants they came from, at their original expiry.
- Every event's credit cost is **set by hand, per event**, required, never inherited from a category.
- A booking snapshots its cost; a return gives back what was charged, not what the event costs today.

### 20.3 Events and Booking
- One place per person per event, enforced at the database level.
- The **meeting point is withheld until the event is confirmed**, and shown to the booked only.
- Threshold events confirm or cancel at the decision date. Failing to confirm releases every hold, with credits back.
- Member and guest seats are **separate pools**; a full member allocation never consumes a guest seat.
- Members release for full credits back. Guests release for nothing.
- An event may be edited after booking; attendees are told what changed and may leave with full credits.
- Cancelling an event returns credits to members and refunds €35 to guests, in one transaction, and tells everyone.

### 20.4 Guests and the Event Pass
- **€35 per pass.** **Two per person, ever.** Non-refundable on release.
- Guests see confirmed events only, from **T-14 to T-2** — so members get a two-week clear run on no-minimum events. Threshold events open to guests when they confirm, at T-7.
- Guests never see Signature moments, and never events costing **more than 18 credits**.
- No account, no password. The receipt carries a ticket link showing date, meeting point and a release button.
- She must confirm she is a mother at checkout.
- If she joins within thirty days the €35 comes off the joining fee. If she never joins, **she does not hear from us again**.

### 20.5 Free Walks and Open Events
- RSVP required: name, surname, email, WhatsApp number.
- **Members book first;** non-members join an open list.
- WhatsApp confirmation three days before; meeting point the day before.
- Both must be mothers. A non-mother is offered the Letter instead — politely, and that is the end of it.

### 20.6 Boutique and Site
- The shop is public; **pickup is members-only** — which is what the Wix verification endpoint exists to enforce. If it cannot be enforced, the copy changes.
- **€5.95 shipping within Spain**, quoted from a setting, not hard-coded.
- Journal, Partners, FAQ and Legal stay on our platform, because it must feel like one site.
- One exclusive partner per specialty, enforced when a second is added.
- Events pages sit on `#FEFDF9` with status colours on cards only — confirmed `#E8F1E9`, pending `#FFF3E4`, cancelled `#FBF1F1`, past `#E9EAEA`; every other page is `#F8EFE2`; selected filter chips are burgundy.

> [!WARNING]
> If a rule is not in this register and not in the two companion briefs, it is not a rule — ask before implementing it, and ask before implementing anything that contradicts one of these.

---

## 21. Delivery and Handover

| Milestone | Deliverables |
| :--- | :--- |
| **M1 — Foundations** | Schema, migrations, seed data, auth, roles, audit log, deploy pipeline, staging. |
| **M2 — Money** | Stripe subscriptions, joining, webhooks, credit ledger with tests, windows and applications. |
| **M3 — Events** | Booking engine, capacity pools, waitlists, confirmation and cancellation, jobs, passes and tickets. |
| **M4 — Surfaces** | Public site against real data, member account, admin back office, CMS, ten emails live. |
| **M5 — Hardening** | Wix boundary, GDPR tooling, observability, acceptance suite green, restore test, handover. |

**Handover is a package, not a login:**
- Repository with README and runbook
- Migration history
- Environment variable inventory
- Processor list
- Restore procedure
- Job catalogue
- A one-page *"How to fix the five most likely incidents"*
- A recorded walkthrough of the admin

**With your quote, tell us:**
1. Your read on the credit ledger and whether you would model it differently;
2. How you would handle the concurrent-booking case;
3. Whether you would use Prisma or Drizzle and why;
4. What you would push back on in [§14](#14-the-wix-boundary);
5. Which of the acceptance tests you think is hardest.

---

*Read alongside the Developer Brief and the Admin & CMS Brief. Questions: [hello@themothers.cc](mailto:hello@themothers.cc) — a question costs nothing; a wrong assumption costs a milestone.*