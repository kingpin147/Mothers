import React from "react";
import HomeClient from "../HomeClient";
import { getPublicEvents } from "@/app/actions/events";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Mothers — A private membership club for mothers · Barcelona",
  description:
    "A private club for mothers in Barcelona: curated events, genuine community, credit-based booking, and trusted partner care.",
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
