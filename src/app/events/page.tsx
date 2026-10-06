import { getPublicEvents } from "@/app/actions/events";
import { EventsCalendar } from "./EventsCalendar";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

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
    images: [
      {
        url: "/assets/design-events.png",
        width: 1200,
        height: 630,
        alt: "The Mothers Events Calendar",
      },
    ],
  },
};

export default async function EventsPage() {
  const data = await getPublicEvents();
  return (
    <EventsCalendar
      events={data.events || []}
      categories={data.categories || []}
      creditBalance={data.creditBalance || 0}
    />
  );
}
