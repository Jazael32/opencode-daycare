import { type NextRequest } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

// Next.js 16 renamed `middleware.ts` to `proxy.ts`, and the exported
// function is now `proxy`. This keeps Supabase auth sessions refreshed
// on every request before they reach Server Components.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /*
   * Match all request paths except:
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - svg, png, jpg, jpeg, gif and webp files (static assets)
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
