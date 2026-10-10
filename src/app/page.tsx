import React from "react";
import HomeClient from "./HomeClient";
import { getPublicEvents } from "@/app/actions/events";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Mothers — Private Moms Club & Community in Barcelona",
  description:
    "The Mothers is a private moms club in Barcelona offering curated gatherings, genuine community, and trusted experiences designed for modern mothers and bumps.",
  openGraph: {
    title: "The Mothers — Private Moms Club & Community in Barcelona",
    description:
      "The Mothers is a private moms club in Barcelona offering curated gatherings, genuine community, and trusted experiences designed for modern mothers and bumps.",
    url: "https://themothers.cc",
    siteName: "The Mothers",
    images: [
      {
        url: "https://themothers.cc/assets/home-hero.webp",
        width: 1200,
        height: 630,
        alt: "The Mothers Barcelona",
      },
    ],
  },
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
