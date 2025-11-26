"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Wallet, Activity, Building2, Settings, Shield, Sparkles } from "lucide-react";

interface NavDockProps {
    activeTab: string;
    onTabChange?: (tabId: string) => void;
    isAdmin?: boolean;
}

export function NavDock({ activeTab, onTabChange, isAdmin = false }: NavDockProps) {
    const router = useRouter();

    const handleTabClick = (tabId: string) => {
        if (tabId === 'admin') {
            router.push('/admin/card-catalog');
        } else if (tabId === 'benefits') {
            router.push('/benefits');
        } else {
            if (onTabChange) {
                onTabChange(tabId);
            } else {
                router.push('/dashboard');
            }
        }
    };

    const tabs = [
        { id: 'wallet', icon: Wallet },
        { id: 'benefits', icon: Sparkles },
        { id: 'activity', icon: Activity },
        { id: 'banks', icon: Building2 },
        { id: 'settings', icon: Settings },
        ...(isAdmin ? [{ id: 'admin', icon: Shield }] : [])
    ];

    return (
        <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-glass-nav backdrop-blur-2xl rounded-full px-2 py-2 flex items-center gap-1 shadow-2xl z-50">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`relative px-6 py-3 rounded-full transition-all duration-300 flex items-center justify-center ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                        } ${tab.id === 'admin' ? 'text-purple-400 hover:text-purple-300' : ''}`}
                >
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="nav-pill"
                            className="absolute inset-0 bg-white/10 rounded-full"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <div className="relative z-10 flex flex-col items-center gap-1">
                        <tab.icon
                            className={`w-6 h-6 ${activeTab === tab.id ? 'text-white' : ''} ${tab.id === 'admin' ? 'text-purple-400' : ''
                                }`}
                            strokeWidth={activeTab === tab.id ? 2.5 : 2}
                        />
                    </div>
                </button>
            ))}
        </nav>
    );
}
