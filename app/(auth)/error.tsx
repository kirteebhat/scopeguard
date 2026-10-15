"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Auth flow error caught:", error);
  }, [error]);

  return (
    <div className="w-full max-w-md mx-auto py-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 text-center">
        <ErrorState
          title="Authentication Error"
          message={
            error.message ||
            "Unable to complete the authentication process. Please try again or return to sign in."
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
              Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

