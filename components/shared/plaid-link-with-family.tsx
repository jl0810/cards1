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
  onSuccess?: () => void;
}

export default function PlaidLinkWithFamily({
  familyMembers,
  onSuccess: onLinkSuccess,
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
        const requestBody = {
          public_token,
          metadata,
          familyMemberId: selectedFamilyMemberId,
        };

        const response = await fetch("/api/plaid/exchange-public-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          throw new Error(
            `Server returned invalid response (${response.status})`,
          );
        }

        if (!response.ok) {
          // Show specific error message from server
          const errorMessage =
            data?.error?.message ||
            data?.error ||
            data?.message ||
            "Failed to exchange token";

          throw new Error(errorMessage);
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
        if (onLinkSuccess) {
          onLinkSuccess();
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to link bank account";
        toast.error(errorMessage);
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
        className="bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
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
        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg pr-2 transition-colors"
      >
        <Plus className="w-4 h-4 mr-2" />
        {loading ? "Connecting..." : "Connect Bank for"}
        {/* Inline family member display */}
        <div className="ml-2 flex items-center gap-1.5 pl-2 border-l border-white/20">
          <div className="relative flex h-5 w-5 shrink-0 overflow-hidden rounded-full border border-white/30 bg-indigo-500/20 flex items-center justify-center">
            <span className="text-xs font-medium text-indigo-300">
              {selectedMember?.name?.substring(0, 2)?.toUpperCase() || "FM"}
            </span>
          </div>
          <span className="text-sm font-medium text-white max-w-[100px] truncate">
            {selectedMember?.name?.substring(0, 10) || "Select..."}
            {selectedMember?.name?.length > 10 && "..."}
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
                  <div className="relative flex h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white/20 bg-indigo-500/20 flex items-center justify-center mr-3">
                    <span className="text-xs font-medium text-indigo-300">
                      {member.name?.substring(0, 2)?.toUpperCase() || "FM"}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-white max-w-[120px] truncate">
                    {member.name?.substring(0, 10)}
                    {member.name?.length > 10 && "..."}
                  </span>
                  {member.isPrimary && (
                    <>
                      <span className="text-[10px] text-indigo-400 font-medium">
                        Primary Owner
                      </span>
                      <motion.div
                        layoutId="check"
                        className="absolute right-2 text-indigo-400"
                      >
                        <Check className="h-4 w-4" />
                      </motion.div>
                    </>
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
