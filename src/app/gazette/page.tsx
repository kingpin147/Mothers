import React from "react";
import { getCirclePosts, checkPostingEligibility, getTrendingCircleTags } from "@/app/actions/gazette";
import { auth } from "@/lib/auth";
import { GazetteFeedClient } from "./GazetteFeedClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "La Gazette — Private Community Forum for Barcelona Moms",
  description:
    "Connect honestly with mothers in Barcelona. Share advice, ask questions, discuss parenting stages, and find local friendships inside our supportive forum space.",
};

export default async function GazettePage() {
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
