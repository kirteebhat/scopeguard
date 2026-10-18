"use client";

import React, { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  label?: string;
  timeout?: number;
  showText?: boolean;
}

/**
 * CopyButton
 * Accessible clipboard button with spring-animated checkmark confirmation.
 */
export function CopyButton({
  value,
  label = "Copy",
  timeout = 2000,
  showText = false,
  className,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
      } catch (err) {
        console.error("Failed to copy text: ", err);
      }
    },
    [value, timeout]
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied to clipboard" : label}
      title={copied ? "Copied!" : label}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-850",
        copied && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
        className
      )}
      {...props}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {showText && <span>Copied!</span>}
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1"
          >
            <Copy className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" aria-hidden="true" />
            {showText && <span>{label}</span>}
          </motion.span>
        )}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </button>
  );
}
