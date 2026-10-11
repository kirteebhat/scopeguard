import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters")
    .max(100, "Workspace name cannot exceed 100 characters"),
});

export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters")
    .max(100, "Workspace name cannot exceed 100 characters"),
});

export const updateMemberRoleSchema = z.object({
  targetUserId: z.string().uuid("Invalid user ID"),
  role: z.enum(["manager", "member"], {
    errorMap: () => ({ message: "Role must be either 'manager' or 'member'" }),
  }),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

