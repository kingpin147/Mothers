"use server";

import { db } from "@/db";
import { proReview, partner, person, member } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { verifyAdmin } from "@/lib/adminAuth";

export async function submitProReview(data: {
  proId: string;
  vote: "yes" | "no";
  tags?: string[];
  text?: string;
  anon?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "AUTH_REQUIRED" };
  }
  const accountId = session.user.id;

  const vote = data.vote === "no" ? "no" : "yes";
  const tags = (data.tags || []).slice(0, 3);
  const text = (data.text || "").trim().slice(0, 300);
  const anon = Boolean(data.anon);

  // Check existing review
  const existing = await db.query.proReview.findFirst({
    where: and(eq(proReview.proId, data.proId), eq(proReview.accountId, accountId)),
  });

  if (existing) {
    await db
      .update(proReview)
      .set({
        vote,
        tags,
        text,
        anon,
        hidden: false,
      })
      .where(eq(proReview.id, existing.id));
  } else {
    await db.insert(proReview).values({
      proId: data.proId,
      accountId,
      vote,
      tags,
      text,
      anon,
      hidden: false,
    });
  }

  // Recalculate partner counts
  const counts = await db
    .select({
      yesCount: sql<number>`count(*) filter (where ${proReview.vote} = 'yes' and ${proReview.hidden} = false)::int`,
      noCount: sql<number>`count(*) filter (where ${proReview.vote} = 'no')::int`,
    })
    .from(proReview)
    .where(eq(proReview.proId, data.proId));

  const yesCount = counts[0]?.yesCount || 0;
  const noCount = counts[0]?.noCount || 0;

  await db
    .update(partner)
    .set({
      recommendationCount: yesCount,
      notForMeCount: noCount,
      updatedAt: new Date(),
    })
    .where(eq(partner.id, data.proId));

  return { success: true };
}

export async function getProReviews(proId: string) {
  const session = await auth();
  const currentUserId = session?.user?.id || null;

  const [reviewsList, partnerData, userReview] = await Promise.all([
    db
      .select({
        id: proReview.id,
        vote: proReview.vote,
        tags: proReview.tags,
        text: proReview.text,
        anon: proReview.anon,
        createdAt: proReview.createdAt,
        firstName: person.firstName,
        neighbourhood: member.neighbourhood,
      })
      .from(proReview)
      .innerJoin(person, eq(proReview.accountId, person.id))
      .leftJoin(member, eq(member.personId, person.id))
      .where(
        and(
          eq(proReview.proId, proId),
          eq(proReview.vote, "yes"),
          eq(proReview.hidden, false)
        )
      )
      .orderBy(desc(proReview.createdAt)),
    db.query.partner.findFirst({
      where: eq(partner.id, proId),
    }),
    currentUserId
      ? db.query.proReview.findFirst({
          where: and(eq(proReview.proId, proId), eq(proReview.accountId, currentUserId)),
        })
      : null,
  ]);

  // Aggregate tags
  const tagCounts: Record<string, number> = {};
  for (const r of reviewsList) {
    if (r.tags && Array.isArray(r.tags)) {
      for (const t of r.tags) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      }
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  // Take 2 latest public reviews with written text
  const textReviews = reviewsList
    .filter((r) => r.text && r.text.trim().length > 0)
    .slice(0, 2)
    .map((r) => ({
      id: r.id,
      text: r.text,
      author: r.anon
        ? (r.neighbourhood ? `A mother in ${r.neighbourhood}` : "A mother")
        : `${r.firstName || "A mother"}, ${r.neighbourhood || ""}`.trim().replace(/,\s*$/, ""),
      createdAt: r.createdAt,
    }));

  return {
    recommendationCount: partnerData?.recommendationCount || reviewsList.length,
    topTags,
    latestReviews: textReviews,
    myReview: userReview
      ? {
          vote: userReview.vote,
          tags: userReview.tags || [],
          text: userReview.text || "",
          anon: userReview.anon,
        }
      : null,
  };
}

export async function reportProReview(reviewId: string) {
  await db
    .update(proReview)
    .set({ reports: sql`${proReview.reports} + 1` })
    .where(eq(proReview.id, reviewId));
  return { success: true };
}

export async function adminGetProReviews() {
  await verifyAdmin();

  return await db
    .select({
      id: proReview.id,
      proId: proReview.proId,
      proName: partner.name,
      accountId: proReview.accountId,
      accountEmail: person.email,
      accountName: sql<string>`concat(${person.firstName}, ' ', ${person.lastName})`,
      vote: proReview.vote,
      tags: proReview.tags,
      text: proReview.text,
      anon: proReview.anon,
      hidden: proReview.hidden,
      reports: proReview.reports,
      createdAt: proReview.createdAt,
    })
    .from(proReview)
    .innerJoin(partner, eq(proReview.proId, partner.id))
    .innerJoin(person, eq(proReview.accountId, person.id))
    .orderBy(desc(proReview.reports), desc(proReview.createdAt));
}

export async function adminToggleHideProReview(reviewId: string, hidden: boolean) {
  await verifyAdmin();

  const [updated] = await db
    .update(proReview)
    .set({ hidden })
    .where(eq(proReview.id, reviewId))
    .returning();

  if (updated) {
    const counts = await db
      .select({
        yesCount: sql<number>`count(*) filter (where ${proReview.vote} = 'yes' and ${proReview.hidden} = false)::int`,
        noCount: sql<number>`count(*) filter (where ${proReview.vote} = 'no')::int`,
      })
      .from(proReview)
      .where(eq(proReview.proId, updated.proId));

    await db
      .update(partner)
      .set({
        recommendationCount: counts[0]?.yesCount || 0,
        notForMeCount: counts[0]?.noCount || 0,
      })
      .where(eq(partner.id, updated.proId));
  }

  return { success: true };
}
