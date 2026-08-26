import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Membership — The Mothers Barcelona",
  description:
    "Join The Mothers Barcelona private members club. Credit-based access to curated events, a genuine community of mothers, and trusted partner care.",
  openGraph: {
    title: "Membership — The Mothers Barcelona",
    description:
      "Join The Mothers Barcelona private members club. Credit-based events, trusted community.",
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
