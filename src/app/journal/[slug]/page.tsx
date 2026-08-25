import React from "react";
import Link from "next/link";
import { db } from "@/db";
import { journalPost } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";

export const dynamic = "force-static";

// ─── Static fallback data ────────────────────────────────────────────────────

interface StaticPost {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  author: string;
  category: string;
  readTime: string;
  publishedAt: Date;
}

const STATIC_POSTS: StaticPost[] = [
  {
    slug: "postpartum-support-barcelona",
    title: "Finding Your Village: The First 100 Days in Barcelona",
    excerpt: "Practical wisdom, quiet parks, and building meaningful connections when you have a newborn in the city.",
    body: `The first three months of welcoming a baby are uniquely tender. In a vibrant city like Barcelona, the world continues to move at full speed outside your balcony while inside, hours stretch around feedings and quiet naps.

Having even one other mother to meet in the park on a sunny morning changes everything. That is why The Mothers was built — to make finding your neighbourhood circle effortless, warm, and natural.`,
    author: "The Mothers Editorial",
    category: "Maternal Wellness",
    readTime: "4 min read",
    publishedAt: new Date("2026-08-18"),
  },
  {
    slug: "career-and-motherhood-rebalance",
    title: "Returning to Work Without Losing Your Centre",
    excerpt: "Guidance on flexible rhythms, boundaries, and career navigation after welcoming a baby.",
    body: `Returning to work after having a baby is one of the most common sources of invisible stress among the mothers in our community. The pressure to \"snap back\" professionally is real, even when your body and sleep are still catching up.

The women who navigate this most gracefully tend to share one thing: they stopped trying to be who they were before. Instead, they built new rhythms that honoured both their professional identity and their new role as a mother.`,
    author: "The Mothers Editorial",
    category: "Life & Work",
    readTime: "6 min read",
    publishedAt: new Date("2026-08-10"),
  },
  {
    slug: "quiet-cafes-and-stroller-walks-bcn",
    title: "The Best Stroller Walks & Peaceful Cafés in Sarrià and Gràcia",
    excerpt: "Curated corners of the city where you can nurse, push a stroller easily, and enjoy a warm coffee.",
    body: `Barcelona is a wonderful city for mothers — if you know where to go. Narrow Gothic streets and cobblestones are beautiful but not always stroller-friendly. Sarrià and Gràcia offer wide pavements, gentle inclines, and neighbourhood squares that still feel local and unhurried.

Here are our favourite routes and stops, tested and approved by members who live in these barrios.`,
    author: "The Mothers Editorial",
    category: "City Guides",
    readTime: "5 min read",
    publishedAt: new Date("2026-08-01"),
  },
];

// ─── DB + static fallback helper ────────────────────────────────────────────

async function getJournalPost(slug: string): Promise<StaticPost | null> {
  // Try DB first
  try {
    const dbPost = await db.query.journalPost.findFirst({
      where: eq(journalPost.slug, slug),
    });
    if (dbPost && dbPost.status === "published") {
      return {
        slug: dbPost.slug,
        title: dbPost.title,
        excerpt: dbPost.excerpt,
        body: dbPost.body,
        author: dbPost.author,
        category: "Journal",
        readTime: "5 min read",
        publishedAt: dbPost.publishedAt ?? new Date(dbPost.createdAt),
      };
    }
  } catch {
    // DB unavailable — fall through to static data
  }

  // Fall back to static
  return STATIC_POSTS.find((p) => p.slug === slug) ?? null;
}

// ─── generateMetadata ────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getJournalPost(slug);
  if (!post) {
    return {
      title: "Journal — The Mothers",
      description: "Read the latest from The Mothers Journal.",
    };
  }
  return {
    title: `${post.title} — The Mothers Journal`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
    },
  };
}

// ─── Page component ──────────────────────────────────────────────────────────

export default async function JournalSinglePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getJournalPost(slug);

  if (!post) {
    return (
      <div
        style={{
          backgroundColor: "var(--color-bg)",
          minHeight: "100vh",
          padding: "clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px) 100px",
        }}
      >
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <div style={{ marginBottom: "28px" }}>
            <Link href="/journal" style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
              ← Back to Journal
            </Link>
          </div>
          <p style={{ color: "var(--color-text-muted)" }}>Article not found.</p>
        </div>
      </div>
    );
  }

  const dateStr = post.publishedAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Render body paragraphs (split on double newlines)
  const paragraphs = post.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div
      style={{
        backgroundColor: "var(--color-bg)",
        minHeight: "100vh",
        padding: "clamp(48px, 6vw, 80px) clamp(24px, 5vw, 64px) 100px",
      }}
    >
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ marginBottom: "28px" }}>
          <Link href="/journal" style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
            ← Back to Journal
          </Link>
        </div>

        <article
          className="card"
          style={{
            backgroundColor: "#fff",
            padding: "clamp(32px, 5vw, 56px)",
            border: "1px solid var(--color-divider)",
          }}
        >
          {/* Category & read time */}
          <div
            style={{
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--color-accent-2)",
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            {post.category} · {post.readTime}
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(28px, 4.5vw, 44px)",
              margin: "0 0 16px",
              lineHeight: "1.2",
            }}
          >
            {post.title}
          </h1>

          {/* Byline */}
          <div
            style={{
              fontSize: "13px",
              color: "var(--color-text-muted)",
              borderBottom: "1px solid var(--color-divider)",
              paddingBottom: "20px",
              marginBottom: "32px",
            }}
          >
            By {post.author} · {dateStr}
          </div>

          {/* Body */}
          <div
            style={{
              fontSize: "16.5px",
              lineHeight: "1.8",
              color: "var(--color-text)",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {paragraphs.map((para, idx) => (
              <p key={idx} style={{ margin: 0 }}>
                {para}
              </p>
            ))}
          </div>

          {/* CTA footer */}
          <div
            style={{
              marginTop: "48px",
              paddingTop: "28px",
              borderTop: "1px solid var(--color-divider)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <h4 style={{ fontSize: "16px", margin: "0 0 4px" }}>Want to join our next walk?</h4>
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>
                Applications are open for our founding circle.
              </p>
            </div>
            <Link href="/membership/apply" className="btn btn-primary" style={{ fontSize: "13px" }}>
              Apply to Join →
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
