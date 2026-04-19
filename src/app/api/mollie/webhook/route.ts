import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mollie, PRODUCTS, type ProductId } from "@/lib/mollie";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const params = new URLSearchParams(body);
  const molliePaymentId = params.get("id");

  if (!molliePaymentId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Verify by fetching from Mollie — do not trust the webhook body alone
  const payment = await mollie.payments.get(molliePaymentId);

  const record = await prisma.molliePayment.findUnique({
    where: { mollieId: molliePaymentId },
    include: { user: { select: { id: true } } },
  });

  if (!record) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  await prisma.molliePayment.update({
    where: { mollieId: molliePaymentId },
    data: { status: payment.status },
  });

  if (payment.status !== "paid") return NextResponse.json({ ok: true });

  const product = (payment.metadata as { product: ProductId } | null)?.product ?? record.product as ProductId;
  const config = PRODUCTS[product];
  if (!config) return NextResponse.json({ error: "Unknown product" }, { status: 400 });

  const updateData: Parameters<typeof prisma.user.update>[0]["data"] = {
    creditsLeft: { increment: config.credits },
  };

  if (config.tier) {
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 30);
    updateData.tier = config.tier;
    updateData.subscriptionEndsAt = endsAt;
  }

  await prisma.user.update({ where: { id: record.user.id }, data: updateData });

  return NextResponse.json({ ok: true });
}
