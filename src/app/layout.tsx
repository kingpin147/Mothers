import type { Metadata } from "next";
import { Cormorant_Garamond, Lora } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";

export const metadata: Metadata = {
  metadataBase: new URL("https://themothers.cc"),
  title: "The Mothers — Private Members Club for Mothers in Barcelona",
  description: "A private club for mothers in Barcelona: curated events, genuine community, credit-based booking, and trusted partner care.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${lora.variable}`} suppressHydrationWarning>
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
