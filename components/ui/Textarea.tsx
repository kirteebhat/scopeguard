import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError = false, disabled, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={cn(
          "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-offset-0",
          hasError
            ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
            : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-100",
          disabled && "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200",
          className
        )}
        aria-invalid={hasError ? "true" : undefined}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

