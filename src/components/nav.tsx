import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const BATCH_TIERS = new Set(["PRO", "BUSINESS"]);

export async function Nav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let credits: number | null = null;
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
        {user && (
          <nav className="flex items-center gap-8 text-xs uppercase tracking-widest font-medium">
            <Link href="/upload" className="hover:underline underline-offset-4">
              Nieuwe foto
            </Link>
            {showBatch && (
              <Link href="/upload/batch" className="hover:underline underline-offset-4">
                Batch
              </Link>
            )}
            <Link href="/upgrade" className="border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-colors">
              {credits} credit{credits !== 1 ? "s" : ""}
            </Link>
            <Link href="/account" className="hover:underline underline-offset-4">
              Account
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
