import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Journal — Motherhood Insights & Guides | The Mothers",
  description:
    "Thoughtful articles on pregnancy, postpartum doulas, infant sleep, feeding, and returning to work, written by trusted specialists for modern mothers in Barcelona.",
  openGraph: {
    title: "The Journal — Motherhood Insights & Guides | The Mothers",
    description:
      "Thoughtful articles on pregnancy, postpartum doulas, infant sleep, feeding, and returning to work, written by trusted specialists for modern mothers in Barcelona.",
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
