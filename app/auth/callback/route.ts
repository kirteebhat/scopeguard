import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectUrl } from "@/lib/validation/redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const safeNext = getSafeRedirectUrl(next, "/dashboard");
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // Return the user to an error page or login with error query param
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

