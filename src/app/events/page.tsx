import { getPublicEvents } from "@/app/actions/events";
import { EventsCalendar } from "./EventsCalendar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Events & Calendar — The Mothers Barcelona",
  description: "Curated club gatherings, community walks, expert workshops, and signature evenings for mothers in Barcelona.",
  openGraph: {
    title: "Events Calendar — The Mothers Barcelona",
    description: "Browse upcoming walks, workshops, dinners, and seasonal gatherings for mothers in Barcelona.",
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
