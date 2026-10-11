"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime errors in development
    console.error("Authenticated boundary error:", error);
  }, [error]);

  const isForbidden =
    error.name === "ForbiddenError" ||
    error.message.toLowerCase().includes("access denied") ||
    error.message.toLowerCase().includes("forbidden");

  return (
    <div className="py-12 flex flex-col items-center justify-center space-y-4">
      <ErrorState
        title={isForbidden ? "Access Denied" : "Something went wrong"}
        message={
          isForbidden
            ? "Your workspace role does not permit access to this resource or action."
            : error.message || "An unexpected error occurred while loading this page."
        }
        onRetry={reset}
        retryLabel="Try Again"
      />

      <Link href="/dashboard">
        <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}

