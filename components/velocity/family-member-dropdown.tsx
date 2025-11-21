"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

interface FamilyMemberDropdownProps {
    members: Array<{ id: string; name: string; color?: string }>;
    selectedId: string;
    onSelect: (id: string) => void;
    onClose: () => void;
}

export function FamilyMemberDropdown({ members, selectedId, onSelect, onClose }: FamilyMemberDropdownProps) {
    const [isOpen, setIsOpen] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setTimeout(onClose, 200);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const selectedMember = members.find(m => m.id === selectedId);

    return (
        <div ref={dropdownRef} className="relative flex-1">
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2.5 text-sm font-bold bg-white/10 border border-white/20 rounded-xl text-white flex items-center justify-between hover:bg-white/15 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {selectedMember?.color && (
                        <div className={`w-2 h-2 rounded-full ${selectedMember.color}`} />
                    )}
                    <span>{selectedMember?.name || 'Select member'}</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 backdrop-blur-xl"
                    >
                        <div className="py-1">
                            {members.map((member) => {
                                const isSelected = member.id === selectedId;
                                return (
                                    <button
                                        key={member.id}
                                        onClick={() => {
                                            onSelect(member.id);
                                            setIsOpen(false);
                                            setTimeout(onClose, 200);
                                        }}
                                        className={`w-full px-3 py-2.5 text-sm font-bold flex items-center justify-between transition-colors ${isSelected
                                                ? 'bg-brand-primary/20 text-white'
                                                : 'text-slate-300 hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {member.color && (
                                                <div className={`w-2 h-2 rounded-full ${member.color}`} />
                                            )}
                                            <span>{member.name}</span>
                                        </div>
                                        {isSelected && <Check className="w-4 h-4 text-brand-primary" />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
