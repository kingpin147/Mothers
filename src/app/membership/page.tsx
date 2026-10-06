import React from "react";
import MembershipClient from "./MembershipClient";
import { getPublicMembershipWindow, getPublicSettings } from "@/app/actions/publicWindow";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private Membership for Mothers in Barcelona | The Mothers",
  description:
    "Join The Mothers Barcelona private members club. Enjoy credit-based booking for curated gatherings, supportive stage groups, and exclusive partner privileges.",
  openGraph: {
    title: "Private Membership for Mothers in Barcelona | The Mothers",
    description:
      "Join The Mothers Barcelona private members club. Enjoy credit-based booking for curated gatherings, supportive stage groups, and exclusive partner privileges.",
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
  const settings = await getPublicSettings();
  
  return (
    <MembershipClient 
      initialWindowOpen={state.open} 
      initialSpotsRemaining={state.spotsRemaining}
      nextWindowDate={state.nextWindowDate ?? null}
      publicSettings={settings}
    />
  );
}
