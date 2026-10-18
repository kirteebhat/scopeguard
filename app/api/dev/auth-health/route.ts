import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Disabled in production to prevent environment probing
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const startTime = Date.now();
  let supabaseAuthPing: "ok" | "error" = "ok";
  let pingErrorMessage: string | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const projectRef = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] || "unknown";

  try {
    const supabase = await createClient();
    // Lightweight auth check to verify network reachability and auth gateway response
    const { error } = await supabase.auth.getSession();
    if (error) {
      supabaseAuthPing = "error";
      pingErrorMessage = error.message;
    }
  } catch (err) {
    supabaseAuthPing = "error";
    pingErrorMessage = err instanceof Error ? err.message : "Unknown connection error";
  }

  const latencyMs = Date.now() - startTime;

  // Check for session cookie presence
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const authCookie = allCookies.find(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );

  return NextResponse.json({
    status: supabaseAuthPing === "ok" ? "healthy" : "degraded",
    environment: process.env.NODE_ENV || "development",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
    projectRef,
    supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    authPing: {
      status: supabaseAuthPing,
      latencyMs,
      ...(pingErrorMessage ? { error: pingErrorMessage } : {}),
    },
    session: {
      hasAuthCookie: Boolean(authCookie),
      cookieName: authCookie ? authCookie.name : null,
    },
    timestamp: new Date().toISOString(),
  });
}
