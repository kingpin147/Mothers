import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Account — The Mothers Barcelona",
  description:
    "Manage your membership, view your credit ledger, update personal details, and explore upcoming bookings in The Mothers Barcelona member account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
