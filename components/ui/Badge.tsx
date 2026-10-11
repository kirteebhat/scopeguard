import React from "react";
import { cn } from "@/lib/utils";
import {
  FileEdit,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Info,
  AlertTriangle,
} from "lucide-react";

export type BadgeVariant =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "default"
  | "info"
  | "success"
  | "warning"
  | "error";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  showIcon?: boolean;
}

export function Badge({
  children,
  variant = "default",
  showIcon = false,
  className,
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-300",
    pending: "bg-amber-50 text-amber-900 border-amber-300",
    approved: "bg-emerald-50 text-emerald-900 border-emerald-300",
    rejected: "bg-rose-50 text-rose-900 border-rose-300",
    withdrawn: "bg-slate-100 text-slate-600 border-slate-200",
    default: "bg-slate-100 text-slate-800 border-slate-200",
    info: "bg-indigo-50 text-indigo-800 border-indigo-200",
    success: "bg-emerald-50 text-emerald-900 border-emerald-300",
    warning: "bg-amber-50 text-amber-900 border-amber-300",
    error: "bg-rose-50 text-rose-900 border-rose-300",
  };

  const renderIcon = () => {
    const iconClass = "w-3 h-3 flex-shrink-0";
    switch (variant) {
      case "draft":
        return <FileEdit className={iconClass} />;
      case "pending":
        return <Clock className={iconClass} />;
      case "approved":
      case "success":
        return <CheckCircle2 className={iconClass} />;
      case "rejected":
      case "error":
        return <XCircle className={iconClass} />;
      case "withdrawn":
        return <Ban className={iconClass} />;
      case "warning":
        return <AlertTriangle className={iconClass} />;
      case "info":
        return <Info className={iconClass} />;
      default:
        return null;
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {showIcon && renderIcon()}
      <span>{children}</span>
    </span>
  );
}

