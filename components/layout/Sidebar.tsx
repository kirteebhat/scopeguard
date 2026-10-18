"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  Shield,
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Team", href: "/settings/team", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

export interface SidebarProps {
  workspaceName?: string;
  userEmail?: string;
  userRole?: string;
  onLogout?: () => void;
  className?: string;
}

export function Sidebar({
  workspaceName = "Acme Agency",
  userEmail = "founder@acme.agency",
  userRole = "owner",
  onLogout,
  className,
}: SidebarProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-screen select-none transition-all duration-200 ease-in-out relative",
        isCollapsed ? "w-18" : "w-64",
        className
      )}
    >
      {/* Brand & Workspace */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col items-stretch">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-150">
                <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white block leading-tight truncate">
                  ScopeGuard
                </span>
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
                  B2B Scope Platform
                </span>
              </div>
            )}
          </div>

          {/* Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Workspace Pill */}
        {!isCollapsed && (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 border border-slate-200/60 dark:border-slate-700/60 mt-1 transition-all duration-150">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
              {workspaceName}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60">
              {userRole}
            </span>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2.5 py-4 space-y-1" aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "relative flex items-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-[0.98]",
                isCollapsed
                  ? "justify-center p-2.5"
                  : "gap-3 px-3 py-2",
                isActive
                  ? "text-indigo-700 dark:text-indigo-300 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={shouldReduceMotion ? undefined : "sidebar-active-pill"}
                  className="absolute inset-0 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100/60 dark:border-indigo-800/60"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "relative z-10 w-4 h-4 shrink-0 transition-colors",
                  isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
                )}
              />
              {!isCollapsed && <span className="relative z-10 truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Section & Logout */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div
          className={cn(
            "flex items-center rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs",
            isCollapsed ? "justify-center p-2" : "justify-between p-2"
          )}
        >
          {!isCollapsed && (
            <div className="min-w-0 pr-2">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {userEmail}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                Role: {userRole}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout || (() => {})}
            aria-label="Log out of application"
            title="Log out"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
