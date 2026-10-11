import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export default function TeamSettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="flex gap-4 border-b border-slate-200 pb-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>

      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  );
}

