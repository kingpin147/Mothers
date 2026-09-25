"use server";

import { db } from "@/db";
import { creditBatch, creditEntry, person, booking, member } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { queueAndSendEmail, generatePaymentReceiptEmailHtml } from "@/lib/brevo";
import { getAppUrl } from "@/lib/urls";

export async function processCreditTopUp(data: {
  amount: number;
  paymentMethod?: string;
  targetEventId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("You must be logged in to buy credits.");
  }

  const creditsCount = Math.floor(Number(data.amount));
  if (isNaN(creditsCount) || creditsCount <= 0) {
    throw new Error("Invalid credit amount.");
  }

  const user = await db.query.person.findFirst({
    where: eq(person.id, session.user.id),
  });

  if (!user) {
    throw new Error("User not found.");
  }

  // 6 months expiry from now
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 6);

  // 1. Create credit batch
  const [batch] = await db
    .insert(creditBatch)
    .values({
      personId: user.id,
      amount: creditsCount,
      remaining: creditsCount,
      expiresAt,
      source: "purchase",
    })
    .returning();

  // 2. Also ensure member record exists or creditEntry is logged for backward compatibility
  const existingMember = await db.query.member.findFirst({
    where: eq(member.personId, user.id),
  });

  if (existingMember) {
    await db.insert(creditEntry).values({
      memberId: existingMember.id,
      amount: creditsCount,
      type: "purchase",
      sourceType: "topup",
      sourceId: batch.id,
      reason: `Purchased ${creditsCount} credits (€${creditsCount * 2})`,
      expiresAt,
    });
  }

  // 3. Send Payment Receipt Email (§11)
  const amountEur = creditsCount * 2;
  const isEs = user.locale === "es";
  const origin = getAppUrl();
  const orderId = `TM-${batch.id.substring(0, 8).toUpperCase()}`;
  const expiryDateFormatted = expiresAt.toLocaleDateString(isEs ? "es-ES" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const subject = isEs
    ? `Recibo de compra — ${creditsCount} créditos`
    : `Your receipt — ${creditsCount} credits`;

  const htmlContent = generatePaymentReceiptEmailHtml({
    firstName: user.firstName || "Member",
    orderId,
    amountEur,
    creditsPurchased: creditsCount,
    expiryDateFormatted,
    appUrl: origin,
    isEs,
  });

  await queueAndSendEmail({
    personId: user.id,
    toEmail: user.email,
    toName: `${user.firstName} ${user.lastName}`,
    templateKey: "payment_receipt",
    dedupeKey: `topup_receipt_${batch.id}`,
    subject,
    htmlContent,
    isTransactional: true,
  });

  revalidatePath("/account");
  revalidatePath("/events");

  return {
    success: true,
    batchId: batch.id,
    creditsAdded: creditsCount,
    expiresAt: expiresAt.toISOString(),
  };
}
