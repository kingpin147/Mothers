"use server";

import { db } from "@/db";
import {
  conversation,
  directMessage,
  messageBlock,
  messageReport,
  person,
  adminUser,
} from "@/db/schema";
import { eq, and, or, desc, asc, sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Helper to get authenticated person ID
async function getAuthPerson() {
  const session = await auth();
  if (!session?.user) return null;
  const personId = (session.user as any).personId || session.user.id;
  const personRecord = await db.query.person.findFirst({
    where: eq(person.id, personId),
  });
  return personRecord;
}

// ─── 1. GET ALL CONVERSATIONS FOR CURRENT USER ──────────────────────────────

export async function getConversationsAction() {
  const currentPerson = await getAuthPerson();
  if (!currentPerson) return { success: false, error: "AUTH_REQUIRED" };

  try {
    // 1. Fetch blocks involving this person (as blocker or blocked)
    const blocks = await db
      .select()
      .from(messageBlock)
      .where(
        or(
          eq(messageBlock.blockerPersonId, currentPerson.id),
          eq(messageBlock.blockedPersonId, currentPerson.id)
        )
      );

    const blockedUserIds = new Set<string>();
    blocks.forEach((b) => {
      blockedUserIds.add(b.blockerPersonId);
      blockedUserIds.add(b.blockedPersonId);
    });
    blockedUserIds.delete(currentPerson.id);

    // 2. Fetch conversations
    const convs = await db
      .select()
      .from(conversation)
      .where(
        or(
          eq(conversation.personOneId, currentPerson.id),
          eq(conversation.personTwoId, currentPerson.id)
        )
      )
      .orderBy(desc(conversation.lastMessageAt));

    const result = [];

    for (const c of convs) {
      const otherPersonId =
        c.personOneId === currentPerson.id ? c.personTwoId : c.personOneId;

      // Skip blocked pairs silently (§12 / DM-04)
      if (blockedUserIds.has(otherPersonId)) continue;

      const otherPerson = await db.query.person.findFirst({
        where: eq(person.id, otherPersonId),
      });

      // Count unread messages in this conversation sent to current person
      const unreadCountRes = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(directMessage)
        .where(
          and(
            eq(directMessage.conversationId, c.id),
            eq(directMessage.recipientId, currentPerson.id),
            sql`read_at IS NULL`,
            eq(directMessage.hiddenByAdmin, false)
          )
        );

      const unreadCount = unreadCountRes[0]?.count || 0;

      const isDeleted = !otherPerson || !!otherPerson.deletedAt;
      const displayName = isDeleted
        ? "A mother who left"
        : otherPerson.firstName;

      const initials = isDeleted
        ? "M"
        : `${otherPerson.firstName?.[0] || ""}${otherPerson.lastName?.[0] || ""}`.toUpperCase();

      result.push({
        id: c.id,
        otherPersonId,
        otherPersonName: displayName,
        initials,
        neighbourhood: otherPerson?.profileData?.neighbourhood || null,
        stage: otherPerson?.profileData?.stages?.[0] || null,
        badges: otherPerson?.badges || [],
        lastMessageText: c.lastMessageText,
        lastMessageAt: c.lastMessageAt,
        unreadCount,
        isDeleted,
      });
    }

    return { success: true, conversations: result };
  } catch (error: any) {
    console.error("getConversationsAction error:", error);
    return { success: false, error: "FAILED_TO_LOAD_CONVERSATIONS" };
  }
}

// ─── 2. GET MESSAGES IN CONVERSATION ────────────────────────────────────────

export async function getMessagesAction(conversationId: string) {
  const currentPerson = await getAuthPerson();
  if (!currentPerson) return { success: false, error: "AUTH_REQUIRED" };

  try {
    const conv = await db.query.conversation.findFirst({
      where: eq(conversation.id, conversationId),
    });

    if (!conv) return { success: false, error: "CONVERSATION_NOT_FOUND" };
    if (conv.personOneId !== currentPerson.id && conv.personTwoId !== currentPerson.id) {
      return { success: false, error: "UNAUTHORIZED" };
    }

    // Mark unread messages sent to current person as read
    await db
      .update(directMessage)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(directMessage.conversationId, conversationId),
          eq(directMessage.recipientId, currentPerson.id),
          sql`read_at IS NULL`
        )
      );

    const msgs = await db
      .select()
      .from(directMessage)
      .where(
        and(
          eq(directMessage.conversationId, conversationId),
          eq(directMessage.hiddenByAdmin, false)
        )
      )
      .orderBy(asc(directMessage.createdAt));

    const otherPersonId =
      conv.personOneId === currentPerson.id ? conv.personTwoId : conv.personOneId;

    const otherPerson = await db.query.person.findFirst({
      where: eq(person.id, otherPersonId),
    });

    const isDeleted = !otherPerson || !!otherPerson.deletedAt;
    const otherPersonName = isDeleted ? "A mother who left" : otherPerson.firstName;

    return {
      success: true,
      messages: msgs.map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        isFromMe: m.senderId === currentPerson.id,
        createdAt: m.createdAt,
        readAt: m.readAt,
      })),
      otherPerson: {
        id: otherPersonId,
        firstName: otherPersonName,
        neighbourhood: otherPerson?.profileData?.neighbourhood || null,
        stage: otherPerson?.profileData?.stages?.[0] || null,
        badges: otherPerson?.badges || [],
        isDeleted,
      },
      currentPersonSuspended: currentPerson.isSuspended,
    };
  } catch (error: any) {
    console.error("getMessagesAction error:", error);
    return { success: false, error: "FAILED_TO_LOAD_MESSAGES" };
  }
}

// ─── 3. START OR GET CONVERSATION WITH A USER ───────────────────────────────

export async function startOrGetConversationWith(recipientPersonId: string) {
  const currentPerson = await getAuthPerson();
  if (!currentPerson) return { success: false, error: "AUTH_REQUIRED" };

  if (currentPerson.id === recipientPersonId) {
    return { success: false, error: "CANNOT_MESSAGE_SELF" };
  }

  try {
    // Check if blocked
    const block = await db.query.messageBlock.findFirst({
      where: or(
        and(eq(messageBlock.blockerPersonId, currentPerson.id), eq(messageBlock.blockedPersonId, recipientPersonId)),
        and(eq(messageBlock.blockerPersonId, recipientPersonId), eq(messageBlock.blockedPersonId, currentPerson.id))
      ),
    });
    if (block) return { success: false, error: "CONVERSATION_BLOCKED" };

    // Check existing
    const existing = await db.query.conversation.findFirst({
      where: or(
        and(eq(conversation.personOneId, currentPerson.id), eq(conversation.personTwoId, recipientPersonId)),
        and(eq(conversation.personOneId, recipientPersonId), eq(conversation.personTwoId, currentPerson.id))
      ),
    });

    if (existing) {
      return { success: true, conversationId: existing.id };
    }

    // 20 new conversations per day limit (§12 / DM-06)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newConvsToday = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversation)
      .where(
        and(
          or(
            eq(conversation.personOneId, currentPerson.id),
            eq(conversation.personTwoId, currentPerson.id)
          ),
          sql`created_at >= ${oneDayAgo}`
        )
      );

    if ((newConvsToday[0]?.count || 0) >= 20) {
      return { success: false, error: "DAILY_CONVERSATION_LIMIT_REACHED" };
    }

    const inserted = await db
      .insert(conversation)
      .values({
        personOneId: currentPerson.id,
        personTwoId: recipientPersonId,
        lastMessageText: "",
      })
      .returning();

    return { success: true, conversationId: inserted[0].id };
  } catch (error: any) {
    console.error("startOrGetConversationWith error:", error);
    return { success: false, error: "FAILED_TO_START_CONVERSATION" };
  }
}

// ─── 4. SEND MESSAGE ────────────────────────────────────────────────────────

export async function sendMessageAction(conversationId: string, content: string) {
  const currentPerson = await getAuthPerson();
  if (!currentPerson) return { success: false, error: "AUTH_REQUIRED" };

  // Suspended accounts cannot send (§12 / DM-06)
  if (currentPerson.isSuspended) {
    return { success: false, error: "ACCOUNT_SUSPENDED" };
  }

  const cleanText = content.trim();
  if (!cleanText || cleanText.length === 0) {
    return { success: false, error: "EMPTY_MESSAGE" };
  }
  // 2,000 characters limit (§12)
  if (cleanText.length > 2000) {
    return { success: false, error: "MESSAGE_TOO_LONG" };
  }

  try {
    const conv = await db.query.conversation.findFirst({
      where: eq(conversation.id, conversationId),
    });
    if (!conv) return { success: false, error: "CONVERSATION_NOT_FOUND" };

    const recipientId =
      conv.personOneId === currentPerson.id ? conv.personTwoId : conv.personOneId;

    // Check block
    const block = await db.query.messageBlock.findFirst({
      where: or(
        and(eq(messageBlock.blockerPersonId, currentPerson.id), eq(messageBlock.blockedPersonId, recipientId)),
        and(eq(messageBlock.blockerPersonId, recipientId), eq(messageBlock.blockedPersonId, currentPerson.id))
      ),
    });
    if (block) return { success: false, error: "CONVERSATION_BLOCKED" };

    const inserted = await db
      .insert(directMessage)
      .values({
        conversationId,
        senderId: currentPerson.id,
        recipientId,
        content: cleanText,
      })
      .returning();

    await db
      .update(conversation)
      .set({
        lastMessageAt: new Date(),
        lastMessageText: cleanText.slice(0, 100),
      })
      .where(eq(conversation.id, conversationId));

    revalidatePath("/account");

    return {
      success: true,
      message: {
        id: inserted[0].id,
        content: inserted[0].content,
        senderId: inserted[0].senderId,
        isFromMe: true,
        createdAt: inserted[0].createdAt,
      },
    };
  } catch (error: any) {
    console.error("sendMessageAction error:", error);
    return { success: false, error: "FAILED_TO_SEND_MESSAGE" };
  }
}

// ─── 5. BLOCK USER (SILENT) ─────────────────────────────────────────────────

export async function blockUserAction(blockedPersonId: string) {
  const currentPerson = await getAuthPerson();
  if (!currentPerson) return { success: false, error: "AUTH_REQUIRED" };

  try {
    await db
      .insert(messageBlock)
      .values({
        blockerPersonId: currentPerson.id,
        blockedPersonId,
      })
      .onConflictDoNothing();

    revalidatePath("/account");
    return { success: true };
  } catch (error: any) {
    console.error("blockUserAction error:", error);
    return { success: false, error: "BLOCK_FAILED" };
  }
}

// ─── 6. REPORT CONVERSATION ─────────────────────────────────────────────────

export async function reportConversationAction(conversationId: string, reason: string) {
  const currentPerson = await getAuthPerson();
  if (!currentPerson) return { success: false, error: "AUTH_REQUIRED" };

  try {
    const conv = await db.query.conversation.findFirst({
      where: eq(conversation.id, conversationId),
    });
    if (!conv) return { success: false, error: "CONVERSATION_NOT_FOUND" };

    const reportedPersonId =
      conv.personOneId === currentPerson.id ? conv.personTwoId : conv.personOneId;

    await db.insert(messageReport).values({
      conversationId,
      reporterPersonId: currentPerson.id,
      reportedPersonId,
      reason: reason.trim() || "Inappropriate message",
    });

    return { success: true };
  } catch (error: any) {
    console.error("reportConversationAction error:", error);
    return { success: false, error: "REPORT_FAILED" };
  }
}

// ─── 7. GET TOTAL UNREAD COUNT ──────────────────────────────────────────────

export async function getUnreadMessagesCountAction() {
  const currentPerson = await getAuthPerson();
  if (!currentPerson) return { success: false, count: 0 };

  try {
    // Exclude blocked conversations
    const blocks = await db
      .select()
      .from(messageBlock)
      .where(
        or(
          eq(messageBlock.blockerPersonId, currentPerson.id),
          eq(messageBlock.blockedPersonId, currentPerson.id)
        )
      );

    const blockedUserIds = new Set<string>();
    blocks.forEach((b) => {
      blockedUserIds.add(b.blockerPersonId);
      blockedUserIds.add(b.blockedPersonId);
    });
    blockedUserIds.delete(currentPerson.id);

    const unread = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(directMessage)
      .where(
        and(
          eq(directMessage.recipientId, currentPerson.id),
          sql`read_at IS NULL`,
          eq(directMessage.hiddenByAdmin, false),
          blockedUserIds.size > 0
            ? sql`sender_id NOT IN (${sql.join([...blockedUserIds].map(id => sql`${id}`), sql`, `)})`
            : sql`TRUE`
        )
      );

    return { success: true, count: unread[0]?.count || 0 };
  } catch {
    return { success: false, count: 0 };
  }
}

// ─── 8. ADMIN MODERATION DESK: GET REPORTED MESSAGES ────────────────────────

export async function getAdminReportedMessagesAction() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  try {
    const reports = await db
      .select()
      .from(messageReport)
      .where(eq(messageReport.status, "pending"))
      .orderBy(desc(messageReport.createdAt));

    const result = [];
    for (const rep of reports) {
      const reporter = await db.query.person.findFirst({
        where: eq(person.id, rep.reporterPersonId),
      });
      const reported = await db.query.person.findFirst({
        where: eq(person.id, rep.reportedPersonId),
      });

      // Get last 5 messages in that conversation
      const messages = await db
        .select()
        .from(directMessage)
        .where(eq(directMessage.conversationId, rep.conversationId))
        .orderBy(desc(directMessage.createdAt))
        .limit(5);

      result.push({
        id: rep.id,
        conversationId: rep.conversationId,
        reporterName: reporter?.firstName || "Unknown",
        reporterEmail: reporter?.email,
        reportedPersonId: rep.reportedPersonId,
        reportedName: reported?.firstName || "Unknown",
        reportedEmail: reported?.email,
        reportedIsSuspended: !!reported?.isSuspended,
        reason: rep.reason,
        createdAt: rep.createdAt,
        messages: messages.reverse().map((m) => ({
          id: m.id,
          content: m.content,
          senderName: m.senderId === rep.reporterPersonId ? reporter?.firstName : reported?.firstName,
          isReportedUser: m.senderId === rep.reportedPersonId,
          createdAt: m.createdAt,
          hiddenByAdmin: m.hiddenByAdmin,
        })),
      });
    }

    return { success: true, reports: result };
  } catch (error: any) {
    console.error("getAdminReportedMessagesAction error:", error);
    return { success: false, error: "FAILED_TO_FETCH_REPORTS" };
  }
}

// ─── 9. ADMIN RESOLVE REPORT ────────────────────────────────────────────────

export async function resolveMessageReportAction(
  reportId: string,
  resolution: "nothing" | "hide" | "suspend"
) {
  const session = await auth();
  const adminId = session?.user?.id;
  const role = (session?.user as any)?.role;
  const allowed = ["owner", "manager", "super_admin"];
  if (!role || !allowed.includes(role)) {
    return { success: false, error: "UNAUTHORIZED_ADMIN" };
  }

  try {
    const rep = await db.query.messageReport.findFirst({
      where: eq(messageReport.id, reportId),
    });
    if (!rep) return { success: false, error: "REPORT_NOT_FOUND" };

    if (resolution === "nothing") {
      await db
        .update(messageReport)
        .set({
          status: "resolved_nothing",
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        })
        .where(eq(messageReport.id, reportId));
    } else if (resolution === "hide") {
      // Hide the last message in this conversation
      const lastMsg = await db
        .select()
        .from(directMessage)
        .where(
          and(
            eq(directMessage.conversationId, rep.conversationId),
            eq(directMessage.senderId, rep.reportedPersonId)
          )
        )
        .orderBy(desc(directMessage.createdAt))
        .limit(1);

      if (lastMsg.length > 0) {
        await db
          .update(directMessage)
          .set({ hiddenByAdmin: true })
          .where(eq(directMessage.id, lastMsg[0].id));
      }

      await db
        .update(messageReport)
        .set({
          status: "resolved_hidden",
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        })
        .where(eq(messageReport.id, reportId));
    } else if (resolution === "suspend") {
      // Suspend reported account
      await db
        .update(person)
        .set({
          isSuspended: true,
          suspendedAt: new Date(),
          suspendedReason: `Suspended for reported direct message violation: ${rep.reason}`,
        })
        .where(eq(person.id, rep.reportedPersonId));

      const reportedPerson = await db.query.person.findFirst({
        where: eq(person.id, rep.reportedPersonId),
      });

      if (reportedPerson) {
        const { sendAccountSuspendedEmail } = await import("@/lib/brevo");
        await sendAccountSuspendedEmail({
          personId: reportedPerson.id,
          email: reportedPerson.email,
          firstName: reportedPerson.firstName,
          reason: "Violation of community communication standards in direct messages",
          locale: (reportedPerson.locale as any) || "es",
        }).catch(() => {});
      }

      await db
        .update(messageReport)
        .set({
          status: "resolved_suspended",
          reviewedByAdminId: adminId,
          reviewedAt: new Date(),
        })
        .where(eq(messageReport.id, reportId));
    }

    revalidatePath("/admin/pre-launch");
    return { success: true };
  } catch (error: any) {
    console.error("resolveMessageReportAction error:", error);
    return { success: false, error: "FAILED_TO_RESOLVE_REPORT" };
  }
}
