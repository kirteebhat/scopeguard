import React from "react";
import { Spinner } from "@/components/ui/Spinner";

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-slate-500 font-medium">Loading workspace setup...</p>
      </div>
    </div>
  );
}

