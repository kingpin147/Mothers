import { db } from "@/db";
import { faqItem } from "@/db/schema";
import { eq } from "drizzle-orm";
import FaqClient from "./FaqClient";

export const revalidate = 60; // optionally revalidate every minute or let layout handle it

export default async function FaqPage() {
  const publishedFaqs = await db
    .select()
    .from(faqItem)
    .where(eq(faqItem.active, true))
    .orderBy(faqItem.sortOrder);

  const dynamicFaqs = publishedFaqs.map((faq) => ({
    qEn: faq.questionEn,
    aEn: faq.answerEn,
    qEs: faq.questionEs,
    aEs: faq.answerEs,
  }));

  return <FaqClient dynamicFaqs={dynamicFaqs} />;
}
