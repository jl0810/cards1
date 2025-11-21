"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";

interface AIImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (issuer: string) => void;
}

export function AIImportModal({ isOpen, onClose, onImport }: AIImportModalProps) {
    const [issuer, setIssuer] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (issuer.trim()) {
            onImport(issuer.trim());
            setIssuer("");
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-dark-800 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full overflow-hidden"
                        >
                            <form onSubmit={handleSubmit}>
                                {/* Header */}
                                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-purple-600/10 to-pink-600/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
                                            <Sparkles className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">AI Card Import</h2>
                                            <p className="text-xs text-slate-400 mt-0.5">Automatically import all cards from an issuer</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label htmlFor="issuer" className="block text-sm font-bold text-white mb-2">
                                            Card Issuer
                                        </label>
                                        <input
                                            id="issuer"
                                            type="text"
                                            value={issuer}
                                            onChange={(e) => setIssuer(e.target.value)}
                                            placeholder="e.g., Chase, American Express, Citi"
                                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                                            autoFocus
                                        />
                                        <p className="text-xs text-slate-500 mt-2">
                                            AI will scrape the web and import <span className="text-purple-400 font-bold">all cards</span> from this issuer with their benefits
                                        </p>
                                    </div>

                                    {/* Example cards */}
                                    <div className="bg-purple-600/5 border border-purple-500/20 rounded-lg p-3">
                                        <p className="text-xs font-bold text-purple-300 mb-2">✨ Examples:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {['Chase', 'American Express', 'Citi', 'Capital One', 'Discover'].map((example) => (
                                                <button
                                                    key={example}
                                                    type="button"
                                                    onClick={() => setIssuer(example)}
                                                    className="px-3 py-1 text-xs font-bold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-full transition-colors"
                                                >
                                                    {example}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex gap-3 p-6 border-t border-white/5 bg-dark-900/50">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg font-bold text-sm text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!issuer.trim()}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Import All Cards
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
