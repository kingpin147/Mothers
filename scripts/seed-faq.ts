import { db } from "../src/db";
import { faqItem } from "../src/db/schema";
import { CANONICAL_FAQS } from "../src/lib/faqData";

async function main() {
  console.log("Reseeding FAQ items table...");
  // Clear old FAQ items
  await db.delete(faqItem);

  const seedValues = CANONICAL_FAQS.map((faq, index) => ({
    groupName: faq.group,
    category: faq.group,
    questionEn: faq.qEn,
    answerEn: faq.aEn,
    questionEs: faq.qEs,
    answerEs: faq.aEs,
    questionFr: faq.qFr || "",
    answerFr: faq.aFr || "",
    policyQuote: faq.policyQuote || null,
    sortOrder: index,
    active: true,
    isPublished: true,
  }));

  await db.insert(faqItem).values(seedValues);
  console.log(`✅ Successfully seeded ${seedValues.length} canonical FAQ items!`);

  const check = await db.select().from(faqItem).orderBy(faqItem.sortOrder);
  console.log(`Verified ${check.length} rows in database:`);
  check.forEach((f, i) => {
    console.log(`${i + 1}. [${f.groupName}] ${f.questionEn}`);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error("Error seeding FAQ items:", err);
  process.exit(1);
});
