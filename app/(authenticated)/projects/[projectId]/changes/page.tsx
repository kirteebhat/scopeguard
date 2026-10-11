import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/data/projects";
import { getProjectChangeRequests } from "@/lib/data/change-requests";
import { getWorkspaceContextOrRedirect } from "@/lib/data/auth-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Plus, ArrowLeft, Settings } from "lucide-react";
import { ProjectChangesClientList } from "./ProjectChangesClientList";

interface ProjectChangesPageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({
  params,
}: ProjectChangesPageProps): Promise<Metadata> {
  const { projectId } = await params;
  try {
    const project = await getProjectById(projectId);
    return {
      title: `Change Requests - ${project.name} - ScopeGuard`,
      description: `Review and propose scope modifications for ${project.clientName}.`,
    };
  } catch {
    return {
      title: "Change Requests - ScopeGuard",
    };
  }
}

export default async function ProjectChangesPage({ params }: ProjectChangesPageProps) {
  const { projectId } = await params;
  await getWorkspaceContextOrRedirect();

  let project;
  try {
    project = await getProjectById(projectId);
  } catch {
    notFound();
  }

  const changeRequests = await getProjectChangeRequests(projectId);
  const canCreate = true; // All roles (owner, manager, member) can create drafts per DECISIONS.md

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href={`/projects/${project.id}`} className="hover:text-indigo-600 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {project.name}</span>
        </Link>
      </div>

      <PageHeader
        title="Scope Change Requests"
        description={`Commercial scope modifications, additional billing proposals, and deadline extensions for ${project.clientName}.`}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/projects/${project.id}/settings`}>
              <Button variant="ghost" size="sm" leftIcon={<Settings className="w-4 h-4" />}>
                Project Settings
              </Button>
            </Link>
            <Link href={`/changes/new?projectId=${project.id}`}>
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} id="newChangeRequestButton">
                New Change Request
              </Button>
            </Link>
          </div>
        }
      />

      <ProjectChangesClientList
        project={project}
        initialChanges={changeRequests}
        canCreate={canCreate}
      />
    </div>
  );
}
