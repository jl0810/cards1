"use client";

/**
 * Animated Hero Section Component
 *
 * @module components/marketing/animated-hero
 * @implements BR-046 - Animation Standards
 * @implements BR-047 - Marketing Content Display
 * @satisfies US-038 - Hero Section Experience
 * @tested __tests__/components/marketing/animated-hero.test.tsx
 */

import { motion } from "framer-motion";
import {
  ArrowRight as _ArrowRight,
  Sparkles as _Sparkles,
  Zap as _Zap,
  Shield as _Shield,
} from "lucide-react";
import Link from "next/link";
import _NextLink from "next/link";
import { Button } from "@/components/ui/button";
import ShimmerButton from "@/components/ui/shimmer-button";

interface AnimatedHeroProps {
  children: React.ReactNode;
}

export function AnimatedHero({ children }: AnimatedHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedButtons() {
  return (
    <div className="flex items-center justify-center gap-x-6">
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <ShimmerButton className="shadow-2xl">
          <Link href="/sign-up" className="text-lg font-semibold">
            Start Tracking
          </Link>
        </ShimmerButton>
      </motion.div>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="text-lg h-14 px-10 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm"
        >
          <Link href="/dashboard">View Demo</Link>
        </Button>
      </motion.div>
    </div>
  );
}
