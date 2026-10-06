import { db } from "@/db";
import { faqItem } from "@/db/schema";
import { eq } from "drizzle-orm";
import FaqClient from "./FaqClient";
import { getPublicSettings } from "@/app/actions/publicWindow";
import { CANONICAL_FAQS } from "@/lib/faqData";
import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Frequently Asked Questions About Membership | The Mothers",
  description:
    "Get answers about joining The Mothers in Barcelona, how credits work, event cancellations, stage groups, host opportunities, and our curated partner network.",
};

export default async function FaqPage() {
  const publishedFaqs = await db
    .select()
    .from(faqItem)
    .where(eq(faqItem.active, true))
    .orderBy(faqItem.sortOrder);

  const allFaqs =
    publishedFaqs.length > 0
      ? publishedFaqs.map((faq) => ({
          group: faq.category || faq.groupName || "Coming to an event now",
          qEn: faq.questionEn,
          aEn: faq.answerEn,
          qEs: faq.questionEs && faq.questionEs.trim() ? faq.questionEs : faq.questionEn,
          aEs: faq.answerEs && faq.answerEs.trim() ? faq.answerEs : faq.answerEn,
        }))
      : CANONICAL_FAQS.map((faq) => ({
          group: faq.group || "Coming to an event now",
          qEn: faq.qEn,
          aEn: faq.aEn,
          qEs: faq.qEs,
          aEs: faq.aEs,
        }));

  const publicSettings = await getPublicSettings();

  return <FaqClient dynamicFaqs={allFaqs} publicSettings={publicSettings} />;
}
