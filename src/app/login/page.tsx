"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const supabase = createClient();

function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("error") === "link_verlopen") {
      toast.error("Je inloglink is verlopen. Vraag een nieuwe aan.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      toast.error("Versturen mislukt. Probeer het opnieuw.");
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <p className="font-serif font-black text-2xl uppercase">Controleer je inbox</p>
        <p className="text-sm text-black/60 leading-relaxed">
          We hebben een inloglink gestuurd naar<br />
          <strong>{email}</strong>
        </p>
        <button
          onClick={() => setSent(false)}
          className="text-xs uppercase tracking-widest underline underline-offset-4 text-black/40 hover:text-black"
        >
          Ander e-mailadres
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        placeholder="jouw@email.nl"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoFocus
        className="border border-black px-4 py-2.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-black placeholder:text-black/30"
      />
      <button
        type="submit"
        disabled={loading}
        className="border border-black bg-black text-white px-4 py-2.5 text-xs uppercase tracking-widest font-medium hover:bg-white hover:text-black transition-colors disabled:opacity-50"
      >
        {loading ? "Versturen..." : "Stuur magische link"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Masthead */}
      <header className="border-b-4 border-black">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center">
          <span className="font-serif font-black text-lg tracking-tight uppercase">Fotograph</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="border-b-2 border-black pb-4 mb-8">
            <p className="text-xs uppercase tracking-widest font-medium text-black/40 mb-1">
              Inloggen
            </p>
            <h1 className="font-serif font-black text-4xl uppercase leading-none">
              Welkom terug
            </h1>
          </div>

          <p className="text-sm text-black/60 mb-6 leading-relaxed">
            We sturen je een magische link — geen wachtwoord nodig.
          </p>

          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
