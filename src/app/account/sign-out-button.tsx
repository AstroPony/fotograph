"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="border border-black px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors text-left"
    >
      Uitloggen
    </button>
  );
}
