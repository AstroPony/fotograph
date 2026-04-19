"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { PRODUCTS, type ProductId } from "@/lib/constants";

const PLAN_IDS = ["starter", "pro", "business"] as const;

const TIER_TO_PRODUCT: Record<string, string> = {
  STARTER: "starter", PRO: "pro", BUSINESS: "business",
};

function SuccessBanner() {
  const params = useSearchParams();
  const router = useRouter();
  const [show, setShow] = useState(params.get("status") === "success");

  useEffect(() => {
    if (show) router.replace("/upgrade", { scroll: false });
    // intentionally runs once on mount to strip ?status from the URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show) return null;
  return (
    <div className="border border-black bg-black text-white px-6 py-4 mb-8 text-xs uppercase tracking-widest font-medium">
      Betaling geslaagd — je credits zijn bijgeschreven.
    </div>
  );
}

export function UpgradeClient({ currentTier }: { currentTier: string }) {
  const [loading, setLoading] = useState<ProductId | null>(null);
  const activePlanId = TIER_TO_PRODUCT[currentTier] ?? null;

  async function buy(product: ProductId) {
    setLoading(product);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Betaling starten mislukt");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Onbekende fout");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <div className="border-b-4 border-black pb-4 mb-10">
          <p className="text-xs uppercase tracking-widest font-medium mb-1">Fotograph — Upgraden</p>
          <h1 className="font-serif font-black text-5xl uppercase leading-none tracking-tight">
            Kies je plan
          </h1>
        </div>

        <Suspense>
          <SuccessBanner />
        </Suspense>

        {/* Subscription plans */}
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-1 mb-6">
            Abonnementen
          </h2>
          <div className="grid md:grid-cols-3 gap-px bg-black">
            {PLAN_IDS.map((id) => {
              const p = PRODUCTS[id];
              const name = id.charAt(0).toUpperCase() + id.slice(1);
              const highlight = id === "pro";
              const isCurrent = activePlanId === id;
              return (
                <div key={id} className={`p-6 flex flex-col gap-6 ${highlight ? "bg-black text-white" : "bg-white"}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-xs uppercase tracking-widest font-medium ${highlight ? "text-white/40" : "text-black/40"}`}>
                        {name}
                      </p>
                      {isCurrent && (
                        <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 border ${highlight ? "border-white/40 text-white/60" : "border-black/30 text-black/40"}`}>
                          Huidig
                        </span>
                      )}
                    </div>
                    <p className="font-serif font-black text-5xl uppercase">{p.price}</p>
                    <p className={`text-xs mt-1 ${highlight ? "text-white/50" : "text-black/50"}`}>/maand</p>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium mb-1 ${highlight ? "text-white" : ""}`}>{p.imagesPerMonth}</p>
                    <p className={`text-xs leading-relaxed ${highlight ? "text-white/50" : "text-black/50"}`}>{p.note}</p>
                  </div>
                  <button
                    onClick={() => buy(id)}
                    disabled={loading !== null || isCurrent}
                    className={`text-xs uppercase tracking-widest font-medium px-4 py-2.5 border transition-colors disabled:opacity-50 ${
                      highlight
                        ? "border-white text-white hover:bg-white hover:text-black"
                        : "border-black text-black hover:bg-black hover:text-white"
                    }`}
                  >
                    {loading === id ? "Doorsturen…" : isCurrent ? "Huidig plan" : `Kies ${name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Credit pack */}
        <section>
          <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-1 mb-6">
            Losse credits
          </h2>
          <div className="border border-black p-6 flex items-center justify-between gap-6">
            <div>
              <p className="font-serif font-black text-3xl uppercase">{PRODUCTS.credits.credits} credits — {PRODUCTS.credits.price}</p>
              <p className="text-xs text-black/50 mt-1">{PRODUCTS.credits.note}</p>
            </div>
            <button
              onClick={() => buy("credits")}
              disabled={loading !== null}
              className="border border-black px-6 py-2.5 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {loading === "credits" ? "Doorsturen…" : "Koop credits"}
            </button>
          </div>
        </section>

        <p className="text-xs text-black/40 mt-6">
          Betaling via iDEAL, creditcard of andere Stripe-methoden. Abonnementen worden maandelijks verlengd.
        </p>
      </main>
    </div>
  );
}
