import { z } from "zod";
import { ISO_DATE_REGEX, isValidDateString } from "./project";

export const PRICING_METHODS = ["hourly", "fixed"] as const;
export const CLIENT_DECISIONS = ["approved", "rejected"] as const;

const isoDateSchema = z
  .string()
  .regex(ISO_DATE_REGEX, "Date must be in YYYY-MM-DD format")
  .refine(isValidDateString, "Invalid calendar date");

const MAX_HOURS = 10_000;
const MAX_RATE_MINOR = 100_000_000; // 100M minor units ($1M/hr)
const MAX_FIXED_COST_MINOR = 1_000_000_000_000; // 1 trillion minor units ($10B)

/**
 * Schema for creating a working draft change request.
 */
export const createChangeRequestDraftSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(150, "Title cannot exceed 150 characters"),
  description: z
    .string()
    .trim()
    .min(5, "Description must be at least 5 characters")
    .max(5000, "Description cannot exceed 5000 characters"),
  deliverableId: z.string().uuid("Invalid deliverable ID").optional().nullable(),
  pricingMethod: z.enum(PRICING_METHODS, {
    errorMap: () => ({ message: "Pricing method must be either 'hourly' or 'fixed'" }),
  }),
  estimatedHours: z
    .number({ invalid_type_error: "Estimated hours must be a number" })
    .min(0, "Estimated hours cannot be negative")
    .max(MAX_HOURS, "Estimated hours cannot exceed 10,000")
    .optional()
    .nullable(),
  hourlyRateMinor: z
    .number({ invalid_type_error: "Hourly rate must be a number" })
    .int("Hourly rate must be an integer in minor units")
    .min(0, "Hourly rate cannot be negative")
    .max(MAX_RATE_MINOR, "Hourly rate exceeds maximum permitted limit")
    .optional()
    .nullable(),
  fixedCostMinor: z
    .number({ invalid_type_error: "Fixed cost must be a number" })
    .int("Fixed cost must be an integer in minor units")
    .min(0, "Fixed cost cannot be negative")
    .max(MAX_FIXED_COST_MINOR, "Fixed cost exceeds maximum permitted limit")
    .optional()
    .nullable(),
  proposedDeadline: isoDateSchema.optional().nullable(),
  termsNotes: z
    .string()
    .trim()
    .max(3000, "Terms and notes cannot exceed 3000 characters")
    .optional()
    .nullable(),
});

/**
 * Schema for updating an existing working draft change request.
 */
export const updateChangeRequestDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(150, "Title cannot exceed 150 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .min(5, "Description must be at least 5 characters")
    .max(5000, "Description cannot exceed 5000 characters")
    .optional(),
  deliverableId: z.string().uuid("Invalid deliverable ID").optional().nullable(),
  pricingMethod: z.enum(PRICING_METHODS).optional(),
  estimatedHours: z
    .number()
    .min(0, "Estimated hours cannot be negative")
    .max(MAX_HOURS, "Estimated hours cannot exceed 10,000")
    .optional()
    .nullable(),
  hourlyRateMinor: z
    .number()
    .int("Hourly rate must be an integer in minor units")
    .min(0, "Hourly rate cannot be negative")
    .max(MAX_RATE_MINOR, "Hourly rate exceeds maximum permitted limit")
    .optional()
    .nullable(),
  fixedCostMinor: z
    .number()
    .int("Fixed cost must be an integer in minor units")
    .min(0, "Fixed cost cannot be negative")
    .max(MAX_FIXED_COST_MINOR, "Fixed cost exceeds maximum permitted limit")
    .optional()
    .nullable(),
  proposedDeadline: isoDateSchema.optional().nullable(),
  termsNotes: z
    .string()
    .trim()
    .max(3000, "Terms and notes cannot exceed 3000 characters")
    .optional()
    .nullable(),
});

/**
 * Strict schema for publishing a change request to pending approval.
 * Enforces all preconditions required to freeze an immutable snapshot version.
 */
export const publishChangeRequestSchema = z
  .object({
    changeRequestId: z.string().uuid("Invalid change request ID"),
    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters")
      .max(150, "Title cannot exceed 150 characters"),
    description: z
      .string()
      .trim()
      .min(5, "Description must be at least 5 characters")
      .max(5000, "Description cannot exceed 5000 characters"),
    deliverableId: z.string().uuid("Invalid deliverable ID").optional().nullable(),
    pricingMethod: z.enum(PRICING_METHODS),
    estimatedHours: z
      .number({ invalid_type_error: "Hours must be specified for hourly pricing" })
      .min(0, "Hours cannot be negative")
      .max(MAX_HOURS, "Hours cannot exceed 10,000")
      .optional()
      .nullable(),
    hourlyRateMinor: z
      .number({ invalid_type_error: "Hourly rate must be specified for hourly pricing" })
      .int("Hourly rate must be an integer in minor units")
      .min(0, "Hourly rate cannot be negative")
      .max(MAX_RATE_MINOR, "Hourly rate exceeds maximum permitted limit")
      .optional()
      .nullable(),
    fixedCostMinor: z
      .number({ invalid_type_error: "Fixed cost must be specified for fixed pricing" })
      .int("Fixed cost must be an integer in minor units")
      .min(0, "Fixed cost cannot be negative")
      .max(MAX_FIXED_COST_MINOR, "Fixed cost exceeds maximum permitted limit")
      .optional()
      .nullable(),
    projectStartDate: isoDateSchema.optional().nullable(),
    proposedDeadline: isoDateSchema.optional().nullable(),
    termsNotes: z
      .string()
      .trim()
      .max(3000, "Terms and notes cannot exceed 3000 characters")
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    // 1. Hourly pricing validation
    if (data.pricingMethod === "hourly") {
      if (data.estimatedHours === undefined || data.estimatedHours === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Estimated hours must be provided for hourly pricing",
          path: ["estimatedHours"],
        });
      }
      if (data.hourlyRateMinor === undefined || data.hourlyRateMinor === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Hourly rate must be provided for hourly pricing",
          path: ["hourlyRateMinor"],
        });
      }
    }

    // 2. Fixed pricing validation
    if (data.pricingMethod === "fixed") {
      if (data.fixedCostMinor === undefined || data.fixedCostMinor === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Fixed cost must be provided for fixed pricing",
          path: ["fixedCostMinor"],
        });
      }
    }

    // 3. Proposed deadline must be on or after project start date
    if (data.proposedDeadline && data.projectStartDate) {
      if (data.proposedDeadline < data.projectStartDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Proposed deadline must be on or after project start date",
          path: ["proposedDeadline"],
        });
      }
    }
  });

/**
 * Schema for client approval or rejection submitted via public approval link.
 * Requires self-declared actor name of at least 2 characters.
 */
export const clientDecisionSchema = z.object({
  decision: z.enum(CLIENT_DECISIONS, {
    errorMap: () => ({ message: "Decision must be either 'approved' or 'rejected'" }),
  }),
  actorName: z
    .string({ required_error: "Your name is required to submit a decision" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes cannot exceed 1000 characters")
    .optional()
    .nullable(),
});

export type CreateChangeRequestDraftInput = z.infer<typeof createChangeRequestDraftSchema>;
export type UpdateChangeRequestDraftInput = z.infer<typeof updateChangeRequestDraftSchema>;
export type PublishChangeRequestInput = z.infer<typeof publishChangeRequestSchema>;
export type ClientDecisionInput = z.infer<typeof clientDecisionSchema>;
