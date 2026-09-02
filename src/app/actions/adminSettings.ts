"use server";

import { db } from "@/db";
import { setting, window, auditLog, person, member } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

async function verifyAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
    throw new Error("UNAUTHORIZED_ADMIN");
  }
  return { adminId: session?.user?.id, role };
}

// ─── 1. GET & UPDATE CLUB SETTINGS ──────────────────────────────────────────

export async function getClubSettings() {
  await verifyAdmin();

  const settingsRows = await db.select().from(setting);
  const currentWindow = await db.query.window.findFirst({
    where: eq(window.status, "open"),
  });

  const settingsMap: Record<string, any> = {};
  for (const s of settingsRows) {
    settingsMap[s.key] = s.value;
  }

  return {
    success: true,
    settings: {
      monthlyGrantCredits: settingsMap["monthly_grant_credits"] ?? 20,
      rolloverCapCredits: settingsMap["rollover_cap_credits"] ?? 0,
      referralBonusCredits: settingsMap["referral_bonus_credits"] ?? 5,
      guestPassPriceCents: settingsMap["guest_pass_price_cents"] ?? 3500,
      maxLifetimeGuestPasses: settingsMap["max_lifetime_guest_passes"] ?? 2,
      
      passToMemberDays: settingsMap["pass_to_member_days"] ?? 30,
      passCreditCeiling: settingsMap["pass_credit_ceiling"] ?? 18,
      guestPlacesDefault: settingsMap["guest_places_default"] ?? 2,
      guestsOpenDays: settingsMap["guests_open_days"] ?? 14,
      guestsCloseDays: settingsMap["guests_close_days"] ?? 2,
      
      creditLifeMonths: settingsMap["credit_life_months"] ?? 6,
      expiryWarningDays: settingsMap["expiry_warning_days"] ?? 30,
      topUpPriceCents: settingsMap["top_up_price_cents"] ?? 100,
      releaseDeadlineHours: settingsMap["release_deadline_hours"] ?? 48,
      
      godmotherThreeMonthBonus: settingsMap["godmother_three_month_bonus"] ?? 15,
      godmotherFriendsLimit: settingsMap["godmother_friends_limit"] ?? 0,
      godmotherBonusLife: settingsMap["godmother_bonus_life"] ?? 6,
      
      answerAppHours: settingsMap["answer_app_hours"] ?? 72,
      paymentLinkHours: settingsMap["payment_link_hours"] ?? 72,
      pauseAllowanceMonths: settingsMap["pause_allowance_months"] ?? 2,
      rateHeldMonths: settingsMap["rate_held_months"] ?? 12,
      
      scheduleMembersFrom: settingsMap["schedule_members_from"] ?? 28,
      scheduleGuestsOpen: settingsMap["schedule_guests_open"] ?? 14,
      scheduleEarlyWarning: settingsMap["schedule_early_warning"] ?? 10,
      scheduleDecisionPoint: settingsMap["schedule_decision_point"] ?? 7,
      scheduleGuestsClose: settingsMap["schedule_guests_close"] ?? 2,
    },
    currentWindow: currentWindow || null,
  };
}

export async function updateClubSettings(data: {
  joiningFeeCents?: number;
  openingMonthlyPriceCents?: number;
  openingQuarterlyPriceCents?: number;
  standardMonthlyPriceCents?: number;
  passToMemberDays?: number;
  
  guestPassPriceCents?: number;
  passCreditCeiling?: number;
  maxLifetimeGuestPasses?: number;
  guestPlacesDefault?: number;
  guestsOpenDays?: number;
  guestsCloseDays?: number;
  
  monthlyGrantCredits?: number;
  creditLifeMonths?: number;
  rolloverCapCredits?: number;
  expiryWarningDays?: number;
  topUpPriceCents?: number;
  releaseDeadlineHours?: number;
  
  referralBonusCredits?: number;
  godmotherThreeMonthBonus?: number;
  godmotherFriendsLimit?: number;
  godmotherBonusLife?: number;
  
  answerAppHours?: number;
  paymentLinkHours?: number;
  pauseAllowanceMonths?: number;
  placesOffered?: number;
  rateHeldMonths?: number;
  
  scheduleMembersFrom?: number;
  scheduleGuestsOpen?: number;
  scheduleEarlyWarning?: number;
  scheduleDecisionPoint?: number;
  scheduleGuestsClose?: number;
}) {
  const { adminId } = await verifyAdmin();

  const settingEntries = [
    { key: "pass_to_member_days", value: data.passToMemberDays },
    { key: "guest_pass_price_cents", value: data.guestPassPriceCents },
    { key: "pass_credit_ceiling", value: data.passCreditCeiling },
    { key: "max_lifetime_guest_passes", value: data.maxLifetimeGuestPasses },
    { key: "guest_places_default", value: data.guestPlacesDefault },
    { key: "guests_open_days", value: data.guestsOpenDays },
    { key: "guests_close_days", value: data.guestsCloseDays },
    { key: "monthly_grant_credits", value: data.monthlyGrantCredits },
    { key: "credit_life_months", value: data.creditLifeMonths },
    { key: "rollover_cap_credits", value: data.rolloverCapCredits },
    { key: "expiry_warning_days", value: data.expiryWarningDays },
    { key: "top_up_price_cents", value: data.topUpPriceCents },
    { key: "release_deadline_hours", value: data.releaseDeadlineHours },
    { key: "referral_bonus_credits", value: data.referralBonusCredits },
    { key: "godmother_three_month_bonus", value: data.godmotherThreeMonthBonus },
    { key: "godmother_friends_limit", value: data.godmotherFriendsLimit },
    { key: "godmother_bonus_life", value: data.godmotherBonusLife },
    { key: "answer_app_hours", value: data.answerAppHours },
    { key: "payment_link_hours", value: data.paymentLinkHours },
    { key: "pause_allowance_months", value: data.pauseAllowanceMonths },
    { key: "rate_held_months", value: data.rateHeldMonths },
    { key: "schedule_members_from", value: data.scheduleMembersFrom },
    { key: "schedule_guests_open", value: data.scheduleGuestsOpen },
    { key: "schedule_early_warning", value: data.scheduleEarlyWarning },
    { key: "schedule_decision_point", value: data.scheduleDecisionPoint },
    { key: "schedule_guests_close", value: data.scheduleGuestsClose },
  ].filter(s => s.value !== undefined);

  for (const s of settingEntries) {
    await db
      .insert(setting)
      .values(s)
      .onConflictDoUpdate({
        target: setting.key,
        set: { value: s.value, updatedAt: new Date() },
      });
  }

  // Update open window if places / pricing provided
  if (data.placesOffered !== undefined || data.openingMonthlyPriceCents !== undefined || data.joiningFeeCents !== undefined) {
    const openWindow = await db.query.window.findFirst({
      where: eq(window.status, "open"),
    });

    if (openWindow) {
      await db
        .update(window)
        .set({
          placesOffered: data.placesOffered ?? openWindow.placesOffered,
          monthlyPriceCents: data.openingMonthlyPriceCents ?? openWindow.monthlyPriceCents,
          joiningFeeCents: data.joiningFeeCents ?? openWindow.joiningFeeCents,
          updatedAt: new Date(),
        })
        .where(eq(window.id, openWindow.id));
    }
  }

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "update_club_settings",
    entity: "setting",
    entityId: "global",
    after: data,
  });

  return { success: true };
}

export async function getMembershipWindows() {
  await verifyAdmin();
  const windows = await db.select().from(window).orderBy(desc(window.createdAt));
  return { success: true, windows };
}

export async function createMembershipWindow(data: {
  opensAt: string;
  closesAt: string;
  placesOffered: number;
  openingMonthlyPriceCents: number;
  openingQuarterlyPriceCents: number;
  standardMonthlyPriceCents: number;
  standardQuarterlyPriceCents: number;
}) {
  const { adminId } = await verifyAdmin();
  if (new Date(data.closesAt) <= new Date(data.opensAt) || data.placesOffered < 1) {
    return { success: false, error: "INVALID_WINDOW" };
  }

  const existingOpen = await db.query.window.findFirst({ where: eq(window.status, "open") });
  if (existingOpen) return { success: false, error: "WINDOW_ALREADY_OPEN" };

  const [created] = await db.insert(window).values({
    opensAt: new Date(data.opensAt),
    closesAt: new Date(data.closesAt),
    placesOffered: data.placesOffered,
    joiningFeeCents: 1900,
    monthlyPriceCents: data.openingMonthlyPriceCents,
    launchRate: true,
    lockMonths: 12,
    status: "draft",
  }).returning();

  await db.insert(setting).values({
    key: `window_prices_${created.id}`,
    value: {
      openingMonthlyPriceCents: data.openingMonthlyPriceCents,
      openingQuarterlyPriceCents: data.openingQuarterlyPriceCents,
      standardMonthlyPriceCents: data.standardMonthlyPriceCents,
      standardQuarterlyPriceCents: data.standardQuarterlyPriceCents,
    },
  }).onConflictDoUpdate({
    target: setting.key,
    set: { value: {
      openingMonthlyPriceCents: data.openingMonthlyPriceCents,
      openingQuarterlyPriceCents: data.openingQuarterlyPriceCents,
      standardMonthlyPriceCents: data.standardMonthlyPriceCents,
      standardQuarterlyPriceCents: data.standardQuarterlyPriceCents,
    }, updatedAt: new Date() },
  });

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "create_membership_window",
    entity: "window",
    entityId: created.id,
    after: data,
  });
  return { success: true, window: created };
}

export async function setMembershipWindowStatus(windowId: string, status: "open" | "closed") {
  const { adminId } = await verifyAdmin();
  const target = await db.query.window.findFirst({ where: eq(window.id, windowId) });
  if (!target) return { success: false, error: "WINDOW_NOT_FOUND" };
  if (status === "open") {
    const openWindow = await db.query.window.findFirst({ where: eq(window.status, "open") });
    if (openWindow && openWindow.id !== windowId) return { success: false, error: "WINDOW_ALREADY_OPEN" };
  }
  await db.update(window).set({ status, updatedAt: new Date() }).where(eq(window.id, windowId));
  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: `${status}_membership_window`,
    entity: "window",
    entityId: windowId,
    before: { status: target.status },
    after: { status },
  });
  return { success: true };
}

// ─── 2. UPDATE MEMBER PROFILE (STAGE / AREA / NOTES) ─────────────────────────

export async function adminUpdateMemberProfile(data: {
  memberId: string;
  stage: string;
  neighbourhood: string;
  phone?: string;
  notesInternal?: string;
}) {
  const { adminId } = await verifyAdmin();

  const targetMember = await db.query.member.findFirst({
    where: eq(member.id, data.memberId),
  });
  if (!targetMember) return { success: false, error: "MEMBER_NOT_FOUND" };

  await db.transaction(async (tx) => {
    await tx
      .update(member)
      .set({
        stage: data.stage,
        neighbourhood: data.neighbourhood,
        updatedAt: new Date(),
      })
      .where(eq(member.id, data.memberId));

    await tx
      .update(person)
      .set({
        phoneE164: data.phone || null,
        notesInternal: data.notesInternal || null,
        updatedAt: new Date(),
      })
      .where(eq(person.id, targetMember.personId));

    await tx.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "update_member_profile",
      entity: "member",
      entityId: data.memberId,
      after: data,
    });
  });

  return { success: true };
}
