import React from "react";
import MembershipClient from "../MembershipClient";
import { getPublicMembershipWindow, getPublicSettings } from "@/app/actions/publicWindow";
import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Apply for Membership — The Mothers Barcelona",
  description: "Apply to join The Mothers Barcelona opening cohort.",
};

export default async function ApplyPage() {
  const state = await getPublicMembershipWindow();
  const settings = await getPublicSettings();

  return (
    <MembershipClient
      initialWindowOpen={state.open}
      initialSpotsRemaining={state.spotsRemaining}
      nextWindowDate={state.nextWindowDate ?? null}
      autoOpenApply={true}
      publicSettings={settings}
    />
  );
}
