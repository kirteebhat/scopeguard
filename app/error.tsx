"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime errors
    console.error("Root application error caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-900">
      <div className="w-full max-w-md text-center space-y-6">
        <ErrorState
          title="Unexpected Application Error"
          message={
            error.message ||
            "An unexpected error occurred. Please try again or return to the main dashboard."
          }
          onRetry={reset}
          retryLabel="Try Again"
        />

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={reset}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Reload Page
          </Button>

          <Link href="/dashboard">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

