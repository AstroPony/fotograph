"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import { LangSwitcher } from "@/components/lang-switcher";
import { PRODUCTS } from "@/lib/constants";

export function HomeContent() {
  const { t } = useLanguage();

  const paidTiers = [
    {
      id: "starter" as const,
      photos: t("product_starter_photos"),
      note: t("product_starter_note"),
    },
    {
      id: "pro" as const,
      photos: t("product_pro_photos"),
      note: t("product_pro_note"),
    },
    {
      id: "business" as const,
      photos: t("product_business_photos"),
      note: t("product_business_note"),
    },
  ];

  const steps = [
    { step: "01", title: t("home_step1_title"), body: t("home_step1_body") },
    { step: "02", title: t("home_step2_title"), body: t("home_step2_body") },
    { step: "03", title: t("home_step3_title"), body: t("home_step3_body") },
  ];

  return (
    <>
      {/* Top bar */}
      <header className="border-b border-black">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-serif font-black text-lg tracking-tight uppercase">Fotograph</Link>
          <div className="flex items-center gap-4">
            <LangSwitcher />
            <Link href="/login" className="text-xs uppercase tracking-widest font-medium hover:underline underline-offset-4">
              {t("nav_login")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6">
        {/* Hero */}
        <section className="border-b-4 border-black py-16">
          <p className="text-xs uppercase tracking-widest font-medium mb-4 text-black/50">
            {t("home_tagline")}
          </p>
          <h1 className="font-serif font-black text-4xl sm:text-6xl md:text-8xl uppercase leading-none tracking-tight mb-8">
            {t("home_h1_1")}<br />{t("home_h1_2")}<br />{t("home_h1_3")}
          </h1>
          <p className="text-base text-black/60 max-w-lg mb-10 leading-relaxed">
            {t("home_body")}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/login" className="bg-black text-white px-8 py-3 text-xs uppercase tracking-widest font-medium hover:bg-black/80 transition-colors">
              {t("home_cta_start")}
            </Link>
            <a href="#prijzen" className="border border-black px-8 py-3 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors">
              {t("home_cta_pricing")}
            </a>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-black py-12">
          <h2 className="text-xs uppercase tracking-widest font-medium mb-8">{t("home_how_title")}</h2>
          <div className="grid md:grid-cols-3 gap-px bg-black">
            {steps.map(({ step, title, body }) => (
              <div key={step} className="bg-white p-8">
                <p className="font-serif font-black text-4xl uppercase text-black/10 mb-4">{step}</p>
                <h3 className="font-serif font-bold text-xl uppercase mb-2">{title}</h3>
                <p className="text-sm text-black/60 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bol.com callout */}
        <section className="border-b border-black py-12">
          <div className="grid md:grid-cols-2 gap-px bg-black">
            <div className="bg-white p-8">
              <p className="text-xs uppercase tracking-widest font-medium text-black/40 mb-4">{t("home_bol_label")}</p>
              <h2 className="font-serif font-black text-3xl uppercase leading-tight mb-4">
                {t("home_bol_h2")}
              </h2>
              <ul className="text-sm text-black/60 leading-relaxed space-y-2">
                <li>— {t("home_bol_req1")}</li>
                <li>— {t("home_bol_req2")}</li>
                <li>— {t("home_bol_req3")}</li>
                <li>— {t("home_bol_req4")}</li>
              </ul>
            </div>
            <div className="bg-black text-white p-8 flex flex-col justify-between">
              <p className="text-xs uppercase tracking-widest font-medium text-white/40 mb-4">{t("home_nl_label")}</p>
              <p className="font-serif font-black text-3xl uppercase leading-tight">
                {t("home_nl_quote")}
              </p>
              <p className="text-xs uppercase tracking-widest text-white/40 mt-6">iDEAL · Bol.com · Shopify · WooCommerce</p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="prijzen" className="border-b border-black py-12">
          <h2 className="text-xs uppercase tracking-widest font-medium mb-8">{t("home_pricing_title")}</h2>
          <div className="grid md:grid-cols-4 gap-px bg-black">
            {/* Free tier */}
            <div className="bg-white p-6 flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest font-medium mb-1 text-black/40">{t("tier_FREE")}</p>
                <p className="font-serif font-black text-4xl uppercase">€0</p>
                <p className="text-xs mt-1 text-black/60">{t("home_per_month")}</p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">{t("home_pricing_free_photos")}</p>
                <p className="text-xs leading-relaxed text-black/50">{t("home_pricing_free_note")}</p>
              </div>
              <Link href="/login" className="text-center text-xs uppercase tracking-widest font-medium px-4 py-2 transition-colors border border-black hover:bg-black hover:text-white">
                {t("home_pricing_cta_free")}
              </Link>
            </div>
            {/* Paid tiers */}
            {paidTiers.map(({ id, photos, note }) => {
              const p = PRODUCTS[id];
              const highlight = id === "pro";
              return (
                <div key={id} className={`p-6 flex flex-col gap-4 ${highlight ? "bg-black text-white" : "bg-white"}`}>
                  <div>
                    <p className={`text-xs uppercase tracking-widest font-medium mb-1 ${highlight ? "text-white/40" : "text-black/40"}`}>
                      {id.charAt(0).toUpperCase() + id.slice(1)}
                    </p>
                    <p className="font-serif font-black text-4xl uppercase">{p.price}</p>
                    <p className={`text-xs mt-1 ${highlight ? "text-white/60" : "text-black/60"}`}>{t("home_per_month")}</p>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium mb-1 ${highlight ? "text-white" : ""}`}>{photos}</p>
                    <p className={`text-xs leading-relaxed ${highlight ? "text-white/50" : "text-black/50"}`}>{note}</p>
                  </div>
                  <Link
                    href="/login"
                    className={`text-center text-xs uppercase tracking-widest font-medium px-4 py-2 transition-colors border ${
                      highlight
                        ? "border-white text-white hover:bg-white hover:text-black"
                        : "border-black text-black hover:bg-black hover:text-white"
                    }`}
                  >
                    {t("home_pricing_cta_choose")} {id.charAt(0).toUpperCase() + id.slice(1)}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-black/40 mt-4">
            {t("home_pricing_credits_label")} {PRODUCTS.credits.price} {t("home_pricing_credits_for")} {PRODUCTS.credits.credits} {t("home_pricing_credits_photos")} {t("product_credits_note")}
          </p>
        </section>

        {/* Footer */}
        <footer className="py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <span className="font-serif font-black text-sm uppercase tracking-tight">Fotograph</span>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-black/40 uppercase tracking-widest">
            <Link href="/voorwaarden" className="hover:text-black transition-colors">{t("home_terms")}</Link>
            <Link href="/privacy" className="hover:text-black transition-colors">{t("home_privacy")}</Link>
          </div>
        </footer>
      </main>
    </>
  );
}
