import React from "react";
import { auth } from "@/lib/auth";
import { getAdminReports } from "@/app/actions/adminReports";
import { ReportsAdminClient } from "./ReportsAdminClient";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moderation Queue — The Mothers Admin",
  description: "Review reports, hide/restore posts, and manage paused accounts.",
};

export default async function AdminReportsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const isAdmin = ["owner", "manager", "host", "super_admin"].includes(role);

  if (!isAdmin) {
    redirect("/admin/login");
  }

  const reports = await getAdminReports();

  return <ReportsAdminClient initialReports={reports} />;
}
