import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Journal — The Mothers Barcelona",
  description:
    "Stories, insights, and practical wisdom from The Mothers Barcelona community. Articles on motherhood, wellness, parenting, and life in Barcelona.",
  openGraph: {
    title: "Journal — The Mothers Barcelona",
    description:
      "Stories and insights from The Mothers Barcelona community on motherhood, wellness, and parenting.",
    url: "https://themothers.cc/journal",
    siteName: "The Mothers",
    locale: "en_GB",
    type: "website",
  },
};

export default function JournalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
