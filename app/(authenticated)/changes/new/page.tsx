import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { getProjectById, getWorkspaceProjects } from "@/lib/data/projects";
import { getProjectDeliverables } from "@/lib/data/deliverables";
import { getWorkspaceContextOrRedirect } from "@/lib/data/auth-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChangeRequestForm } from "@/components/changes/ChangeRequestForm";
import { Plus, ArrowLeft, FolderKanban } from "lucide-react";

export const metadata: Metadata = {
  title: "New Change Request - ScopeGuard",
  description: "Draft a new client change proposal with live impact calculation.",
};

interface NewChangePageProps {
  searchParams: Promise<{ projectId?: string }>;
}

export default async function NewChangePage({ searchParams }: NewChangePageProps) {
  const { projectId } = await searchParams;
  await getWorkspaceContextOrRedirect();

  const workspaceProjects = await getWorkspaceProjects();

  if (workspaceProjects.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="New Change Request"
          description="Create a client-approved scope change order."
        />
        <Card>
          <CardContent className="pt-8 pb-8">
            <EmptyState
              icon={<FolderKanban className="w-10 h-10 text-slate-400" />}
              title="No projects found"
              description="A project contract baseline is required before creating scope change requests."
              action={
                <Link href="/projects/new">
                  <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                    Create Project First
                  </Button>
                </Link>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine active target project
  const targetProjectId = projectId || workspaceProjects[0].id;
  const project = await getProjectById(targetProjectId);
  const deliverables = await getProjectDeliverables(targetProjectId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link
          href={`/projects/${project.id}/changes`}
          className="hover:text-indigo-600 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Change Requests</span>
        </Link>
      </div>

      <PageHeader
        title="Draft Change Request"
        description={`Propose a commercial scope adjustment for ${project.name} (${project.clientName}).`}
      />

      <ChangeRequestForm
        project={project}
        deliverables={deliverables}
        isNew={true}
      />
    </div>
  );
}
