"use server";

import { db } from "@/db";
import { setting, auditLog, person, member, leadEntry } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function verifyAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
    throw new Error("UNAUTHORIZED_ADMIN");
  }
  return { adminId: session?.user?.id || "admin", role };
}

// ─── 0. PUBLIC SETTINGS READER (§M-01) ───────────────────────────────────────

export async function checkEmailOnWaitlist(email: string) {
  if (!email || !email.includes("@")) return { onList: false };
  try {
    const normalized = email.trim().toLowerCase();
    const found = await db.query.leadEntry.findFirst({
      where: eq(leadEntry.email, normalized),
    });
    return { onList: !!found };
  } catch {
    return { onList: false };
  }
}

export async function getPublicClubSettings() {
  try {
    const settingsRows = await db.select().from(setting);
    const settingsMap: Record<string, any> = {};
    for (const s of settingsRows) {
      settingsMap[s.key] = s.value;
    }
    return {
      membershipLive: Boolean(settingsMap["membership_live"] ?? false),
      priceDisplay: (settingsMap["price_display"] as "single" | "dual") ?? "single",
      topUpPriceCents: Number(settingsMap["top_up_price_cents"] ?? 200),
      expectedLaunch: settingsMap["expected_launch"] ?? "2027-01-06",
      joiningFeeCents: Number(settingsMap["joining_fee_cents"] ?? 1900),
      monthlyFeeCents: Number(settingsMap["monthly_fee_cents"] ?? 3900),
      quarterlyFeeCents: Number(settingsMap["quarterly_fee_cents"] ?? 9900),
      referralBonusCredits: Number(settingsMap["referral_bonus_credits"] ?? 5),
    };
  } catch {
    return {
      membershipLive: false,
      priceDisplay: "single" as const,
      topUpPriceCents: 200,
      expectedLaunch: "2027-01-06",
      joiningFeeCents: 1900,
      monthlyFeeCents: 3900,
      quarterlyFeeCents: 9900,
      referralBonusCredits: 5,
    };
  }
}

// ─── 1. GET & UPDATE CLUB SETTINGS ──────────────────────────────────────────

export async function getClubSettings() {
  await verifyAdmin();

  const settingsRows = await db.select().from(setting);


  const settingsMap: Record<string, any> = {};
  for (const s of settingsRows) {
    settingsMap[s.key] = s.value;
  }

  return {
    success: true,
    settings: {
      membershipLive: settingsMap["membership_live"] ?? false,
      expectedLaunch: settingsMap["expected_launch"] ?? "2027-01-06",
      priceDisplay: settingsMap["price_display"] ?? "single",

      joiningFeeCents: settingsMap["joining_fee_cents"] ?? 1900,
      monthlyFeeCents: settingsMap["monthly_fee_cents"] ?? 3900,
      quarterlyFeeCents: settingsMap["quarterly_fee_cents"] ?? 9900,

      nonMemberMarkup: settingsMap["non_member_markup"] ?? 1.5,

      monthlyGrantCredits: settingsMap["monthly_grant_credits"] ?? 20,
      quarterlyGrantCredits: settingsMap["quarterly_grant_credits"] ?? 60,
      creditLifeMonths: settingsMap["credit_life_months"] ?? 6,
      rolloverCapCredits: settingsMap["rollover_cap_credits"] ?? null,
      expiryWarningDays: settingsMap["expiry_warning_days"] ?? 30,
      topUpPriceCents: settingsMap["top_up_price_cents"] ?? 200,
      releaseDeadlineHours: settingsMap["release_deadline_hours"] ?? 48,

      referralBonusCredits: settingsMap["referral_bonus_credits"] ?? 5,
      godmotherBonusLife: settingsMap["godmother_bonus_life"] ?? 6,
      pauseAllowanceMonths: settingsMap["pause_allowance_months"] ?? 2,

      scheduleMembersFrom: settingsMap["schedule_members_from"] ?? 28,
      scheduleEarlyWarning: settingsMap["schedule_early_warning"] ?? 10,
      scheduleDecisionPoint: settingsMap["schedule_decision_point"] ?? 7,
      pinnedCircleTag: settingsMap["pinned_circle_tag"] ?? "",
      blockedCircleTags: settingsMap["blocked_circle_tags"] ?? "",
    },
    currentWindow: null,
  };
}

export async function saveClubSettingsAudit(
  settingsPatch: Record<string, any>,
  auditInfo?: { summary: string; flaggedPages: string }
) {
  const { adminId } = await verifyAdmin();

  // Read previous settings to save before/after
  const prevRows = await db.select().from(setting);
  const prevMap: Record<string, any> = {};
  for (const s of prevRows) {
    prevMap[s.key] = s.value;
  }

  const entriesToUpdate: { key: string; value: any }[] = [];

  const keyMapping: Record<string, string> = {
    membershipLive: "membership_live",
    expectedLaunch: "expected_launch",
    priceDisplay: "price_display",
    joiningFee: "joining_fee_cents",
    monthlyFee: "monthly_fee_cents",
    quarterlyFee: "quarterly_fee_cents",
    nonMemberWalkCredits: "non_member_walk_credits",
    nonMemberMarkup: "non_member_markup",
    monthlyCredits: "monthly_grant_credits",
    quarterlyCredits: "quarterly_grant_credits",
    creditExpiryMonths: "credit_life_months",
    rolloverCeiling: "rollover_cap_credits",
    expiryWarningDays: "expiry_warning_days",
    topUpCreditPrice: "top_up_price_cents",
    releaseDeadlineHours: "release_deadline_hours",
    godmotherBonusReferrer: "referral_bonus_credits",
    godmotherBonusLife: "godmother_bonus_life",
    pauseAllowanceMonths: "pause_allowance_months",
    scheduleMembersFrom: "schedule_members_from",
    scheduleEarlyWarning: "schedule_early_warning",
    scheduleDecisionPoint: "schedule_decision_point",
    pinnedCircleTag: "pinned_circle_tag",
    blockedCircleTags: "blocked_circle_tags",
  };

  for (const [k, v] of Object.entries(settingsPatch)) {
    const dbKey = keyMapping[k] || k;
    let dbValue = v;
    if (k === "joiningFee" || k === "monthlyFee" || k === "quarterlyFee" || k === "topUpCreditPrice") {
      if (typeof v === "number") dbValue = v * 100;
    }
    entriesToUpdate.push({ key: dbKey, value: dbValue });
  }

  for (const s of entriesToUpdate) {
    await db
      .insert(setting)
      .values(s)
      .onConflictDoUpdate({
        target: setting.key,
        set: { value: s.value, updatedAt: new Date() },
      });
  }

  if (auditInfo) {
    await db.insert(auditLog).values({
      actorId: adminId,
      actorType: "admin",
      action: "update_club_settings",
      entity: "setting",
      entityId: "global_settings",
      before: prevMap,
      after: { ...prevMap, ...settingsPatch },
    });
  }

  return { success: true };
}

export async function setMembershipLiveMode(live: boolean, switchDualPrice: boolean = false) {
  const { adminId } = await verifyAdmin();

  await db
    .insert(setting)
    .values({ key: "membership_live", value: live })
    .onConflictDoUpdate({
      target: setting.key,
      set: { value: live, updatedAt: new Date() },
    });

  if (live) {
    const existingLiveAt = await db.query.setting.findFirst({
      where: eq(setting.key, "membership_live_at"),
    });
    if (!existingLiveAt) {
      await db
        .insert(setting)
        .values({ key: "membership_live_at", value: new Date().toISOString() })
        .onConflictDoNothing();
    }
  }

  if (!live && switchDualPrice) {
    await db
      .insert(setting)
      .values({ key: "price_display", value: "dual" })
      .onConflictDoUpdate({
        target: setting.key,
        set: { value: "dual", updatedAt: new Date() },
      });
  } else if (!live) {
    await db
      .insert(setting)
      .values({ key: "price_display", value: "single" })
      .onConflictDoUpdate({
        target: setting.key,
        set: { value: "single", updatedAt: new Date() },
      });
  }

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: live ? "activate_membership_plan" : "deactivate_membership_plan",
    entity: "setting",
    entityId: "membership_live",
    after: { membership_live: live, price_display: switchDualPrice ? "dual" : "single" },
  });

  return { success: true };
}

export async function setPriceDisplayMode(mode: "single" | "dual") {
  const { adminId } = await verifyAdmin();

  await db
    .insert(setting)
    .values({ key: "price_display", value: mode })
    .onConflictDoUpdate({
      target: setting.key,
      set: { value: mode, updatedAt: new Date() },
    });

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "set_price_display_mode",
    entity: "setting",
    entityId: "price_display",
    after: { price_display: mode },
  });

  return { success: true };
}


// ─── 3. ADMIN UPDATE MEMBER PROFILE ─────────────────────────────────────────

export async function adminUpdateMemberProfile(rawData: {
  memberId: string;
  stage: string;
  neighbourhood: string;
  phone?: string;
  notesInternal?: string;
}) {
  const { adminId } = await verifyAdmin();

  const mem = await db.query.member.findFirst({
    where: eq(member.id, rawData.memberId),
  });
  if (!mem) return { success: false, error: "Member not found" };

  await db
    .update(member)
    .set({
      stage: rawData.stage,
      neighbourhood: rawData.neighbourhood,
      updatedAt: new Date(),
    })
    .where(eq(member.id, rawData.memberId));

  if (rawData.phone !== undefined || rawData.notesInternal !== undefined) {
    await db
      .update(person)
      .set({
        phoneE164: rawData.phone,
        notesInternal: rawData.notesInternal,
        updatedAt: new Date(),
      })
      .where(eq(person.id, mem.personId));
  }

  await db.insert(auditLog).values({
    actorId: adminId,
    actorType: "admin",
    action: "admin_update_member_profile",
    entity: "member",
    entityId: rawData.memberId,
    after: rawData,
  });

  return { success: true };
}
