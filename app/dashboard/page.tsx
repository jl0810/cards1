"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, BellRing, Wallet, Activity, Settings, LayoutGrid } from "lucide-react";
import { WalletView } from "@/components/velocity/wallet-view";
import { ActivityView } from "@/components/velocity/activity-view";
import { SettingsView } from "@/components/velocity/settings-view";

// --- INITIAL DATA ---
const INITIAL_USERS = [
  { id: 'u1', name: 'Alex', avatar: 'A', role: 'Admin', color: 'bg-blue-500' },
  { id: 'u2', name: 'Sarah', avatar: 'S', role: 'Member', color: 'bg-purple-500' },
];

const INITIAL_ACCOUNTS = [
  {
    id: 'a1', userId: 'u1', bank: 'Chase', name: 'Sapphire Reserve', balance: 2450.20, due: '2d', type: 'Visa', color: 'from-blue-900 to-slate-900',
    liabilities: { apr: '22.49%', limit: '$15,000', min_due: '$45.00', last_statement: '$2,100.00' }
  },
  {
    id: 'a2', userId: 'u1', bank: 'Amex', name: 'Platinum', balance: 890.50, due: 'Overdue', type: 'Amex', color: 'from-slate-200 to-slate-400 text-black',
    liabilities: { apr: 'N/A (Charge)', limit: 'No Preset', min_due: '$890.50', last_statement: '$890.50' }
  },
  {
    id: 'a3', userId: 'u2', bank: 'Citi', name: 'Custom Cash', balance: 45.00, due: '14d', type: 'Master', color: 'from-teal-900 to-slate-900',
    liabilities: { apr: '19.99%', limit: '$5,000', min_due: '$25.00', last_statement: '$45.00' }
  }
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('wallet');
  const [activeUser, setActiveUser] = useState('all');
  const [users, setUsers] = useState(INITIAL_USERS);
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [loading, setLoading] = useState(true);

  // Handlers for Settings Actions
  const addMember = (name: string) => {
    const newId = `u${users.length + 1}`;
    const colors = ['bg-pink-500', 'bg-orange-500', 'bg-cyan-500'];
    const newColor = colors[users.length % colors.length];
    setUsers([...users, { id: newId, name, avatar: name[0], role: 'Member', color: newColor }]);
  };

  const linkBank = (bankName: string, userId: string) => {
    const newId = `a${accounts.length + 1}`;
    const newCard = {
      id: newId,
      userId: userId,
      bank: bankName,
      name: 'New Card',
      balance: 0.00,
      due: '30d',
      type: 'Visa',
      color: 'from-slate-800 to-black',
      liabilities: { apr: '20%', limit: '$5,000', min_due: '$0.00', last_statement: '$0.00' }
    };
    setAccounts([...accounts, newCard]);
  };

  useEffect(() => { setTimeout(() => setLoading(false), 1000); }, []);

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-dark-900 text-white">
      <div className="w-12 h-12 border-t-2 border-brand-primary rounded-full mb-6 animate-spin"></div>
      <p className="text-xs font-bold tracking-widest uppercase text-slate-500 animate-pulse">Loading Velocity</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-mesh bg-cover bg-fixed text-slate-200 font-sans selection:bg-brand-primary/30 bg-dark-900">

      {/* HEADER */}
      <header className="pt-6 pb-4 px-5 sticky top-0 z-20 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">PointMax</h1>
          </div>
          <button className="relative p-2 hover:bg-white/5 rounded-full transition-colors">
            <BellRing className="text-slate-400 w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-dark-900"></span>
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          <button onClick={() => setActiveUser('all')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${activeUser === 'all' ? 'bg-white text-black border-white shadow-lg' : 'bg-glass-100 text-slate-400 border-transparent'}`}>
            <LayoutGrid className="w-4 h-4" /> All
          </button>
          {users.map(user => (
            <button key={user.id} onClick={() => setActiveUser(user.id)} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${activeUser === user.id ? 'bg-white text-black border-white shadow-lg' : 'bg-glass-100 text-slate-400 border-transparent'}`}>
              <div className={`w-2 h-2 rounded-full ${user.color}`} /> {user.name}
            </button>
          ))}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="px-5 pt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'wallet' && <motion.div key="wallet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><WalletView users={users} accounts={accounts} activeUser={activeUser} /></motion.div>}
          {activeTab === 'activity' && <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><ActivityView /></motion.div>}
          {activeTab === 'settings' && <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><SettingsView users={users} accounts={accounts} onAddMember={addMember} onLinkBank={linkBank} /></motion.div>}
        </AnimatePresence>
      </main>

      {/* NAVIGATION DOCK */}
      <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-glass-nav backdrop-blur-2xl rounded-full px-2 py-2 flex items-center gap-1 shadow-2xl z-50">
        {[
          { id: 'wallet', icon: Wallet },
          { id: 'activity', icon: Activity },
          { id: 'settings', icon: Settings }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative px-6 py-3 rounded-full transition-all duration-300 flex items-center justify-center ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            {activeTab === tab.id && <motion.div layoutId="nav-pill" className="absolute inset-0 bg-white/10 rounded-full" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
            <div className="relative z-10 flex flex-col items-center gap-1"><tab.icon className={`w-6 h-6 ${activeTab === tab.id ? 'text-white' : ''}`} strokeWidth={activeTab === tab.id ? 2.5 : 2} /></div>
          </button>
        ))}
      </nav>
    </div>
  );
}
