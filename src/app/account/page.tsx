import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { IMAGE_STATUS_LABELS } from "@/lib/scenes";
import SignOutButton from "./sign-out-button";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: {
      creditsLeft: true,
      tier: true,
      subscriptionEndsAt: true,
      createdAt: true,
      _count: { select: { images: true } },
    },
  });

  const recentImages = await prisma.image.findMany({
    where: { user: { supabaseId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, status: true, sceneTheme: true, createdAt: true },
  });

  const TIER_LABELS: Record<string, string> = {
    FREE: "Gratis", STARTER: "Starter", PRO: "Pro", BUSINESS: "Business",
  };

  const stats = [
    { label: "Huidig plan", value: TIER_LABELS[dbUser?.tier ?? "FREE"] },
    { label: "Credits resterend", value: dbUser?.creditsLeft ?? 0 },
    { label: "Foto's gemaakt", value: dbUser?._count.images ?? 0 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {/* Page header */}
        <div className="border-b-4 border-black pb-4 mb-10">
          <p className="text-xs uppercase tracking-widest font-medium mb-1">Fotograph — Account</p>
          <h1 className="font-serif font-black text-5xl uppercase leading-none tracking-tight">
            Mijn account
          </h1>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-black mb-10">
          {stats.map((s) => (
            <div key={s.label} className="bg-white p-6">
              <p className="text-xs uppercase tracking-widest font-medium text-black/40 mb-2">{s.label}</p>
              <p className="font-serif font-black text-4xl uppercase leading-none">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-px bg-black">
          {/* Account details */}
          <div className="bg-white p-6 flex flex-col gap-6">
            <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-2">
              Gegevens
            </h2>

            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-widest text-black/40">E-mailadres</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>

            {dbUser?.subscriptionEndsAt && (
              <div className="flex flex-col gap-1">
                <p className="text-xs uppercase tracking-widest text-black/40">Abonnement geldig tot</p>
                <p className="text-sm font-medium">
                  {new Date(dbUser.subscriptionEndsAt).toLocaleDateString("nl-NL", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-black/10">
              <Link
                href="/upgrade"
                className="border border-black px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors text-center"
              >
                Credits kopen / Upgraden
              </Link>
              <SignOutButton />
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white p-6 flex flex-col gap-4">
            <h2 className="text-xs uppercase tracking-widest font-medium border-b border-black pb-2">
              Recente activiteit
            </h2>

            {recentImages.length === 0 ? (
              <p className="text-sm text-black/40">Nog geen foto&apos;s gegenereerd.</p>
            ) : (
              <div className="flex flex-col gap-px bg-black/10">
                {recentImages.map((img) => (
                  <div key={img.id} className="bg-white flex items-center justify-between px-3 py-2.5 gap-3">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-medium uppercase tracking-widest">
                        {img.sceneTheme ?? "Onbekend"}
                      </p>
                      <p className="text-[11px] text-black/40">
                        {new Date(img.createdAt).toLocaleDateString("nl-NL", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 border ${
                      img.status === "DONE"
                        ? "border-black text-black"
                        : img.status === "FAILED"
                        ? "border-black/30 text-black/30"
                        : "border-black/20 text-black/40"
                    }`}>
                      {IMAGE_STATUS_LABELS[img.status] ?? img.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
