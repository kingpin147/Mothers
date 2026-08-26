import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partners — The Mothers Barcelona",
  description:
    "Discover trusted partner services recommended by The Mothers Barcelona: baby care, wellness, nutrition, and family-friendly businesses.",
  openGraph: {
    title: "Partners — The Mothers Barcelona",
    description:
      "Trusted services and businesses recommended by The Mothers Barcelona community.",
    url: "https://themothers.cc/partners",
    siteName: "The Mothers",
    locale: "en_GB",
    type: "website",
  },
};

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
