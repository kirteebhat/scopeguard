/**
 * Pure, framework-free monetary calculations and formatting for ScopeGuard.
 * Zero external dependencies. Zero floating-point storage drift.
 * Strictly adheres to docs/04-calculation-rules.md.
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  minorUnitDigits: number;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", minorUnitDigits: 2 },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", minorUnitDigits: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", minorUnitDigits: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", minorUnitDigits: 2 },
};

/**
 * Parses user-entered decimal string (e.g. "2500.00", "1,500.50", "45")
 * into integer minor units without floating-point math drift.
 *
 * Examples:
 *  - "2500.00" -> 250000
 *  - "0.1" -> 10
 *  - "0.05" -> 5
 *  - "1,500.5" -> 150050
 *  - "0" -> 0
 *
 * @throws Error on invalid decimal formats, negative values, or >2 decimal places.
 */
export function parseDecimalToMinor(amountStr: string): number {
  if (typeof amountStr !== "string") {
    throw new Error("Amount must be a string");
  }

  const sanitized = amountStr.trim().replace(/,/g, "");
  if (sanitized === "") {
    throw new Error("Amount string cannot be empty");
  }

  // Strictly match non-negative decimals with up to 2 decimal places
  if (!/^\d+(\.\d{1,2})?$/.test(sanitized)) {
    throw new Error(
      `Invalid currency decimal format: "${amountStr}". Expected non-negative numeric string with at most 2 decimal digits.`
    );
  }

  const [whole, decimal = ""] = sanitized.split(".");
  const paddedDecimal = (decimal + "00").slice(0, 2);

  const wholeNum = parseInt(whole, 10);
  const decimalNum = parseInt(paddedDecimal, 10);

  if (isNaN(wholeNum) || isNaN(decimalNum) || wholeNum < 0) {
    throw new Error("Invalid amount values parsed");
  }

  const result = wholeNum * 100 + decimalNum;
  if (!Number.isSafeInteger(result)) {
    throw new Error("Amount exceeds maximum safe integer limit");
  }

  return result;
}

/**
 * Converts integer minor units back to an exact two-decimal string without floating-point division.
 *
 * Examples:
 *  - 250000 -> "2500.00"
 *  - 10 -> "0.10"
 *  - 5 -> "0.05"
 *  - 0 -> "0.00"
 */
export function minorToDecimalString(amountMinor: number): string {
  if (typeof amountMinor !== "number" || !Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error("Minor units must be a non-negative integer");
  }

  const whole = Math.floor(amountMinor / 100);
  const cents = amountMinor % 100;
  return `${whole}.${cents.toString().padStart(2, "0")}`;
}

/**
 * Computes hourly pricing cost using deterministic half-up rounding.
 *
 * Formula:
 *   cost_minor = floor(hours * rate_minor + 0.5)
 *
 * Worked examples:
 *   - 12.5 hrs @ 150000 paise (₹1,500.00/hr) = 1,875,000 paise
 *   - 3.33 hrs @ 8550 cents ($85.50/hr) = 28,472 cents (from 28,471.5 half-up)
 *   - 0.0 hrs @ 12000 cents = 0 cents
 */
export function calculateHourlyCost(hours: number, rateMinor: number): number {
  if (typeof hours !== "number" || typeof rateMinor !== "number") {
    throw new Error("Hours and rate must be numbers");
  }

  if (!Number.isFinite(hours) || !Number.isFinite(rateMinor)) {
    throw new Error("Hours and rate must be finite numbers");
  }

  if (hours < 0 || rateMinor < 0) {
    throw new Error("Hours and rate must be non-negative");
  }

  if (!Number.isInteger(rateMinor)) {
    throw new Error("Hourly rate in minor units must be an integer");
  }

  // Exact half-up rounding: floor(product + 0.5)
  const product = hours * rateMinor;
  const result = Math.floor(product + 0.5);

  if (!Number.isSafeInteger(result)) {
    throw new Error("Calculated hourly cost exceeds maximum safe integer");
  }

  return result;
}

/**
 * Formats integer minor units for localized display by currency code.
 *
 * Examples:
 *  - (1875000, "INR") -> "₹18,750.00"
 *  - (28472, "USD") -> "$284.72"
 *  - (0, "USD") -> "$0.00"
 */
export function formatMinorToCurrency(
  amountMinor: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  if (typeof amountMinor !== "number" || !Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error("Amount in minor units must be a non-negative integer");
  }

  const normalizedCurrency = currency.toUpperCase().trim();
  const majorAmount = amountMinor / 100;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(majorAmount);
  } catch {
    // Fallback if locale or currency code is unsupported by Intl
    const symbol = SUPPORTED_CURRENCIES[normalizedCurrency]?.symbol || normalizedCurrency;
    return `${symbol} ${minorToDecimalString(amountMinor)}`;
  }
}
