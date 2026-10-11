import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FolderKanban, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Projects - ScopeGuard",
  description: "View and manage agency projects and client scope baselines.",
};

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage project baselines, deliverable milestones, and change proposals."
        actions={
          <Link href="/projects/new">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              New Project
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={<FolderKanban className="w-8 h-8 text-slate-400" />}
            title="No projects found"
            description="Get started by creating a client contract baseline with budget, currency, and deliverable targets."
            action={
              <Link href="/projects/new">
                <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                  Create Project
                </Button>
              </Link>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
