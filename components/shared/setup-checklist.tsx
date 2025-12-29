"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Settings, Box, Cloud, LineChart, Shield } from "lucide-react";
import { motion } from "framer-motion";

interface SetupItem {
  id: string;
  label: string;
  description: string;
  status: "pending" | "completed" | "error";
  action?: string;
  icon: React.ReactNode;
}

export function SetupChecklist() {
  const [items, setItems] = useState<SetupItem[]>([
    {
      id: "env-vars",
      label: "Environment configuration",
      description: "Database and API secrets for production deployment.",
      status: "pending",
      icon: <Box className="h-5 w-5" />
    },
    {
      id: "auth",
      label: "Supabase authentication",
      description: "Auth providers and security policies configured.",
      status: "pending",
      icon: <Shield className="h-5 w-5" />
    },
    {
      id: "billing",
      label: "Stripe connection",
      description: "Payment processing and subscription models.",
      status: "pending",
      icon: <Cloud className="h-5 w-5" />
    },
    {
      id: "analytics",
      label: "Growth analytics",
      description: "Tracking user events and financial velocity metrics.",
      status: "pending",
      icon: <LineChart className="h-5 w-5" />
    },
  ]);

  useEffect(() => {
    // Simulate checking setup status
    const checkSetup = async () => {
      setTimeout(() => {
        setItems(prev => prev.map(item => {
          if (item.id === "env-vars" || item.id === "auth" || item.id === "analytics") {
            return { ...item, status: "completed" };
          }
          if (item.id === "billing") {
            return { ...item, status: "error", action: "Configure Stripe" };
          }
          return item;
        }));
      }, 1000);
    };

    void checkSetup();
  }, []);

  const completedCount = items.filter(item => item.status === "completed").length;
  const totalCount = items.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="glass-card border-white/5 bg-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">
                  Launch Checklist
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Ready your application for production deployment.
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border-transparent font-bold">
              {completedCount}/{totalCount} COMPLETE
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <div className={`mt-0.5 flex-shrink-0 p-2 rounded-xl ${item.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                    item.status === "error" ? "bg-red-500/10 text-red-500" :
                      "bg-slate-500/10 text-slate-500"
                  }`}>
                  {item.status === "completed" ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : item.status === "error" ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    item.icon
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white tracking-tight">{item.label}</h4>
                    {item.action && (
                      <button className="text-[10px] font-black uppercase tracking-widest text-brand-primary hover:text-brand-primary/80 transition-colors">
                        {item.action}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
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
