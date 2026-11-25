import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Member Sign In & Account Access | The Mothers",
  description:
    "Sign in to your account at The Mothers to manage event bookings, check your credit balance, access The Forum, and view your perks.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
