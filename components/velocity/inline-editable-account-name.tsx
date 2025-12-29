"use client";

import { useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { updateAccountNickname } from "@/app/actions/accounts";
import { getAccountDisplayName } from "@/lib/utils/account-display";

interface InlineEditableAccountNameProps {
  account: {
    id: string;
    name: string;
    officialName?: string | null;
    mask: string;
    extended?: {
      nickname?: string | null;
    } | null;
  };
  onUpdate?: () => void;
}

export function InlineEditableAccountName({
  account,
  onUpdate,
}: InlineEditableAccountNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState(account.extended?.nickname || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayName = getAccountDisplayName(account);

  const handleSave = async () => {
    setIsSubmitting(true);
    const newNickname = nickname.trim() || null;

    try {
      const result = await updateAccountNickname({
        accountId: account.id,
        nickname: newNickname,
      });

      if (result.success) {
        toast.success("Account name updated");
        setIsEditing(false);
        // Call onUpdate to refresh parent data
        onUpdate?.();
      } else {
        // Revert on error
        setNickname(account.extended?.nickname || "");
        toast.error(result.error || "Failed to update account name");
      }
    } catch {
      // Revert on error
      setNickname(account.extended?.nickname || "");
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNickname(account.extended?.nickname || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 w-full">
        <Input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={account.officialName || account.name}
          autoFocus
          className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleSave}
          disabled={isSubmitting}
          className="h-8 w-8 hover:bg-white/10"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Check className="h-4 w-4 text-green-500" />
          )}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleCancel}
          className="h-8 w-8 hover:bg-white/10"
        >
          <X className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
      >
        <Pencil className="h-3 w-3 text-slate-400" />
      </Button>
      <p className="font-medium text-white flex-1">
        {displayName}
        {account.extended?.nickname && (
          <span className="ml-2 text-xs text-slate-400">(Custom)</span>
        )}
      </p>
      {account.extended?.nickname && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={async () => {
            setIsSubmitting(true);
            try {
              const result = await updateAccountNickname({
                accountId: account.id,
                nickname: null,
              });
              if (result.success) {
                toast.success("Reverted to original name");
                setNickname("");
                onUpdate?.();
              } else {
                toast.error("Failed to revert name");
              }
            } catch {
              toast.error("An unexpected error occurred");
            } finally {
              setIsSubmitting(false);
            }
          }}
          disabled={isSubmitting}
          className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 text-slate-400"
        >
          Revert
        </Button>
      )}
    </div>
  );
}
