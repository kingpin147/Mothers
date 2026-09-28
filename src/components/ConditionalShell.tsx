"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import { FirstVisitProfileModal } from "@/components/FirstVisitProfileModal";

const STANDALONE_PATHS = ["/coming-soon"];

export default function ConditionalShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isComingSoonPage = pathname === "/" || pathname === "/coming-soon" || pathname?.startsWith("/coming-soon");
  const isAdminPage = pathname?.startsWith("/admin");
  const isStandalone = isComingSoonPage;

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "var(--color-bg, #fdf8f2)",
      }}
    >
      <Navigation />
      <main style={{ flex: 1 }}>{children}</main>
      {!isAdminPage && <Footer />}
      {!isAdminPage && <CookieBanner />}
      {!isAdminPage && <FirstVisitProfileModal />}
    </div>
  );
}
