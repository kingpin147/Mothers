import React from "react";
import { getClubSettings } from "@/app/actions/adminSettings";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const res = await getClubSettings();
  const settings = res.success && res.settings ? res.settings : {};

  return <SettingsClient initialSettings={settings} />;
}
