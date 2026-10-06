import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions About Membership | The Mothers",
  description:
    "Get answers about joining The Mothers in Barcelona, how credits work, event cancellations, stage groups, host opportunities, and our curated partner network.",
  openGraph: {
    title: "Frequently Asked Questions About Membership | The Mothers",
    description:
      "Get answers about joining The Mothers in Barcelona, how credits work, event cancellations, stage groups, host opportunities, and our curated partner network.",
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
