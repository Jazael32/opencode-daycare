import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Public routes render without a session. Every other route is protected,
// including routes added in the future.
const publicRoutes = new Set(["/login", "/activar-cuenta"]);

// `setAll` sends these headers so CDNs and reverse proxies never cache
// responses that carry session cookies. A redirect must keep them too.
const cacheHeaders = ["cache-control", "expires", "pragma"];

function redirectTo(
  request: NextRequest,
  pathname: string,
  source: NextResponse,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;

  const response = NextResponse.redirect(url);

  // Carry the cookies that `setAll` refreshed; otherwise the redirect would
  // drop them and sign the user out on the next request.
  source.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));

  cacheHeaders.forEach((header) => {
    const value = source.headers.get(header);
    if (value) {
      response.headers.set(header, value);
    }
  });

  return response;
}

export async function updateSession(request: NextRequest) {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          // Cache headers passed by @supabase/ssr stop CDNs and reverse
          // proxies from caching responses that carry session cookies.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    },
  );

  // IMPORTANT: Do not run code between createServerClient and getClaims().
  // getClaims() refreshes the auth token when it is close to expiring and
  // verifies the token signature on every request, which is what keeps
  // users signed in. Never trust `getSession()` here — it reads the
  // session cookie without validating it.
  const { data } = await supabase.auth.getClaims();
  const hasSession = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!hasSession && !publicRoutes.has(pathname)) {
    return redirectTo(request, "/login", supabaseResponse);
  }

  // Signed-in users never see the auth screens (SPEC 09 for /login,
  // SPEC 11 for /activar-cuenta).
  if (hasSession && (pathname === "/login" || pathname === "/activar-cuenta")) {
    return redirectTo(request, "/", supabaseResponse);
  }

  // IMPORTANT: Return the response that `setAll` last built. An earlier
  // response does not carry the refreshed cookies, so the user would be
  // signed out on the next request.
  return supabaseResponse;
}
