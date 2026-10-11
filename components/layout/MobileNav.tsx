"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Shield, X, LogOut } from "lucide-react";
import { NAV_ITEMS } from "./Sidebar";

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName?: string;
  userEmail?: string;
  userRole?: string;
  onLogout?: () => void;
}

export function MobileNav({
  isOpen,
  onClose,
  workspaceName = "Acme Agency",
  userEmail = "founder@acme.agency",
  userRole = "owner",
  onLogout,
}: MobileNavProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = origOverflow;
    };
  }, [isOpen, onClose]);

  // Close automatically on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
        className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col justify-between"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-slate-900">ScopeGuard</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Workspace info */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 truncate">
              {workspaceName}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
              {userRole}
            </span>
          </div>

          {/* Nav links */}
          <nav className="p-3 space-y-1" aria-label="Mobile Navigation Links">
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
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 flex-shrink-0",
                      isActive ? "text-indigo-600" : "text-slate-400"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between">
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
              aria-label="Log out"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

