import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ — The Mothers Barcelona",
  description:
    "Frequently asked questions about The Mothers Barcelona: membership tiers, credits, event booking, cancellations, Godmother referrals, and more.",
  openGraph: {
    title: "FAQ — The Mothers Barcelona",
    description:
      "Your questions about The Mothers Barcelona answered: membership, credits, events, and community.",
    url: "https://themothers.cc/faq",
    siteName: "The Mothers",
    locale: "en_GB",
    type: "website",
  },
};

export default function FaqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
