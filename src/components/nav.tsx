import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NavLinks } from "./nav-links";

const BATCH_TIERS = new Set(["PRO", "BUSINESS"]);

export async function Nav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let credits = 0;
  let showBatch = false;
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { creditsLeft: true, tier: true },
    });
    credits = dbUser?.creditsLeft ?? 0;
    showBatch = BATCH_TIERS.has(dbUser?.tier ?? "");
  }

  return (
    <header className="border-b border-black">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="font-serif font-black text-lg tracking-tight uppercase">
          Fotograph
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm" title="Taal: Nederlands">🇳🇱</span>
          {user && <NavLinks credits={credits} showBatch={showBatch} />}
        </div>
      </div>
    </header>
  );
}
