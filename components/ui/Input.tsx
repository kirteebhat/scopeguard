import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  prefixElement?: React.ReactNode;
  suffixElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      hasError = false,
      prefixElement,
      suffixElement,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className="relative flex items-center w-full">
        {prefixElement && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-sm">
            {prefixElement}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-offset-0",
            hasError
              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
              : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-100",
            disabled && "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200",
            Boolean(prefixElement) && "pl-9",
            Boolean(suffixElement) && "pr-9",
            className
          )}
          aria-invalid={hasError ? "true" : undefined}
          {...props}
        />
        {suffixElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 text-sm">
            {suffixElement}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
