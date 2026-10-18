"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";

export interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Purposeful page transition wrapper:
 * Sub-200ms subtle fade and slight y-translation (6px), animating strictly opacity & transform.
 * Completely bypassed when prefers-reduced-motion is enabled.
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.2,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className || "w-full flex-1"}
    >
      {children}
    </motion.div>
  );
}

