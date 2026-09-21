"use server";

import { db } from "@/db";
import { application, person, member, memberCredential, creditEntry, auditLog, window } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const tokenSchema = z.string().trim().min(1, "Token is required");
const savePasswordSchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
  password: z.string().min(8, "PASSWORD_TOO_SHORT"),
});

export async function getActivationDetails(rawToken: string) {
  const parsed = tokenSchema.safeParse(rawToken);
  if (!parsed.success) {
    return { success: false, error: "INVALID_OR_EXPIRED_TOKEN" };
  }
  const token = parsed.data;

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

  const credRecord = personRecord ? await db.query.memberCredential.findFirst({
    where: eq(memberCredential.personId, personRecord.id),
  }) : null;

  return {
    success: true,
    application: appRecord,
    person: personRecord,
    member: memberRecord,
    window: windowRecord,
    monthlyPriceCents: windowRecord?.monthlyPriceCents || 3900,
    joiningFeeCents: windowRecord?.joiningFeeCents || 1900,
    hasPasswordSet: !!credRecord,
  };
}

export async function saveMemberPassword(rawToken: string, rawPassword: string) {
  const parsed = savePasswordSchema.safeParse({ token: rawToken, password: rawPassword });
  if (!parsed.success) {
    const isPwErr = parsed.error.issues.some(i => i.message === "PASSWORD_TOO_SHORT");
    return { success: false, error: isPwErr ? "PASSWORD_TOO_SHORT" : "INVALID_INPUT" };
  }
  const { token, password } = parsed.data;

  try {
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
