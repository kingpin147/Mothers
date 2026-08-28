import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://themothers.cc"),
  title: "The Mothers — Private Members Club for Mothers in Barcelona",
  description: "A private club for mothers in Barcelona: curated events, genuine community, credit-based booking, and trusted partner care.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SessionProviderWrapper>
          <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Navigation />
            <main style={{ flex: 1 }}>{children}</main>
            <Footer />
          </div>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
