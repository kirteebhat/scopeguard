"use client";

import React from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Ban,
  FolderPlus,
  Edit3,
  Globe,
  User,
  Clock,
} from "lucide-react";
import { formatMinorToCurrency } from "@/lib/domain/money";
import type { ActivityLogItem } from "@/lib/data/activity";

interface ActivityFeedProps {
  activities: ActivityLogItem[];
  title?: string;
  emptyMessage?: string;
}

export function ActivityFeed({
  activities,
  title = "Activity & Audit Trail",
  emptyMessage = "No activity recorded yet.",
}: ActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="py-8 text-center text-xs text-slate-400">
          <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300" />
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          {title} ({activities.length})
        </h3>
        <span className="text-[11px] text-slate-400">Immutable audit log</span>
      </div>

      <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {activities.map((log) => {
          const config = getActionConfig(log);
          const actorDisplay = formatActor(log);
          const relativeTime = getRelativeTime(log.createdAt);
          const absoluteTime = new Date(log.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          });

          return (
            <div key={log.id} className="relative group text-xs">
              {/* Timeline marker icon */}
              <div
                className={`absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full border bg-white ${config.iconBg} ${config.iconColor}`}
                title={config.label}
              >
                {config.icon}
              </div>

              <div className="flex flex-col">
                <div className="text-slate-700 leading-relaxed">
                  <span className="font-semibold text-slate-900 mr-1.5 inline-flex items-center gap-1">
                    {log.actorType === "client_link" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70 font-semibold text-[11px]">
                        <Globe className="w-3 h-3 text-emerald-600 shrink-0" />
                        {actorDisplay}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 font-semibold text-[11px]">
                        <User className="w-3 h-3 text-slate-500 shrink-0" />
                        {actorDisplay}
                      </span>
                    )}
                  </span>
                  <span className="text-slate-700">{config.sentence}</span>
                </div>

                {/* Timestamp on clean, roomier second line below */}
                <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-300 shrink-0" />
                  <span>{relativeTime}</span>
                  <span className="text-slate-300">•</span>
                  <span title={absoluteTime}>{absoluteTime}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Formats actor strictly per requirement:
 * - Client: "Client (name provided: X)"
 * - User: "Full Name" or email
 * - System: "System"
 */
function formatActor(log: ActivityLogItem): string {
  if (log.actorType === "client_link") {
    const declaredName = log.actorName ? log.actorName.trim() : "Client Representative";
    return `Client (name provided: ${declaredName})`;
  }

  if (log.actorType === "user") {
    return log.actorName ? log.actorName.trim() : "Team Member";
  }

  return "System";
}

/**
 * Returns human-readable sentence and icon styling per action type.
 */
function getActionConfig(log: ActivityLogItem): {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  sentence: React.ReactNode;
} {
  const meta = log.metadata || {};

  switch (log.action) {
    case "project_created":
      return {
        icon: <FolderPlus className="w-3 h-3" />,
        iconBg: "border-indigo-200 bg-indigo-50",
        iconColor: "text-indigo-600",
        label: "Project Created",
        sentence: (
          <>
            created project{" "}
            <strong>{String(meta.projectName || meta.name || "Project")}</strong>
            {meta.budgetMinor !== undefined && meta.currency ? (
              <>
                {" "}with baseline budget{" "}
                <span className="font-semibold text-slate-900">
                  {formatMinorToCurrency(Number(meta.budgetMinor), String(meta.currency))}
                </span>
              </>
            ) : null}
            .
          </>
        ),
      };

    case "project_updated":
      return {
        icon: <Edit3 className="w-3 h-3" />,
        iconBg: "border-slate-200 bg-slate-50",
        iconColor: "text-slate-600",
        label: "Project Updated",
        sentence: <>updated project parameters and settings.</>,
      };

    case "change_request_created":
      return {
        icon: <FileText className="w-3 h-3" />,
        iconBg: "border-blue-200 bg-blue-50",
        iconColor: "text-blue-600",
        label: "Draft Created",
        sentence: (
          <>
            created draft change request{" "}
            <strong>{String(meta.title || "Change Request")}</strong>
            {meta.costMinor !== undefined ? (
              <>
                {" "}with estimated cost{" "}
                <span className="font-semibold text-slate-900">
                  {formatMinorToCurrency(Number(meta.costMinor), String(meta.currency || "USD"))}
                </span>
              </>
            ) : null}
            .
          </>
        ),
      };

    case "change_request_updated":
      return {
        icon: <Edit3 className="w-3 h-3" />,
        iconBg: "border-slate-200 bg-slate-50",
        iconColor: "text-slate-600",
        label: "Draft Updated",
        sentence: (
          <>
            updated draft change request{" "}
            <strong>{String(meta.title || "Change Request")}</strong>.
          </>
        ),
      };

    case "change_request_published":
      return {
        icon: <Send className="w-3 h-3" />,
        iconBg: "border-indigo-200 bg-indigo-50",
        iconColor: "text-indigo-600",
        label: "Proposal Published",
        sentence: (
          <>
            published Version {String(meta.version_number || "1")} for client sign-off
            {meta.cost_minor !== undefined || meta.costMinor !== undefined ? (
              <>
                {" "}valued at{" "}
                <span className="font-semibold text-slate-900">
                  {formatMinorToCurrency(
                    Number(meta.cost_minor ?? meta.costMinor),
                    String(meta.currency || "USD")
                  )}
                </span>
              </>
            ) : null}
            .
          </>
        ),
      };

    case "approval_token_regenerated":
      return {
        icon: <RefreshCw className="w-3 h-3" />,
        iconBg: "border-amber-200 bg-amber-50",
        iconColor: "text-amber-600",
        label: "Link Regenerated",
        sentence: (
          <>
            revoked previous client link and generated a new link for Version{" "}
            {String(meta.version_number || "1")}.
          </>
        ),
      };

    case "change_request_revised":
      return {
        icon: <RefreshCw className="w-3 h-3" />,
        iconBg: "border-amber-200 bg-amber-50",
        iconColor: "text-amber-600",
        label: "Proposal Revised",
        sentence: (
          <>
            revised pending proposal back to draft (active client link revoked).
          </>
        ),
      };

    case "change_request_withdrawn":
      return {
        icon: <Ban className="w-3 h-3" />,
        iconBg: "border-slate-300 bg-slate-100",
        iconColor: "text-slate-500",
        label: "Proposal Withdrawn",
        sentence: (
          <>withdrew proposal (client link revoked permanently).</>
        ),
      };

    case "change_request_approved":
      return {
        icon: <CheckCircle2 className="w-3 h-3" />,
        iconBg: "border-emerald-200 bg-emerald-50",
        iconColor: "text-emerald-600",
        label: "Proposal Approved",
        sentence: (
          <>
            approved scope modification Version {String(meta.version_number || "1")}
            {meta.cost_minor !== undefined ? (
              <>
                {" "}for{" "}
                <span className="font-semibold text-emerald-700">
                  {formatMinorToCurrency(Number(meta.cost_minor), String(meta.currency || "USD"))}
                </span>
              </>
            ) : null}
            .
          </>
        ),
      };

    case "change_request_rejected":
      return {
        icon: <XCircle className="w-3 h-3" />,
        iconBg: "border-rose-200 bg-rose-50",
        iconColor: "text-rose-600",
        label: "Proposal Declined",
        sentence: (
          <>declined scope modification Version {String(meta.version_number || "1")}.</>
        ),
      };

    default:
      return {
        icon: <FileText className="w-3 h-3" />,
        iconBg: "border-slate-200 bg-slate-50",
        iconColor: "text-slate-600",
        label: "Activity",
        sentence: <>{log.action.replace(/_/g, " ")}.</>,
      };
  }
}

/**
 * Calculates human-friendly relative time.
 */
function getRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 45) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

