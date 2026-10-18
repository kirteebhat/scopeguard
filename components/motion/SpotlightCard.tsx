"use client";

import React, { useRef, useState, useCallback } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
  type HTMLMotionProps,
} from "motion/react";
import { cn } from "@/lib/utils";

export interface SpotlightCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children?: React.ReactNode;
  spotlightColor?: string;
  enableTilt?: boolean;
  maxTiltDeg?: number;
}

/**
 * SpotlightCard
 * Provides a radial cursor-following glow and subtle 3D card tilt (±4° max).
 * Automatically honors prefers-reduced-motion by disabling transforms and transitions.
 */
export const SpotlightCard = React.forwardRef<HTMLDivElement, SpotlightCardProps>(
  (
    {
      children,
      className,
      spotlightColor = "rgba(99, 102, 241, 0.12)",
      enableTilt = true,
      maxTiltDeg = 4,
      ...props
    },
    forwardedRef
  ) => {
    const internalRef = useRef<HTMLDivElement | null>(null);
    const shouldReduce = useReducedMotion();
    const [isHovered, setIsHovered] = useState(false);

    // Mouse coordinates relative to card center (-0.5 to 0.5)
    const normX = useMotionValue(0);
    const normY = useMotionValue(0);

    // Mouse coordinates in pixels for radial gradient
    const mousePxX = useMotionValue(0);
    const mousePxY = useMotionValue(0);

    // Smooth spring physics for 3D tilt
    const springConfig = { stiffness: 260, damping: 24, mass: 0.8 };
    const tiltX = useSpring(
      useTransform(normY, [-0.5, 0.5], [maxTiltDeg, -maxTiltDeg]),
      springConfig
    );
    const tiltY = useSpring(
      useTransform(normX, [-0.5, 0.5], [-maxTiltDeg, maxTiltDeg]),
      springConfig
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        if (shouldReduce || e.pointerType === "touch") return;
        const target = internalRef.current;
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const pxX = e.clientX - rect.left;
        const pxY = e.clientY - rect.top;

        mousePxX.set(pxX);
        mousePxY.set(pxY);
        normX.set(pxX / rect.width - 0.5);
        normY.set(pxY / rect.height - 0.5);
      },
      [shouldReduce, mousePxX, mousePxY, normX, normY]
    );

    const handlePointerEnter = useCallback(() => {
      if (!shouldReduce) setIsHovered(true);
    }, [shouldReduce]);

    const handlePointerLeave = useCallback(() => {
      setIsHovered(false);
      normX.set(0);
      normY.set(0);
    }, [normX, normY]);

    const spotlightBg = useMotionTemplate`radial-gradient(450px circle at ${mousePxX}px ${mousePxY}px, ${spotlightColor}, transparent 80%)`;

    return (
      <div
        ref={(node) => {
          internalRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        style={{ perspective: 1000 }}
        className="group relative"
      >
        <motion.div
          onPointerMove={handlePointerMove}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          style={{
            rotateX: enableTilt && !shouldReduce ? tiltX : 0,
            rotateY: enableTilt && !shouldReduce ? tiltY : 0,
            transformStyle: "preserve-3d",
          }}
          className={cn(
            "relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-[box-shadow,border-color] duration-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700",
            className
          )}
          {...props}
        >
          {/* Radial Mouse Glow Overlay */}
          {!shouldReduce && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300"
              style={{
                background: spotlightBg,
                opacity: isHovered ? 1 : 0,
              }}
            />
          )}

          {/* Card Content */}
          <div className="relative z-10">{children}</div>
        </motion.div>
      </div>
    );
  }
);
SpotlightCard.displayName = "SpotlightCard";
