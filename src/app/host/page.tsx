import React from "react";
import { checkHostEligibility, getUpcomingEventsNeedingHost } from "@/app/actions/host";
import { auth } from "@/lib/auth";
import { HostClient } from "./HostClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Become a Host — The Mothers · Barcelona",
  description: "Lead walks, park socials and hosted coffees in your neighbourhood. Earn 2 credits for every event that runs.",
};

export default async function HostPage() {
  const session = await auth();
  const [eligibility, eventsData] = await Promise.all([
    checkHostEligibility(),
    getUpcomingEventsNeedingHost(),
  ]);

  return (
    <HostClient
      currentUser={session?.user || null}
      eligibility={eligibility}
      eventsNeedingHost={eventsData.events || []}
      userBookings={eventsData.userBookings || []}
      userHostRequests={eventsData.userHostRequests || []}
    />
  );
}
