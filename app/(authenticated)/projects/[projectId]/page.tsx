import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectById } from "@/lib/data/projects";
import { getProjectDeliverables } from "@/lib/data/deliverables";
import { getProjectChangeRequests } from "@/lib/data/change-requests";
import { getWorkspaceContextOrRedirect } from "@/lib/data/auth-context";
import { formatMinorToCurrency } from "@/lib/domain/money";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectImpactCard } from "@/components/projects/ProjectImpactCard";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { getProjectActivityLogs } from "@/lib/data/activity";
import {
  Settings,
  Layers,
  FileText,
  ArrowRight,
  Plus,
  Download,
  Compass,
} from "lucide-react";

interface ProjectDetailPageProps {
  params: Promise<{ projectId: string }>;
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { projectId } = await params;
  try {
    const project = await getProjectById(projectId);
    return {
      title: `${project.name} - ScopeGuard`,
      description: `Contract scope and budget baseline for ${project.clientName}.`,
    };
  } catch {
    return {
      title: "Project Detail - ScopeGuard",
    };
  }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
  await getWorkspaceContextOrRedirect();

  let project;
  try {
    project = await getProjectById(projectId);
  } catch {
    notFound();
  }

  const deliverables = await getProjectDeliverables(projectId);
  const changeRequests = await getProjectChangeRequests(projectId);
  const activities = await getProjectActivityLogs(projectId);

  // Next action computation based on project & change request states
  const pendingCount = changeRequests.filter((c) => c.status === "pending_approval").length;
  const draftCount = changeRequests.filter((c) => c.status === "draft").length;

  let nextAction: { title: string; description: string; href: string; label: string } | null = null;
  if (deliverables.length === 0) {
    nextAction = {
      title: "Add Contract Deliverables",
      description: "Define baseline deliverables agreed in the statement of work to easily detect scope creep.",
      href: `/projects/${project.id}/settings`,
      label: "Add Deliverables",
    };
  } else if (pendingCount > 0) {
    nextAction = {
      title: `${pendingCount} Proposal${pendingCount > 1 ? "s" : ""} Pending Client Sign-off`,
      description: "Client approval links are currently active. Review proposals or resend links to secure client decision.",
      href: `/projects/${project.id}/changes`,
      label: "Review Pending Proposals",
    };
  } else if (draftCount > 0) {
    nextAction = {
      title: "Draft Change Request in Progress",
      description: "You have unsubmitted change orders. Finalize scope details and publish client proposal links.",
      href: `/projects/${project.id}/changes`,
      label: "Review Drafts",
    };
  } else {
    nextAction = {
      title: "Scope Baseline Protected",
      description: "All change orders are resolved. When new client requests emerge, create a change request before beginning unbilled work.",
      href: `/changes/new?projectId=${project.id}`,
      label: "New Change Request",
    };
  }

  const getDeliverableStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "in_progress":
        return <Badge variant="info">In Progress</Badge>;
      case "cancelled":
        return <Badge variant="default">Cancelled</Badge>;
      case "pending":
      default:
        return <Badge variant="warning">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={project.name}
        description={`Client: ${project.clientName} • Currency: ${project.currency} • Start Date: ${project.startDate}`}
        actions={
          <div className="flex items-center gap-2">
            <a
              href={`/api/projects/${project.id}/export-csv`}
              download
              className="inline-flex"
              id="exportProjectCsvButton"
            >
              <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />}>
                Export CSV
              </Button>
            </a>
            <Link href={`/projects/${project.id}/changes`}>
              <Button variant="ghost" size="sm" leftIcon={<FileText className="w-4 h-4" />}>
                Change Orders ({changeRequests.length})
              </Button>
            </Link>
            <Link href={`/changes/new?projectId=${project.id}`}>
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                New Change
              </Button>
            </Link>
            <Link href={`/projects/${project.id}/settings`}>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Settings className="w-4 h-4" />}
                id="projectSettingsButton"
              >
                Project Settings
              </Button>
            </Link>
          </div>
        }
      />

      {/* Contextual Next Action Prompt */}
      {nextAction && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/40 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                  Recommended Next Step
                </span>
                <h3 className="text-xs font-bold text-slate-900">{nextAction.title}</h3>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {nextAction.description}
              </p>
            </div>
          </div>
          <Link href={nextAction.href} className="shrink-0">
            <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              {nextAction.label}
            </Button>
          </Link>
        </div>
      )}

      {/* Project Impact Card (Pillars for Contract Value, Approved Changes, Estimates Pending) */}
      <ProjectImpactCard project={project} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scope & Deliverables (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deliverables Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Contract Deliverables ({deliverables.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Agreed deliverables defined in the initial statement of work.
                </CardDescription>
              </div>
              <Link href={`/projects/${project.id}/settings`}>
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Manage
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {deliverables.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">No deliverables added to this project yet.</p>
                  <Link href={`/projects/${project.id}/settings`}>
                    <Button variant="secondary" size="sm" className="mt-3">
                      Add Deliverable
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {deliverables.map((del) => (
                    <div key={del.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900">{del.title}</p>
                        {del.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{del.description}</p>
                        )}
                      </div>
                      <div className="shrink-0">{getDeliverableStatusBadge(del.status)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change Requests Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Scope Change Requests
                </CardTitle>
                <CardDescription className="text-xs">
                  Formal client proposals capturing out-of-scope tasks, budget additions, and timeline adjustments.
                </CardDescription>
              </div>
              {changeRequests.length > 0 && (
                <Link href={`/projects/${project.id}/changes`}>
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    View All ({changeRequests.length})
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent className="pt-2 pb-6">
              {changeRequests.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-8 h-8 text-slate-400" />}
                  title="No change requests yet"
                  description="When client requirements expand beyond this baseline, create a formal scope proposal to compute cost, extend deadlines, and secure client sign-off."
                  action={
                    <Link href={`/changes/new?projectId=${project.id}`}>
                      <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                        Create Change Request
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {changeRequests.slice(0, 5).map((cr) => (
                    <div key={cr.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div className="min-w-0">
                        <Link href={`/changes/${cr.id}`} className="font-semibold text-slate-900 hover:text-indigo-600">
                          {cr.title}
                        </Link>
                        {cr.deliverableTitle && (
                          <p className="text-slate-500 text-[11px] mt-0.5">
                            Target: {cr.deliverableTitle}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-slate-800">
                          {formatMinorToCurrency(cr.costMinor, project.currency)}
                        </span>
                        <Badge
                          variant={
                            cr.status === "approved"
                              ? "approved"
                              : cr.status === "pending_approval"
                              ? "pending"
                              : cr.status === "rejected"
                              ? "rejected"
                              : "default"
                          }
                        >
                          {cr.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Baseline Details & Terms (1 col) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-900">Contract Baseline</CardTitle>
              <CardDescription className="text-xs">Fixed parameters from original contract.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold text-slate-800 capitalize">{project.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Currency</span>
                <span className="font-semibold text-slate-800">{project.currency}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Default Hourly Rate</span>
                <span className="font-semibold text-slate-800">
                  {formatMinorToCurrency(project.hourlyRateMinor, project.currency)}/hr
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Contract Start Date</span>
                <span className="font-semibold text-slate-800">{project.startDate}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Contract Deadline</span>
                <span className="font-semibold text-slate-800">{project.originalDeadline}</span>
              </div>

              {project.description && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-500 block font-medium mb-1">Scope Description:</span>
                  <p className="text-slate-700 text-xs leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {project.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity & Audit Trail Feed */}
          <ActivityFeed activities={activities} title="Project Activity & Audit Trail" />
        </div>
      </div>
    </div>
  );
}
