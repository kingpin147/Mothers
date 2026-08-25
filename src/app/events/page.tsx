import { getPublicEvents } from "@/app/actions/events";
import { EventsCalendar } from "./EventsCalendar";

export default async function EventsPage() {
  const data = await getPublicEvents();
  return (
    <EventsCalendar
      events={data.events || []}
      categories={data.categories || []}
    />
  );
}
