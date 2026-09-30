import { redirect } from "next/navigation";
import { getPublicClubSettings } from "@/app/actions/adminSettings";
import { getPublicPartners } from "@/app/actions/publicWindow";
import PartnersClient from "./PartnersClient";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const settings = await getPublicClubSettings();
  if (!settings.membershipLive) {
    redirect("/");
  }

  const res = await getPublicPartners();
  const initialPartners = res.success && res.partners ? res.partners : [];

  return <PartnersClient initialPartners={initialPartners} />;
}
