import React from "react";
import { cn } from "@/lib/utils";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export function Table({ className, containerClassName, ...props }: TableProps) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm",
        containerClassName
      )}
    >
      <table className={cn("w-full text-left text-sm text-slate-800", className)} {...props} />
    </div>
  );
}

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  sticky?: boolean;
}

export function TableHeader({
  className,
  sticky = false,
  ...props
}: TableHeaderProps) {
  return (
    <thead
      className={cn(
        "bg-slate-50/75 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500",
        sticky && "sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs shadow-2xs",
        className
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-slate-100", className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-indigo-50/30 focus-within:bg-indigo-50/40",
        className
      )}
      {...props}
    />
  );
}

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function TableHead({
  className,
  numeric = false,
  ...props
}: TableHeadProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-semibold text-slate-600",
        numeric && "text-right tabular-nums",
        className
      )}
      {...props}
    />
  );
}

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

export function TableCell({
  className,
  numeric = false,
  ...props
}: TableCellProps) {
  return (
    <td
      className={cn(
        "px-4 py-3.5 align-middle text-slate-700",
        numeric && "text-right tabular-nums",
        className
      )}
      {...props}
    />
  );
}

