import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FolderKanban, FileText, CheckCircle2, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard - ScopeGuard",
  description: "ScopeGuard agency dashboard and active projects overview.",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Monitor active projects, draft change requests, and client approval statuses."
        actions={
          <Link href="/projects/new">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              New Project
            </Button>
          </Link>
        }
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Projects
            </CardTitle>
            <FolderKanban className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">0</div>
            <p className="text-xs text-slate-500 mt-1">Currently managed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Client Approvals
            </CardTitle>
            <FileText className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">0</div>
            <p className="text-xs text-slate-500 mt-1">Awaiting client decision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Approved Change Budget
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">$0.00</div>
            <p className="text-xs text-slate-500 mt-1">From immutable snapshots</p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State Card */}
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={<FolderKanban className="w-8 h-8 text-slate-400" />}
            title="No projects configured yet"
            description="Create your first client project to establish baseline deliverable budgets and start issuing change orders."
            action={
              <Link href="/projects/new">
                <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                  Create your first project
                </Button>
              </Link>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
