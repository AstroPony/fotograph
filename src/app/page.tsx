import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/lib/constants";
import { HomeContent } from "@/components/home-content";

export const metadata: Metadata = {
  title: "AI productfotografie voor Bol.com & webshops",
  description:
    "Upload je productfoto en genereer professionele lifestyle-foto's in seconden. Achtergrond verwijderen en AI-scènes voor Bol.com, Shopify en WooCommerce. Gratis beginnen.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Fotograph — AI productfotografie voor Bol.com & webshops",
    description:
      "Upload je productfoto en genereer professionele lifestyle-foto's in seconden. Achtergrond verwijderen en AI-scènes voor Bol.com, Shopify en WooCommerce.",
    url: SITE_URL,
    type: "website",
  },
};

const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Fotograph",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "AI productfotografie tool voor Bol.com-verkopers en webshops. Verwijder achtergronden en genereer professionele lifestyle-foto's in seconden.",
  inLanguage: "nl",
  offers: [
    { "@type": "Offer", name: "Gratis", price: "0", priceCurrency: "EUR", url: `${SITE_URL}/#prijzen` },
    ...([["Starter", "19"], ["Pro", "49"], ["Business", "99"]] as const).map(([name, price]) => ({
      "@type": "Offer",
      name,
      price,
      priceCurrency: "EUR",
      url: `${SITE_URL}/#prijzen`,
      priceSpecification: { "@type": "UnitPriceSpecification", price, priceCurrency: "EUR", billingDuration: "P1M", unitText: "maand" },
    })),
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Hoe werkt Fotograph?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Upload je productfoto (JPG, PNG of WEBP, tot 20MB), kies een scène en Fotograph verwijdert automatisch de achtergrond en genereert een professionele lifestyle-foto. Klaar in minder dan een minuut.",
      },
    },
    {
      "@type": "Question",
      name: "Voldoen gegenereerde foto's aan de Bol.com-beeldvereisten?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja. Fotograph genereert foto's met witte achtergrond voor hoofdfoto's, minimaal 1200×1200px voor de zoomfunctie, en zonder watermerken — precies zoals Bol.com vereist.",
      },
    },
    {
      "@type": "Question",
      name: "Hoeveel foto's kan ik gratis maken?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Met het gratis abonnement genereer je 10 foto's per maand. Gratis foto's hebben een watermerk en zijn 512px. Voor hogere resoluties en meer foto's zijn betaalde abonnementen beschikbaar vanaf €19/maand.",
      },
    },
    {
      "@type": "Question",
      name: "Welke bestandsformaten worden ondersteund?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Fotograph accepteert JPG, PNG en WEBP bestanden tot 20MB.",
      },
    },
    {
      "@type": "Question",
      name: "Hoe lang duurt het genereren van een productfoto?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Een productfoto is klaar in minder dan een minuut. Het systeem verwijdert de achtergrond en genereert de AI-scène volledig automatisch.",
      },
    },
  ],
};

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <HomeContent />
    </div>
  );
}
