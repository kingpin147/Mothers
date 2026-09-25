import type { Metadata } from "next";
import { Cormorant_Garamond, Lora } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";
import ConditionalShell from "@/components/ConditionalShell";
import { LanguageProvider } from "@/components/LanguageProvider";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-heading",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://themothers.cc"),
  title: {
    default: "The Mothers — A private membership club for mothers · Barcelona",
    template: "%s — The Mothers",
  },
  description:
    "A private club for mothers in Barcelona: curated events, genuine community, credit-based booking, and trusted partner care.",
  keywords: [
    "The Mothers",
    "mothers club Barcelona",
    "club de madres Barcelona",
    "maternity Barcelona",
    "Barcelona mothers community",
    "motherhood club",
    "moms club Barcelona",
  ],
  authors: [{ name: "The Mothers" }],
  creator: "The Mothers",
  publisher: "The Mothers",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["es_ES"],
    url: "https://themothers.cc",
    siteName: "The Mothers",
    title: "The Mothers — A private membership club for mothers · Barcelona",
    description:
      "A private club for mothers in Barcelona: curated events, genuine community, credit-based booking, and trusted partner care.",
    images: [
      {
        url: "/assets/home-hero.webp",
        width: 1200,
        height: 630,
        alt: "The Mothers — A private membership club for mothers in Barcelona",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Mothers — A private membership club for mothers · Barcelona",
    description:
      "A private club for mothers in Barcelona: curated events, genuine community, credit-based booking, and trusted partner care.",
    images: ["/assets/home-hero.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://themothers.cc",
  },
  verification: {
    google: "google72538638f5afd7be.html",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://themothers.cc/#organization",
      "name": "The Mothers",
      "url": "https://themothers.cc",
      "logo": {
        "@type": "ImageObject",
        "@id": "https://themothers.cc/#logo",
        "url": "https://themothers.cc/assets/logo-mark-alpha.png",
        "contentUrl": "https://themothers.cc/assets/logo-mark-alpha.png",
        "caption": "The Mothers Logo",
      },
      "image": "https://themothers.cc/assets/home-hero.webp",
      "description":
        "A private membership club for mothers in Barcelona: curated events, genuine community, credit-based booking, and trusted partner care.",
      "sameAs": ["https://www.instagram.com/themothers.cc"],
    },
    {
      "@type": "WebSite",
      "@id": "https://themothers.cc/#website",
      "url": "https://themothers.cc",
      "name": "The Mothers",
      "publisher": {
        "@id": "https://themothers.cc/#organization",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cormorant.variable} ${lora.variable}`} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <SessionProviderWrapper>
          <LanguageProvider>
            <ConditionalShell>{children}</ConditionalShell>
          </LanguageProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
