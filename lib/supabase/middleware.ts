import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { getSafeRedirectUrl } from "@/lib/validation/redirect";

/**
 * Refreshes Supabase session tokens and enforces route protection rules.
 * Protects /dashboard, /projects, and /settings by redirecting unauthenticated users to /login?next=<path>.
 * Redirects authenticated users away from /login, /signup, /forgot-password to /dashboard.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT use supabase.auth.getSession() on the server as it does not validate with Supabase Auth.
  // Always use supabase.auth.getUser()!
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected paths that require authentication
  const protectedPrefixes = ["/dashboard", "/projects", "/settings", "/onboarding"];
  const isProtectedPath = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // Auth pages that should redirect to dashboard if already authenticated
  const authPaths = ["/login", "/signup", "/forgot-password"];
  const isAuthPath = authPaths.includes(pathname);

  if (isProtectedPath && !user) {
    // Unauthenticated access to protected route: redirect to /login?next=<encoded_path>
    const nextPath = pathname + request.nextUrl.search;
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", nextPath);

    const redirectResponse = NextResponse.redirect(loginUrl);
    // Copy any cookies set by Supabase (such as cleared expired session cookies)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  if (isAuthPath && user) {
    // Already authenticated user visiting login or signup: redirect to safe next path or /dashboard
    const nextParam = request.nextUrl.searchParams.get("next");
    const safeTarget = getSafeRedirectUrl(nextParam, "/dashboard");
    const targetUrl = new URL(safeTarget, request.url);

    const redirectResponse = NextResponse.redirect(targetUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
