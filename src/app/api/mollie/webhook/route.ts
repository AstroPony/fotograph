import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, PRODUCTS, type ProductId } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent> extends Promise<infer T> ? T : ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle one-time payment (credit packs)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.payment_status !== "paid") return NextResponse.json({ ok: true });

    const product = session.metadata?.product as ProductId | undefined;
    const userId = session.metadata?.userId;
    if (!product || !userId) return NextResponse.json({ error: "Missing metadata" }, { status: 400 });

    await applyPurchase(userId, product, session.id);
  }

  // Handle subscription renewals
  if (event.type === "invoice.paid") {
    const invoice = event.data.object;
    const subDetails = invoice.parent?.subscription_details;
    const subId = typeof subDetails?.subscription === "string"
      ? subDetails.subscription
      : subDetails?.subscription?.id;
    if (!subId) return NextResponse.json({ ok: true });

    const subscription = await stripe.subscriptions.retrieve(subId);
    const product = subscription.metadata?.product as ProductId | undefined;
    const userId = subscription.metadata?.userId;
    if (!product || !userId) return NextResponse.json({ ok: true });

    await applyPurchase(userId, product, invoice.id);
  }

  return NextResponse.json({ ok: true });
}

async function applyPurchase(userId: string, product: ProductId, externalId: string) {
  const config = PRODUCTS[product];
  if (!config) return;

  await prisma.molliePayment.upsert({
    where: { mollieId: externalId },
    update: { status: "paid" },
    create: { userId, mollieId: externalId, status: "paid", amount: String(config.amount), product },
  });

  const updateData: Parameters<typeof prisma.user.update>[0]["data"] = {
    creditsLeft: { increment: config.credits },
  };
  if (config.tier) {
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 30);
    updateData.tier = config.tier;
    updateData.subscriptionEndsAt = endsAt;
  }

  await prisma.user.update({ where: { id: userId }, data: updateData });
}
