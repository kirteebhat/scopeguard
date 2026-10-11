"use client";

import React from "react";
import { Menu, Shield } from "lucide-react";
import Link from "next/link";

export interface HeaderProps {
  onOpenMobileNav: () => void;
  workspaceName?: string;
  pageTitle?: string;
}

export function Header({
  onOpenMobileNav,
  workspaceName = "Acme Agency",
  pageTitle,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
      {/* Mobile brand & toggle */}
      <div className="flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Shield className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-900">ScopeGuard</span>
        </Link>
      </div>

      {/* Desktop breadcrumb or title */}
      <div className="hidden lg:flex lg:items-center lg:gap-2">
        <span className="text-xs font-medium text-slate-400">
          {workspaceName}
        </span>
        {pageTitle && (
          <>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-700">
              {pageTitle}
            </span>
          </>
        )}
      </div>

      {/* Right area slot */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 hidden sm:inline">
          Workspace: <strong className="text-slate-700 font-semibold">{workspaceName}</strong>
        </span>
      </div>
    </header>
  );
}

