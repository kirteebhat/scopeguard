import React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({
  children,
  className,
  required = false,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn("block text-sm font-medium text-slate-800 mb-1", className)}
      {...props}
    >
      {children}
      {required && (
        <span className="text-rose-600 ml-1" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

