"use server";

import { db } from "@/db";
import { setting, window, auditLog, person, member } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

async function verifyAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!role || (role !== "owner" && role !== "manager")) {
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
      rolloverCapCredits: settingsMap["rollover_cap_credits"] ?? 40,
      referralBonusCredits: settingsMap["referral_bonus_credits"] ?? 20,
      guestPassPriceCents: settingsMap["guest_pass_price_cents"] ?? 3500,
      maxLifetimeGuestPasses: settingsMap["max_lifetime_guest_passes"] ?? 2,
    },
    currentWindow: currentWindow || null,
  };
}

export async function updateClubSettings(data: {
  monthlyGrantCredits: number;
  rolloverCapCredits: number;
  referralBonusCredits: number;
  guestPassPriceCents: number;
  maxLifetimeGuestPasses: number;
  placesOffered?: number;
  monthlyPriceCents?: number;
  joiningFeeCents?: number;
}) {
  const { adminId } = await verifyAdmin();

  const settingEntries = [
    { key: "monthly_grant_credits", value: data.monthlyGrantCredits },
    { key: "rollover_cap_credits", value: data.rolloverCapCredits },
    { key: "referral_bonus_credits", value: data.referralBonusCredits },
    { key: "guest_pass_price_cents", value: data.guestPassPriceCents },
    { key: "max_lifetime_guest_passes", value: data.maxLifetimeGuestPasses },
  ];

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
  if (data.placesOffered !== undefined || data.monthlyPriceCents !== undefined) {
    const openWindow = await db.query.window.findFirst({
      where: eq(window.status, "open"),
    });

    if (openWindow) {
      await db
        .update(window)
        .set({
          placesOffered: data.placesOffered ?? openWindow.placesOffered,
          monthlyPriceCents: data.monthlyPriceCents ?? openWindow.monthlyPriceCents,
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
