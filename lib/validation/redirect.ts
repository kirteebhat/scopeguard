/**
 * Validates and sanitizes redirect target URLs.
 * Strictly prevents open-redirect vulnerabilities by ensuring the target
 * is a valid, same-origin relative path without protocol-relative slashes,
 * Windows directory separator bypasses, or control character injections.
 */
export function getSafeRedirectUrl(
  target: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!target || typeof target !== "string") {
    return fallback;
  }

  const trimmed = target.trim();

  // Must begin with a single slash
  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  // Must not begin with "//" (protocol-relative URLs like //evil.com)
  if (trimmed.startsWith("//")) {
    return fallback;
  }

  // Must not begin with "/\" (Windows directory separator bypass like /\evil.com)
  if (trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Must not contain control characters or newlines (HTTP header injection protection)
  if (/[\r\n\0]/.test(trimmed)) {
    return fallback;
  }

  // Path portion before query/hash must not contain backslashes
  const pathBeforeQuery = trimmed.split(/[?#]/)[0];
  if (pathBeforeQuery.includes("\\")) {
    return fallback;
  }

  try {
    // Validate that the target resolves strictly to the same origin
    const dummyOrigin = "http://localhost:3000";
    const parsed = new URL(trimmed, dummyOrigin);

    if (parsed.origin !== dummyOrigin) {
      return fallback;
    }

    if (parsed.protocol !== "http:") {
      return fallback;
    }

    if (!parsed.pathname.startsWith("/")) {
      return fallback;
    }

    return trimmed;
  } catch {
    return fallback;
  }
}

