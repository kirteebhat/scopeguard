import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export default function ClientApprovalLoading() {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Banner Skeleton */}
        <Skeleton className="h-10 w-full rounded-xl" />

        {/* Card Skeleton */}
        <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-sm">
          <CardHeader className="bg-slate-900 text-white p-6 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-32 bg-slate-800" />
              <Skeleton className="h-4 w-24 bg-slate-800" />
            </div>
            <Skeleton className="h-7 w-3/4 bg-slate-800" />
            <Skeleton className="h-4 w-1/2 bg-slate-800" />
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <Skeleton className="h-10 w-full rounded-xl" />
              <div className="flex gap-3">
                <Skeleton className="h-10 w-1/2 rounded-xl" />
                <Skeleton className="h-10 w-1/2 rounded-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

