import { db } from "@/db";
import { journalPost, mediaAsset } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import JournalClient from "./JournalClient";

export const revalidate = 60;

const TOPIC_CAT: Record<string, string> = {
  Pregnancy: "pregnancy",
  "The early months": "postpartum",
  "Family life": "family",
  Barcelona: "city",
  "From the members": "friendship",
};

export default async function JournalPage() {
  const published = await db
    .select({
      post: journalPost,
      image: mediaAsset.publicUrl,
    })
    .from(journalPost)
    .leftJoin(mediaAsset, eq(journalPost.heroImageId, mediaAsset.id))
    .where(eq(journalPost.status, "published"))
    .orderBy(desc(journalPost.publishedAt));

  const dynamicArticles = published.map((row) => {
    const a = row.post;
    const wordCount = a.body ? a.body.split(/\s+/).length : 0;
    const readTime = Math.max(1, Math.round(wordCount / 200));
    
    // Attempt to map category, default to family
    const cat = TOPIC_CAT[a.title] || "family"; // Note: title is used since topic column is missing, actually tm-store used a.topic but schema has no topic. We'll default to 'family' as a fallback, or map based on tags if added later.

    return {
      id: a.slug || a.id,
      cat: cat,
      dateEn: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
      dateEs: a.publishedAt ? new Date(a.publishedAt).toLocaleDateString("es-ES", { month: "short", day: "numeric", year: "numeric" }) : "",
      readEn: `${readTime} min read`,
      readEs: `${readTime} min de lectura`,
      author: a.author || "The Mothers",
      roleEn: "",
      roleEs: "",
      titleEn: a.title,
      titleEs: a.title,
      dekEn: a.excerpt,
      dekEs: a.excerpt,
      image: row.image || "/assets/journal-doula.jpg", // fallback image
    };
  });

  return <JournalClient dynamicArticles={dynamicArticles as any} />;
}
