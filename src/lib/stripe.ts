import Stripe from "stripe";
import type { ProductId } from "./constants";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

export type { ProductId };
export { PRODUCTS } from "./constants";

/** Map product ID → Stripe Price ID. Server-only — never import in client components. */
export const PRICE_IDS: Record<ProductId, string> = {
  credits:  process.env.STRIPE_PRICE_CREDITS!,
  starter:  process.env.STRIPE_PRICE_STARTER!,
  pro:      process.env.STRIPE_PRICE_PRO!,
  business: process.env.STRIPE_PRICE_BUSINESS!,
};
