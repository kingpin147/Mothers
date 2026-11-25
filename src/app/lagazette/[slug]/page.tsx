import { redirect } from "next/navigation";

export default async function LegacyGazettePostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/forum/${slug}`);
}
