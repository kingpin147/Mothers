import React from "react";
import { notFound, redirect } from "next/navigation";
import { getCirclePosts, getCirclePostBySlugOrId, checkPostingEligibility, getTrendingCircleTags } from "@/app/actions/gazette";
import { auth } from "@/lib/auth";
import { GazetteFeedClient } from "../GazetteFeedClient";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCirclePostBySlugOrId(slug);

  if (!post) {
    return {
      title: "Publication not found — La Gazette",
    };
  }

  const snippet = post.body.length > 160 ? `${post.body.slice(0, 157)}...` : post.body;
  const title = `${post.author} on La Gazette — The Mothers`;
  const firstPhoto = post.photos && post.photos.length > 0 ? post.photos[0] : null;
  const canonicalUrl = `https://themothers.cc/lagazette/${post.slug || post.id}`;

  return {
    title,
    description: snippet,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description: snippet,
      url: canonicalUrl,
      type: "article",
      images: firstPhoto ? [{ url: firstPhoto }] : undefined,
    },
    twitter: {
      card: firstPhoto ? "summary_large_image" : "summary",
      title,
      description: snippet,
      images: firstPhoto ? [firstPhoto] : undefined,
    },
  };
}

export default async function GazettePostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getCirclePostBySlugOrId(slug);

  if (!post) {
    notFound();
  }

  // If user visited via the raw UUID but the post has a clean readable slug, redirect to readable URL
  if (slug === post.id && post.slug && post.slug !== post.id) {
    redirect(`/lagazette/${post.slug}`);
  }

  const session = await auth();
  const allPosts = await getCirclePosts();

  // Ensure this post is at the front of the feed if not already present
  const initialPosts = [
    post,
    ...allPosts.filter((p) => p.id !== post.id),
  ];

  const eligibility = await checkPostingEligibility();
  const trendingTopics = await getTrendingCircleTags();

  return (
    <GazetteFeedClient
      initialPosts={initialPosts}
      currentUser={session?.user || null}
      eligibility={eligibility}
      trendingTopics={trendingTopics}
      highlightedPostId={post.id}
    />
  );
}
