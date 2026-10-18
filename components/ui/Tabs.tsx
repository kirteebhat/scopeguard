"use client";

import React, { createContext, useContext, useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  tabGroupId: string;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const tabGroupId = useId();

  return (
    <TabsContext.Provider
      value={{
        activeTab: value,
        setActiveTab: onValueChange,
        tabGroupId,
      }}
    >
      <div className={cn("w-full space-y-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-slate-600 text-xs font-medium",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabTrigger({
  value,
  children,
  className,
  disabled = false,
}: TabTriggerProps) {
  const context = useContext(TabsContext);
  const shouldReduceMotion = useReducedMotion();

  if (!context) {
    throw new Error("TabTrigger must be used within Tabs");
  }

  const isActive = context.activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => context.setActiveTab(value)}
      className={cn(
        "relative px-3.5 py-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 select-none z-10",
        isActive
          ? "text-slate-900 font-semibold"
          : "text-slate-600 hover:text-slate-900",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {isActive && (
        <motion.div
          layoutId={`tab-indicator-${context.tabGroupId}`}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 400, damping: 30 }
          }
          className="absolute inset-0 bg-white rounded-lg shadow-xs z-[-1] border border-slate-200/60"
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabContent({ value, children, className }: TabContentProps) {
  const context = useContext(TabsContext);
  const shouldReduceMotion = useReducedMotion();

  if (!context) {
    throw new Error("TabContent must be used within Tabs");
  }

  if (context.activeTab !== value) return null;

  return (
    <motion.div
      role="tabpanel"
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

