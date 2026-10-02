import React from "react";
import HomeClient from "../HomeClient";
import { getPublicEvents } from "@/app/actions/events";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Mothers — A way of life for the modern Mother · Barcelona",
  description:
    "Curated gatherings, genuine community, credit-based booking, and trusted partner care for mothers in Barcelona.",
};

export default async function HomePage() {
  let events: any[] = [];
  try {
    const data = await getPublicEvents();
    events = data.events || [];
  } catch {
    events = [];
  }

  return <HomeClient initialEvents={events} />;
}
