"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Onboarding error caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 text-center">
        <ErrorState
          title="Onboarding Setup Error"
          message={
            error.message ||
            "An error occurred while setting up your agency workspace. Please try again."
          }
          onRetry={reset}
          retryLabel="Try Again"
        />

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={reset}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry
          </Button>

          <Link href="/login">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              Sign In Again
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

