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
      const result = await prisma.user.upsert({
        where: { supabaseId: data.user.id },
        update: {},
        create: { supabaseId: data.user.id, email: data.user.email },
        select: { createdAt: true, updatedAt: true },
      });
      // Send welcome email only on first sign-in (created and updated timestamps are equal)
      const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
      if (isNew) {
        sendWelcomeEmail(data.user.email).catch(() => null); // fire-and-forget, never block redirect
      }
    }
  }

  return NextResponse.redirect(`${origin}/upload`);
}
