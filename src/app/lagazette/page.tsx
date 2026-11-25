import { redirect } from "next/navigation";

export default async function LegacyGazettePage({
  searchParams,
}: {
  searchParams?: Promise<{ post?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  if (sp?.post) {
    redirect(`/forum?post=${encodeURIComponent(sp.post)}`);
  }
  redirect("/forum");
}
