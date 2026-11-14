import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Lora } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";
import ConditionalShell from "@/components/ConditionalShell";
import { LanguageProvider } from "@/components/LanguageProvider";
import { Analytics } from "@vercel/analytics/next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-heading",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "serif"],
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
  preload: false,
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://themothers.cc"),
  title: {
    default: "The Mothers — Private Moms Club & Community in Barcelona",
    template: "%s",
  },
  description:
    "The Mothers is a private moms club in Barcelona offering curated gatherings, genuine community, and trusted experiences designed for modern mothers and bumps.",
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
    title: "The Mothers — Private Moms Club & Community in Barcelona",
    description:
      "The Mothers is a private moms club in Barcelona offering curated gatherings, genuine community, and trusted experiences designed for modern mothers and bumps.",
    images: [
      {
        url: "/assets/home-hero.webp",
        width: 1200,
        height: 630,
        alt: "The Mothers — Barcelona",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Mothers — Private Moms Club & Community in Barcelona",
    description:
      "The Mothers is a private moms club in Barcelona offering curated gatherings, genuine community, and trusted experiences designed for modern mothers and bumps.",
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
        "The Mothers is a private moms club in Barcelona offering curated gatherings, genuine community, and trusted experiences designed for modern mothers.",
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
        {/* Google Tag Manager / Google Tag (GTM-P6R76JD6) */}
        <Script
          async
          src="https://www.googletagmanager.com/gtm.js?id=GTM-P6R76JD6"
          strategy="afterInteractive"
        />
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
          `}
        </Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,600&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-P6R76JD6"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <SessionProviderWrapper>
          <LanguageProvider>
            <ConditionalShell>{children}</ConditionalShell>
          </LanguageProvider>
        </SessionProviderWrapper>
        <Analytics />
      </body>
    </html>
  );
}
