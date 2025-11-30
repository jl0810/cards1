"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Settings } from "lucide-react";
import { motion } from "framer-motion";

interface SetupItem {
  id: string;
  label: string;
  description: string;
  status: "pending" | "completed" | "error";
  action?: string;
}

export function SetupChecklist() {
  const [items, setItems] = useState<SetupItem[]>([
    {
      id: "env-vars",
      label: "Environment variables configured",
      description: "All required env vars are set",
      status: "pending",
    },
    {
      id: "webhooks",
      label: "Clerk webhooks configured",
      description: "Webhook endpoints are set up for user events",
      status: "pending",
    },
    {
      id: "billing",
      label: "Billing integration active",
      description: "Stripe or billing provider connected",
      status: "pending",
    },
    {
      id: "analytics",
      label: "Analytics enabled",
      description: "PostHog or analytics tracking active",
      status: "pending",
    },
  ]);

  useEffect(() => {
    // Simulate checking setup status
    const checkSetup = async () => {
      // In a real app, check actual env vars, webhook status, etc.
      setTimeout(() => {
        setItems([
          {
            id: "env-vars",
            label: "Environment variables configured",
            description: "All required env vars are set",
            status: "completed",
          },
          {
            id: "webhooks",
            label: "Clerk webhooks configured",
            description: "Webhook endpoints are set up for user events",
            status: "completed",
          },
          {
            id: "billing",
            label: "Billing integration active",
            description: "Stripe or billing provider connected",
            status: "error",
            action: "Configure billing",
          },
          {
            id: "analytics",
            label: "Analytics enabled",
            description: "PostHog or analytics tracking active",
            status: "completed",
          },
        ]);
      }, 1000);
    };

    checkSetup();
  }, []);

  const completedCount = items.filter(item => item.status === "completed").length;
  const totalCount = items.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Getting Started
              </CardTitle>
              <CardDescription>
                Complete these steps to fully set up your SaaS application
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {completedCount}/{totalCount} Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg border"
              >
                {item.status === "completed" ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                ) : item.status === "error" ? (
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{item.label}</h4>
                    {item.action && (
                      <button className="text-xs text-primary hover:underline">
                        {item.action}
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
