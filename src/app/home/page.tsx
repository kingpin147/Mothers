import React from "react";
import HomeClient from "../HomeClient";
import { getPublicEvents } from "@/app/actions/events";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Mothers — Private Moms Club & Community in Barcelona",
  description:
    "The Mothers is a private moms club in Barcelona offering curated gatherings, genuine community, and trusted experiences designed for modern mothers and bumps.",
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
