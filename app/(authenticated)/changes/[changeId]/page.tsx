import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getChangeRequestById } from "@/lib/data/change-requests";
import { getWorkspaceContextOrRedirect } from "@/lib/data/auth-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChangeRequestForm } from "@/components/changes/ChangeRequestForm";
import { ChangeRequestReadOnlyDetail } from "@/components/changes/ChangeRequestReadOnlyDetail";
import { ArrowLeft } from "lucide-react";

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

          <ChangeRequestForm
            project={changeRequest.project}
            deliverables={changeRequest.deliverables}
            initialData={changeRequest}
            isNew={false}
          />
        </>
      ) : (
        <ChangeRequestReadOnlyDetail
          changeRequest={changeRequest}
          userRole={role}
        />
      )}
    </div>
  );
}

