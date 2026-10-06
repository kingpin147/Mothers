import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curated Partner Network & Motherhood Perks in Barcelona",
  description:
    "Explore our vetted directory of Barcelona specialists, prenatal yoga studios, lactation experts, postpartum doulas, and family-friendly hospitality venues.",
  openGraph: {
    title: "Curated Partner Network & Motherhood Perks in Barcelona",
    description:
      "Explore our vetted directory of Barcelona specialists, prenatal yoga studios, lactation experts, postpartum doulas, and family-friendly hospitality venues.",
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
