import React from "react";
import { auth } from "@/lib/auth";
import { getPreLaunchDeskData } from "@/app/actions/adminPreLaunch";
import { PreLaunchDeskClient } from "@/app/admin/pre-launch/PreLaunchDeskClient";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "La Gazette Moderation — The Mothers Admin",
  description: "Moderation queue and topic settings for La Gazette.",
};

export default async function AdminReportsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const isAdmin = ["owner", "manager", "host", "super_admin"].includes(role);

  if (!isAdmin) {
    redirect("/account/login");
  }

  const data = await getPreLaunchDeskData();

  if (!data.success) {
    redirect("/admin");
  }

  return <PreLaunchDeskClient initialData={data} defaultTab="circle" />;
}
