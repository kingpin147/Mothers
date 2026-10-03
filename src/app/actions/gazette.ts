"use server";

import { db } from "@/db";
import { circlePost, circleReply, circleHeart, circleReport, person, member, setting } from "@/db/schema";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface PostItem {
  id: string;
  author: string;
  isAnonymous: boolean;
  anonymousArea: string | null;
  initial: string;
  topic: string;
  topicLabel: string;
  body: string;
  photos: string[];
  hasPhotos: boolean;
  photoGrid: string;
  heartsCount: number;
  isHearted: boolean;
  repliesCount: number;
  createdAt: string;
  meta: string;
  neighbourhood: string;
  isExpert: boolean;
  status: string;
  replies: ReplyItem[];
}

export interface ReplyItem {
  id: string;
  author: string;
  initial: string;
  body: string;
  meta: string;
  isExpert: boolean;
  isAnonymous: boolean;
}

const TOPIC_LABELS: Record<string, string> = {
  all: "Everything",
  pregnancy: "Pregnancy & birth",
  feeding: "Feeding",
  sleep: "Sleep",
  postpartum: "Postpartum",
  schools: "Nurseries & schools",
  work: "Work & money",
  bcn: "Life in Barcelona",
  friends: "Meetups & friends",
  recs: "Recommendations",
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

export async function checkPostingEligibility() {
  const session = await auth();
  if (!session?.user?.id) {
    return { canPost: false, reason: "login_required" };
  }

  const personId = (session.user as any).personId || session.user.id;
  const user = await db.query.person.findFirst({
    where: eq(person.id, personId),
  });

  if (!user) {
    return { canPost: false, reason: "user_not_found" };
  }

  if (user.isSuspended) {
    return { canPost: false, reason: "account_suspended" };
  }

  if (user.isPaused) {
    return { canPost: false, reason: "account_paused", pausedReason: user.pausedReason };
  }

  // Check if membership is live (§DS-03)
  const settingsRows = await db.select().from(setting);
  const settingsMap: Record<string, any> = {};
  for (const s of settingsRows) settingsMap[s.key] = s.value;
  const isMembershipLive = Boolean(settingsMap["membership_live"] ?? false);

  if (isMembershipLive) {
    // Check if user is an active member
    const mem = await db.query.member.findFirst({
      where: and(eq(member.personId, personId), eq(member.status, "active")),
    });

    if (mem) {
      return {
        canPost: true,
        isMember: true,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      };
    }

    // Non-member: count posts + replies from the first switch-on date (N-23)
    const liveAtRow = settingsRows.find((s) => s.key === "membership_live_at");
    const liveSettingRow = settingsRows.find((s) => s.key === "membership_live");
    const switchDate = liveAtRow?.value
      ? new Date(liveAtRow.value as string)
      : (liveSettingRow?.updatedAt || new Date(0));

    const [postsRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(circlePost)
      .where(and(eq(circlePost.personId, personId), gte(circlePost.createdAt, switchDate)));

    const [repliesRes] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(circleReply)
      .where(and(eq(circleReply.personId, personId), gte(circleReply.createdAt, switchDate)));

    const totalUsed = (postsRes?.count || 0) + (repliesRes?.count || 0);
    const remaining = Math.max(0, 3 - totalUsed);

    if (totalUsed >= 3) {
      return {
        canPost: false,
        reason: "membership_required",
        message: "You have used your 3 free La Gazette posts/replies. Become a member for unlimited conversations.",
        remaining: 0,
        totalUsed,
        isMember: false,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      };
    }

    return {
      canPost: true,
      isMember: false,
      remaining,
      totalUsed,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    };
  }

  // Pre-launch rule (DS-03): any account holder posts and replies freely.
  return {
    canPost: true,
    isPreLaunch: true,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
  };
}

export async function getCirclePosts(selectedTopic?: string, sortBy: "recent" | "trending" = "recent"): Promise<PostItem[]> {
  const session = await auth();
  const currentUserId = session?.user?.id ? ((session.user as any).personId || session.user.id) : null;

  const whereClause = selectedTopic && selectedTopic !== "all"
    ? and(eq(circlePost.topic, selectedTopic), sql`${circlePost.status} IN ('visible', 'hidden')`)
    : sql`${circlePost.status} IN ('visible', 'hidden')`;

  const posts = await db.query.circlePost.findMany({
    where: whereClause,
    orderBy: [desc(circlePost.createdAt)],
    limit: 60,
  });

  if (!posts.length) return [];

  let userHeartedPostIds = new Set<string>();
  if (currentUserId) {
    const userHearts = await db.query.circleHeart.findMany({
      where: eq(circleHeart.personId, currentUserId),
    });
    userHearts.forEach((h) => {
      if (h.postId) userHeartedPostIds.add(h.postId);
    });
  }

  const result: PostItem[] = [];

  for (const p of posts) {
    const isPostHidden = p.status === "hidden";
    const authorPerson = await db.query.person.findFirst({
      where: eq(person.id, p.personId),
    });

    let authorName = "A mother";
    let initial = "M";
    let neighbourhood = p.anonymousArea || "Barcelona";

    if (p.isAnonymous) {
      authorName = p.anonymousArea ? `A mother in ${p.anonymousArea}` : "A mother in Barcelona";
      initial = "M";
    } else if (authorPerson) {
      authorName = `${authorPerson.firstName || "Mother"} ${authorPerson.lastName ? authorPerson.lastName[0] + "." : ""}`.trim();
      initial = authorPerson.firstName ? authorPerson.firstName[0].toUpperCase() : "M";
    }

    const rawReplies = await db.query.circleReply.findMany({
      where: and(eq(circleReply.postId, p.id), eq(circleReply.status, "visible")),
      orderBy: [circleReply.createdAt],
    });

    const replies: ReplyItem[] = [];
    for (const r of rawReplies) {
      const replyPerson = await db.query.person.findFirst({
        where: eq(person.id, r.personId),
      });

      let rAuthor = "A mother";
      let rInitial = "M";
      if (r.isAnonymous) {
        rAuthor = r.anonymousArea ? `A mother in ${r.anonymousArea}` : "A mother";
      } else if (replyPerson) {
        rAuthor = `${replyPerson.firstName || "Mother"} ${replyPerson.lastName ? replyPerson.lastName[0] + "." : ""}`.trim();
        rInitial = replyPerson.firstName ? replyPerson.firstName[0].toUpperCase() : "M";
      }

      replies.push({
        id: r.id,
        author: rAuthor,
        initial: rInitial,
        body: r.body,
        meta: formatTimeAgo(new Date(r.createdAt)),
        isExpert: r.isPartnerExpert,
        isAnonymous: r.isAnonymous,
      });
    }

    const photoCount = (p.photos as string[])?.length || 0;
    const photoGrid =
      photoCount === 1
        ? "1fr"
        : photoCount === 2
        ? "1fr 1fr"
        : photoCount === 3
        ? "1fr 1fr 1fr"
        : "1fr 1fr";

    result.push({
      id: p.id,
      author: authorName,
      isAnonymous: p.isAnonymous,
      anonymousArea: p.anonymousArea,
      initial,
      topic: p.topic,
      topicLabel: TOPIC_LABELS[p.topic] || p.topic,
      body: isPostHidden ? "This post was removed for moderation." : p.body,
      photos: isPostHidden ? [] : ((p.photos as string[]) || []),
      hasPhotos: !isPostHidden && photoCount > 0,
      photoGrid,
      heartsCount: p.heartsCount,
      isHearted: userHeartedPostIds.has(p.id),
      repliesCount: replies.length,
      createdAt: p.createdAt.toISOString(),
      meta: formatTimeAgo(new Date(p.createdAt)),
      neighbourhood,
      isExpert: p.isPartnerExpert,
      status: p.status,
      replies,
    });
  }

  if (sortBy === "trending") {
    result.sort((a, b) => {
      const ageHoursA = (Date.now() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60);
      const ageHoursB = (Date.now() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60);
      const scoreA = (a.heartsCount * 2 + a.repliesCount * 3) / Math.pow(ageHoursA + 2, 1.5);
      const scoreB = (b.heartsCount * 2 + b.repliesCount * 3) / Math.pow(ageHoursB + 2, 1.5);
      return scoreB - scoreA;
    });
  }

  return result;
}

export async function createCirclePost(data: {
  topic: string;
  body: string;
  photos?: string[];
  isAnonymous?: boolean;
  anonymousArea?: string;
  photoConsent?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to post in La Gazette.");
  }

  const personId = (session.user as any).personId || session.user.id;
  const eligibility = await checkPostingEligibility();
  if (!eligibility.canPost) {
    if (eligibility.reason === "account_suspended") {
      throw new Error("Your account has been suspended.");
    }
    if (eligibility.reason === "account_paused") {
      throw new Error("Your account is currently paused.");
    }
    if (eligibility.reason === "membership_required") {
      throw new Error(eligibility.message || "You have used your 3 free La Gazette posts/replies. Become a member for unlimited conversations.");
    }
    throw new Error("You are not eligible to post.");
  }

  // Rate limit: 5 posts per 24 hours, minimum 30s gap
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentPosts = await db.query.circlePost.findMany({
    where: and(eq(circlePost.personId, personId), gte(circlePost.createdAt, last24h)),
    orderBy: [desc(circlePost.createdAt)],
  });

  if (recentPosts.length >= 5) {
    throw new Error("Rate limit reached: Maximum 5 posts per 24 hours.");
  }

  if (recentPosts.length > 0) {
    const timeSinceLast = Date.now() - new Date(recentPosts[0].createdAt).getTime();
    if (timeSinceLast < 30000) {
      throw new Error("Please wait 30 seconds before creating another post.");
    }
  }

  if (!data.body || data.body.trim().length < 10) {
    throw new Error("Post must be at least 10 characters.");
  }

  const photos = data.photos || [];
  if (photos.length > 4) {
    throw new Error("Maximum 4 photos allowed per post.");
  }

  // Server-side validation of photo type and size (CI-04)
  for (const photo of photos) {
    if (typeof photo !== "string") {
      throw new Error("Invalid photo format.");
    }
    if (photo.startsWith("data:")) {
      const match = photo.match(/^data:([^;]+);base64,/);
      if (!match) {
        throw new Error("Invalid image data URL format.");
      }
      const mime = match[1].toLowerCase();
      const validMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "image/gif"];
      if (!validMimes.includes(mime)) {
        throw new Error(`Unsupported image type: ${mime}. Allowed: JPG, PNG, WebP, AVIF, GIF`);
      }
      // Check approximate size: base64 length * 0.75 <= 10MB (10 * 1024 * 1024)
      const base64Data = photo.substring(match[0].length);
      const approxSizeBytes = base64Data.length * 0.75;
      if (approxSizeBytes > 10 * 1024 * 1024) {
        throw new Error("Each photo must be under 10MB.");
      }
    } else if (!photo.startsWith("http://") && !photo.startsWith("https://") && !photo.startsWith("/")) {
      throw new Error("Invalid photo URL.");
    }
  }

  if (photos.length > 0 && !data.photoConsent) {
    throw new Error("Parental photo consent is required when posting images.");
  }

  const [newPost] = await db
    .insert(circlePost)
    .values({
      personId,
      topic: data.topic || "postpartum",
      body: data.body.trim(),
      photos,
      photoConsent: photos.length > 0 ? (data.photoConsent ?? false) : true,
      isAnonymous: data.isAnonymous ?? false,
      anonymousArea: data.anonymousArea || "Barcelona",
      status: "visible",
    })
    .returning();

  revalidatePath("/gazette");
  return { success: true, post: newPost };
}

export async function createCircleReply(postId: string, body: string, isAnonymous = false) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to reply.");
  }

  const personId = (session.user as any).personId || session.user.id;
  const eligibility = await checkPostingEligibility();
  if (!eligibility.canPost) {
    if (eligibility.reason === "account_suspended") {
      throw new Error("Your account has been suspended.");
    }
    if (eligibility.reason === "account_paused") {
      throw new Error("Your account is currently paused.");
    }
    if (eligibility.reason === "membership_required") {
      throw new Error(eligibility.message || "You have used your 3 free posts/replies in La Gazette. Become a member for unlimited conversations.");
    }
    throw new Error("You are not eligible to reply.");
  }

  if (!body || body.trim().length < 2) {
    throw new Error("Reply cannot be empty.");
  }

  // Rate limit: 20 replies per 24 hours, minimum 30s gap
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentReplies = await db.query.circleReply.findMany({
    where: and(eq(circleReply.personId, personId), gte(circleReply.createdAt, last24h)),
    orderBy: [desc(circleReply.createdAt)],
  });

  if (recentReplies.length >= 20) {
    throw new Error("Rate limit reached: Maximum 20 replies per 24 hours.");
  }

  if (recentReplies.length > 0) {
    const timeSinceLast = Date.now() - new Date(recentReplies[0].createdAt).getTime();
    if (timeSinceLast < 30000) {
      throw new Error("Please wait 30 seconds before submitting another reply.");
    }
  }

  await db.insert(circleReply).values({
    postId,
    personId,
    body: body.trim(),
    isAnonymous,
    status: "visible",
  });

  await db
    .update(circlePost)
    .set({
      repliesCount: sql`${circlePost.repliesCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(circlePost.id, postId));

  revalidatePath("/gazette");
  return { success: true };
}

export async function toggleCircleHeart(postId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to heart a post.");
  }

  const personId = (session.user as any).personId || session.user.id;
  const existing = await db.query.circleHeart.findFirst({
    where: and(eq(circleHeart.personId, personId), eq(circleHeart.postId, postId)),
  });

  if (existing) {
    await db.delete(circleHeart).where(eq(circleHeart.id, existing.id));
    await db
      .update(circlePost)
      .set({
        heartsCount: sql`GREATEST(0, ${circlePost.heartsCount} - 1)`,
      })
      .where(eq(circlePost.id, postId));
    return { hearted: false };
  } else {
    await db.insert(circleHeart).values({
      personId,
      postId,
    });
    await db
      .update(circlePost)
      .set({
        heartsCount: sql`${circlePost.heartsCount} + 1`,
      })
      .where(eq(circlePost.id, postId));
    return { hearted: true };
  }
}

export async function reportCirclePost(postId: string, reason: string, details?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to report a post.");
  }

  const personId = (session.user as any).personId || session.user.id;

  const targetPost = await db.query.circlePost.findFirst({
    where: eq(circlePost.id, postId),
  });

  if (!targetPost) {
    throw new Error("Post not found.");
  }

  // Prevent author from reporting their own post (F-15)
  if (targetPost.personId === personId) {
    return { success: false, error: "You cannot report your own post." };
  }

  // Check if reporter has already reported this post (F-15)
  const existingReport = await db.query.circleReport.findFirst({
    where: and(
      eq(circleReport.postId, postId),
      eq(circleReport.reporterPersonId, personId)
    ),
  });

  if (!existingReport) {
    await db.insert(circleReport).values({
      postId,
      reporterPersonId: personId,
      reason,
      details,
      status: "pending",
    });
  }

  // Count distinct reporters for this post (F-15)
  const countRes = await db
    .select({ count: sql<number>`count(DISTINCT ${circleReport.reporterPersonId})::int` })
    .from(circleReport)
    .where(eq(circleReport.postId, postId));

  const distinctCount = countRes[0]?.count || 1;

  await db
    .update(circlePost)
    .set({
      reportsCount: distinctCount,
      ...(distinctCount >= 3
        ? {
            status: "hidden",
            hiddenReason: "Auto-hidden: 3 or more distinct member reports received",
          }
        : {}),
    })
    .where(eq(circlePost.id, postId));

  revalidatePath("/gazette");
  return { success: true };
}

export async function getTrendingCircleTags(): Promise<{ topic: string; label: string; score: number; postCount: number }[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const postsLast7d = await db
    .select({
      topic: circlePost.topic,
      heartsCount: circlePost.heartsCount,
      repliesCount: circlePost.repliesCount,
    })
    .from(circlePost)
    .where(
      and(
        gte(circlePost.createdAt, sevenDaysAgo),
        sql`${circlePost.status} = 'visible'`
      )
    );

  const topicScores: Record<string, { score: number; count: number }> = {};

  const settingsRows = await db.select().from(setting).where(sql`key IN ('pinned_circle_tag', 'blocked_circle_tags')`);
  const settingsMap: Record<string, any> = {};
  for (const s of settingsRows) settingsMap[s.key] = s.value;
  
  const pinnedTag = typeof settingsMap["pinned_circle_tag"] === "string" ? settingsMap["pinned_circle_tag"].trim() : "";
  const blockedTagsRaw = typeof settingsMap["blocked_circle_tags"] === "string" ? settingsMap["blocked_circle_tags"] : "";
  const blockedTags = new Set(blockedTagsRaw.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean));

  for (const p of postsLast7d) {
    if (!p.topic) continue;
    if (blockedTags.has(p.topic.toLowerCase())) continue;
    if (!topicScores[p.topic]) {
      topicScores[p.topic] = { score: 0, count: 0 };
    }
    // Ranking: posts × 3 + replies × 2 + hearts × 1 (§CI-06)
    topicScores[p.topic].score += 3 + (p.repliesCount || 0) * 2 + (p.heartsCount || 0) * 1;
    topicScores[p.topic].count += 1;
  }

  // Force pinned tag
  if (pinnedTag && !blockedTags.has(pinnedTag.toLowerCase())) {
    if (!topicScores[pinnedTag]) {
      topicScores[pinnedTag] = { score: Infinity, count: 0 };
    } else {
      topicScores[pinnedTag].score = Infinity;
    }
  }

  const sorted = Object.entries(topicScores)
    .map(([topic, data]) => ({
      topic,
      label: TOPIC_LABELS[topic] || topic,
      score: data.score,
      postCount: data.count,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return sorted;
}
