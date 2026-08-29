import React from "react";
import HomeClient from "./HomeClient";
import { getPublicMembershipWindow } from "@/app/actions/publicWindow";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Mothers — Private Membership Club for Mothers in Barcelona",
  description:
    "A private club for mothers in Barcelona, from pregnancy through the school years. Weekly events, curated community, and partner perks.",
  openGraph: {
    title: "The Mothers — Private Membership Club for Mothers in Barcelona",
    description:
      "Find your people. Build your circle. Opening Circle now open for the first 50 mothers.",
    url: "https://themothers.cc",
    siteName: "The Mothers",
    images: [
      {
        url: "https://themothers.cc/assets/home-hero.webp",
        width: 1200,
        height: 630,
        alt: "The Mothers Barcelona",
      },
    ],
  },
};

export default async function HomePage() {
  const state = await getPublicMembershipWindow();

  return (
    <HomeClient
      initialWindowOpen={state.open}
      initialSpotsRemaining={state.spotsRemaining}
    />
  );
}
