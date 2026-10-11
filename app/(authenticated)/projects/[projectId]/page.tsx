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
import {
  Settings,
  Layers,
  TrendingUp,
  FileText,
  ArrowRight,
  Plus,
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
  console.log("[ProjectDetailPage] Rendering with projectId:", projectId);
  await getWorkspaceContextOrRedirect();

  let project;
  try {
    project = await getProjectById(projectId);
  } catch {
    notFound();
  }

  const deliverables = await getProjectDeliverables(projectId);
  const changeRequests = await getProjectChangeRequests(projectId);
  const hasApprovedExtra = project.approvedExtraMinor > 0;
  const hasExtendedDeadline = project.deltaDays > 0;

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

      {/* Financial & Timeline Metrics Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Original Budget */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <span className="text-xs font-medium text-slate-500 block">Original Budget</span>
            <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              {formatMinorToCurrency(project.budgetMinor, project.currency)}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Contract baseline</span>
          </CardContent>
        </Card>

        {/* Approved Changes */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <span className="text-xs font-medium text-slate-500 block">Approved Additional</span>
            <p className="text-lg sm:text-xl font-bold text-emerald-600 mt-1 flex items-center gap-1">
              {hasApprovedExtra && <TrendingUp className="w-4 h-4" />}
              {formatMinorToCurrency(project.approvedExtraMinor, project.currency)}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {project.financialRollup.approvedVersionsCount} approved proposal
              {project.financialRollup.approvedVersionsCount === 1 ? "" : "s"}
            </span>
          </CardContent>
        </Card>

        {/* Revised Total Budget */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <span className="text-xs font-medium text-slate-500 block">Revised Total</span>
            <p className="text-lg sm:text-xl font-bold text-indigo-950 mt-1">
              {formatMinorToCurrency(project.revisedBudgetMinor, project.currency)}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {hasApprovedExtra ? "Baseline + Approved Changes" : "No approved changes"}
            </span>
          </CardContent>
        </Card>

        {/* Revised Deadline */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <span className="text-xs font-medium text-slate-500 block">Revised Deadline</span>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-lg sm:text-xl font-bold text-slate-900">
                {project.revisedDeadline || project.originalDeadline}
              </p>
              {hasExtendedDeadline && (
                <span className="text-xs font-semibold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded">
                  +{project.deltaDays}d
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {hasExtendedDeadline
                ? `Extended from ${project.originalDeadline}`
                : "Contractual delivery date"}
            </span>
          </CardContent>
        </Card>
      </div>

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
        </div>
      </div>
    </div>
  );
}
