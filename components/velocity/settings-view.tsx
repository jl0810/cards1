"use client";

import { useState } from "react";
import {
  Shield,
  CreditCard,
  Plug,
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
  User,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";

type PanelView = "main" | "family";

import { UserSchema, AccountSchema } from "@/lib/validations";
import type { z } from "zod";

type User = z.infer<typeof UserSchema>;
type Account = z.infer<typeof AccountSchema>;

export function SettingsView({
  users,
  accounts,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onLinkBank,
}: {
  users: User[];
  accounts: Account[];
  onAddMember: (name: string) => void;
  onUpdateMember: (id: string, name: string) => void;
  onDeleteMember: (id: string) => void;
  onLinkBank: (bank: string, userId: string) => void;
}) {
  const { user } = useUser();
  const clerk = useClerk();
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
    enter: { x: "100%", opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {activePanel === "main" && (
          <motion.div
            key="main"
            initial="enter"
            animate="center"
            exit="exit"
            variants={slideVariants}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="space-y-4 pb-24"
          >
            {/* Profile Card */}
            <div className="glass-card p-6 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                  {user?.firstName?.[0] || "U"}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white">
                    {user?.firstName || "User"}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </div>
            </div>

            {/* Settings Grid */}
            <div className="space-y-3">
              {/* Family Members */}
              <button
                onClick={() => setActivePanel("family")}
                className="w-full glass-card p-4 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-pink-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-white">
                      Family Members
                    </h3>
                    <p className="text-xs text-slate-400">
                      {users.length} member{users.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </button>

              {/* Security */}
              <div className="glass-card p-4 rounded-2xl flex items-center justify-between opacity-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-white">Security</h3>
                    <p className="text-xs text-slate-400">Coming soon</p>
                  </div>
                </div>
              </div>

              {/* Sign Out */}
              <button
                onClick={() => clerk.signOut()}
                className="w-full glass-card p-4 rounded-2xl flex items-center justify-between hover:bg-red-500/10 transition-all group border border-transparent hover:border-red-500/20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <LogOut className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-white">Sign Out</h3>
                    <p className="text-xs text-slate-400">
                      Log out of your account
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* Family Members Panel */}
        {activePanel === "family" && (
          <motion.div
            key="family"
            initial="enter"
            animate="center"
            exit="exit"
            variants={slideVariants}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-[140px] left-0 right-0 bottom-0 bg-dark-900 z-40"
          >
            <div className="h-full flex flex-col">
              {/* Compact Header */}
              <div className="bg-dark-900/95 backdrop-blur-xl border-b border-white/5 px-5 py-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setActivePanel("main")}
                    className="flex items-center gap-2 text-sm font-bold text-white hover:text-brand-primary transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={() => setIsAddingMember(!isAddingMember)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${isAddingMember ? "bg-red-500/20 text-red-400" : "bg-brand-primary/20 text-brand-primary"}`}
                  >
                    {isAddingMember ? "Cancel" : "+ Add Member"}
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                <AnimatePresence>
                  {isAddingMember && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      className="overflow-hidden"
                    >
                      <div className="glass-card p-3 rounded-xl flex items-center gap-3 bg-brand-primary/10 border-brand-primary/20">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white border border-dashed border-white/30">
                          ?
                        </div>
                        <input
                          autoFocus
                          type="text"
                          placeholder="Enter name..."
                          className="bg-transparent border-none text-sm font-bold text-white placeholder:text-white/30 focus:outline-none flex-1"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddMember()
                          }
                        />
                        <button
                          onClick={handleAddMember}
                          className="p-2 bg-brand-primary hover:bg-brand-primary/80 rounded-lg transition-colors"
                        >
                          <Check size={16} className="text-white" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {users.map((userItem) => (
                  <motion.div
                    key={userItem.id}
                    layout
                    className="glass-card p-3 rounded-xl flex items-center justify-between group hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`w-10 h-10 rounded-full ${userItem.color} flex items-center justify-center text-sm font-bold text-white shadow-md`}
                      >
                        {userItem.avatar}
                      </div>
                      {editingId === userItem.id ? (
                        <input
                          autoFocus
                          type="text"
                          className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-brand-primary flex-1"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                          onBlur={saveEdit}
                        />
                      ) : (
                        <div className="flex-1">
                          <p className="text-sm font-bold text-white">
                            {userItem.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {userItem.role}
                          </p>
                        </div>
                      )}
                    </div>
                    {editingId !== userItem.id && (
                      <>
                        <button
                          onClick={() => startEditing(userItem)}
                          className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Rename"
                        >
                          <Pencil size={14} />
                        </button>
                        {userItem.role !== "Owner" && (
                          <button
                            onClick={() => onDeleteMember(userItem.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove Family Member"
                          >
                            <LogOut size={14} />
                          </button>
                        )}
                      </>
                    )}
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
