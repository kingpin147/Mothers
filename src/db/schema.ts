import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── ENUMS ──────────────────────────────────────────────────────────────────

export const memberStatusEnum = pgEnum("member_status", [
  "applicant",
  "accepted_awaiting_payment",
  "active",
  "past_due",
  "paused",
  "cancelled_at_period_end",
  "lapsed",
  "banned",
]);

export const adminRoleEnum = pgEnum("admin_role", [
  "owner",
  "manager",
  "host",
]);

export const windowStatusEnum = pgEnum("window_status", [
  "draft",
  "open",
  "closed",
]);

export const applicationStatusEnum = pgEnum("application_status", [
  "submitted",
  "accepted",
  "paid",
  "expired",
  "declined",
  "withdrawn",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "published_pending",
  "confirmed",
  "completed",
  "cancelled",
]);

export const bookingKindEnum = pgEnum("booking_kind", [
  "member",
  "guest",
  "rsvp",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "held",
  "confirmed",
  "released",
  "cancelled_event",
  "attended",
  "no_show",
]);

export const passStatusEnum = pgEnum("pass_status", [
  "paid",
  "used",
  "released",
  "refunded",
  "credited",
]);

export const creditEntryTypeEnum = pgEnum("credit_entry_type", [
  "grant",
  "joining_bonus",
  "spend",
  "return_release",
  "return_cancellation",
  "expiry",
  "adjustment",
  "correction",
]);

export const godmotherStatusEnum = pgEnum("godmother_status", [
  "pending",
  "qualified",
  "paid",
]);

// ─── 1. PEOPLE & ACCESS ─────────────────────────────────────────────────────

export const person = pgTable(
  "person",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull().unique(),
    phoneE164: text("phone_e164"),
    whatsappE164: text("whatsapp_e164"),
    locale: text("locale").default("es").notNull(),
    isMother: boolean("is_mother").default(true).notNull(),
    marketingOptIn: boolean("marketing_opt_in").default(false).notNull(),
    source: text("source"),
    notesInternal: text("notes_internal"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_person_email").on(table.email),
  ]
);

export const memberCredential = pgTable(
  "member_credential",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    personId: text("person_id").notNull().references(() => person.id, { onDelete: "cascade" }).unique(),
    passwordHash: text("password_hash").notNull(),
    passwordUpdatedAt: timestamp("password_updated_at", { withTimezone: true }).defaultNow().notNull(),
    resetTokenHash: text("reset_token_hash"),
    resetTokenExpiresAt: timestamp("reset_token_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    personId: text("person_id").notNull().references(() => person.id, { onDelete: "cascade" }).unique(),
    status: memberStatusEnum("status").default("applicant").notNull(),
    stage: text("stage"), // e.g. pregnancy, 0-1yr, 1-3yr, 4-7yr, 8-10yr
    neighbourhood: text("neighbourhood"),
    children: jsonb("children").$type<Array<{ birthMonth: number; birthYear: number }>>().default([]),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    monthlyPriceCents: integer("monthly_price_cents").default(3900).notNull(),
    priceLockedUntil: timestamp("price_locked_until", { withTimezone: true }),
    joiningFeePaidCents: integer("joining_fee_paid_cents").default(0).notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    pausedUntil: timestamp("paused_until", { withTimezone: true }),
    atRiskSince: timestamp("at_risk_since", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const adminUser = pgTable(
  "admin_user",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull().unique(),
    role: adminRoleEnum("role").notNull(),
    passwordHash: text("password_hash").notNull(),
    mfaEnrolledAt: timestamp("mfa_enrolled_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const waitlistEntry = pgTable(
  "waitlist_entry",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    personId: text("person_id").notNull().references(() => person.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    stageAtSignup: text("stage_at_signup"),
    source: text("source"),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    removedReason: text("removed_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// ─── 2. JOINING WINDOWS & APPLICATIONS ───────────────────────────────────────

export const window = pgTable(
  "window",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
    closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
    placesOffered: integer("places_offered").notNull(),
    joiningFeeCents: integer("joining_fee_cents").default(5800).notNull(),
    monthlyPriceCents: integer("monthly_price_cents").default(3900).notNull(),
    launchRate: boolean("launch_rate").default(false).notNull(),
    lockMonths: integer("lock_months").default(12).notNull(),
    status: windowStatusEnum("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_unique_open_window")
      .on(table.status)
      .where(sql`status = 'open'`),
  ]
);

export const applicationFormVersion = pgTable(
  "application_form_version",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    version: integer("version").notNull(),
    questions: jsonb("questions").notNull(), // structured questions array
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const application = pgTable(
  "application",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    windowId: text("window_id").notNull().references(() => window.id),
    personId: text("person_id").notNull().references(() => person.id),
    answers: jsonb("answers").notNull(),
    formVersionId: text("form_version_id").references(() => applicationFormVersion.id),
    status: applicationStatusEnum("status").default("submitted").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedByAdminId: text("decided_by_admin_id").references(() => adminUser.id),
    declineReasonCode: text("decline_reason_code"),
    declineNote: text("decline_note"),
    acceptExpiresAt: timestamp("accept_expires_at", { withTimezone: true }),
    paymentLinkToken: text("payment_link_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_application_window_status").on(table.windowId, table.status),
  ]
);

// ─── 3. EVENTS & ATTENDANCE ─────────────────────────────────────────────────

export const eventCategory = pgTable(
  "event_category",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    stageAffinity: text("stage_affinity"),
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const event = pgTable(
  "event",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    categoryId: text("category_id").references(() => eventCategory.id),
    description: text("description").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    venueName: text("venue_name").notNull(),
    meetingPoint: text("meeting_point").notNull(), // withheld from non-booked/pending
    neighbourhood: text("neighbourhood").notNull(),
    capacityMember: integer("capacity_member").notNull(),
    capacityGuest: integer("capacity_guest").default(2).notNull(),
    minToConfirm: integer("min_to_confirm").default(0).notNull(),
    creditCost: integer("credit_cost").notNull(), // required, explicit
    guestPriceCents: integer("guest_price_cents").default(3500).notNull(),
    isSignature: boolean("is_signature").default(false).notNull(),
    isFreeWalk: boolean("is_free_walk").default(false).notNull(),
    partnerId: text("partner_id"),
    hostAdminId: text("host_admin_id").references(() => adminUser.id),
    imageId: text("image_id"),
    status: eventStatusEnum("status").default("draft").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    guestOpenAt: timestamp("guest_open_at", { withTimezone: true }),
    guestCloseAt: timestamp("guest_close_at", { withTimezone: true }),
    decisionAt: timestamp("decision_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_event_status_starts").on(table.status, table.startsAt),
  ]
);

export const booking = pgTable(
  "booking",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id").notNull().references(() => event.id),
    personId: text("person_id").notNull().references(() => person.id),
    memberId: text("member_id").references(() => member.id),
    kind: bookingKindEnum("kind").notNull(),
    status: bookingStatusEnum("status").default("held").notNull(),
    creditsCharged: integer("credits_charged").default(0).notNull(),
    moneyPaidCents: integer("money_paid_cents").default(0).notNull(),
    passId: text("pass_id"),
    bookedAt: timestamp("booked_at", { withTimezone: true }).defaultNow().notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    attendedAt: timestamp("attended_at", { withTimezone: true }),
    noShow: boolean("no_show").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_booking_event_status").on(table.eventId, table.status),
    index("idx_booking_person_status").on(table.personId, table.status),
    uniqueIndex("idx_unique_active_booking")
      .on(table.eventId, table.personId)
      .where(sql`status IN ('held', 'confirmed')`),
  ]
);

export const eventWaitlist = pgTable(
  "event_waitlist",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id").notNull().references(() => event.id),
    personId: text("person_id").notNull().references(() => person.id),
    position: integer("position").notNull(),
    offeredAt: timestamp("offered_at", { withTimezone: true }),
    offerExpiresAt: timestamp("offer_expires_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const eventChangeLog = pgTable(
  "event_change_log",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id").notNull().references(() => event.id),
    changedByAdminId: text("changed_by_admin_id").references(() => adminUser.id),
    fieldName: text("field_name").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// ─── 4. PASSES, CREDITS & MONEY ─────────────────────────────────────────────

export const eventPass = pgTable(
  "event_pass",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    personId: text("person_id").notNull().references(() => person.id),
    eventId: text("event_id").notNull().references(() => event.id),
    priceCents: integer("price_cents").default(3500).notNull(),
    status: passStatusEnum("status").default("paid").notNull(),
    ticketTokenHash: text("ticket_token_hash").notNull().unique(),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).defaultNow().notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    creditAppliedToMemberId: text("credit_applied_to_member_id").references(() => member.id),
    creditExpiresAt: timestamp("credit_expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const creditEntry = pgTable(
  "credit_entry",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    memberId: text("member_id").notNull().references(() => member.id),
    amount: integer("amount").notNull(), // signed integer (e.g. +20, -18)
    type: creditEntryTypeEnum("type").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }), // grants only
    sourceType: text("source_type").notNull(), // 'booking', 'event', 'window', 'admin_user', 'godmother'
    sourceId: text("source_id"),
    reason: text("reason"),
    actorAdminId: text("actor_admin_id").references(() => adminUser.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_credit_entry_member_created").on(table.memberId, table.createdAt),
    index("idx_credit_entry_member_expires")
      .on(table.memberId, table.expiresAt)
      .where(sql`type = 'grant'`),
  ]
);

export const creditAllocation = pgTable(
  "credit_allocation",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    spendEntryId: text("spend_entry_id").notNull().references(() => creditEntry.id),
    grantEntryId: text("grant_entry_id").notNull().references(() => creditEntry.id),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const payment = pgTable(
  "payment",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    personId: text("person_id").notNull().references(() => person.id),
    purpose: text("purpose").notNull(), // 'joining_fee', 'subscription', 'event_pass'
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").default("EUR").notNull(),
    status: text("status").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    stripeInvoiceId: text("stripe_invoice_id"),
    refundedCents: integer("refunded_cents").default(0).notNull(),
    failureCode: text("failure_code"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const godmotherReferral = pgTable(
  "godmother_referral",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    referrerMemberId: text("referrer_member_id").notNull().references(() => member.id),
    referredPersonId: text("referred_person_id").notNull().references(() => person.id),
    code: text("code").notNull().unique(),
    status: godmotherStatusEnum("status").default("pending").notNull(),
    qualifiedAt: timestamp("qualified_at", { withTimezone: true }),
    payoutCreditEntryId: text("payout_credit_entry_id").references(() => creditEntry.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// ─── 5. CONTENT, CMS, AUDIT & PLUMBING ──────────────────────────────────────

export const partner = pgTable(
  "partner",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    umbrella: text("umbrella").notNull(),
    specialty: text("specialty").notNull(),
    description: text("description").notNull(),
    offerForMembers: text("offer_for_members").notNull(),
    links: jsonb("links").default({}),
    logoImageId: text("logo_image_id"),
    status: text("status").default("active").notNull(),
    exclusiveFrom: timestamp("exclusive_from", { withTimezone: true }),
    exclusiveUntil: timestamp("exclusive_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const journalPost = pgTable(
  "journal_post",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    excerpt: text("excerpt").notNull(),
    body: text("body").notNull(),
    author: text("author").notNull(),
    heroImageId: text("hero_image_id"),
    status: text("status").default("draft").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const pageContent = pgTable(
  "page_content",
  {
    key: text("key").primaryKey(), // e.g. 'home_hero_text', 'membership_quote'
    value: jsonb("value").notNull(),
    updatedByAdminId: text("updated_by_admin_id").references(() => adminUser.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const faqItem = pgTable(
  "faq_item",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    questionEn: text("question_en").notNull(),
    answerEn: text("answer_en").notNull(),
    questionEs: text("question_es").notNull(),
    answerEs: text("answer_es").notNull(),
    category: text("category").default("general").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const setting = pgTable(
  "setting",
  {
    key: text("key").primaryKey(), // e.g. 'shipping_price_cents', 'credit_cap', 'guest_window_offset_days'
    value: jsonb("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const emailLog = pgTable(
  "email_log",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    personId: text("person_id").notNull().references(() => person.id),
    templateKey: text("template_key").notNull(),
    dedupeKey: text("dedupe_key").notNull().unique(), // template + entity + date
    payload: jsonb("payload").notNull(),
    status: text("status").default("queued").notNull(), // 'queued', 'sent', 'delivered', 'bounced', 'failed'
    providerId: text("provider_id"),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_email_log_person_sent").on(table.personId, table.sentAt),
  ]
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    actorId: text("actor_id"),
    actorType: text("actor_type").notNull(), // 'admin', 'member', 'system', 'stripe_webhook'
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: text("ip"),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const consentRecord = pgTable(
  "consent_record",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    personId: text("person_id").notNull().references(() => person.id),
    purpose: text("purpose").notNull(), // 'marketing', 'terms_of_service', 'privacy_policy'
    granted: boolean("granted").notNull(),
    textShownVerbatim: text("text_shown_verbatim").notNull(),
    version: text("version").notNull(),
    ip: text("ip"),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const jobRun = pgTable(
  "job_run",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    jobKey: text("job_key").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    outcome: text("outcome").notNull(), // 'success', 'failed', 'partial'
    counts: jsonb("counts"),
    error: text("error"),
  }
);

export const stripeEvent = pgTable(
  "stripe_event",
  {
    id: text("id").primaryKey(), // Stripe event id (e.g. evt_...)
    type: text("type").notNull(),
    payload: jsonb("payload").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
  }
);
