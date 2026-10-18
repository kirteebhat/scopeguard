import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-slate-900 dark:text-white focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">ScopeGuard</span>
          </Link>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 text-center">
            Client-approved change orders & budget protection
          </p>
        </div>

        {/* Content Container */}
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl sm:px-10">
          {children}
        </div>

        {/* Security Footer Note */}
        <p className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
          Protected by end-to-end cryptographic change verification.
        </p>
      </div>
    </div>
  );
}

