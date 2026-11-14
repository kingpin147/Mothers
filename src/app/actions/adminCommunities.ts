"use server";

import { db } from "@/db";
import { community } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function getAdminCommunitiesAction() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
    throw new Error("UNAUTHORIZED");
  }

  const all = await db
    .select()
    .from(community)
    .orderBy(desc(community.createdAt));

  const requests = all.filter((c) => !c.approved);
  const approved = all.filter((c) => c.approved);

  return { requests, approved };
}

export async function approveCommunityAction(input: {
  communityId: string;
  commissionRatePercent?: number;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const adminId = session?.user?.id;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
    throw new Error("UNAUTHORIZED");
  }

  const [existing] = await db
    .select()
    .from(community)
    .where(eq(community.id, input.communityId))
    .limit(1);

  if (!existing) {
    return { success: false, error: "NOT_FOUND" };
  }

  const defaultCommission = existing.type === "workshop" ? 20 : 15;
  const commission = typeof input.commissionRatePercent === "number" && input.commissionRatePercent >= 0
    ? input.commissionRatePercent
    : defaultCommission;

  await db
    .update(community)
    .set({
      approved: true,
      approvedAt: new Date(),
      approvedByAdminId: adminId || null,
      commissionRatePercent: commission,
      updatedAt: new Date(),
    })
    .where(eq(community.id, input.communityId));

  return { success: true };
}

export async function rejectCommunityAction(input: {
  communityId: string;
  reason?: string;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
    throw new Error("UNAUTHORIZED");
  }

  await db
    .delete(community)
    .where(eq(community.id, input.communityId));

  return { success: true };
}

export async function updateCommunityCommissionAction(input: {
  communityId: string;
  commissionRatePercent: number;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
    throw new Error("UNAUTHORIZED");
  }

  await db
    .update(community)
    .set({
      commissionRatePercent: input.commissionRatePercent,
      updatedAt: new Date(),
    })
    .where(eq(community.id, input.communityId));

  return { success: true };
}
