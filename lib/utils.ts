export type ClassValue = string | number | boolean | undefined | null;

/**
 * Utility to conditionally combine Tailwind class names without extra dependencies.
 */
export function cn(...inputs: (ClassValue | ClassValue[])[]): string {
  return inputs
    .flat()
    .filter((x): x is string | number => typeof x === "string" || typeof x === "number")
    .filter(Boolean)
    .join(" ");
}

