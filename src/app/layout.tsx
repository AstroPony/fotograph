import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/components/posthog-provider";
import { SITE_URL } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  display: "swap",
});

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Fotograph",
  url: SITE_URL,
  logo: `${SITE_URL}/fotograph-logo.png`,
  description: "AI productfotografie voor Bol.com en webshops. Genereer professionele lifestyle-foto's in seconden.",
  address: { "@type": "PostalAddress", addressCountry: "NL" },
  areaServed: ["NL", "BE"],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Fotograph",
  url: SITE_URL,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Fotograph — AI productfotografie",
    template: "%s — Fotograph",
  },
  description: "Genereer professionele productfoto's met AI voor Bol.com en je webshop.",
  keywords: [
    "AI productfotografie",
    "product foto bewerken",
    "achtergrond verwijderen product",
    "Bol.com productfoto",
    "AI foto generator",
    "productfoto AI",
    "achtergrond verwijderen",
    "lifestyle productfoto",
  ],
  robots: { index: true, follow: true },
  alternates: {
    canonical: SITE_URL,
    languages: {
      "nl-NL": SITE_URL,
      "nl-BE": SITE_URL,
      "nl": SITE_URL,
    },
  },
  openGraph: {
    type: "website",
    locale: "nl_NL",
    siteName: "Fotograph",
    title: "Fotograph — AI productfotografie",
    description: "Genereer professionele productfoto's met AI voor Bol.com en je webshop.",
    url: SITE_URL,
    images: [{ url: "/fotograph-logo.png", width: 512, height: 512, alt: "Fotograph logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fotograph — AI productfotografie",
    description: "Genereer professionele productfoto's met AI voor Bol.com en je webshop.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${geistSans.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-black">
        <PostHogProvider>
          {children}
          <Toaster richColors position="top-right" />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        </PostHogProvider>
      </body>
    </html>
  );
}
