import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";

export default function AuthLoading() {
  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="space-y-2 text-center pb-2">
          <Skeleton className="h-6 w-32 mx-auto" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg mt-6" />
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100 pt-4">
          <Skeleton className="h-4 w-40" />
        </CardFooter>
      </Card>
    </div>
  );
}

