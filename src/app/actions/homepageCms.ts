"use server";

import { db } from "@/db";
import { homeMedia, sponsor } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyAdmin } from "@/lib/adminAuth";

export async function getHomepageMedia() {
  try {
    const rows = await db.select().from(homeMedia);
    const mediaMap: Record<string, {
      imageUrl?: string | null;
      focalPoint: string;
      altText: string;
      parentConsentConfirmed: boolean;
      quoteText?: string | null;
      quoteWho?: string | null;
    }> = {};

    for (const r of rows) {
      mediaMap[r.id] = {
        imageUrl: r.imageUrl,
        focalPoint: r.focalPoint,
        altText: r.altText,
        parentConsentConfirmed: r.parentConsentConfirmed,
        quoteText: r.quoteText,
        quoteWho: r.quoteWho,
      };
    }

    // Also get active sponsor for current month (YYYY-MM)
    const currentMonth = new Date().toISOString().slice(0, 7);
    const activeSponsor = await db.query.sponsor.findFirst({
      where: and(eq(sponsor.month, currentMonth), eq(sponsor.status, "live")),
    });

    return { media: mediaMap, sponsor: activeSponsor || null };
  } catch (err) {
    console.error("Error loading homepage media:", err);
    return { media: {}, sponsor: null };
  }
}

export async function adminSaveHomepageSlot(data: {
  id: string;
  imageUrl?: string | null;
  focalPoint?: string;
  altText?: string;
  parentConsentConfirmed?: boolean;
  quoteText?: string | null;
  quoteWho?: string | null;
}) {
  await verifyAdmin();

  const existing = await db.query.homeMedia.findFirst({
    where: eq(homeMedia.id, data.id),
  });

  if (existing) {
    await db
      .update(homeMedia)
      .set({
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.focalPoint !== undefined && { focalPoint: data.focalPoint }),
        ...(data.altText !== undefined && { altText: data.altText }),
        ...(data.parentConsentConfirmed !== undefined && { parentConsentConfirmed: data.parentConsentConfirmed }),
        ...(data.quoteText !== undefined && { quoteText: data.quoteText }),
        ...(data.quoteWho !== undefined && { quoteWho: data.quoteWho }),
        updatedAt: new Date(),
      })
      .where(eq(homeMedia.id, data.id));
  } else {
    await db.insert(homeMedia).values({
      id: data.id,
      imageUrl: data.imageUrl || null,
      focalPoint: data.focalPoint || "center",
      altText: data.altText || "",
      parentConsentConfirmed: Boolean(data.parentConsentConfirmed),
      quoteText: data.quoteText || null,
      quoteWho: data.quoteWho || null,
    });
  }

  return { success: true };
}
