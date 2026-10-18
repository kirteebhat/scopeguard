"use client";

import React from "react";
import Link from "next/link";
import { formatMinorToCurrency } from "@/lib/domain/money";
import type { ChangeRequestItem } from "@/lib/data/change-requests";
import type { ChangeRequestStatus } from "@/lib/domain/stateMachine";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Layers,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChangeRequestBoardViewProps {
  changes: ChangeRequestItem[];
  currency: string;
}

interface ColumnConfig {
  status: ChangeRequestStatus;
  label: string;
  badgeClass: string;
  borderClass: string;
  headerIcon: React.ReactNode;
}

const BOARD_COLUMNS: ColumnConfig[] = [
  {
    status: "draft",
    label: "Draft",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    borderClass: "border-t-slate-400 dark:border-t-slate-500",
    headerIcon: <FileText className="h-4 w-4 text-slate-500" />,
  },
  {
    status: "pending_approval",
    label: "Pending Review",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    borderClass: "border-t-amber-500",
    headerIcon: <Clock className="h-4 w-4 text-amber-500" />,
  },
  {
    status: "approved",
    label: "Approved",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    borderClass: "border-t-emerald-500",
    headerIcon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  },
  {
    status: "rejected",
    label: "Rejected",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
    borderClass: "border-t-rose-500",
    headerIcon: <XCircle className="h-4 w-4 text-rose-500" />,
  },
  {
    status: "withdrawn",
    label: "Withdrawn",
    badgeClass: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    borderClass: "border-t-slate-300 dark:border-t-slate-600",
    headerIcon: <Ban className="h-4 w-4 text-slate-400" />,
  },
];

export function ChangeRequestBoardView({
  changes,
  currency,
}: ChangeRequestBoardViewProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin">
      {BOARD_COLUMNS.map((col) => {
        const columnItems = changes.filter((cr) => cr.status === col.status);
        const columnTotal = columnItems.reduce((acc, cr) => acc + (cr.costMinor || 0), 0);

        return (
          <div
            key={col.status}
            className={cn(
              "flex flex-col w-72 sm:w-80 shrink-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 border-t-4 p-3 shadow-xs",
              col.borderClass
            )}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                {col.headerIcon}
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {col.label}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                    col.badgeClass
                  )}
                >
                  {columnItems.length}
                </span>
              </div>
              <span className="text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-400">
                {formatMinorToCurrency(columnTotal, currency)}
              </span>
            </div>

            {/* Cards Area */}
            <div className="space-y-3 flex-1 min-h-[160px]">
              {columnItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center p-4">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    No {col.label.toLowerCase()} proposals
                  </p>
                </div>
              ) : (
                columnItems.map((cr) => (
                  <Link
                    key={cr.id}
                    href={`/changes/${cr.id}`}
                    className="block group"
                  >
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 p-3.5 shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                      {/* Title & Version */}
                      <div className="flex items-start justify-between gap-1.5">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                          {cr.title}
                        </h4>
                        {cr.currentVersion && (
                          <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                            v{cr.currentVersion}
                          </span>
                        )}
                      </div>

                      {/* Deliverable Linkage */}
                      {cr.deliverableTitle && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          <Layers className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span className="truncate">{cr.deliverableTitle}</span>
                        </div>
                      )}

                      {/* Cost and Deadline */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                          {formatMinorToCurrency(cr.costMinor, currency)}
                        </div>
                        {cr.proposedDeadline ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <Calendar className="h-3 w-3" />
                            <span>{cr.proposedDeadline}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Fixed</span>
                        )}
                      </div>

                      {/* Arrow Footer */}
                      <div className="mt-2 flex items-center justify-end text-[10px] font-medium text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Details</span>
                        <ArrowRight className="h-3 w-3 ml-0.5" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
