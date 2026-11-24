"use server";

import { db } from "@/db";
import { circlePost, circleReply, circleReport, person, adminUser } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth, verifyAdminSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface ReportItem {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: {
    id: string;
    name: string;
    email: string;
  };
  post?: {
    id: string;
    authorId: string;
    authorName: string;
    authorEmail: string;
    body: string;
    topic: string;
    status: string;
    reportsCount: number;
    isPaused: boolean;
  } | null;
}

export async function getAdminReports(): Promise<ReportItem[]> {
  await verifyAdminSession();

  const reports = await db.query.circleReport.findMany({
    orderBy: [desc(circleReport.createdAt)],
    limit: 100,
  });

  const items: ReportItem[] = [];

  for (const r of reports) {
    const reporterPerson = await db.query.person.findFirst({
      where: eq(person.id, r.reporterPersonId),
    });

    let postInfo = null;
    if (r.postId) {
      const p = await db.query.circlePost.findFirst({
        where: eq(circlePost.id, r.postId),
      });

      if (p) {
        const authorPerson = await db.query.person.findFirst({
          where: eq(person.id, p.personId),
        });

        postInfo = {
          id: p.id,
          authorId: p.personId,
          authorName: authorPerson ? `${authorPerson.firstName} ${authorPerson.lastName}` : "Unknown",
          authorEmail: authorPerson?.email || "",
          body: p.body,
          topic: p.topic,
          status: p.status,
          reportsCount: p.reportsCount,
          isPaused: authorPerson?.isPaused || false,
        };
      }
    }

    items.push({
      id: r.id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reporter: {
        id: r.reporterPersonId,
        name: reporterPerson ? `${reporterPerson.firstName} ${reporterPerson.lastName}` : "Unknown",
        email: reporterPerson?.email || "",
      },
      post: postInfo,
    });
  }

  return items;
}

export async function updateReportStatus(reportId: string, status: "open" | "resolved_hidden" | "resolved_dismissed") {
  await verifyAdminSession();

  await db
    .update(circleReport)
    .set({
      status,
      reviewedAt: new Date(),
    })
    .where(eq(circleReport.id, reportId));

  revalidatePath("/admin/reports");
  revalidatePath("/admin/pre-launch");
  return { success: true };
}

export async function moderatePost(postId: string, action: "hide" | "restore") {
  await verifyAdminSession();

  const post = await db.query.circlePost.findFirst({
    where: eq(circlePost.id, postId),
  });

  await db
    .update(circlePost)
    .set({
      status: action === "hide" ? "hidden" : "visible",
      hiddenReason: action === "hide" ? "Hidden by moderator" : null,
      updatedAt: new Date(),
    })
    .where(eq(circlePost.id, postId));

  if (action === "hide" && post?.personId) {
    try {
      const author = await db.query.person.findFirst({
        where: eq(person.id, post.personId),
      });
      if (author?.email) {
        const { sendForumPostRemovedEmail } = await import("@/lib/brevo");
        await sendForumPostRemovedEmail({
          personId: author.id,
          email: author.email,
          firstName: author.firstName || "Member",
          postKind: "post",
          postDate: new Date().toLocaleDateString(),
          reason: "Violating community house rules",
          postExcerpt: (post.body || "").slice(0, 100),
          locale: author.locale || "en",
        });
      }
    } catch (err) {
      console.error("[moderatePost] Failed to send forum post removed email:", err);
    }
  }

  revalidatePath("/admin/reports");
  revalidatePath("/lagazette");
  revalidatePath("/gazette");
  return { success: true };
}

export async function togglePauseAuthorAccount(personId: string, pause: boolean, reasonText?: string) {
  await verifyAdminSession();

  await db
    .update(person)
    .set({
      isPaused: pause,
      pausedReason: pause ? (reasonText || "Account paused by admin for violating house rules") : null,
      updatedAt: new Date(),
    })
    .where(eq(person.id, personId));

  if (!pause) {
    try {
      const author = await db.query.person.findFirst({
        where: eq(person.id, personId),
      });
      if (author?.email) {
        const { sendAccountReinstatedEmail } = await import("@/lib/brevo");
        await sendAccountReinstatedEmail({
          personId: author.id,
          email: author.email,
          firstName: author.firstName || "Member",
          locale: author.locale || "en",
        });
      }
    } catch (err) {
      console.error("[togglePauseAuthorAccount] Failed to send reinstated email:", err);
    }
  }

  revalidatePath("/admin/reports");
  return { success: true };
}

import {
  deleteGazettePostAdmin as delPost,
  deleteGazetteCommentAdmin as delComment,
  getAllGazettePublicationsAdmin as getPubs,
} from "@/app/actions/gazette";

export async function deleteGazettePostAdmin(data: string | { postId: string; reason?: string }) {
  const id = typeof data === "string" ? data : data?.postId;
  return delPost(id);
}

export async function deleteGazetteCommentAdmin(data: string | { commentId: string; reason?: string }) {
  const id = typeof data === "string" ? data : data?.commentId;
  return delComment(id);
}

export async function getAllGazettePublicationsAdmin() {
  return getPubs();
}

