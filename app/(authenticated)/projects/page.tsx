import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { getWorkspaceProjects } from "@/lib/data/projects";
import { getWorkspaceContextOrRedirect } from "@/lib/data/auth-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { ProjectsClientList } from "./ProjectsClientList";

export const metadata: Metadata = {
  title: "Projects - ScopeGuard",
  description: "View and manage agency projects and client scope baselines.",
};

export default async function ProjectsPage() {
  const { role } = await getWorkspaceContextOrRedirect();
  const projects = await getWorkspaceProjects();
  const canCreate = role === "owner" || role === "manager";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage project baselines, deliverable milestones, and change proposals."
        actions={
          canCreate ? (
            <Link href="/projects/new">
              <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} id="newProjectButton">
                New Project
              </Button>
            </Link>
          ) : undefined
        }
      />

      <ProjectsClientList initialProjects={projects} canCreate={canCreate} />
    </div>
  );
}
