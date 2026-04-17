import { NextResponse, type NextRequest } from "next/server";

/**
 * Phase 1: passthrough proxy — no auth needed yet.
 * Phase 2: add Supabase session refresh + /dashboard protection.
 */
export function proxy(request: NextRequest) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
