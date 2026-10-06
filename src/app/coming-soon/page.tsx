import { Metadata } from "next";
import ComingSoonClient from "./ComingSoonClient";

export const metadata: Metadata = {
  title: "The Mothers Barcelona — Private Membership Club for Moms",
  description:
    "A private membership club for mothers in Barcelona is opening soon. Join the early access list to receive priority invitations and connect with local mothers.",
  openGraph: {
    title: "The Mothers Barcelona — Private Membership Club for Moms",
    description:
      "A private membership club for mothers in Barcelona is opening soon. Join the early access list to receive priority invitations and connect with local mothers.",
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
