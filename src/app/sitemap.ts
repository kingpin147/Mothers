import type { MetadataRoute } from "next";
import { db } from "@/db";
import { event, journalPost } from "@/db/schema";
import { inArray, eq } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://themothers.cc";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/membership`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/journal`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/gazette`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/partners`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/host`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  try {
    const [publishedEvents, publishedArticles] = await Promise.all([
      db
        .select({ id: event.id, updatedAt: event.updatedAt })
        .from(event)
        .where(inArray(event.status, ["confirmed", "published_pending"])),
      db
        .select({ slug: journalPost.slug, publishedAt: journalPost.publishedAt })
        .from(journalPost)
        .where(eq(journalPost.status, "published")),
    ]);

    const eventRoutes: MetadataRoute.Sitemap = publishedEvents.map((ev) => ({
      url: `${baseUrl}/events/${ev.id}`,
      lastModified: ev.updatedAt || new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    }));

    const articleRoutes: MetadataRoute.Sitemap = publishedArticles.map((art) => ({
      url: `${baseUrl}/journal/${art.slug}`,
      lastModified: art.publishedAt || new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    return [...staticRoutes, ...eventRoutes, ...articleRoutes];
  } catch {
    return staticRoutes;
  }
}
