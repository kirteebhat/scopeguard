import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getPublicEnv, getServerEnv } from "@/lib/env";

describe("Environment Loader (lib/env.ts)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("successfully parses valid public environment variables", () => {
    const publicEnv = getPublicEnv();
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("test-anon-key");
    expect(publicEnv.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });

  it("successfully parses valid server environment variables in Node runtime", () => {
    const serverEnv = getServerEnv();
    expect(serverEnv.SUPABASE_SERVICE_ROLE_KEY).toBe("test-service-key");
  });

  it("throws security violation if getServerEnv is called in browser runtime", () => {
    // Simulate browser window
    (globalThis as unknown as { window: unknown }).window = {};

    expect(() => getServerEnv()).toThrowError(/Security Boundary Violation/);

    // Clean up
    delete (globalThis as unknown as { window?: unknown }).window;
  });
});

