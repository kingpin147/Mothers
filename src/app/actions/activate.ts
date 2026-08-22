"use server";

import { db } from "@/db";
import { application, person, member, memberCredential, creditEntry, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function getActivationDetails(token: string) {
  const appRecord = await db.query.application.findFirst({
    where: eq(application.paymentLinkToken, token),
  });

  if (!appRecord || appRecord.status !== "accepted") {
    return { success: false, error: "INVALID_OR_EXPIRED_TOKEN" };
  }

  if (appRecord.acceptExpiresAt && new Date() > new Date(appRecord.acceptExpiresAt)) {
    return { success: false, error: "TOKEN_EXPIRED" };
  }

  const personRecord = await db.query.person.findFirst({
    where: eq(person.id, appRecord.personId),
  });

  return {
    success: true,
    application: appRecord,
    person: personRecord,
    monthlyPriceCents: 2900,
    joiningFeeCents: 5800,
  };
}

export async function completeMembershipActivation(token: string, password: string) {
  try {
    if (!password || password.length < 8) {
      return { success: false, error: "PASSWORD_TOO_SHORT" };
    }

    const appRecord = await db.query.application.findFirst({
      where: eq(application.paymentLinkToken, token),
    });

    if (!appRecord || appRecord.status !== "accepted") {
      return { success: false, error: "INVALID_TOKEN" };
    }

    if (appRecord.acceptExpiresAt && new Date() > new Date(appRecord.acceptExpiresAt)) {
      return { success: false, error: "TOKEN_EXPIRED" };
    }

    const personRecord = await db.query.person.findFirst({
      where: eq(person.id, appRecord.personId),
    });

    if (!personRecord) {
      return { success: false, error: "PERSON_NOT_FOUND" };
    }

    // 1. Hash password & store in member_credential
    const passwordHash = await bcrypt.hash(password, 12);
    const existingCred = await db.query.memberCredential.findFirst({
      where: eq(memberCredential.personId, personRecord.id),
    });

    if (existingCred) {
      await db
        .update(memberCredential)
        .set({
          passwordHash,
          passwordUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(memberCredential.id, existingCred.id));
    } else {
      await db.insert(memberCredential).values({
        personId: personRecord.id,
        passwordHash,
      });
    }

    // 2. Transition Application to 'paid'
    await db
      .update(application)
      .set({
        status: "paid",
        updatedAt: new Date(),
      })
      .where(eq(application.id, appRecord.id));

    // 3. Activate member & lock rate for 12 months (§20.1)
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const priceLockUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const existingMember = await db.query.member.findFirst({
      where: eq(member.personId, personRecord.id),
    });

    let memberId: string;

    if (existingMember) {
      memberId = existingMember.id;
      await db
        .update(member)
        .set({
          status: "active",
          joinedAt: now,
          monthlyPriceCents: 2900,
          priceLockedUntil: priceLockUntil,
          joiningFeePaidCents: 5800,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          updatedAt: now,
        })
        .where(eq(member.id, existingMember.id));
    } else {
      const insertedMember = await db
        .insert(member)
        .values({
          personId: personRecord.id,
          status: "active",
          joinedAt: now,
          monthlyPriceCents: 2900,
          priceLockedUntil: priceLockUntil,
          joiningFeePaidCents: 5800,
          currentPeriodEnd: periodEnd,
        })
        .returning({ id: member.id });
      memberId = insertedMember[0].id;
    }

    // 4. Grant initial 20 monthly credits (§5)
    await db.insert(creditEntry).values({
      memberId,
      amount: 20,
      type: "grant",
      expiresAt: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000), // 6-month FIFO expiry
      sourceType: "window",
      sourceId: appRecord.windowId,
      reason: "Initial Monthly Grant (Opening Circle)",
    });

    // 5. Audit log
    await db.insert(auditLog).values({
      actorId: personRecord.id,
      actorType: "member",
      action: "activate_membership",
      entity: "member",
      entityId: memberId,
      before: { status: "accepted_awaiting_payment" },
      after: { status: "active", creditBalance: 20 },
    });

    return { success: true, email: personRecord.email };
  } catch (error: any) {
    console.error("completeMembershipActivation error:", error);
    return { success: false, error: error?.message || "ACTIVATION_FAILED" };
  }
}
