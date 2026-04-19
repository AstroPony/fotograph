import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { UpgradeClient } from "./upgrade-client";

export default async function UpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let tier = "FREE";
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      select: { tier: true },
    });
    tier = dbUser?.tier ?? "FREE";
  }

  return <UpgradeClient currentTier={tier} />;
}
