"use client";

import React, { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { RefreshCw } from "lucide-react";

export default function ClientApprovalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Client approval portal error caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 text-center">
        <ErrorState
          title="Proposal Unavailable"
          message={
            error.message ||
            "Unable to load this scope change proposal. The link may have expired or been updated by your agency."
          }
          onRetry={reset}
          retryLabel="Try Again"
        />

        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={reset}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry Loading Proposal
          </Button>
        </div>
      </div>
    </div>
  );
}

