import Link from "next/link";

export const metadata = { title: "Algemene Voorwaarden — Fotograph" };

export default function VoorwaardenPage() {
  return (
    <div className="min-h-screen flex flex-col">
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
            Algemene Voorwaarden
          </h1>
        </div>

        <div className="prose-none max-w-2xl space-y-8 text-sm leading-relaxed text-black/80">

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">Artikel 1 — Definities</h2>
            <p>In deze algemene voorwaarden wordt verstaan onder:</p>
            <ul className="mt-3 space-y-1.5 list-none">
              <li><strong>Fotograph:</strong> de dienst aangeboden via fotograph.nl, geëxploiteerd door IkZieNix, gevestigd in Nederland.</li>
              <li><strong>Gebruiker:</strong> iedere natuurlijke of rechtspersoon die een account aanmaakt en gebruik maakt van de dienst.</li>
              <li><strong>Credits:</strong> digitale eenheden die recht geven op het genereren van één productfoto.</li>
              <li><strong>Abonnement:</strong> een maandelijks terugkerende overeenkomst voor het gebruik van Fotograph.</li>
              <li><strong>Gegenereerde afbeelding:</strong> een door AI gecreëerde productfoto op basis van een door de gebruiker aangeleverde bronafbeelding.</li>
            </ul>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">Artikel 2 — Toepasselijkheid</h2>
            <p>
              Deze algemene voorwaarden zijn van toepassing op alle overeenkomsten tussen Fotograph en de gebruiker, alsmede op alle gebruik van de dienst. Door een account aan te maken gaat de gebruiker akkoord met deze voorwaarden.
            </p>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">Artikel 3 — De Dienst</h2>
            <p>
              Fotograph biedt een online platform voor het genereren van AI-productfotografie. De gebruiker uploadt een bronafbeelding, kiest een scène en Fotograph genereert een nieuwe afbeelding. Iedere gegenereerde afbeelding kost één credit.
            </p>
            <p className="mt-3">
              Fotograph streeft naar een beschikbaarheid van 99% per jaar, maar kan geen absolute uptime garanderen. Gepland onderhoud wordt, indien mogelijk, vooraf aangekondigd.
            </p>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">Artikel 4 — Credits &amp; Abonnementen</h2>
            <p>
              Credits zijn persoonsgebonden, niet overdraagbaar en niet restitueerbaar, tenzij anders bepaald. Ongebruikte credits bij een maandabonnement vervallen aan het einde van de maandcyclus. Credits uit losse pakketten (pay-as-you-go) vervallen niet.
            </p>
            <p className="mt-3">
              Abonnementen worden automatisch maandelijks verlengd. Opzegging dient minimaal 24 uur voor de volgende factuurdatum te geschieden via de accountinstellingen. Na opzegging blijft het abonnement actief tot het einde van de betaalde periode.
            </p>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">Artikel 5 — Betaling</h2>
            <p>
              Betaling geschiedt via de aangeboden betaalmethoden (iDEAL, creditcard en overige methoden via Stripe). Alle prijzen zijn inclusief BTW. Facturen worden per e-mail verstuurd.
            </p>
            <p className="mt-3">
              Bij niet-tijdige betaling behoudt Fotograph het recht om de toegang tot de dienst te beperken of te staken totdat de openstaande betaling is voldaan.
            </p>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">Artikel 6 — Intellectueel Eigendom</h2>
            <p>
              De gebruiker behoudt alle rechten op de door hem geüploade bronafbeeldingen. De gegenereerde afbeeldingen worden eigendom van de gebruiker, met dien verstande dat Fotograph een niet-exclusieve licentie heeft om gegenereerde afbeeldingen te gebruiken voor marketingdoeleinden van de dienst, tenzij de gebruiker hier bezwaar tegen maakt via <a href="mailto:info@fotograph.nl" className="underline underline-offset-2">info@fotograph.nl</a>.
            </p>
            <p className="mt-3">
              De gebruiker garandeert dat geüploade afbeeldingen geen inbreuk maken op rechten van derden. De gebruiker vrijwaart Fotograph voor alle aanspraken in dit verband.
            </p>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">Artikel 7 — Aansprakelijkheid</h2>
            <p>
              Fotograph is niet aansprakelijk voor indirecte schade, gevolgschade, gederfde winst of schade als gevolg van onjuist gebruik van de dienst. De totale aansprakelijkheid van Fotograph is beperkt tot het bedrag dat de gebruiker in de drie maanden voorafgaand aan de schadeveroorzakende gebeurtenis heeft betaald.
            </p>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">Artikel 8 — Gebruiksregels</h2>
            <p>Het is de gebruiker niet toegestaan om via Fotograph:</p>
            <ul className="mt-3 space-y-1.5 list-none">
              <li>— Afbeeldingen te genereren die onwettig, obsceen, misleidend of schadelijk zijn.</li>
              <li>— De dienst te gebruiken voor doeleinden die in strijd zijn met de wet of openbare orde.</li>
              <li>— Geautomatiseerde verzoeken te sturen buiten de aangeboden API-interface.</li>
              <li>— De dienst te misbruiken of te proberen de beveiliging te omzeilen.</li>
            </ul>
            <p className="mt-3">
              Bij overtreding behoudt Fotograph het recht het account per direct te sluiten zonder restitutie.
            </p>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">Artikel 9 — EU AI Act</h2>
            <p>
              Alle door Fotograph gegenereerde afbeeldingen worden gemarkeerd als AI-gegenereerde content conform de EU AI Act. Dit gebeurt automatisch via EXIF-metadata in het bestand. De gebruiker is zelf verantwoordelijk voor het naleven van eventuele aanvullende marktplaatsvereisten (zoals Bol.com-richtlijnen).
            </p>
          </section>

          <section className="border-b border-black/10 pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">Artikel 10 — Wijzigingen</h2>
            <p>
              Fotograph behoudt het recht deze voorwaarden te wijzigen. Wijzigingen worden minimaal 14 dagen van tevoren per e-mail aangekondigd. Voortgezet gebruik van de dienst na de ingangsdatum geldt als aanvaarding van de gewijzigde voorwaarden.
            </p>
          </section>

          <section className="pb-8">
            <h2 className="font-serif font-bold text-xl uppercase mb-3">Artikel 11 — Toepasselijk Recht</h2>
            <p>
              Op deze overeenkomst is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in het arrondissement waar IkZieNix gevestigd is.
            </p>
            <p className="mt-3 text-black/50 text-xs uppercase tracking-widest">
              Vragen? <a href="mailto:info@fotograph.nl" className="underline underline-offset-2">info@fotograph.nl</a>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-black">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-xs text-black/40 uppercase tracking-widest">
          <Link href="/" className="hover:text-black transition-colors">← Terug naar Fotograph</Link>
          <Link href="/privacy" className="hover:text-black transition-colors">Privacybeleid</Link>
        </div>
      </footer>
    </div>
  );
}
