import React from "react";
import MembershipClient from "../MembershipClient";
import { getPublicMembershipWindow } from "@/app/actions/publicWindow";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply for Membership — The Mothers Barcelona",
  description: "Apply to join The Mothers Barcelona opening cohort.",
};

export default async function ApplyPage() {
  const state = await getPublicMembershipWindow();

  return (
    <MembershipClient
      initialWindowOpen={state.open}
      initialSpotsRemaining={state.spotsRemaining}
      autoOpenApply={true}
    />
  );
}
