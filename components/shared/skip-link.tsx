"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SkipLinkProps extends React.HTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  href: string;
}

/**
 * Skip link for keyboard navigation accessibility
 * Allows users to skip to main content, bypassing navigation
 */
export function SkipLink({ children, href, className, ...props }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        // Visually hidden until focused
        "absolute top-0 left-0 z-50 p-3 -translate-y-full transform transition-transform",
        "bg-primary text-primary-foreground rounded-md text-sm font-medium",
        "focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}
