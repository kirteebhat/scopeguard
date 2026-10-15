import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Block internal developer routes in production builds
  if (
    process.env.NODE_ENV === "production" &&
    request.nextUrl.pathname.startsWith("/dev")
  ) {
    return new NextResponse(null, { status: 404 });
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images and fonts (*.svg, *.png, *.jpg, *.jpeg, *.gif, *.webp, *.woff, *.woff2)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)",
  ],
};

