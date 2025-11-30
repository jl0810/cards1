import { cn } from "@/lib/utils";
import { forwardRef, HTMLAttributes } from "react";

/**
 * Glassmorphism card component following the exact specification
 * from global rules: bg-white/5 backdrop-blur-md backdrop-saturate-150
 */
export const GlassCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // Light mode glassmorphism (exact order for Safari)
        "bg-white/5 backdrop-blur-md backdrop-saturate-150 border border-white/10 shadow-lg shadow-black/5 rounded-xl",
        // Dark mode variant
        "dark:bg-black/10 dark:border-white/10 dark:shadow-black/10",
        className
      )}
      {...props}
    />
  )
);

GlassCard.displayName = "GlassCard";

/**
 * Glassmorphism surface for panels, modals, overlays
 */
export const GlassSurface = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-white/10 backdrop-blur-lg backdrop-saturate-200 border border-white/20 shadow-xl shadow-black/10 rounded-2xl",
        "dark:bg-black/20 dark:border-white/20 dark:shadow-white/5",
        className
      )}
      {...props}
    />
  )
);

GlassSurface.displayName = "GlassSurface";
