'use client';

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Utility function to validate URLs
function isValidUrl(string: string): boolean {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface FamilyMember {
    id: string;
    name: string;
    avatar?: string | null;
    isPrimary: boolean;
}

interface FamilyMemberSelectorProps {
    currentMemberId: string;
    members: FamilyMember[];
    onSelect: (memberId: string) => void;
}

export function FamilyMemberSelector({
    currentMemberId,
    members,
    onSelect,
}: FamilyMemberSelectorProps) {
    const [open, setOpen] = useState(false);
    const selectedMember = members.find((m) => m.id === currentMemberId) || members[0];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    role="combobox"
                    aria-expanded={open}
                    className="h-8 w-auto min-w-[140px] justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 text-xs font-medium text-slate-200 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                    <div className="flex items-center gap-2">
                        <div className="relative flex h-5 w-5 shrink-0 overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-indigo-500 to-purple-600">
                            {selectedMember?.avatar && isValidUrl(selectedMember.avatar) ? (
                                <img
                                    src={selectedMember.avatar}
                                    alt={selectedMember.name}
                                    className="aspect-square h-full w-full object-cover"
                                    onError={(e) => {
                                        // Fallback to initials on image load error
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            <div className={`flex h-full w-full items-center justify-center bg-indigo-500 text-[9px] font-bold text-white uppercase ${(selectedMember?.avatar && isValidUrl(selectedMember.avatar)) ? 'hidden' : ''}`}>
                                {selectedMember?.name?.substring(0, 2) || 'FM'}
                            </div>
                        </div>
                        <span className="truncate max-w-[80px]">
                            {selectedMember?.name || 'Select...'}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-black/80 backdrop-blur-xl border-white/10 text-slate-200 shadow-2xl rounded-xl overflow-hidden">
                <div className="p-2">
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Assign Account To
                    </div>
                    <div className="space-y-1">
                        {members.map((member) => (
                            <motion.button
                                key={member.id}
                                onClick={() => {
                                    onSelect(member.id);
                                    setOpen(false);
                                }}
                                className={cn(
                                    "relative flex w-full cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors hover:bg-white/10 focus:bg-white/10",
                                    currentMemberId === member.id && "bg-white/10 text-white"
                                )}
                                whileHover={{ x: 4 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/10 mr-3 bg-gradient-to-br from-slate-700 to-slate-600">
                                    {member.avatar && isValidUrl(member.avatar) ? (
                                        <img
                                            src={member.avatar}
                                            alt={member.name}
                                            className="aspect-square h-full w-full object-cover"
                                            onError={(e) => {
                                                // Fallback to initials on image load error
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    <div className={`flex h-full w-full items-center justify-center text-xs font-bold text-white uppercase ${(member.avatar && isValidUrl(member.avatar)) ? 'hidden' : ''}`}>
                                        {member.name.substring(0, 2)}
                                    </div>
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="font-medium text-sm">
                                        {member.name}
                                    </span>
                                    {member.isPrimary && (
                                        <span className="text-[10px] text-indigo-400 font-medium">
                                            Primary Owner
                                        </span>
                                    )}
                                </div>
                                {currentMemberId === member.id && (
                                    <motion.div
                                        layoutId="check"
                                        className="absolute right-2 text-indigo-400"
                                    >
                                        <Check className="h-4 w-4" />
                                    </motion.div>
                                )}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
