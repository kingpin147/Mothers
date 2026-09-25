"use server";

import { db } from "@/db";
import { circlePost, circleReply, circleReport, person, adminUser } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
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
  const session = await auth();
  const role = (session?.user as any)?.role;
  const isAdmin = ["owner", "manager", "host", "super_admin"].includes(role);

  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

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

export async function updateReportStatus(reportId: string, status: "resolved_hidden" | "resolved_dismissed") {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!["owner", "manager", "host", "super_admin"].includes(role)) {
    throw new Error("Unauthorized");
  }

  await db
    .update(circleReport)
    .set({
      status,
      reviewedAt: new Date(),
    })
    .where(eq(circleReport.id, reportId));

  revalidatePath("/admin/reports");
  return { success: true };
}

export async function moderatePost(postId: string, action: "hide" | "restore") {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!["owner", "manager", "host", "super_admin"].includes(role)) {
    throw new Error("Unauthorized");
  }

  await db
    .update(circlePost)
    .set({
      status: action === "hide" ? "hidden" : "visible",
      hiddenReason: action === "hide" ? "Hidden by moderator" : null,
      updatedAt: new Date(),
    })
    .where(eq(circlePost.id, postId));

  revalidatePath("/admin/reports");
  revalidatePath("/circle");
  return { success: true };
}

export async function togglePauseAuthorAccount(personId: string, pause: boolean, reasonText?: string) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!["owner", "manager", "host", "super_admin"].includes(role)) {
    throw new Error("Unauthorized");
  }

  await db
    .update(person)
    .set({
      isPaused: pause,
      pausedReason: pause ? (reasonText || "Account paused by admin for violating house rules") : null,
      updatedAt: new Date(),
    })
    .where(eq(person.id, personId));

  revalidatePath("/admin/reports");
  return { success: true };
}
