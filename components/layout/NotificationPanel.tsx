"use client";

import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  FolderKanban,
  Check,
} from "lucide-react";
import Link from "next/link";
import type { ActivityLogItem } from "@/lib/data/activity";

export interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  activities?: ActivityLogItem[];
  onMarkAllAsRead?: () => void;
}

export function NotificationPanel({
  open,
  onClose,
  activities = [],
  onMarkAllAsRead,
}: NotificationPanelProps) {
  // ESC key dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const getActivityIcon = useCallback((action: string) => {
    if (action.includes("approved")) {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
    if (action.includes("rejected")) {
      return <AlertTriangle className="h-4 w-4 text-rose-500" />;
    }
    if (action.includes("project")) {
      return <FolderKanban className="h-4 w-4 text-indigo-500" />;
    }
    return <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />;
  }, []);

  const formatRelativeTime = (timestamp: string) => {
    try {
      const diffMs = Date.now() - new Date(timestamp).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "";
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs"
          />

          {/* Slide-over Drawer */}
          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Notifications & Activity
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Recent workspace events
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onMarkAllAsRead && activities.length > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllAsRead}
                      className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium inline-flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Mark read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close notifications"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Clock className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      All caught up!
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
                      New change requests, approvals, and deliverables will show here.
                    </p>
                  </div>
                ) : (
                  activities.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                    >
                      <div className="mt-0.5 shrink-0 rounded-lg p-1.5 bg-white dark:bg-slate-800 shadow-2xs border border-slate-200/60 dark:border-slate-700/60">
                        {getActivityIcon(item.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {item.action.replace(/_/g, " ")}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {item.actorName || "Workspace member"} performed {item.action.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
                <Link
                  href="/dashboard#activity"
                  onClick={onClose}
                  className="block w-full py-2 text-center text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  View full immutable audit trail &rarr;
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
