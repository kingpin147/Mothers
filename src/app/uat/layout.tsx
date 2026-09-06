import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "User Acceptance Testing",
  description: "Phase 1 UAT checklist for The Mothers platform.",
};

export default function UatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
