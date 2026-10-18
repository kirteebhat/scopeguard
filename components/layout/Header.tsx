"use client";

import React from "react";
import { Menu, Shield, Bell } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export interface HeaderProps {
  onOpenMobileNav: () => void;
  workspaceName?: string;
  pageTitle?: string;
  onOpenCommandPalette?: () => void;
  onOpenNotifications?: () => void;
  unreadCount?: number;
}

export function Header({
  onOpenMobileNav,
  workspaceName: _workspaceName = "Acme Agency",
  pageTitle,
  onOpenCommandPalette,
  onOpenNotifications,
  unreadCount = 0,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8 transition-colors">
      {/* Mobile brand & toggle */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Shield className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">ScopeGuard</span>
        </Link>
      </div>

      {/* Desktop breadcrumb or title */}
      <div className="hidden lg:flex lg:items-center lg:gap-2">
        <Link
          href="/dashboard"
          className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          Dashboard
        </Link>
        {pageTitle && (
          <>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {pageTitle}
            </span>
          </>
        )}
      </div>

      {/* Right area slot - command palette button, notification, theme toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search Shortcut Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Open command palette"
          className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <span>Search...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600 rounded shadow-2xs">
            ⌘K
          </kbd>
        </button>

        {/* Notifications Trigger */}
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
            </span>
          )}
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}

