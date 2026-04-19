import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PRODUCTS } from "@/lib/mollie";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-black">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-serif font-black text-lg tracking-tight uppercase">Fotograph</span>
          <Link
            href="/login"
            className="text-xs uppercase tracking-widest font-medium hover:underline underline-offset-4"
          >
            Inloggen
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6">
        {/* Hero */}
        <section className="border-b-4 border-black py-16">
          <p className="text-xs uppercase tracking-widest font-medium mb-4 text-black/50">
            AI productfotografie voor Bol.com &amp; webshops
          </p>
          <h1 className="font-serif font-black text-6xl md:text-8xl uppercase leading-none tracking-tight mb-8">
            Professionele<br />productfoto&apos;s<br />in seconden.
          </h1>
          <p className="text-base text-black/60 max-w-lg mb-10 leading-relaxed">
            Upload je productfoto en kies een scène. Fotograph verwijdert de achtergrond en genereert een professionele lifestyle-foto — klaar voor Bol.com, Shopify of je eigen webshop.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/login"
              className="bg-black text-white px-8 py-3 text-xs uppercase tracking-widest font-medium hover:bg-black/80 transition-colors"
            >
              Gratis beginnen
            </Link>
            <a
              href="#prijzen"
              className="border border-black px-8 py-3 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors"
            >
              Prijzen bekijken
            </a>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-black py-12">
          <h2 className="text-xs uppercase tracking-widest font-medium mb-8">Hoe het werkt</h2>
          <div className="grid md:grid-cols-3 gap-px bg-black">
            {[
              { step: "01", title: "Upload", body: "Sleep je productfoto naar Fotograph. JPG, PNG of WEBP — tot 20MB." },
              { step: "02", title: "Kies scène", body: "Kies een stijl: studio, marmeren aanrecht, houten plank, buitentuin en meer." },
              { step: "03", title: "Download", body: "AI verwijdert de achtergrond en genereert de scène. Klaar in onder een minuut." },
            ].map(({ step, title, body }) => (
              <div key={step} className="bg-white p-8">
                <p className="font-serif font-black text-4xl uppercase text-black/10 mb-4">{step}</p>
                <h3 className="font-serif font-bold text-xl uppercase mb-2">{title}</h3>
                <p className="text-sm text-black/60 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bol.com-specific callout */}
        <section className="border-b border-black py-12">
          <div className="grid md:grid-cols-2 gap-px bg-black">
            <div className="bg-white p-8">
              <p className="text-xs uppercase tracking-widest font-medium text-black/40 mb-4">Bol.com verkopers</p>
              <h2 className="font-serif font-black text-3xl uppercase leading-tight mb-4">
                Voldoe aan Bol.com&apos;s beeldvereisten
              </h2>
              <ul className="text-sm text-black/60 leading-relaxed space-y-2">
                <li>— Witte achtergrond voor hoofdfoto&apos;s</li>
                <li>— Minimaal 1200×1200px voor zoom</li>
                <li>— Geen watermerken op geëxporteerde foto&apos;s</li>
                <li>— Meerdere scènes voor aanvullende productfoto&apos;s</li>
              </ul>
            </div>
            <div className="bg-black text-white p-8 flex flex-col justify-between">
              <p className="text-xs uppercase tracking-widest font-medium text-white/40 mb-4">Nederlandstalig</p>
              <p className="font-serif font-black text-3xl uppercase leading-tight">
                De enige AI-fotografie&shy;tool met Nederlandse interface en iDEAL betaling.
              </p>
              <p className="text-xs uppercase tracking-widest text-white/40 mt-6">iDEAL · Bol.com · Shopify · WooCommerce</p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="prijzen" className="border-b border-black py-12">
          <h2 className="text-xs uppercase tracking-widest font-medium mb-8">Prijzen</h2>
          <div className="grid md:grid-cols-4 gap-px bg-black">
            {/* Free tier */}
            <div className="bg-white p-6 flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest font-medium mb-1 text-black/40">Gratis</p>
                <p className="font-serif font-black text-4xl uppercase">€0</p>
                <p className="text-xs mt-1 text-black/60">/maand</p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">10 foto&apos;s/maand</p>
                <p className="text-xs leading-relaxed text-black/50">Watermerk · 512px · 5 scènes</p>
              </div>
              <Link href="/login" className="text-center text-xs uppercase tracking-widest font-medium px-4 py-2 transition-colors border border-black hover:bg-black hover:text-white">
                Start gratis
              </Link>
            </div>
            {/* Paid tiers from PRODUCTS */}
            {(["starter", "pro", "business"] as const).map((id) => {
              const p = PRODUCTS[id];
              const highlight = id === "pro";
              return (
                <div key={id} className={`p-6 flex flex-col gap-4 ${highlight ? "bg-black text-white" : "bg-white"}`}>
                  <div>
                    <p className={`text-xs uppercase tracking-widest font-medium mb-1 ${highlight ? "text-white/40" : "text-black/40"}`}>
                      {id.charAt(0).toUpperCase() + id.slice(1)}
                    </p>
                    <p className="font-serif font-black text-4xl uppercase">{p.price}</p>
                    <p className={`text-xs mt-1 ${highlight ? "text-white/60" : "text-black/60"}`}>/maand</p>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium mb-1 ${highlight ? "text-white" : ""}`}>{p.imagesPerMonth}</p>
                    <p className={`text-xs leading-relaxed ${highlight ? "text-white/50" : "text-black/50"}`}>{p.note}</p>
                  </div>
                  <Link
                    href="/login"
                    className={`text-center text-xs uppercase tracking-widest font-medium px-4 py-2 transition-colors border ${
                      highlight
                        ? "border-white text-white hover:bg-white hover:text-black"
                        : "border-black text-black hover:bg-black hover:text-white"
                    }`}
                  >
                    Kies {id.charAt(0).toUpperCase() + id.slice(1)}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-black/40 mt-4">
            Losse credits ook beschikbaar: {PRODUCTS.credits.price} voor {PRODUCTS.credits.credits} foto&apos;s. {PRODUCTS.credits.note}
          </p>
        </section>

        {/* Footer */}
        <footer className="py-8 flex items-center justify-between">
          <span className="font-serif font-black text-sm uppercase tracking-tight">Fotograph</span>
          <p className="text-xs text-black/40 uppercase tracking-widest">
            AI productfotografie · Nederland · KVK-nummer volgt
          </p>
        </footer>
      </main>
    </div>
  );
}
