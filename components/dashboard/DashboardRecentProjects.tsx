"use client";

import React from "react";
import Link from "next/link";
import { FolderKanban, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatMinorToCurrency } from "@/lib/domain/money";
import type { DashboardProjectItem } from "@/lib/data/dashboard";

interface DashboardRecentProjectsProps {
  projects: DashboardProjectItem[];
}

export function DashboardRecentProjects({ projects }: DashboardRecentProjectsProps) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-indigo-600" />
            Recently Updated Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-400 py-6 text-center">
            No projects found in this workspace.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusVariant = (status: string): BadgeVariant => {
    switch (status) {
      case "active":
        return "success";
      case "completed":
        return "info";
      case "on_hold":
        return "warning";
      case "archived":
        return "default";
      default:
        return "default";
    }
  };

  const formatRelativeTime = (isoString: string): string => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-indigo-600" />
            Recently Updated Projects
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Active workspace baselines and revised scope rollups
          </p>
        </div>
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700">
            View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {/* Desktop Table View (Hidden on Small Screens) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-slate-500 border-b border-slate-100 font-semibold">
              <tr>
                <th className="py-3 px-4">Project & Client</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Revised Budget</th>
                <th className="py-3 px-3">Revised Deadline</th>
                <th className="py-3 px-3">Pending CRs</th>
                <th className="py-3 px-3">Updated</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => {
                const hasApproved = p.approvedExtraMinor > 0;
                const hasDeltaDays = p.deltaDays > 0;

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-medium">
                      <Link
                        href={`/projects/${p.id}`}
                        className="text-slate-900 hover:text-indigo-600 font-semibold flex items-center gap-1.5"
                      >
                        {p.name}
                      </Link>
                      <span className="text-[11px] text-slate-500 block">
                        {p.clientName}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <Badge variant={getStatusVariant(p.status)} className="capitalize">
                        {p.status.replace("_", " ")}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-900">
                        {formatMinorToCurrency(p.revisedBudgetMinor, p.currency)}
                      </div>
                      {hasApproved && (
                        <span className="text-[10px] text-emerald-600 font-medium">
                          +{formatMinorToCurrency(p.approvedExtraMinor, p.currency)}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="text-slate-800 font-medium">
                        {p.revisedDeadline}
                      </div>
                      {hasDeltaDays && (
                        <span className="text-[10px] text-amber-600 font-medium">
                          +{p.deltaDays}d revised
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      {p.pendingRequestsCount > 0 ? (
                        <Badge variant="pending" showIcon>
                          {p.pendingRequestsCount}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-slate-500">
                      {formatRelativeTime(p.updatedAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/projects/${p.id}`}>
                        <Button variant="secondary" size="sm" className="text-xs h-7 px-2.5">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile-First Card View (Rule 4.2: zero horizontal overflow at 360px viewport width) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {projects.map((p) => {
            const hasApproved = p.approvedExtraMinor > 0;
            const hasDeltaDays = p.deltaDays > 0;

            return (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-sm font-bold text-slate-900 hover:text-indigo-600"
                    >
                      {p.name}
                    </Link>
                    <p className="text-xs text-slate-500">{p.clientName}</p>
                  </div>
                  <Badge variant={getStatusVariant(p.status)} className="capitalize shrink-0">
                    {p.status.replace("_", " ")}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Revised Budget</span>
                    <span className="font-bold text-slate-900">
                      {formatMinorToCurrency(p.revisedBudgetMinor, p.currency)}
                    </span>
                    {hasApproved && (
                      <span className="text-[10px] text-emerald-600 font-medium block">
                        +{formatMinorToCurrency(p.approvedExtraMinor, p.currency)} approved
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">Revised Deadline</span>
                    <span className="font-medium text-slate-800">{p.revisedDeadline}</span>
                    {hasDeltaDays && (
                      <span className="text-[10px] text-amber-600 font-medium block">
                        +{p.deltaDays}d extended
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {p.pendingRequestsCount > 0 && (
                      <Badge variant="pending" showIcon>
                        {p.pendingRequestsCount} Pending
                      </Badge>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {formatRelativeTime(p.updatedAt)}
                    </span>
                  </div>

                  <Link href={`/projects/${p.id}`}>
                    <Button variant="secondary" size="sm" className="text-xs h-7 px-3">
                      Open Project
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
