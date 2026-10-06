import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions of Membership | The Mothers Barcelona",
  description:
    "Read the official terms and conditions for The Mothers Barcelona, governing accounts, credit wallets, event bookings, community guidelines, and memberships.",
  openGraph: {
    title: "Terms & Conditions of Membership | The Mothers Barcelona",
    description:
      "Read the official terms and conditions for The Mothers Barcelona, governing accounts, credit wallets, event bookings, community guidelines, and memberships.",
    url: "https://themothers.cc/terms",
    siteName: "The Mothers",
    locale: "en_GB",
    type: "website",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
