import React from "react";
import { getCirclePosts, getCirclePostById, checkPostingEligibility, getTrendingCircleTags } from "@/app/actions/gazette";
import { auth } from "@/lib/auth";
import { GazetteFeedClient } from "./GazetteFeedClient";
import { Metadata } from "next";

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ post?: string; filter?: string; topic?: string }>;
}): Promise<Metadata> {
  const sp = searchParams ? await searchParams : {};
  if (sp?.post) {
    const post = await getCirclePostById(sp.post);
    if (post) {
      const snippet = post.body.length > 160 ? `${post.body.slice(0, 157)}...` : post.body;
      const title = `${post.author} on La Gazette — The Mothers`;
      const firstPhoto = post.photos && post.photos.length > 0 ? post.photos[0] : null;

      return {
        title,
        description: snippet,
        openGraph: {
          title,
          description: snippet,
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
  }

  return {
    title: "La Gazette — Private Community Forum for Barcelona Moms",
    description:
      "Connect honestly with mothers in Barcelona. Share advice, ask questions, discuss parenting stages, and find local friendships inside our supportive forum space.",
  };
}

export default async function GazettePage({
  searchParams,
}: {
  searchParams?: Promise<{ post?: string; filter?: string; topic?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const session = await auth();
  let initialPosts = await getCirclePosts();

  if (sp?.post) {
    const exists = initialPosts.some((p) => p.id === sp.post);
    if (!exists) {
      const targetPost = await getCirclePostById(sp.post);
      if (targetPost) {
        initialPosts = [targetPost, ...initialPosts];
      }
    }
  }

  const eligibility = await checkPostingEligibility();
  const trendingTopics = await getTrendingCircleTags();

  return (
    <GazetteFeedClient
      initialPosts={initialPosts}
      currentUser={session?.user || null}
      eligibility={eligibility}
      trendingTopics={trendingTopics}
      highlightedPostId={sp?.post || null}
    />
  );
}
