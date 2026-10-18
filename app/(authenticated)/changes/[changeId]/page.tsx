import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChangeRequestById } from "@/lib/data/change-requests";
import { getChangeRequestActivityLogs } from "@/lib/data/activity";
import { getWorkspaceContextOrRedirect } from "@/lib/data/auth-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChangeRequestForm } from "@/components/changes/ChangeRequestForm";
import { ChangeRequestReadOnlyDetail } from "@/components/changes/ChangeRequestReadOnlyDetail";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { ArrowLeft, Compass } from "lucide-react";

interface ChangeDetailPageProps {
  params: Promise<{ changeId: string }>;
}

export async function generateMetadata({
  params,
}: ChangeDetailPageProps): Promise<Metadata> {
  const { changeId } = await params;
  try {
    const changeRequest = await getChangeRequestById(changeId);
    return {
      title: `${changeRequest.title} - ScopeGuard`,
      description: `Change proposal details for ${changeRequest.project.name}.`,
    };
  } catch {
    return {
      title: "Change Request - ScopeGuard",
    };
  }
}

export default async function ChangeDetailPage({ params }: ChangeDetailPageProps) {
  const { changeId } = await params;
  const { role } = await getWorkspaceContextOrRedirect();

  let changeRequest;
  try {
    changeRequest = await getChangeRequestById(changeId);
  } catch {
    notFound();
  }

  const isDraft = changeRequest.status === "draft";
  const activities = await getChangeRequestActivityLogs(changeId);

  return (
    <div className="space-y-6">
      {isDraft ? (
        <>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link
              href={`/projects/${changeRequest.projectId}/changes`}
              className="hover:text-indigo-600 flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Change Requests</span>
            </Link>
          </div>

          <PageHeader
            title="Edit Change Request Draft"
            description={`Working draft for ${changeRequest.project.name}. Changes remain uncommitted until submitted and approved.`}
          />

          {/* Draft Next Action Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                    Draft In Progress
                  </span>
                  <h3 className="text-xs font-bold text-slate-900">Preview &amp; Submit for Client Approval</h3>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Refine the scope description, assign an affected deliverable, and set pricing. When ready, click &quot;Submit for Approval&quot; to generate the client sign-off link.
                </p>
              </div>
            </div>
          </div>

          <ChangeRequestForm
            project={changeRequest.project}
            deliverables={changeRequest.deliverables}
            initialData={changeRequest}
            isNew={false}
          />

          <ActivityFeed activities={activities} title="Draft History & Activity" />
        </>
      ) : (
        <ChangeRequestReadOnlyDetail
          changeRequest={changeRequest}
          userRole={role}
          activities={activities}
        />
      )}
    </div>
  );
}

