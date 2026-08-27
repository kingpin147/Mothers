import React from "react";
import MembershipClient from "./MembershipClient";
import { getPublicMembershipWindow } from "@/app/actions/publicWindow";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Membership — The Mothers Barcelona",
  description: "One membership. Everything you need to build your circle. Monthly credits, curated gatherings, and vetted community.",
  openGraph: {
    title: "Membership — The Mothers Barcelona",
    description: "Opening Circle and The Circle tiers for mothers in Barcelona, from pregnancy through the school years.",
    url: "https://themothers.cc/membership",
    siteName: "The Mothers",
    images: [
      {
        url: "/assets/design-membership.png",
        width: 1200,
        height: 630,
        alt: "The Mothers Membership",
      },
    ],
  },
};

export default async function MembershipPage() {
  const state = await getPublicMembershipWindow();
  
  return (
    <MembershipClient 
      initialWindowOpen={state.open} 
      initialSpotsRemaining={state.spotsRemaining} 
    />
  );
}
