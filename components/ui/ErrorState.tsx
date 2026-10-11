import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred while loading this resource. Please try again.",
  onRetry,
  retryLabel = "Try Again",
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/40 p-8 sm:p-12 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600 mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-950">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-rose-800 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <div className="mt-6">
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

