import { Metadata } from "next";
import ComingSoonClient from "./ComingSoonClient";

export const metadata: Metadata = {
  title: "The Mothers — Coming Soon",
  description:
    "A private membership club for mothers in Barcelona. Something beautiful is on its way.",
  openGraph: {
    title: "The Mothers — Coming Soon",
    description:
      "A private membership club for mothers in Barcelona. Something beautiful is on its way.",
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

export default function ComingSoonPage() {
  return <ComingSoonClient />;
}
