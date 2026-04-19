import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BatchForm } from "./batch-form";

const TIER_LIMITS: Record<string, number> = {
  PRO: 25,
  BUSINESS: 100,
};

export default async function BatchUploadPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { tier: true, creditsLeft: true },
  });

  const batchLimit = TIER_LIMITS[dbUser?.tier ?? "FREE"] ?? 0;

  if (batchLimit === 0) {
    return (
      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <div className="border-b-4 border-black pb-4 mb-10">
          <p className="text-xs uppercase tracking-widest font-medium mb-1">Fotograph — Batch upload</p>
          <h1 className="font-serif font-black text-5xl uppercase leading-none tracking-tight">
            Batch upload
          </h1>
        </div>
        <div className="border border-black p-10 flex flex-col items-center text-center gap-6 max-w-lg">
          <h2 className="font-serif font-black text-3xl uppercase leading-tight">
            Pro of Business vereist
          </h2>
          <p className="text-sm text-black/60 leading-relaxed">
            Batch upload is beschikbaar vanaf het Pro-abonnement (25 foto&apos;s per batch) en Business (100 per batch).
          </p>
          <Link
            href="/upgrade"
            className="bg-black text-white px-6 py-2.5 text-xs uppercase tracking-widest font-medium hover:bg-black/80 transition-colors"
          >
            Upgraden
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <div className="border-b-4 border-black pb-4 mb-10">
        <p className="text-xs uppercase tracking-widest font-medium mb-1">Fotograph — Batch upload</p>
        <h1 className="font-serif font-black text-5xl uppercase leading-none tracking-tight">
          Batch upload
        </h1>
      </div>
      <BatchForm batchLimit={batchLimit} creditsLeft={dbUser?.creditsLeft ?? 0} />
    </div>
  );
}
