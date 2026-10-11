"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
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
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const variantClasses = {
            default: "bg-slate-900 text-white border-slate-800",
            success: "bg-emerald-50 text-emerald-900 border-emerald-300",
            error: "bg-rose-50 text-rose-900 border-rose-300",
            warning: "bg-amber-50 text-amber-900 border-amber-300",
            info: "bg-indigo-50 text-indigo-900 border-indigo-200",
          };

          const icon = () => {
            const cls = "w-4 h-4 flex-shrink-0 mt-0.5";
            switch (t.variant) {
              case "success":
                return <CheckCircle2 className={cn(cls, "text-emerald-700")} />;
              case "error":
                return <AlertCircle className={cn(cls, "text-rose-700")} />;
              case "warning":
                return <AlertTriangle className={cn(cls, "text-amber-700")} />;
              case "info":
                return <Info className={cn(cls, "text-indigo-700")} />;
              default:
                return null;
            }
          };

          return (
            <div
              key={t.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all animate-in slide-in-from-bottom-2",
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
            </div>
          );
        })}
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

