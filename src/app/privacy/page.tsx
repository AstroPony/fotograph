import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacybeleid",
  description: "Lees het privacybeleid van Fotograph. Hoe wij omgaan met jouw persoonsgegevens conform de AVG.",
  alternates: { canonical: `${SITE_URL}/privacy` },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Privacybeleid", item: `${SITE_URL}/privacy` },
  ],
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <header className="border-b border-black">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-serif font-black text-lg tracking-tight uppercase">
            Fotograph
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <div className="border-b-4 border-black pb-4 mb-10">
          <p className="text-xs uppercase tracking-widest font-medium text-black/40 mb-1">
            Juridisch — Versie 1.0 · April 2026
          </p>
          <h1 className="font-serif font-black text-5xl uppercase leading-none tracking-tight">
            Privacybeleid
          </h1>
        </div>

        <div className="prose-none max-w-2xl space-y-8 text-sm leading-relaxed text-black/80">

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">1 — Wie zijn wij?</h2>
            <p>
              Fotograph is een dienst van IkZieNix, gevestigd in Nederland. Wij zijn verantwoordelijk voor de verwerking van uw persoonsgegevens zoals beschreven in dit privacybeleid.
            </p>
            <p className="mt-3">
              Vragen over uw privacy? Neem contact op via <a href="mailto:info@fotograph.nl" className="underline underline-offset-2">info@fotograph.nl</a>.
            </p>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">2 — Welke gegevens verzamelen wij?</h2>
            <p>Wij verwerken de volgende categorieën persoonsgegevens:</p>
            <ul className="mt-3 space-y-2 list-none">
              <li>
                <strong>Accountgegevens:</strong> e-mailadres (verplicht voor inloggen via magische link).
              </li>
              <li>
                <strong>Betalingsgegevens:</strong> transactie-ID&apos;s en abonnementsstatus (verwerkt via Stripe — wij slaan nooit volledige betaalkaartgegevens op).
              </li>
              <li>
                <strong>Afbeeldingen:</strong> productfoto&apos;s die u uploadt en de gegenereerde resultaten. Deze worden opgeslagen in beveiligde cloudopslag (Cloudflare R2).
              </li>
              <li>
                <strong>Gebruiksgegevens:</strong> het aantal gebruikte credits, gekozen scènes en tijdstempels van gegenereerde foto&apos;s.
              </li>
              <li>
                <strong>Technische gegevens:</strong> IP-adres, browsertype en apparaatinformatie (via Vercel hosting logs — bewaard maximaal 30 dagen).
              </li>
            </ul>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">3 — Waarom verwerken wij uw gegevens?</h2>
            <p>Wij verwerken uw persoonsgegevens voor de volgende doeleinden:</p>
            <ul className="mt-3 space-y-2 list-none">
              <li>— <strong>Uitvoering van de overeenkomst:</strong> het verlenen van toegang tot de dienst, genereren van foto&apos;s en bijhouden van credits (grondslag: uitvoering overeenkomst).</li>
              <li>— <strong>Betalingsverwerking:</strong> facturering en het voorkomen van fraude (grondslag: uitvoering overeenkomst).</li>
              <li>— <strong>Communicatie:</strong> het sturen van transactionele e-mails zoals inloglinks en facturen (grondslag: uitvoering overeenkomst).</li>
              <li>— <strong>Klantenservice:</strong> het beantwoorden van vragen en klachten (grondslag: gerechtvaardigd belang).</li>
              <li>— <strong>Wettelijke verplichtingen:</strong> het bewaren van boekhoudkundige gegevens (grondslag: wettelijke verplichting — 7 jaar).</li>
            </ul>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">4 — Hoe lang bewaren wij uw gegevens?</h2>
            <ul className="space-y-2 list-none">
              <li>— Accountgegevens: zolang uw account actief is + 1 jaar na verwijdering.</li>
              <li>— Gegenereerde afbeeldingen: zolang uw account actief is. U kunt ze op elk moment zelf verwijderen.</li>
              <li>— Betalingsgegevens: 7 jaar conform fiscale bewaarplicht.</li>
              <li>— Server logs: maximaal 30 dagen.</li>
            </ul>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">5 — Delen wij uw gegevens?</h2>
            <p>
              Wij verkopen uw persoonsgegevens nooit aan derden. Wij schakelen de volgende verwerkers in voor het uitvoeren van de dienst:
            </p>
            <ul className="mt-3 space-y-2 list-none">
              <li>— <strong>Supabase</strong> (authenticatie &amp; database) — EU-servers</li>
              <li>— <strong>Cloudflare R2</strong> (bestandsopslag) — EU-regio</li>
              <li>— <strong>Stripe</strong> (betalingen) — VS, met EU Standard Contractual Clauses</li>
              <li>— <strong>Replicate</strong> (AI-modellen) — VS, met EU Standard Contractual Clauses</li>
              <li>— <strong>Photoroom</strong> (achtergrondverwijdering) — VS, met EU Standard Contractual Clauses</li>
              <li>— <strong>Resend</strong> (transactionele e-mail) — VS, met EU Standard Contractual Clauses</li>
            </ul>
            <p className="mt-3">
              Met alle verwerkers zijn verwerkersovereenkomsten gesloten conform artikel 28 AVG.
            </p>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">6 — Uw rechten</h2>
            <p>Onder de AVG heeft u de volgende rechten:</p>
            <ul className="mt-3 space-y-1.5 list-none">
              <li>— <strong>Inzage:</strong> u kunt opvragen welke gegevens wij van u verwerken.</li>
              <li>— <strong>Rectificatie:</strong> u kunt onjuiste gegevens laten corrigeren.</li>
              <li>— <strong>Verwijdering:</strong> u kunt verzoeken uw gegevens te verwijderen (recht op vergetelheid).</li>
              <li>— <strong>Beperking:</strong> u kunt de verwerking (tijdelijk) laten beperken.</li>
              <li>— <strong>Overdraagbaarheid:</strong> u kunt uw gegevens in een machine-leesbaar formaat opvragen.</li>
              <li>— <strong>Bezwaar:</strong> u kunt bezwaar maken tegen verwerking op grond van gerechtvaardigd belang.</li>
            </ul>
            <p className="mt-3">
              Dien een verzoek in via <a href="mailto:info@fotograph.nl" className="underline underline-offset-2">info@fotograph.nl</a>. Wij reageren binnen 30 dagen. U heeft ook het recht een klacht in te dienen bij de <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Autoriteit Persoonsgegevens</a>.
            </p>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">7 — Cookies</h2>
            <p>
              Fotograph gebruikt uitsluitend functionele cookies die nodig zijn voor het inloggen en het bijhouden van uw sessie (Supabase Auth). Wij gebruiken geen tracking- of advertentiecookies. Er is geen aparte cookiebanner nodig voor uitsluitend functionele cookies.
            </p>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">8 — Beveiliging</h2>
            <p>
              Wij nemen passende technische en organisatorische maatregelen om uw persoonsgegevens te beveiligen. Alle verbindingen zijn versleuteld via HTTPS. Afbeeldingen zijn opgeslagen in privé-buckets met tijdgebonden toegangslinks. Toegang tot de database is beperkt tot geautoriseerde systemen.
            </p>
          </section>

          <section className="pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">9 — Wijzigingen</h2>
            <p>
              Dit privacybeleid kan worden gewijzigd. Wijzigingen worden via e-mail aangekondigd. De actuele versie staat altijd op fotograph.nl/privacy.
            </p>
            <p className="mt-4 text-black/50 text-xs uppercase tracking-widest">
              Laatste update: april 2026
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-black">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-black/40 uppercase tracking-widest">
          <Link href="/" className="hover:text-black transition-colors">← Terug naar Fotograph</Link>
          <Link href="/voorwaarden" className="hover:text-black transition-colors">Algemene Voorwaarden</Link>
        </div>
      </footer>
    </div>
  );
}
