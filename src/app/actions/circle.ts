"use server";

import { db } from "@/db";
import { circlePost, circleReply, circleHeart, circleReport, person, booking, member } from "@/db/schema";
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

  const user = await db.query.person.findFirst({
    where: eq(person.id, session.user.id),
  });

  if (!user) {
    return { canPost: false, reason: "user_not_found" };
  }

  if (user.isPaused) {
    return { canPost: false, reason: "account_paused", pausedReason: user.pausedReason };
  }

  // Pre-membership rule: posting requires at least 1 confirmed booking (free or paid)
  const bookingsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(booking)
    .where(
      and(
        eq(booking.personId, user.id),
        sql`${booking.status} IN ('confirmed', 'attended', 'held')`
      )
    );

  const totalBookings = bookingsCount[0]?.count || 0;
  if (totalBookings < 1) {
    return {
      canPost: false,
      reason: "booking_required",
      totalBookings: 0,
    };
  }

  return {
    canPost: true,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    },
  };
}

export async function getCirclePosts(selectedTopic?: string): Promise<PostItem[]> {
  const session = await auth();
  const currentUserId = session?.user?.id;

  const whereClause = selectedTopic && selectedTopic !== "all"
    ? and(eq(circlePost.topic, selectedTopic), sql`${circlePost.status} IN ('visible', 'hidden')`)
    : sql`${circlePost.status} IN ('visible', 'hidden')`;

  const posts = await db.query.circlePost.findMany({
    where: whereClause,
    orderBy: [desc(circlePost.createdAt)],
    limit: 50,
  });

  if (!posts.length) return [];

  // Fetch all heart records for current user
  let userHeartedPostIds = new Set<string>();
  if (currentUserId) {
    const userHearts = await db.query.circleHeart.findMany({
      where: eq(circleHeart.personId, currentUserId),
    });
    userHearts.forEach((h) => {
      if (h.postId) userHeartedPostIds.add(h.postId);
    });
  }

  // Fetch authors and replies
  const result: PostItem[] = [];

  for (const p of posts) {
    const isPostHidden = p.status === "hidden";
    const authorPerson = await db.query.person.findFirst({
      where: eq(person.id, p.personId),
    });

    // Author display
    let authorName = "A mother";
    let initial = "M";
    let neighbourhood = p.anonymousArea || "Barcelona";

    if (p.isAnonymous) {
      authorName = p.anonymousArea ? `A mother in ${p.anonymousArea}` : "A mother in Barcelona";
      initial = "M";
    } else if (authorPerson) {
      authorName = `${authorPerson.firstName} ${authorPerson.lastName ? authorPerson.lastName[0] + "." : ""}`;
      initial = authorPerson.firstName ? authorPerson.firstName[0].toUpperCase() : "M";
    }

    // Fetch replies
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
        rAuthor = `${replyPerson.firstName} ${replyPerson.lastName ? replyPerson.lastName[0] + "." : ""}`;
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
    throw new Error("You must be logged in to post in The Circle.");
  }

  const eligibility = await checkPostingEligibility();
  if (!eligibility.canPost) {
    if (eligibility.reason === "account_paused") {
      throw new Error("Your account is currently paused.");
    }
    if (eligibility.reason === "booking_required") {
      throw new Error("Posting requires at least one event booking (including free walks & socials).");
    }
    throw new Error("You are not eligible to post.");
  }

  // Rate limit: 5 posts per 24 hours, minimum 30s gap
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentPosts = await db.query.circlePost.findMany({
    where: and(eq(circlePost.personId, session.user.id), gte(circlePost.createdAt, last24h)),
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

  const [newPost] = await db
    .insert(circlePost)
    .values({
      personId: session.user.id,
      topic: data.topic || "postpartum",
      body: data.body.trim(),
      photos: data.photos || [],
      photoConsent: data.photoConsent ?? true,
      isAnonymous: data.isAnonymous ?? false,
      anonymousArea: data.anonymousArea || "Barcelona",
      status: "visible",
    })
    .returning();

  revalidatePath("/circle");
  return { success: true, post: newPost };
}

export async function createCircleReply(postId: string, body: string, isAnonymous = false) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to reply.");
  }

  const eligibility = await checkPostingEligibility();
  if (!eligibility.canPost) {
    throw new Error("Replying requires at least one confirmed booking.");
  }

  if (!body || body.trim().length < 2) {
    throw new Error("Reply cannot be empty.");
  }

  // Rate limit: 20 replies per 24 hours
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentReplies = await db.query.circleReply.findMany({
    where: and(eq(circleReply.personId, session.user.id), gte(circleReply.createdAt, last24h)),
  });

  if (recentReplies.length >= 20) {
    throw new Error("Rate limit reached: Maximum 20 replies per 24 hours.");
  }

  await db.insert(circleReply).values({
    postId,
    personId: session.user.id,
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

  revalidatePath("/circle");
  return { success: true };
}

export async function toggleCircleHeart(postId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to heart a post.");
  }

  const existing = await db.query.circleHeart.findFirst({
    where: and(eq(circleHeart.personId, session.user.id), eq(circleHeart.postId, postId)),
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
      personId: session.user.id,
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

  await db.insert(circleReport).values({
    postId,
    reporterPersonId: session.user.id,
    reason,
    details,
    status: "pending",
  });

  // Increment report count on post
  const updatedPost = await db
    .update(circlePost)
    .set({
      reportsCount: sql`${circlePost.reportsCount} + 1`,
    })
    .where(eq(circlePost.id, postId))
    .returning();

  // Tech brief rule: Auto-hidden after 3 reports, pending review
  if (updatedPost[0] && updatedPost[0].reportsCount >= 3) {
    await db
      .update(circlePost)
      .set({
        status: "hidden",
        hiddenReason: "Auto-hidden: 3 or more reports received",
      })
      .where(eq(circlePost.id, postId));
  }

  revalidatePath("/circle");
  return { success: true };
}
