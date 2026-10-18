import React from "react";
import { cn } from "@/lib/utils";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("shimmer-effect rounded-md bg-slate-200/80", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
