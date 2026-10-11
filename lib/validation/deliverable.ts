import { z } from "zod";

export const DELIVERABLE_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

const MAX_HOURS = 10_000;

export const createDeliverableSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(150, "Title cannot exceed 150 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .nullable(),
  estimatedHours: z
    .number({ invalid_type_error: "Estimated hours must be a number" })
    .min(0, "Estimated hours cannot be negative")
    .max(MAX_HOURS, "Estimated hours cannot exceed 10,000")
    .optional()
    .nullable(),
  status: z.enum(DELIVERABLE_STATUSES).default("pending"),
});

export const updateDeliverableSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters")
    .max(150, "Title cannot exceed 150 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .nullable(),
  estimatedHours: z
    .number()
    .min(0, "Estimated hours cannot be negative")
    .max(MAX_HOURS, "Estimated hours cannot exceed 10,000")
    .optional()
    .nullable(),
  status: z.enum(DELIVERABLE_STATUSES).optional(),
});

export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;
export type UpdateDeliverableInput = z.infer<typeof updateDeliverableSchema>;
