import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getServerEnv, getPublicEnv } from "@/lib/env";

/**
 * Service role client strictly for server-side operations that require
 * elevated privileges (e.g., verifying client link tokens or administrative tasks).
 * NEVER expose this to client components, route handlers returning secrets, or browser bundles.
 */
export function createServiceRoleClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  return createSupabaseClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

