"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { type ProjectListItem, type ProjectStatus } from "@/lib/data/projects";
import { formatMinorToCurrency } from "@/lib/domain/money";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import {
  Search,
  Filter,
  ArrowUpDown,
  FolderKanban,
  Calendar,
  ArrowRight,
  TrendingUp,
  FileQuestion,
  Plus,
} from "lucide-react";

interface ProjectsClientListProps {
  initialProjects: ProjectListItem[];
  canCreate: boolean;
}

type SortOption = "newest" | "deadline_asc" | "deadline_desc" | "name_asc" | "budget_desc";

export function ProjectsClientList({ initialProjects, canCreate }: ProjectsClientListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const filteredProjects = useMemo(() => {
    return initialProjects
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(search.toLowerCase().trim()) ||
          p.clientName.toLowerCase().includes(search.toLowerCase().trim());

        const matchesStatus = statusFilter === "all" || p.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "deadline_asc":
            return (a.revisedDeadline || a.originalDeadline).localeCompare(
              b.revisedDeadline || b.originalDeadline
            );
          case "deadline_desc":
            return (b.revisedDeadline || b.originalDeadline).localeCompare(
              a.revisedDeadline || a.originalDeadline
            );
          case "name_asc":
            return a.name.localeCompare(b.name);
          case "budget_desc":
            return b.revisedBudgetMinor - a.revisedBudgetMinor;
          case "newest":
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [initialProjects, search, statusFilter, sortBy]);

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "completed":
        return <Badge variant="info">Completed</Badge>;
      case "on_hold":
        return <Badge variant="warning">On Hold</Badge>;
      case "archived":
        return <Badge variant="default">Archived</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  if (initialProjects.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8">
          <EmptyState
            icon={<FolderKanban className="w-10 h-10 text-slate-400" />}
            title="No projects yet"
            description="Create your first client contract baseline with budget, currency, and deliverable targets."
            action={
              canCreate ? (
                <Link href="/projects/new">
                  <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
                    Create Project
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
    <div className="space-y-4">
      {/* Search, Filter, Sort Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search projects or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
            id="projectSearchInput"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 min-w-[140px]">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs py-1"
              id="projectStatusFilter"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
          </div>

          <div className="flex items-center gap-1.5 min-w-[150px]">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-9 text-xs py-1"
              id="projectSortBy"
            >
              <option value="newest">Newest First</option>
              <option value="deadline_asc">Deadline (Earliest)</option>
              <option value="deadline_desc">Deadline (Latest)</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="budget_desc">Budget (Highest)</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Zero matches state */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8">
            <EmptyState
              icon={<Search className="w-8 h-8 text-slate-400" />}
              title="No matching projects"
              description="No projects match your current search query or status filter."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        /* Project Cards Grid / Table */
        <div className="grid grid-cols-1 gap-3.5">
          {filteredProjects.map((project) => {
            const hasApprovedExtra = project.approvedExtraMinor > 0;
            const hasExtendedDeadline = project.deltaDays > 0;
            const hasPending = project.pendingRequestsCount > 0;

            return (
              <div
                key={project.id}
                className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Project identity & client */}
                <div className="space-y-1.5 min-w-0 md:max-w-md">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-base font-semibold text-slate-900 hover:text-indigo-600 transition-colors truncate"
                    >
                      {project.name}
                    </Link>
                    {getStatusBadge(project.status)}
                    {hasPending && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <FileQuestion className="w-3 h-3" />
                        {project.pendingRequestsCount} Pending Proposal
                        {project.pendingRequestsCount > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-2">
                    <span>Client: <strong className="text-slate-700 font-medium">{project.clientName}</strong></span>
                    <span>•</span>
                    <span>Currency: <strong className="text-slate-700 font-medium">{project.currency}</strong></span>
                  </p>
                </div>

                {/* Center / Financials */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs shrink-0 py-2 md:py-0 border-y md:border-y-0 border-slate-100">
                  {/* Budget */}
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Original Budget</span>
                    <span className="font-semibold text-slate-800 text-sm">
                      {formatMinorToCurrency(project.budgetMinor, project.currency)}
                    </span>
                    {hasApprovedExtra && (
                      <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5 mt-0.5">
                        <TrendingUp className="w-3 h-3" />
                        +{formatMinorToCurrency(project.approvedExtraMinor, project.currency)}
                      </span>
                    )}
                  </div>

                  {/* Revised Total */}
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">Revised Total</span>
                    <span className="font-bold text-slate-950 text-sm">
                      {formatMinorToCurrency(project.revisedBudgetMinor, project.currency)}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {hasApprovedExtra ? "Includes approved changes" : "Baseline"}
                    </span>
                  </div>

                  {/* Timeline */}
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-slate-400 block font-medium">Deadline</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 text-sm">
                        {project.revisedDeadline || project.originalDeadline}
                      </span>
                      {hasExtendedDeadline && (
                        <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded">
                          +{project.deltaDays}d
                        </span>
                      )}
                    </div>
                    {hasExtendedDeadline ? (
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Orig: {project.originalDeadline}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 block mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> On Track
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: View Button */}
                <div className="flex items-center justify-end">
                  <Link href={`/projects/${project.id}`}>
                    <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
