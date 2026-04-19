import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/resend";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=link_verlopen`);
    }

    if (data.user?.email) {
      const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
      const isAdmin = adminEmails.includes(data.user.email.toLowerCase());

      const result = await prisma.user.upsert({
        where: { supabaseId: data.user.id },
        update: {},
        create: {
          supabaseId: data.user.id,
          email: data.user.email,
          // Admins start with unlimited credits so they never hit the paywall
          ...(isAdmin ? { creditsLeft: 99999, tier: "BUSINESS" } : {}),
        },
        select: { createdAt: true, updatedAt: true },
      });

      const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
      if (isNew && !isAdmin) {
        sendWelcomeEmail(data.user.email).catch(() => null);
      }

      // New users land on upload with a welcome banner; returning users go straight there
      const destination = isNew ? `${origin}/upload?welcome=1` : `${origin}/upload`;
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(`${origin}/upload`);
}
