"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const shouldReduceMotion = useReducedMotion();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      title,
      description,
      variant = "default",
      duration = 4000,
    }: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, title, description, variant, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast viewport */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const variantClasses = {
              default: "bg-slate-900 text-white border-slate-800 dark:bg-slate-800 dark:border-slate-700",
              success: "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800",
              error: "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800",
              warning: "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-800",
              info: "bg-indigo-50 text-indigo-900 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-800",
            };

            const icon = () => {
              const cls = "w-4 h-4 shrink-0 mt-0.5";
              switch (t.variant) {
                case "success":
                  return <CheckCircle2 className={cn(cls, "text-emerald-700 dark:text-emerald-400")} />;
                case "error":
                  return <AlertCircle className={cn(cls, "text-rose-700 dark:text-rose-400")} />;
                case "warning":
                  return <AlertTriangle className={cn(cls, "text-amber-700 dark:text-amber-400")} />;
                case "info":
                  return <Info className={cn(cls, "text-indigo-700 dark:text-indigo-400")} />;
                default:
                  return null;
              }
            };

            return (
              <motion.div
                key={t.id}
                role={t.variant === "error" ? "alert" : "status"}
                initial={
                  shouldReduceMotion
                    ? { opacity: 1 }
                    : { opacity: 0, y: 16, scale: 0.95 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: 8, scale: 0.95 }
                }
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { duration: 0.2, ease: "easeOut" }
                }
                className={cn(
                  "relative overflow-hidden pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg",
                  variantClasses[t.variant || "default"]
                )}
              >
                {icon()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight">{t.title}</p>
                  {t.description && (
                    <p className="mt-1 text-xs opacity-90 leading-normal">{t.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="rounded p-1 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Animated progress bar countdown */}
                {t.duration && t.duration > 0 && !shouldReduceMotion && (
                  <motion.div
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: t.duration / 1000, ease: "linear" }}
                    className="absolute bottom-0 left-0 h-1 bg-current opacity-25"
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
