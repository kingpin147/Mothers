"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";

const STANDALONE_PATHS = ["/coming-soon"];

export default function ConditionalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isComingSoonPage = pathname === "/" || pathname === "/coming-soon" || pathname?.startsWith("/coming-soon");
  const isStandalone = isComingSoonPage;

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navigation />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
