import React from "react";
import { checkHostEligibility, getUpcomingEventsNeedingHost } from "@/app/actions/host";
import { auth } from "@/lib/auth";
import { HostClient } from "./HostClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Become a Host & Welcome Local Mothers | The Mothers BCN",
  description:
    "Host gatherings in Barcelona and welcome fellow mothers at upcoming events. Earn credits, build your network, and play a meaningful role in our local community.",
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
