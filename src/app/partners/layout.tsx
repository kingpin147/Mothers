import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recommended professionals — The Mothers",
  description: "Professionals recommended by mothers.",
  openGraph: {
    title: "Recommended professionals — The Mothers",
    description: "Professionals recommended by mothers.",
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
