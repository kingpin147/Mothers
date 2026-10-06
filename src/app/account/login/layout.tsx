import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Member Sign In & Account Access | The Mothers Barcelona",
  description:
    "Sign in to your account at The Mothers Barcelona to manage event bookings, check your credit balance, access La Gazette community forum, and view your perks.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
