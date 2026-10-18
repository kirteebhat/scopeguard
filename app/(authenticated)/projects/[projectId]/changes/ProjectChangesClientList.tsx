"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { ChangeRequestItem } from "@/lib/data/change-requests";
import type { ProjectDetail } from "@/lib/data/projects";
import type { ChangeRequestStatus } from "@/lib/domain/stateMachine";
import { formatMinorToCurrency } from "@/lib/domain/money";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  Layers,
  ArrowRight,
  Table as TableIcon,
  Kanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChangeRequestBoardView } from "@/components/changes/ChangeRequestBoardView";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface ProjectChangesClientListProps {
  project: ProjectDetail;
  initialChanges: ChangeRequestItem[];
  canCreate: boolean;
}

export function ProjectChangesClientList({
  project,
  initialChanges,
  canCreate,
}: ProjectChangesClientListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<string>(
    () => searchParams.get("status") || "all"
  );
  const [viewMode, setViewMode] = useState<"table" | "board">("table");

  const updateUrlParams = (newSearch: string, newStatus: string) => {
    const params = new URLSearchParams();
    if (newSearch.trim()) params.set("search", newSearch.trim());
    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    updateUrlParams(value, statusFilter);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    updateUrlParams(search, value);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    router.replace(pathname, { scroll: false });
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    let pendingCount = 0;
    let approvedMinor = 0;

    for (const cr of initialChanges) {
      if (cr.status === "pending_approval") {
        pendingCount++;
      } else if (cr.status === "approved") {
        approvedMinor += cr.costMinor;
      }
    }

    return {
      totalCount: initialChanges.length,
      pendingCount,
      approvedMinor,
    };
  }, [initialChanges]);

  // Filtered List
  const filteredChanges = useMemo(() => {
    return initialChanges.filter((cr) => {
      // Status filter
      if (statusFilter !== "all" && cr.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (search.trim() !== "") {
        const query = search.toLowerCase();
        const matchesTitle = cr.title.toLowerCase().includes(query);
        const matchesDesc = cr.description.toLowerCase().includes(query);
        const matchesDeliv = cr.deliverableTitle?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesDeliv) {
          return false;
        }
      }

      return true;
    });
  }, [initialChanges, search, statusFilter]);

  const getStatusBadge = (status: ChangeRequestStatus) => {
    switch (status) {
      case "draft":
        return <Badge variant="draft">Draft</Badge>;
      case "pending_approval":
        return <Badge variant="pending">Pending Approval</Badge>;
      case "approved":
        return <Badge variant="approved">Approved</Badge>;
      case "rejected":
        return <Badge variant="rejected">Rejected</Badge>;
      case "withdrawn":
        return <Badge variant="default">Withdrawn</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (initialChanges.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8">
          <EmptyState
            icon={<FileText className="w-10 h-10 text-slate-400" />}
            title="No change requests yet"
            description="Create your first client change proposal to negotiate and protect scope modifications."
            action={
              canCreate ? (
                <Link href={`/changes/new?projectId=${project.id}`}>
                  <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} id="createFirstChangeRequestButton">
                    New Change Request
                  </Button>
                </Link>
              ) : undefined
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 3-Card Summary Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <span className="text-xs font-medium text-slate-500 block">Total Change Proposals</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{metrics.totalCount}</p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Recorded scope events</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <span className="text-xs font-medium text-slate-500 block">Pending Client Approval</span>
            <p className="text-xl font-bold text-amber-600 mt-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {metrics.pendingCount}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Active links awaiting sign-off</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <span className="text-xs font-medium text-slate-500 block">Approved Additional Scope</span>
            <p className="text-xl font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {formatMinorToCurrency(metrics.approvedMinor, project.currency)}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Incorporated into project baseline</span>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search proposals by title, deliverable, or scope description..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-9 text-xs"
            id="changeSearchInput"
            aria-label="Search proposals by title or deliverable"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Table vs Board View Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded-md text-xs font-medium transition-colors",
                viewMode === "table"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
              aria-label="Table view"
              title="Table view"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={cn(
                "p-1.5 rounded-md text-xs font-medium transition-colors",
                viewMode === "board"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
              aria-label="Board view"
              title="Board view"
            >
              <Kanban className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 min-w-[150px]">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <Select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="h-9 text-xs py-1"
              id="changeStatusFilter"
              aria-label="Filter proposals by status"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Filtered Content or Zero Matches */}
      {filteredChanges.length === 0 ? (
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="pt-8 pb-8">
            <EmptyState
              icon={<Search className="w-8 h-8 text-slate-400" />}
              title="No matching change requests"
              description="No proposals match your current search query or status filter."
              action={
                <Button
                  variant="secondary"
                  onClick={handleClearFilters}
                  id="resetChangeFilterButton"
                >
                  Clear Filters
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : viewMode === "board" ? (
        <ChangeRequestBoardView
          changes={filteredChanges}
          currency={project.currency}
        />
      ) : (
        <Card className="overflow-hidden dark:bg-slate-900 dark:border-slate-800">
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-850 text-slate-500 dark:text-slate-400 font-medium">
                  <th className="py-3 px-4">Proposal</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Pricing</th>
                  <th className="py-3 px-4">Additional Cost</th>
                  <th className="py-3 px-4">Target Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredChanges.map((cr) => (
                  <tr key={cr.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{cr.title}</span>
                        {cr.currentVersion && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            v{cr.currentVersion}
                          </span>
                        )}
                      </div>
                      {cr.deliverableTitle && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Layers className="w-3 h-3 text-indigo-500" />
                          <span>{cr.deliverableTitle}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(cr.status)}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 capitalize">
                      {cr.pricingMethod === "hourly"
                        ? `${cr.estimatedHours || 0} hrs @ ${
                            cr.hourlyRateMinor
                              ? formatMinorToCurrency(cr.hourlyRateMinor, project.currency)
                              : "—"
                          }`
                        : "Fixed Fee"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {formatMinorToCurrency(cr.costMinor, project.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {cr.proposedDeadline || "No deadline shift"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/changes/${cr.id}`}>
                        <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                          {cr.status === "draft" ? "Edit Draft" : "View Details"}
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Collapsed on mobile, no horizontal overflow) */}
          <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredChanges.map((cr) => (
              <div key={cr.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{cr.title}</span>
                      {cr.currentVersion && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          v{cr.currentVersion}
                        </span>
                      )}
                    </div>
                    {cr.deliverableTitle && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Layers className="w-3 h-3 text-indigo-500" />
                        <span>{cr.deliverableTitle}</span>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">{getStatusBadge(cr.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Pricing Method</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">
                      {cr.pricingMethod === "hourly"
                        ? `${cr.estimatedHours || 0} hrs`
                        : "Fixed Fee"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Additional Cost</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatMinorToCurrency(cr.costMinor, project.currency)}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Proposed Deadline</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {cr.proposedDeadline || "No deadline shift"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Link href={`/changes/${cr.id}`} className="w-full">
                    <Button variant="secondary" size="sm" className="w-full justify-center" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      {cr.status === "draft" ? "Edit Draft" : "View Proposal Details"}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
