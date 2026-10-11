import React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  actions,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-6 border-b border-slate-200 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{backLabel}</span>
          </Link>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {actions}
        </div>
      )}
    </div>
  );
}

