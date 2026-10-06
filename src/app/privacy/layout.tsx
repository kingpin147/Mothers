import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Protection | The Mothers Barcelona",
  description:
    "Learn how The Mothers Barcelona protects your personal data, respects member privacy, handles booking records, and complies with European GDPR regulations.",
  openGraph: {
    title: "Privacy Policy & Data Protection | The Mothers Barcelona",
    description:
      "Learn how The Mothers Barcelona protects your personal data, respects member privacy, handles booking records, and complies with European GDPR regulations.",
    url: "https://themothers.cc/privacy",
    siteName: "The Mothers",
    locale: "en_GB",
    type: "website",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
