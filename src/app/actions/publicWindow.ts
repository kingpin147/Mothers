"use server";

import { db } from "@/db";
import { application, window, waitlistEntry, person } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

export async function getPublicMembershipWindow() {
  const currentWindow = await db.query.window.findFirst({
    where: eq(window.status, "open"),
  });

  if (!currentWindow) return { open: false, spotsRemaining: 0 };

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(application)
    .where(and(
      eq(application.windowId, currentWindow.id),
      inArray(application.status, ["accepted", "paid"]),
    ));

  return {
    open: true,
    spotsRemaining: Math.max(0, currentWindow.placesOffered - Number(result?.count || 0)),
  };
}

export async function subscribeToLetter(email: string) {
  if (!email || !email.includes("@")) return { success: false, error: "INVALID_EMAIL" };
  const cleanEmail = email.toLowerCase().trim();
  try {
    let personRecord = await db.query.person.findFirst({ where: eq(person.email, cleanEmail) });
    if (!personRecord) {
      const [p] = await db.insert(person).values({ firstName: "", lastName: "", email: cleanEmail, source: "letter" }).returning();
      personRecord = p;
    }
    const existing = await db.query.waitlistEntry.findFirst({ where: eq(waitlistEntry.personId, personRecord.id) });
    if (!existing) {
      await db.insert(waitlistEntry).values({ personId: personRecord.id, source: "letter" });
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message };
  }
}