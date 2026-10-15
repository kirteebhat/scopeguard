import React from "react";
import { Metadata } from "next";
import { requireRole } from "@/lib/data/auth-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewProjectForm } from "./NewProjectForm";

export const metadata: Metadata = {
  title: "New Project - ScopeGuard",
  description: "Create a new client contract baseline with budget and deliverable scope.",
};

export default async function NewProjectPage() {
  // Guard: Only owner and manager can access new project creation
  await requireRole(["owner", "manager"]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Create New Project"
        description="Establish the contract baseline: budget, default hourly rate, deadlines, and core deliverables."
      />

      <NewProjectForm />
    </div>
  );
}

