"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { RotateCw, Home } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error Boundary Caught]:", error);
  }, [error]);

  const isForbidden =
    error.name === "ForbiddenError" ||
    error.message.toLowerCase().includes("forbidden") ||
    error.message.toLowerCase().includes("access denied");

  return (
    <div className="py-12 px-4 flex flex-col items-center justify-center space-y-5 max-w-lg mx-auto">
      <ErrorState
        title={isForbidden ? "Workspace Access Restricted" : "Unable to Load Dashboard"}
        message={
          isForbidden
            ? "Your account does not have permission to view this workspace dashboard."
            : error.message || "An unexpected error occurred while compiling workspace metrics. Please try again."
        }
        onRetry={reset}
        retryLabel="Retry Dashboard"
      />

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => reset()}
          leftIcon={<RotateCw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
        <Link href="/projects">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Home className="w-3.5 h-3.5" />}
          >
            View Projects
          </Button>
        </Link>
      </div>
    </div>
  );
}
