"use client";

/**
 * Animated Features Grid Component
 * 
 * @module components/marketing/animated-features
 * @implements BR-046 - Animation Standards
 * @implements BR-047 - Marketing Content Display
 * @satisfies US-039 - Feature Showcase
 * @tested __tests__/components/marketing/animated-features.test.ts
 */

import { motion } from "framer-motion";
import { CreditCard, Send, ShieldCheck, Zap, Layout, Globe, ChevronDown } from "lucide-react";

const features = [
  {
    icon: <CreditCard className="h-8 w-8 text-purple-400" />,
    title: "Bank Integration",
    description:
      "Connect securely with Plaid to automatically sync transactions and balances.",
  },
  {
    icon: <Send className="h-8 w-8 text-pink-400" />,
    title: "Smart Alerts",
    description:
      "Never miss a payment or a bonus category. Get notified before due dates.",
  },
  {
    icon: <Zap className="h-8 w-8 text-yellow-400" />,
    title: "Real-time Updates",
    description:
      "See your net worth and point valuations update in real-time as you spend.",
  },
  {
    icon: <Globe className="h-8 w-8 text-emerald-400" />,
    title: "Points Optimization",
    description:
      "Know exactly which card to use for every purchase to maximize your return.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function AnimatedFeatures() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
    >
      {features.map((feature, index) => (
        <motion.div key={index} variants={item} className="group">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:shadow-white/5">
            <div className="relative z-10">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
