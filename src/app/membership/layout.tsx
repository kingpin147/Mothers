import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private Membership for Mothers in Barcelona | The Mothers",
  description:
    "Join The Mothers Barcelona private members club. Enjoy credit-based booking for curated gatherings, supportive stage groups, and exclusive partner privileges.",
  openGraph: {
    title: "Private Membership for Mothers in Barcelona | The Mothers",
    description:
      "Join The Mothers Barcelona private members club. Enjoy credit-based booking for curated gatherings, supportive stage groups, and exclusive partner privileges.",
    url: "https://themothers.cc/membership",
    siteName: "The Mothers",
    locale: "en_GB",
    type: "website",
  },
};

export default function MembershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
