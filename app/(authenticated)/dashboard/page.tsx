import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import {
  DashboardMetricsGrid,
  DashboardRecentProjects,
  DashboardEmptyWorkspace,
} from "@/components/dashboard";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { getDashboardData } from "@/lib/data/dashboard";
import { Plus, FileEdit } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard - ScopeGuard",
  description: "ScopeGuard agency dashboard, live metrics, and scope change management.",
};

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Monitor active projects, draft change requests, and client approval statuses."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {data.hasProjects && (
              <Link href="/changes/new">
                <Button
                  variant="secondary"
                  size="md"
                  leftIcon={<FileEdit className="w-4 h-4" />}
                >
                  New Change Request
                </Button>
              </Link>
            )}

            <Link href="/projects/new">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                New Project
              </Button>
            </Link>
          </div>
        }
      />

      {!data.hasProjects ? (
        /* Brand New Workspace Empty State */
        <div className="space-y-6">
          <DashboardEmptyWorkspace />
          {data.recentActivity.length > 0 && (
            <ActivityFeed
              activities={data.recentActivity}
              title="Workspace Activity"
              emptyMessage="No activity recorded yet in this workspace."
            />
          )}
        </div>
      ) : (
        /* Active Workspace Dashboard with Real Metrics */
        <div className="space-y-6">
          {/* Key Metrics & Multi-Currency Approved Charges */}
          <DashboardMetricsGrid metrics={data.metrics} />

          {/* 2-Column Responsive Layout: Projects & Audit Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DashboardRecentProjects projects={data.recentProjects} />
            </div>

            <div className="lg:col-span-1">
              <ActivityFeed
                activities={data.recentActivity}
                title="Recent Activity"
                emptyMessage="No recent activity in this workspace."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
