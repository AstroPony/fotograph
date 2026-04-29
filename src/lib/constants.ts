export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fotograph.nl";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB — safe to import in client components

export type ProductId = "credits" | "starter" | "pro" | "business";

export const PRODUCTS: Record<
  ProductId,
  {
    amount: number;
    credits: number;
    tier: "FREE" | "STARTER" | "PRO" | "BUSINESS" | null;
    label: string;
    price: string;
    imagesPerMonth: string;
    note: string;
    mode: "payment" | "subscription";
  }
> = {
  credits:  { amount: 1000, credits: 25,  tier: null,       label: "25 credits — €10",    price: "€10", imagesPerMonth: "25 credits",       note: "Geen abonnement. Credits vervallen niet.", mode: "payment"      },
  starter:  { amount: 1900, credits: 50,  tier: "STARTER",  label: "Starter — €19/maand", price: "€19", imagesPerMonth: "50 foto's/maand",  note: "1024px · 15 scènes · eigen prompts",       mode: "subscription" },
  pro:      { amount: 4900, credits: 200, tier: "PRO",      label: "Pro — €49/maand",      price: "€49", imagesPerMonth: "200 foto's/maand", note: "2048px · alle scènes · batch (25)",        mode: "subscription" },
  business: { amount: 9900, credits: 500, tier: "BUSINESS", label: "Business — €99/maand", price: "€99", imagesPerMonth: "500 foto's/maand", note: "API · batch (100) · prioriteit",           mode: "subscription" },
};
