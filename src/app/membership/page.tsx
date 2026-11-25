import React from "react";
import MembershipClient from "./MembershipClient";
import { getPublicMembershipWindow, getPublicSettings } from "@/app/actions/publicWindow";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Membership | The Mothers",
  description:
    "Join The Mothers. Enjoy partner perks, members-only gatherings, and unlimited posting in The Forum — from €6.99 a month.",
  openGraph: {
    title: "Membership | The Mothers",
    description:
      "Join The Mothers. Enjoy partner perks, members-only gatherings, and unlimited posting in The Forum — from €6.99 a month.",
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
