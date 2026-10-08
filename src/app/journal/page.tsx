import { db } from "@/db";
import { journalPost, mediaAsset } from "@/db/schema";
import { eq, desc, and, lte, or, isNull, sql } from "drizzle-orm";
import JournalClient from "./JournalClient";
import { normalizeCategoryId } from "@/lib/journalCategories";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function JournalPage() {
  const now = new Date();

  // Fetch only published articles whose scheduled date has passed (or is null)
  const published = await db
    .select({
      post: journalPost,
      image: mediaAsset.publicUrl,
      imageAlt: mediaAsset.altText,
    })
    .from(journalPost)
    .leftJoin(mediaAsset, eq(journalPost.heroImageId, mediaAsset.id))
    .where(
      and(
        eq(journalPost.status, "published"),
        or(isNull(journalPost.publishedAt), lte(journalPost.publishedAt, now))
      )
    )
    .orderBy(desc(journalPost.publishedAt), desc(journalPost.createdAt));

  const dynamicArticles = published.map((row) => {
    const a = row.post;
    const wordCountEn = a.body ? a.body.split(/\s+/).filter(Boolean).length : 0;
    const wordCountEs = a.bodyEs ? a.bodyEs.split(/\s+/).filter(Boolean).length : wordCountEn;
    
    const readTimeEn = Math.max(1, Math.round(wordCountEn / 200));
    const readTimeEs = Math.max(1, Math.round(wordCountEs / 200));

    const pubDate = a.publishedAt ? new Date(a.publishedAt) : new Date(a.createdAt);

    return {
      id: a.slug || a.id,
      slug: a.slug,
      cat: normalizeCategoryId(a.category),
      dateEn: pubDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      dateEs: pubDate.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }),
      dateFr: pubDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
      readEn: `${readTimeEn} min read`,
      readEs: `${readTimeEs} min de lectura`,
      readFr: `${readTimeEs} min de lecture`,
      author: a.author || "The Mothers",
      roleEn: a.authorRoleEn || "",
      roleEs: a.authorRoleEs || "",
      roleFr: a.authorRoleFr || "",
      titleEn: a.title,
      titleEs: a.titleEs || a.title,
      titleFr: a.titleFr || a.title,
      dekEn: a.excerpt,
      dekEs: a.excerptEs || a.excerpt,
      dekFr: a.excerptFr || a.excerpt,
      quoteEn: a.quoteEn || "",
      quoteEs: a.quoteEs || "",
      quoteFr: a.quoteFr || "",
      bodyEn: a.body,
      bodyEs: a.bodyEs || a.body,
      bodyFr: a.bodyFr || a.body,
      bylineEn: a.bylineEn || "",
      bylineEs: a.bylineEs || "",
      bylineFr: a.bylineFr || "",
      image: row.image || "",
      imageAlt: row.imageAlt || a.title,
      audience: a.audience || "public",
    };
  });

  return <JournalClient dynamicArticles={dynamicArticles as any} />;
}
