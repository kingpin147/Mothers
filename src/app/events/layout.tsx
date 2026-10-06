import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upcoming Events and Gatherings for Mothers | The Mothers",
  description:
    "Discover curated walks, play dates, mothers dinners, and expert workshops across Barcelona. Book your spot easily with flexible credits and meet local moms.",
  openGraph: {
    title: "Upcoming Events and Gatherings for Mothers | The Mothers",
    description:
      "Discover curated walks, play dates, mothers dinners, and expert workshops across Barcelona. Book your spot easily with flexible credits and meet local moms.",
    url: "https://themothers.cc/events",
    siteName: "The Mothers",
    locale: "en_GB",
    type: "website",
  },
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
