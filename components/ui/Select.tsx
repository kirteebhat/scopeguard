import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, hasError = false, disabled, options, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            "w-full appearance-none rounded-lg border bg-white px-3.5 py-2 pr-9 text-sm text-slate-900 transition-colors shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1",
            hasError
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
              : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20",
            disabled && "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200",
            className
          )}
          aria-invalid={hasError ? "true" : undefined}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";

