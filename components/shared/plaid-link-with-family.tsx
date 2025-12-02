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
import { FamilyMemberSelector } from "@/components/velocity/family-member-selector";
import { Plus } from "lucide-react";

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
      <Button onClick={startLink} disabled={loading}>
        <Plus className="w-4 h-4 mr-2" />
        {loading ? "Connecting..." : "Connect Bank Account"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <FamilyMemberSelector
        currentMemberId={selectedFamilyMemberId}
        members={familyMembers}
        onSelect={setSelectedFamilyMemberId}
      />
      <Button onClick={startLink} disabled={loading}>
        <Plus className="w-4 h-4 mr-2" />
        {loading ? "Connecting..." : "Connect Bank"}
      </Button>
    </div>
  );
}
