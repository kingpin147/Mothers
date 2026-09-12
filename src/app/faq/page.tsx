import { db } from "@/db";
import { faqItem } from "@/db/schema";
import { eq } from "drizzle-orm";
import FaqClient from "./FaqClient";
import { getPublicSettings } from "@/app/actions/publicWindow";
import { CANONICAL_FAQS } from "@/lib/faqData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FaqPage() {
  const publishedFaqs = await db
    .select()
    .from(faqItem)
    .where(eq(faqItem.active, true))
    .orderBy(faqItem.sortOrder);

  const cmsFaqs = publishedFaqs.map((faq) => ({
    qEn: faq.questionEn,
    aEn: faq.answerEn,
    qEs: faq.questionEs,
    aEs: faq.answerEs,
  }));

  // If DB already contains custom/all FAQs, ensure no duplicate with canonical list
  const existingQuestions = new Set(cmsFaqs.map((f) => f.qEn.toLowerCase().trim()));
  const filteredBase = CANONICAL_FAQS.filter((f) => !existingQuestions.has(f.qEn.toLowerCase().trim()));
  const allFaqs = [...filteredBase, ...cmsFaqs];

  const publicSettings = await getPublicSettings();

  return <FaqClient dynamicFaqs={allFaqs} publicSettings={publicSettings} />;
}
