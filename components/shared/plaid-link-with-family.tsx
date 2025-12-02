"use client";

/**
 * Enhanced Plaid Link Component with Family Member Selection
 *
 * @module components/shared/plaid-link-with-family
 * @implements BR-010 - Family Member Assignment
 * @satisfies US-006 - Link Bank Account
 *
 * Allows users to select which family member should own the linked bank account
 * before initiating the Plaid Link flow.
 */

import React, { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ChevronsUpDown, Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PlaidMetadata {
  institution?: {
    institution_id: string;
    name: string;
  } | null;
  accounts?: Array<{
    id: string;
    name: string;
    type: string;
    subtype: string;
  }>;
  link_session_id?: string;
}

interface FamilyMember {
  id: string;
  name: string;
  avatar?: string | null;
  isPrimary: boolean;
}

interface PlaidLinkWithFamilyProps {
  familyMembers: FamilyMember[];
}

export default function PlaidLinkWithFamily({
  familyMembers,
}: PlaidLinkWithFamilyProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shouldOpen, setShouldOpen] = useState(false);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string>(
    familyMembers.find((m) => m.isPrimary)?.id || familyMembers[0]?.id || "",
  );
  const router = useRouter();

  const onSuccess = useCallback(
    async (public_token: string, metadata: PlaidMetadata) => {
      try {
        const response = await fetch("/api/plaid/exchange-public-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            public_token,
            metadata,
            familyMemberId: selectedFamilyMemberId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error("Failed to exchange token");
        }

        if (data.duplicate) {
          toast.info("This bank account is already linked.");
        } else {
          const memberName =
            familyMembers.find((m) => m.id === selectedFamilyMemberId)?.name ||
            "selected member";
          toast.success(`Bank account linked successfully to ${memberName}!`);
        }

        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error("Failed to link bank account");
      }
    },
    [router, selectedFamilyMemberId, familyMembers],
  );

  const config: Parameters<typeof usePlaidLink>[0] = {
    token,
    onSuccess,
  };

  const { open, ready } = usePlaidLink(config);

  useEffect(() => {
    if (token && ready && shouldOpen) {
      open();
      setShouldOpen(false);
      setLoading(false);
    }
  }, [token, ready, shouldOpen, open]);

  const startLink = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/plaid/create-link-token", {
        method: "POST",
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("Failed to create link token:", text);
        toast.error("Failed to initialize Plaid");
        setLoading(false);
        return;
      }
      const data = await response.json();
      setToken(data.link_token);
      setShouldOpen(true);
    } catch (error) {
      console.error("Error creating link token:", error);
      toast.error("Error connecting to server");
      setLoading(false);
    }
  };

  // If no family members, show simple button
  if (familyMembers.length === 0) {
    return (
      <Button
        onClick={startLink}
        disabled={loading}
        className="bg-brand-primary hover:bg-brand-primary/90"
      >
        <Plus className="w-4 h-4 mr-2" />
        {loading ? "Connecting..." : "Connect Bank"}
      </Button>
    );
  }

  const selectedMember =
    familyMembers.find((m) => m.id === selectedFamilyMemberId) ||
    familyMembers[0];

  return (
    <div className="relative inline-flex">
      <Button
        onClick={startLink}
        disabled={loading}
        className="bg-brand-primary hover:bg-brand-primary/90 rounded-lg pr-2"
      >
        <Plus className="w-4 h-4 mr-2" />
        {loading ? "Connecting..." : "Connect Bank for"}
        {/* Inline family member display */}
        <div className="ml-2 flex items-center gap-1.5 pl-2 border-l border-white/20">
          <div className="relative flex h-5 w-5 shrink-0 overflow-hidden rounded-full border border-white/30 bg-gradient-to-br from-indigo-500 to-purple-600">
            {selectedMember?.avatar ? (
              <img
                src={selectedMember.avatar}
                alt={selectedMember.name}
                className="aspect-square h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-indigo-500 text-[9px] font-bold text-white uppercase">
                {selectedMember?.name?.substring(0, 2) || "FM"}
              </div>
            )}
          </div>
          <span className="text-sm font-medium">
            {selectedMember?.name || "Select..."}
          </span>
        </div>
      </Button>
      {/* Dropdown trigger overlay - invisible but clickable */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            disabled={loading}
            className="absolute right-0 top-0 h-full w-32 opacity-0 cursor-pointer"
            aria-label="Select family member"
          >
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-70" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 bg-black/80 backdrop-blur-xl border-white/10 text-slate-200 shadow-2xl rounded-xl overflow-hidden">
          <div className="p-2">
            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Link Account To
            </div>
            <div className="space-y-1">
              {familyMembers.map((member) => (
                <motion.button
                  key={member.id}
                  onClick={() => setSelectedFamilyMemberId(member.id)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-lg px-2 py-2 text-sm outline-none transition-colors hover:bg-white/10 focus:bg-white/10",
                    selectedFamilyMemberId === member.id &&
                      "bg-white/10 text-white",
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/10 mr-3 bg-gradient-to-br from-slate-700 to-slate-600">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="aspect-square h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white uppercase">
                        {member.name.substring(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-medium text-sm">{member.name}</span>
                    {member.isPrimary && (
                      <span className="text-[10px] text-indigo-400 font-medium">
                        Primary Owner
                      </span>
                    )}
                  </div>
                  {selectedFamilyMemberId === member.id && (
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
      {/* Visual dropdown indicator */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronsUpDown className="h-3 w-3 text-white/70" />
      </div>
    </div>
  );
}
