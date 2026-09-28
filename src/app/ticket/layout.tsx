import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Event Ticket",
  description: "Event ticket and meeting point for The Mothers Barcelona.",
};

export default function TicketLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
