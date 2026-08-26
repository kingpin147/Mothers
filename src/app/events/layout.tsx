import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events Calendar — The Mothers Barcelona",
  description:
    "Browse and reserve spots at curated events for mothers in Barcelona: yoga, walks, workshops, social circles, and more. Credit-based booking for members.",
  openGraph: {
    title: "Events Calendar — The Mothers Barcelona",
    description:
      "Browse and reserve spots at curated events for mothers in Barcelona.",
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
