import { z } from "zod";
import { emailSchema } from "./auth";

/**
 * Validation schema for dispatching proposal approval links to clients.
 */
export const sendProposalToClientSchema = z
  .object({
    changeRequestId: z.string().uuid("Invalid change request identifier"),
    recipientEmail: emailSchema,
    recipientName: z
      .string()
      .trim()
      .max(100, "Recipient name cannot exceed 100 characters")
      .optional()
      .or(z.literal("")),
    personalNote: z
      .string()
      .trim()
      .max(500, "Personal note cannot exceed 500 characters")
      .refine(
        (val) => !val || !/<[^>]*>/i.test(val),
        "HTML formatting is not permitted in personal notes"
      )
      .optional()
      .or(z.literal("")),
    sendCopyToMe: z.boolean().optional(),
    mode: z.enum(["use_current_link_from_publish", "regenerate_link"]),
    rawToken: z.string().trim().min(10, "Raw approval token is required").optional(),
    attemptKey: z
      .string()
      .trim()
      .min(8, "Send attempt key must be at least 8 characters")
      .max(128, "Send attempt key is too long"),
    saveAsProjectContact: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.mode === "use_current_link_from_publish") {
        return !!data.rawToken && data.rawToken.length >= 10;
      }
      return true;
    },
    {
      message: "An active in-memory token is required when sending immediately from publish",
      path: ["rawToken"],
    }
  );

export type SendProposalToClientInput = z.infer<typeof sendProposalToClientSchema>;

/**
 * Validation schema for updating a project's primary client contact.
 */
export const setProjectClientContactSchema = z.object({
  projectId: z.string().uuid("Invalid project identifier"),
  contactName: z
    .string()
    .trim()
    .max(100, "Contact name cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
  contactEmail: emailSchema.optional().or(z.literal("")),
});

export type SetProjectClientContactInput = z.infer<typeof setProjectClientContactSchema>;

