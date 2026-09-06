import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Event Pass",
  description: "Event pass ticket and meeting point for The Mothers Barcelona.",
};

export default function TicketLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
