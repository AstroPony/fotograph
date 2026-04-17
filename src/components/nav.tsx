import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function Nav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let credits: number | null = null;
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { creditsLeft: true },
    });
    credits = dbUser?.creditsLeft ?? 0;
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
            <span className="border border-black px-2 py-0.5">
              {credits} credit{credits !== 1 ? "s" : ""}
            </span>
            <Link href="/account" className="hover:underline underline-offset-4">
              Account
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
