import { createMollieClient } from "@mollie/api-client";

export const mollie = createMollieClient({
  apiKey: process.env.MOLLIE_API_KEY!,
});

export type ProductId = "credits" | "starter" | "pro" | "business";

export const PRODUCTS: Record<
  ProductId,
  {
    amount: string;
    credits: number;
    tier: "FREE" | "STARTER" | "PRO" | "BUSINESS" | null;
    label: string;
    price: string;
    imagesPerMonth: string;
    note: string;
  }
> = {
  credits:  { amount: "10.00", credits: 25,  tier: null,       label: "25 credits — €10",     price: "€10",  imagesPerMonth: "25 credits",        note: "Geen abonnement. Credits vervallen niet."   },
  starter:  { amount: "19.00", credits: 50,  tier: "STARTER",  label: "Starter — €19/maand",  price: "€19",  imagesPerMonth: "50 foto's/maand",   note: "1024px · 15 scènes · eigen prompts"         },
  pro:      { amount: "49.00", credits: 200, tier: "PRO",      label: "Pro — €49/maand",       price: "€49",  imagesPerMonth: "200 foto's/maand",  note: "2048px · alle scènes · batch (25)"          },
  business: { amount: "99.00", credits: 500, tier: "BUSINESS", label: "Business — €99/maand",  price: "€99",  imagesPerMonth: "500 foto's/maand",  note: "API · batch (100) · prioriteit"             },
};
