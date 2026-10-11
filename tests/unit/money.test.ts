import { describe, it, expect } from "vitest";
import {
  parseDecimalToMinor,
  minorToDecimalString,
  calculateHourlyCost,
  formatMinorToCurrency,
} from "@/lib/domain/money";

describe("lib/domain/money", () => {
  describe("parseDecimalToMinor", () => {
    it("parses standard whole and decimal numbers without floating-point drift", () => {
      expect(parseDecimalToMinor("100")).toBe(10000);
      expect(parseDecimalToMinor("2500.00")).toBe(250000);
      expect(parseDecimalToMinor("45.50")).toBe(4550);
      expect(parseDecimalToMinor("18750.00")).toBe(1875000);
    });

    it("parses zero correctly", () => {
      expect(parseDecimalToMinor("0")).toBe(0);
      expect(parseDecimalToMinor("0.0")).toBe(0);
      expect(parseDecimalToMinor("0.00")).toBe(0);
    });

    it("handles 0.1 + 0.2 style decimals without IEEE-754 binary floating drift", () => {
      // In JS: 0.1 + 0.2 === 0.30000000000000004
      const minorA = parseDecimalToMinor("0.1"); // 10 cents
      const minorB = parseDecimalToMinor("0.2"); // 20 cents
      const sumMinor = minorA + minorB; // exactly 30 cents

      expect(minorA).toBe(10);
      expect(minorB).toBe(20);
      expect(sumMinor).toBe(30);
      expect(minorToDecimalString(sumMinor)).toBe("0.30");
    });

    it("parses single decimal and penny amounts correctly", () => {
      expect(parseDecimalToMinor("0.05")).toBe(5);
      expect(parseDecimalToMinor("0.01")).toBe(1);
      expect(parseDecimalToMinor("0.1")).toBe(10);
      expect(parseDecimalToMinor("0.10")).toBe(10);
      expect(parseDecimalToMinor("0.99")).toBe(99);
      expect(parseDecimalToMinor("1.5")).toBe(150);
    });

    it("handles sanitized comma separators in numbers", () => {
      expect(parseDecimalToMinor("1,500.50")).toBe(150050);
      expect(parseDecimalToMinor("1,000,000.00")).toBe(100000000);
      expect(parseDecimalToMinor("  2,500  ")).toBe(250000);
    });

    it("parses large monetary amounts accurately", () => {
      expect(parseDecimalToMinor("1000000.99")).toBe(100000099);
      expect(parseDecimalToMinor("99999999.99")).toBe(9999999999);
    });

    it("rejects invalid decimal formats and malformed strings", () => {
      expect(() => parseDecimalToMinor("")).toThrow(/empty/i);
      expect(() => parseDecimalToMinor("   ")).toThrow(/empty/i);
      expect(() => parseDecimalToMinor("abc")).toThrow(/invalid/i);
      expect(() => parseDecimalToMinor("10.555")).toThrow(/invalid/i); // > 2 decimal places
      expect(() => parseDecimalToMinor("-50")).toThrow(/invalid/i); // negative
      expect(() => parseDecimalToMinor("-0.01")).toThrow(/invalid/i);
      expect(() => parseDecimalToMinor("1.2.3")).toThrow(/invalid/i);
      expect(() => parseDecimalToMinor("$100")).toThrow(/invalid/i);
      expect(() => parseDecimalToMinor(null as unknown as string)).toThrow(/must be a string/i);
    });
  });

  describe("minorToDecimalString", () => {
    it("converts integer minor units to exact two-decimal strings", () => {
      expect(minorToDecimalString(250000)).toBe("2500.00");
      expect(minorToDecimalString(4550)).toBe("45.50");
      expect(minorToDecimalString(10)).toBe("0.10");
      expect(minorToDecimalString(5)).toBe("0.05");
      expect(minorToDecimalString(1)).toBe("0.01");
      expect(minorToDecimalString(0)).toBe("0.00");
      expect(minorToDecimalString(100000099)).toBe("1000000.99");
    });

    it("throws on invalid inputs", () => {
      expect(() => minorToDecimalString(-1)).toThrow(/non-negative/i);
      expect(() => minorToDecimalString(10.5)).toThrow(/integer/i);
      expect(() => minorToDecimalString(NaN)).toThrow(/integer/i);
    });
  });

  describe("calculateHourlyCost", () => {
    it("matches Worked Example 1 from doc 04: 12.5 hrs @ ₹1,500.00/hr (150,000 paise)", () => {
      const result = calculateHourlyCost(12.5, 150000);
      expect(result).toBe(1875000); // 1,875,000 paise = ₹18,750.00
    });

    it("matches Worked Example 2 from doc 04: 3.33 hrs @ $85.50/hr (8,550 cents) with half-up rounding", () => {
      // 3.33 * 8550 = 28471.5 cents -> half-up rounds to 28472 cents ($284.72)
      const result = calculateHourlyCost(3.33, 8550);
      expect(result).toBe(28472);
    });

    it("matches Worked Example 3 from doc 04: 0.0 hrs @ $120.00/hr", () => {
      const result = calculateHourlyCost(0.0, 12000);
      expect(result).toBe(0);
    });

    it("handles zero hours and zero rate boundaries", () => {
      expect(calculateHourlyCost(0, 0)).toBe(0);
      expect(calculateHourlyCost(10, 0)).toBe(0);
      expect(calculateHourlyCost(0, 5000)).toBe(0);
    });

    it("strictly verifies half-up rounding boundaries", () => {
      // 1.0005 * 1000 = 1000.5 -> rounds up to 1001
      expect(calculateHourlyCost(1.0005, 1000)).toBe(1001);

      // 1.00049 * 1000 = 1000.49 -> rounds down to 1000
      expect(calculateHourlyCost(1.00049, 1000)).toBe(1000);

      // 0.5 * 100 = 50 -> 50
      expect(calculateHourlyCost(0.5, 100)).toBe(50);

      // 0.005 * 100 = 0.5 -> 1
      expect(calculateHourlyCost(0.005, 100)).toBe(1);

      // 0.0049 * 100 = 0.49 -> 0
      expect(calculateHourlyCost(0.0049, 100)).toBe(0);
    });

    it("handles large amounts and long duration without precision loss", () => {
      // 500 hours at $250.00/hr (25,000 cents) = 12,500,000 cents ($125,000)
      expect(calculateHourlyCost(500, 25000)).toBe(12500000);
    });

    it("throws on negative, non-finite, or non-integer inputs", () => {
      expect(() => calculateHourlyCost(-1, 5000)).toThrow(/non-negative/i);
      expect(() => calculateHourlyCost(10, -5000)).toThrow(/non-negative/i);
      expect(() => calculateHourlyCost(10, 50.5)).toThrow(/integer/i); // rate must be minor units integer
      expect(() => calculateHourlyCost(NaN, 5000)).toThrow(/finite/i);
      expect(() => calculateHourlyCost(10, Infinity)).toThrow(/finite/i);
    });
  });

  describe("formatMinorToCurrency", () => {
    it("formats USD currency correctly", () => {
      const formatted = formatMinorToCurrency(28472, "USD");
      expect(formatted).toBe("$284.72");
    });

    it("formats zero amounts correctly", () => {
      const formatted = formatMinorToCurrency(0, "USD");
      expect(formatted).toBe("$0.00");
    });

    it("formats INR currency correctly", () => {
      const formatted = formatMinorToCurrency(1875000, "INR", "en-IN");
      expect(formatted).toContain("18,750.00");
      expect(formatted).toContain("₹");
    });

    it("formats EUR currency correctly", () => {
      const formatted = formatMinorToCurrency(125000, "EUR", "en-US");
      expect(formatted).toContain("1,250.00");
    });

    it("throws on invalid minor unit amounts", () => {
      expect(() => formatMinorToCurrency(-100, "USD")).toThrow(/non-negative/i);
      expect(() => formatMinorToCurrency(10.5, "USD")).toThrow(/integer/i);
    });
  });
});
