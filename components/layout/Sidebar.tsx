"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Shield,
  LayoutDashboard,
  FolderKanban,
  Users,
  Settings,
  LogOut,
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

  return (
    <aside
      className={cn(
        "flex flex-col w-64 border-r border-slate-200 bg-white min-h-screen select-none",
        className
      )}
    >
      {/* Brand & Workspace */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">
              ScopeGuard
            </span>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              B2B Scope Platform
            </span>
          </div>
        </div>

        {/* Workspace Pill */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 border border-slate-200/60">
          <span className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">
            {workspaceName}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
            {userRole}
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors",
                  isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section & Logout */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60 shadow-2xs">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {userEmail}
            </p>
            <p className="text-[10px] text-slate-500 capitalize">
              Role: {userRole}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout || (() => {})}
            aria-label="Log out of application"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

