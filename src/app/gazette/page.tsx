import React from "react";
import { getCirclePosts, checkPostingEligibility, getTrendingCircleTags } from "@/app/actions/gazette";
import { auth } from "@/lib/auth";
import { GazetteFeedClient } from "./GazetteFeedClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "La Gazette — A place for mothers in Barcelona",
  description: "Share what you are living, ask for advice, and cheer each other on in La Gazette.",
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
