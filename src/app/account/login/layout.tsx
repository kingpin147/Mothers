import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login — The Mothers Barcelona",
  description: "Sign in to The Mothers Barcelona member and operator account.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
