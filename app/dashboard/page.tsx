"use client";

import { UserDetails } from "../components/user-details";
import { BillingStatus } from "../components/billing-status";
import { BillingGuard } from "../components/billing-guard";
import { AppShell } from "../components/app-shell";
import { SetupChecklist } from "@/components/setup-checklist";
import { motion } from "framer-motion";

export default function DashboardPage() {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <AppShell>
      <motion.div
        className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 variants={itemVariants} className="text-3xl font-bold mb-8">
          Welcome back!
        </motion.h1>

        <SetupChecklist />

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-10 pb-10">
          <div className="space-y-6">
            <motion.div variants={itemVariants}>
              <BillingGuard>
                <BillingStatus />
              </BillingGuard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <BillingGuard>
                <UserDetails />
              </BillingGuard>
            </motion.div>
          </div>
          <div className="flex flex-col gap-4">
            {/* Right-hand column is currently empty; reserved for future SaaS widgets (usage, activity, etc.) */}
          </div>
        </div>
      </motion.div>
    </AppShell>
  );
}
