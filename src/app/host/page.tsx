import React from "react";
import { checkHostEligibility } from "@/app/actions/host";
import { auth } from "@/lib/auth";
import { HostClient } from "./HostClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Host — The Mothers · Barcelona",
  description: "Lead walks, park socials and hosted coffees in your neighbourhood. Earn 2 credits for every event that runs.",
};

export default async function HostPage() {
  const session = await auth();
  const eligibility = await checkHostEligibility();

  return (
    <HostClient
      currentUser={session?.user || null}
      eligibility={eligibility}
    />
  );
}
