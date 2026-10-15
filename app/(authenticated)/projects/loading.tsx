import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";

export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-9 w-full sm:flex-1 rounded-lg" />
        <Skeleton className="h-9 w-full sm:w-40 rounded-lg" />
        <Skeleton className="h-9 w-full sm:w-40 rounded-lg" />
      </div>

      {/* Project Cards Skeletons */}
      <div className="grid grid-cols-1 gap-3.5">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-5 border-slate-200">
            <CardContent className="p-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

