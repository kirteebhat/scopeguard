import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/data/projects";
import { getProjectDeliverables } from "@/lib/data/deliverables";
import { getWorkspaceContextOrRedirect } from "@/lib/data/auth-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ProjectSettingsForm } from "./ProjectSettingsForm";
import { DeliverablesManager } from "./DeliverablesManager";
import { ArrowLeft } from "lucide-react";

interface ProjectSettingsPageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({
  params,
}: ProjectSettingsPageProps): Promise<Metadata> {
  const { projectId } = await params;
  try {
    const project = await getProjectById(projectId);
    return {
      title: `${project.name} Settings - ScopeGuard`,
      description: `Manage project settings, deliverable commitments, and baseline contracts for ${project.name}.`,
    };
  } catch {
    return {
      title: "Project Settings - ScopeGuard",
    };
  }
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const { projectId } = await params;
  const context = await getWorkspaceContextOrRedirect();

  let project;
  try {
    project = await getProjectById(projectId);
  } catch {
    notFound();
  }

  const deliverables = await getProjectDeliverables(projectId);
  const canManageDeliverables = context.role === "owner" || context.role === "manager";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title={`Settings: ${project.name}`}
        description={`Manage contractual baselines, client credentials, and deliverable commitments for ${project.clientName}.`}
        actions={
          <Link href={`/projects/${project.id}`}>
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Project
            </Button>
          </Link>
        }
      />

      {/* Main Settings Form */}
      <ProjectSettingsForm project={project} userRole={context.role} />

      {/* Deliverables Management Section */}
      <DeliverablesManager
        projectId={project.id}
        initialDeliverables={deliverables}
        canManage={canManageDeliverables}
      />
    </div>
  );
}
