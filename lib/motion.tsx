"use client";

import React from "react";
import { motion, useReducedMotion, type Variants, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Standard B2B Motion Physics and Easing Tokens
 */
export const springPhysics = {
  type: "spring" as const,
  stiffness: 350,
  damping: 30,
};

export const easeStandard = [0, 0, 0.2, 1] as const; // ease-out

/**
 * Reusable Motion Presets
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: easeStandard },
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: { duration: 0.15, ease: easeStandard },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: easeStandard },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.15, ease: easeStandard },
  },
};

export const staggerContainer = (
  staggerChildren = 0.05,
  delayChildren = 0
): Variants => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});

/**
 * Resolves motion variants with strict prefers-reduced-motion fallback.
 * When reduced motion is requested, all translation and scale transforms are zeroed
 * and durations collapse to 0.
 */
export function useSafeVariants(variants: Variants): Variants {
  const shouldReduce = useReducedMotion();
  if (!shouldReduce) return variants;

  const reduced: Variants = {};
  for (const [key, val] of Object.entries(variants)) {
    if (typeof val === "object" && val !== null) {
      reduced[key] = {
        ...val,
        x: 0,
        y: 0,
        scale: 1,
        transition: { duration: 0, delay: 0 },
      };
    } else {
      reduced[key] = val;
    }
  }
  return reduced;
}

/**
 * Lightweight Motion Wrappers
 */
export interface MotionCardProps extends HTMLMotionProps<"div"> {
  hoverLift?: boolean;
}

export const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, hoverLift = false, children, ...props }, ref) => {
    const shouldReduce = useReducedMotion();

    return (
      <motion.div
        ref={ref}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        whileHover={
          hoverLift && !shouldReduce
            ? { y: -2, transition: { duration: 0.15, ease: easeStandard } }
            : undefined
        }
        className={cn(
          "rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow dark:border-slate-800 dark:bg-slate-900",
          hoverLift && "hover:shadow-card",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionCard.displayName = "MotionCard";

export type MotionPageProps = HTMLMotionProps<"div">;

export const MotionPage = React.forwardRef<HTMLDivElement, MotionPageProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={fadeIn}
        initial="hidden"
        animate="show"
        className={cn("w-full flex-1", className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionPage.displayName = "MotionPage";

export interface MotionListProps extends HTMLMotionProps<"div"> {
  staggerDelay?: number;
}

export const MotionList = React.forwardRef<HTMLDivElement, MotionListProps>(
  ({ className, staggerDelay = 0.05, children, ...props }, ref) => {
    const shouldReduce = useReducedMotion();
    const container = staggerContainer(shouldReduce ? 0 : staggerDelay);

    return (
      <motion.div
        ref={ref}
        variants={container}
        initial="hidden"
        animate="show"
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionList.displayName = "MotionList";
