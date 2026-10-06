import React, { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getMyCredits } from "@/app/actions/memberAccount";
import { TopUpClient } from "./TopUpClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Top Up Credits for Event Bookings | The Mothers Barcelona",
  description:
    "Purchase credits for your wallet to book walks, workshops, suppers, and gatherings across Barcelona. Transparent pricing with no recurring fees or lock-ins.",
};

export default async function TopUpPage() {
  const session = await auth();
  let currentBalance = 0;

  if (session?.user?.id) {
    try {
      const res = await getMyCredits();
      currentBalance = Math.max(0, res.balance || 0);
    } catch {
      currentBalance = 0;
    }
  }

  return (
    <Suspense fallback={<div style={{ padding: "80px 24px", textAlign: "center" }}>Loading wallet...</div>}>
      <TopUpClient currentUser={session?.user || null} currentBalance={currentBalance} />
    </Suspense>
  );
}
