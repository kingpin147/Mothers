import React from "react";
import { getCirclePosts, checkPostingEligibility } from "@/app/actions/circle";
import { auth } from "@/lib/auth";
import { CircleFeedClient } from "./CircleFeedClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Circle — A place for mothers in Barcelona",
  description: "Share what you are living, ask for advice, and cheer each other on in The Circle.",
};

export default async function CirclePage() {
  const session = await auth();
  const initialPosts = await getCirclePosts();
  const eligibility = await checkPostingEligibility();

  return (
    <CircleFeedClient
      initialPosts={initialPosts}
      currentUser={session?.user || null}
      eligibility={eligibility}
    />
  );
}
