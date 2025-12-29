"use client";

import { useState } from "react";
import {
  Shield,
  CreditCard,
  ChevronRight,
  LogOut,
  Landmark,
  Check,
  X,
  Plus,
  Pencil,
  ChevronDown,
  Users,
  ArrowLeft,
  Settings,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PanelView = "main" | "family";

import type { UserSchema, AccountSchema } from "@/lib/validations";
import type { z } from "zod";

type User = z.infer<typeof UserSchema>;
type Account = z.infer<typeof AccountSchema>;

interface SettingsViewProps {
  users: User[];
  accounts: Account[];
  onAddMember: (name: string) => void;
  onUpdateMember: (id: string, name: string) => void;
  onDeleteMember: (id: string) => void;
  onLinkBank: (bank: string, userId: string) => void;
}

export function SettingsView({
  users,
  accounts,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onLinkBank,
}: SettingsViewProps) {
  const { user, signOut } = useAuth();
  const [activePanel, setActivePanel] = useState<PanelView>("main");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAddMember = () => {
    if (newMemberName.trim()) {
      onAddMember(newMemberName);
      setNewMemberName("");
      setIsAddingMember(false);
    }
  };

  const startEditing = (user: User) => {
    setEditingId(user.id);
    setEditName(user.name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      onUpdateMember(editingId, editName);
      setEditingId(null);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0
    })
  };

  return (
    <div className="relative overflow-hidden min-h-[600px]">
      <AnimatePresence mode="wait" custom={activePanel === "family" ? 1 : -1}>
        {activePanel === "main" ? (
          <motion.div
            key="main"
            custom={-1}
            initial="enter"
            animate="center"
            exit="exit"
            variants={slideVariants}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="space-y-6 pb-24"
          >
            {/* Profile Section */}
            <div className="glass-card p-8 rounded-[2rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-brand-primary/20 transition-colors duration-500"></div>
              <div className="flex items-center gap-6 relative z-10">
                <Avatar className="w-20 h-20 border-2 border-white/10 shadow-2xl">
                  <AvatarImage src={user?.image || undefined} />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    {user?.name || "Account Owner"}
                  </h2>
                  <p className="text-sm text-slate-400 font-medium">
                    {user?.email}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary text-[10px] font-bold uppercase tracking-wider">
                      {(user as any)?.plan || "Free"} Plan
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4">
              <button className="glass-card p-4 rounded-3xl flex flex-col items-center gap-3 hover:bg-white/10 transition-all border border-white/5 active:scale-95">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-indigo-400" />
                </div>
                <span className="text-sm font-bold text-white">Alerts</span>
              </button>
              <button className="glass-card p-4 rounded-3xl flex flex-col items-center gap-3 hover:bg-white/10 transition-all border border-white/5 active:scale-95 text-slate-500 opacity-60">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-slate-400" />
                </div>
                <span className="text-sm font-bold">Security</span>
              </button>
            </div>

            {/* Settings Menu */}
            <div className="space-y-3">
              <button
                onClick={() => setActivePanel("family")}
                className="w-full glass-card p-5 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all group border border-white/5 active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-pink-500/20 flex items-center justify-center shadow-inner">
                    <Users className="w-6 h-6 text-pink-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-white">
                      Family & Household
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Manage {users.length} member{users.length !== 1 ? "s" : ""} in your household
                    </p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-all">
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
                </div>
              </button>

              <button
                onClick={() => signOut()}
                className="w-full glass-card p-5 rounded-3xl flex items-center justify-between hover:bg-red-500/10 transition-all group border border-transparent hover:border-red-500/20 active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center">
                    <LogOut className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-white">Sign Out</h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Securely end your session
                    </p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-all">
                  <ChevronRight className="w-5 h-5 text-red-400" />
                </div>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="family"
            custom={1}
            initial="enter"
            animate="center"
            exit="exit"
            variants={slideVariants}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="space-y-6"
          >
            {/* Family Header */}
            <div className="flex items-center justify-between px-2">
              <Button
                variant="ghost"
                onClick={() => setActivePanel("main")}
                className="rounded-xl hover:bg-white/10 text-white gap-2 pr-4"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-bold">Settings</span>
              </Button>
              <Button
                onClick={() => setIsAddingMember(!isAddingMember)}
                className={cn(
                  "rounded-xl font-bold gap-2 shadow-lg transition-all",
                  isAddingMember
                    ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                    : "bg-brand-primary text-white hover:bg-brand-primary/90"
                )}
              >
                {isAddingMember ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isAddingMember ? "Cancel" : "Add Member"}
              </Button>
            </div>

            {/* Content Area */}
            <div className="space-y-4">
              <AnimatePresence>
                {isAddingMember && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className="glass-card p-4 rounded-3xl bg-brand-primary/10 border-brand-primary/20 shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold text-white border-2 border-dashed border-white/20">
                        ?
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-brand-primary mb-1 block">New Family Member</label>
                        <input
                          autoFocus
                          type="text"
                          placeholder="What's their name?"
                          className="bg-transparent border-none text-lg font-bold text-white placeholder:text-white/20 focus:outline-none w-full"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                        />
                      </div>
                      <Button
                        size="icon"
                        onClick={handleAddMember}
                        className="bg-brand-primary hover:bg-brand-primary/80 rounded-2xl h-12 w-12 shadow-lg"
                      >
                        <Check size={24} className="text-white" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3 pb-32">
                {users.map((userItem) => (
                  <motion.div
                    key={userItem.id}
                    layout
                    className="glass-card p-4 rounded-3xl flex items-center justify-between group hover:bg-white/5 transition-all border border-white/5"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className={cn("w-12 h-12 shadow-lg", userItem.color)}>
                        <AvatarFallback className="font-bold text-white bg-transparent">
                          {userItem.avatar}
                        </AvatarFallback>
                      </Avatar>

                      {editingId === userItem.id ? (
                        <div className="flex-1">
                          <input
                            autoFocus
                            type="text"
                            className="bg-white/10 border border-brand-primary/30 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 w-full"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                            onBlur={saveEdit}
                          />
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-white truncate">
                            {userItem.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                              {userItem.role}
                            </span>
                            {userItem.role === "Owner" && (
                              <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {editingId !== userItem.id && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(userItem)}
                            className="text-slate-500 hover:text-white hover:bg-white/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Pencil size={18} />
                          </Button>
                          {userItem.role !== "Owner" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDeleteMember(userItem.id)}
                              className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={20} />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
