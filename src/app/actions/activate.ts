"use server";

import { db } from "@/db";
import { application, person, member, memberCredential, creditEntry, auditLog, window } from "@/db/schema";
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

  const memberRecord = await db.query.member.findFirst({
    where: eq(member.personId, appRecord.personId),
  });

  const windowRecord = await db.query.window.findFirst({
    where: eq(window.id, appRecord.windowId),
  });

  return {
    success: true,
    application: appRecord,
    person: personRecord,
    member: memberRecord,
    window: windowRecord,
    monthlyPriceCents: windowRecord?.monthlyPriceCents || 2900,
    joiningFeeCents: windowRecord?.joiningFeeCents || 1900,
  };
}

export async function saveMemberPassword(token: string, password: string) {
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

    // Hash password & store in member_credential
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

    return { success: true };
  } catch (error: any) {
    console.error("saveMemberPassword error:", error);
    return { success: false, error: error?.message || "PASSWORD_SAVE_FAILED" };
  }
}
