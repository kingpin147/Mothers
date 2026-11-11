import React from "react";
import { redirect } from "next/navigation";
import { getCirclePosts, getCirclePostBySlugOrId, checkPostingEligibility, getTrendingCircleTags } from "@/app/actions/gazette";
import { auth } from "@/lib/auth";
import { GazetteFeedClient } from "./GazetteFeedClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "La Gazette — Private Community Forum for Barcelona Moms",
  description:
    "Connect honestly with mothers in Barcelona. Share advice, ask questions, discuss parenting stages, and find local friendships inside our supportive forum space.",
};

export default async function GazettePage({
  searchParams,
}: {
  searchParams?: Promise<{ post?: string; filter?: string; topic?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};

  // If someone accessed using the old ?post=UUID link, redirect to the new clean readable URL
  if (sp?.post) {
    const targetPost = await getCirclePostBySlugOrId(sp.post);
    if (targetPost && targetPost.slug) {
      redirect(`/lagazette/${targetPost.slug}`);
    }
  }

  const session = await auth();
  const initialPosts = await getCirclePosts();
  const eligibility = await checkPostingEligibility();
  const trendingTopics = await getTrendingCircleTags();

  return (
    <GazetteFeedClient
      initialPosts={initialPosts}
      currentUser={session?.user || null}
      eligibility={eligibility}
      trendingTopics={trendingTopics}
    />
  );
}
