"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    shimmerColor?: string;
    shimmerSize?: string;
    borderRadius?: string;
    shimmerDuration?: string;
    background?: string;
    className?: string;
    children?: React.ReactNode;
}

const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
    (
        {
            shimmerColor = "#ffffff",
            shimmerSize = "0.05em",
            shimmerDuration = "3s",
            borderRadius = "100px",
            background = "rgba(0, 0, 0, 1)",
            className,
            children,
            ...props
        },
        ref,
    ) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "group relative overflow-hidden whitespace-nowrap border border-white/10 px-8 py-4 text-white transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_8px_rgba(62,61,117,0.7)]",
                    className,
                )}
                style={
                    {
                        borderRadius: borderRadius,
                        background: background,
                        "--shimmer-color": shimmerColor,
                        "--shimmer-size": shimmerSize,
                        "--shimmer-duration": shimmerDuration,
                    } as React.CSSProperties
                }
                {...props}
            >
                <div className="absolute inset-0 -z-10 h-full w-full animate-[shimmer_var(--shimmer-duration)_infinite] bg-[linear-gradient(110deg,transparent,35%,var(--shimmer-color),40%,transparent)] bg-[length:200%_100%]" />
                <span className="relative z-10 flex items-center gap-2">{children}</span>
            </button>
        );
    },
);

ShimmerButton.displayName = "ShimmerButton";

export default ShimmerButton;
