import { z } from "zod";

/**
 * Public environment schema.
 * Safe for client-side and browser bundles.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("http://localhost:3000"),
});

/**
 * Server-only environment schema.
 * MUST NEVER be accessible or imported in browser bundles.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required on the server"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional().default("ScopeGuard <notifications@scopeguard.agency>"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedPublicEnv: PublicEnv | null = null;
let cachedServerEnv: ServerEnv | null = null;

/**
 * Get validated public environment variables.
 * Safe to call from client components and server code.
 */
export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;

  const rawPublic = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  };

  const parsed = publicEnvSchema.safeParse(rawPublic);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => ` - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `[ScopeGuard Env Error] Invalid or missing public environment variables:\n${errorDetails}`
    );
  }

  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}

/**
 * Get validated server-only environment variables.
 * Throws immediately if invoked in a client/browser runtime.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "[Security Boundary Violation] Attempted to access server-only environment variables from the client/browser bundle!"
    );
  }

  if (cachedServerEnv) return cachedServerEnv;

  const rawServer = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM || "ScopeGuard <notifications@scopeguard.agency>",
  };

  const parsed = serverEnvSchema.safeParse(rawServer);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => ` - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `[ScopeGuard Env Error] Invalid or missing server environment variables:\n${errorDetails}`
    );
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

