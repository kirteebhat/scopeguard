import { z } from "zod";

export const ISO_DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Validates that a string is a calendar-valid date in YYYY-MM-DD format.
 */
export function isValidDateString(val: string): boolean {
  if (!ISO_DATE_REGEX.test(val)) return false;
  const [year, month, day] = val.split("-").map((p) => parseInt(p, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const isoDateSchema = z
  .string()
  .regex(ISO_DATE_REGEX, "Date must be in YYYY-MM-DD format")
  .refine(isValidDateString, "Invalid calendar date");

const MAX_BUDGET_MINOR = 1_000_000_000_000; // 1 trillion minor units ($10B)
const MAX_HOURLY_RATE_MINOR = 100_000_000; // 100M minor units ($1M/hr)

export const createProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Project name must be at least 2 characters")
      .max(100, "Project name cannot exceed 100 characters"),
    clientName: z
      .string()
      .trim()
      .min(2, "Client name must be at least 2 characters")
      .max(100, "Client name cannot exceed 100 characters"),
    clientContactName: z
      .string()
      .trim()
      .max(100, "Client contact name cannot exceed 100 characters")
      .optional()
      .nullable(),
    clientContactEmail: z
      .string()
      .trim()
      .email("Invalid client contact email address")
      .max(255, "Client contact email cannot exceed 255 characters")
      .optional()
      .nullable()
      .or(z.literal("")),
    description: z
      .string()
      .trim()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional()
      .nullable(),
    budgetMinor: z
      .number({ invalid_type_error: "Budget must be a number" })
      .int("Budget must be an integer in minor units")
      .min(0, "Budget cannot be negative")
      .max(MAX_BUDGET_MINOR, "Budget exceeds maximum permitted limit"),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .length(3, "Currency must be a 3-letter ISO code")
      .regex(/^[A-Z]{3}$/, "Currency must contain exactly 3 letters"),
    hourlyRateMinor: z
      .number({ invalid_type_error: "Hourly rate must be a number" })
      .int("Hourly rate must be an integer in minor units")
      .min(0, "Hourly rate cannot be negative")
      .max(MAX_HOURLY_RATE_MINOR, "Hourly rate exceeds maximum permitted limit"),
    startDate: isoDateSchema,
    originalDeadline: isoDateSchema,
  })
  .refine((data) => data.originalDeadline >= data.startDate, {
    message: "Original deadline must be on or after the project start date",
    path: ["originalDeadline"],
  });

export const updateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Project name must be at least 2 characters")
      .max(100, "Project name cannot exceed 100 characters")
      .optional(),
    clientName: z
      .string()
      .trim()
      .min(2, "Client name must be at least 2 characters")
      .max(100, "Client name cannot exceed 100 characters")
      .optional(),
    clientContactName: z
      .string()
      .trim()
      .max(100, "Client contact name cannot exceed 100 characters")
      .optional()
      .nullable(),
    clientContactEmail: z
      .string()
      .trim()
      .email("Invalid client contact email address")
      .max(255, "Client contact email cannot exceed 255 characters")
      .optional()
      .nullable()
      .or(z.literal("")),
    description: z
      .string()
      .trim()
      .max(2000, "Description cannot exceed 2000 characters")
      .optional()
      .nullable(),
    budgetMinor: z
      .number()
      .int("Budget must be an integer in minor units")
      .min(0, "Budget cannot be negative")
      .max(MAX_BUDGET_MINOR, "Budget exceeds maximum permitted limit")
      .optional(),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .length(3, "Currency must be a 3-letter ISO code")
      .regex(/^[A-Z]{3}$/, "Currency must contain exactly 3 letters")
      .optional(),
    hourlyRateMinor: z
      .number()
      .int("Hourly rate must be an integer in minor units")
      .min(0, "Hourly rate cannot be negative")
      .max(MAX_HOURLY_RATE_MINOR, "Hourly rate exceeds maximum permitted limit")
      .optional(),
    status: z.enum(["active", "completed", "on_hold", "archived"]).optional(),
    startDate: isoDateSchema.optional(),
    originalDeadline: isoDateSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.originalDeadline) {
        return data.originalDeadline >= data.startDate;
      }
      return true;
    },
    {
      message: "Original deadline must be on or after the project start date",
      path: ["originalDeadline"],
    }
  );

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

