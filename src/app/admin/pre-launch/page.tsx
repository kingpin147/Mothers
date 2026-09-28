import React from "react";
import { getPreLaunchDeskData } from "@/app/actions/adminPreLaunch";
import { PreLaunchDeskClient } from "./PreLaunchDeskClient";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Pre-launch Desk — The Mothers Barcelona",
  description: "Operations desk running host requests, attendance, circle moderation and pre-launch accounts.",
};

export default async function AdminPreLaunchPage() {
  const data = await getPreLaunchDeskData();

  if (!data.success) {
    redirect("/admin");
  }

  return <PreLaunchDeskClient initialData={data} />;
}
