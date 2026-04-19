import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { mollie, PRODUCTS, type ProductId } from "@/lib/mollie";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { product } = await request.json() as { product: ProductId };
  const productConfig = PRODUCTS[product];
  if (!productConfig) return NextResponse.json({ error: "Ongeldig product" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, email: true, mollieCustomerId: true },
  });
  if (!dbUser) return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get("host")}`;

  let customerId = dbUser.mollieCustomerId;
  if (!customerId) {
    const customer = await mollie.customers.create({ name: dbUser.email, email: dbUser.email });
    customerId = customer.id;
    await prisma.user.update({ where: { id: dbUser.id }, data: { mollieCustomerId: customerId } });
  }

  const payment = await mollie.payments.create({
    amount: { currency: "EUR", value: productConfig.amount },
    description: productConfig.label,
    customerId,
    redirectUrl: `${baseUrl}/upgrade?status=success&product=${product}`,
    webhookUrl: `${baseUrl}/api/mollie/webhook`,
    metadata: { userId: dbUser.id, product },
  });

  await prisma.molliePayment.create({
    data: {
      userId: dbUser.id,
      mollieId: payment.id,
      status: payment.status,
      amount: productConfig.amount,
      product,
    },
  });

  return NextResponse.json({ checkoutUrl: payment._links.checkout?.href });
}
