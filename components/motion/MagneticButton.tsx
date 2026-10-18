"use client";

import React, { useRef, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
  type HTMLMotionProps,
} from "motion/react";
import { cn } from "@/lib/utils";

export interface MagneticButtonProps extends HTMLMotionProps<"div"> {
  strength?: number; // Maximum offset distance in px (default 6)
}

/**
 * MagneticButton
 * Creates a subtle magnetic attraction effect as the cursor hovers over the button.
 * Disables automatically when prefers-reduced-motion is enabled or on touch screens.
 */
export const MagneticButton = React.forwardRef<HTMLDivElement, MagneticButtonProps>(
  ({ children, className, strength = 6, ...props }, forwardedRef) => {
    const internalRef = useRef<HTMLDivElement | null>(null);
    const shouldReduce = useReducedMotion();

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { stiffness: 220, damping: 18, mass: 0.6 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (shouldReduce || e.pointerType === "touch") return;
        const target = internalRef.current;
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = (e.clientX - centerX) / (rect.width / 2);
        const deltaY = (e.clientY - centerY) / (rect.height / 2);

        x.set(deltaX * strength);
        y.set(deltaY * strength);
      },
      [shouldReduce, strength, x, y]
    );

    const handlePointerLeave = useCallback(() => {
      x.set(0);
      y.set(0);
    }, [x, y]);

    return (
      <motion.div
        ref={(node) => {
          internalRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{
          x: !shouldReduce ? springX : 0,
          y: !shouldReduce ? springY : 0,
        }}
        className={cn("inline-block", className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MagneticButton.displayName = "MagneticButton";
