import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe, PRODUCTS, PRICE_IDS, type ProductId } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { product?: ProductId };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { product } = body;
  const productConfig = product ? PRODUCTS[product] : null;
  if (!productConfig) return NextResponse.json({ error: "Ongeldig product" }, { status: 400 });

  if (!PRICE_IDS[product!]) {
    console.error(`[stripe/checkout] Missing price ID for product: ${product}`);
    return NextResponse.json({ error: "Product niet beschikbaar" }, { status: 500 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, email: true, mollieCustomerId: true },
  });
  if (!dbUser) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get("host")}`;

  // Reuse existing Stripe customer or create one
  let stripeCustomerId = dbUser.mollieCustomerId; // reusing the column for Stripe customer ID
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ email: dbUser.email });
    stripeCustomerId = customer.id;
    await prisma.user.update({ where: { id: dbUser.id }, data: { mollieCustomerId: stripeCustomerId } });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: productConfig.mode,
      payment_method_types: ["ideal", "card"],
      locale: "nl",
      line_items: [{ price: PRICE_IDS[product], quantity: 1 }],
      payment_intent_data: productConfig.mode === "payment"
        ? { statement_descriptor_suffix: "Fotograph" }
        : undefined,
      subscription_data: productConfig.mode === "subscription"
        ? { metadata: { userId: dbUser.id, product } }
        : undefined,
      success_url: `${baseUrl}/upgrade?status=success&product=${product}`,
      cancel_url: `${baseUrl}/upgrade`,
      metadata: { userId: dbUser.id, product },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe/checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await prisma.molliePayment.create({
    data: {
      userId: dbUser.id,
      mollieId: session.id,
      status: session.status ?? "open",
      amount: String(productConfig.amount),
      product,
    },
  });

  return NextResponse.json({ checkoutUrl: session.url });
}
