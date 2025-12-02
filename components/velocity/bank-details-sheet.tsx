"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, CreditCard, AlertCircle, Building2 } from "lucide-react";
import { PlaidLinkUpdate } from "@/components/shared/plaid-link-update";
import { FamilyMemberSelector } from "./family-member-selector";
import { BankLogo } from "./bank-logo";
import { LinkedCardDisplay } from "./linked-card-display";
import { CardProductMatcher } from "./card-product-matcher";
import type { PlaidItem, FamilyMember } from "./bank-accounts-view";

interface BankDetailsSheetProps {
  item: PlaidItem | null;
  isOpen: boolean;
  onClose: () => void;
  familyMembers: FamilyMember[];
  onUpdateFamilyMember: (itemId: string, memberId: string) => Promise<void>;
  onDisconnect: (itemId: string) => Promise<void>;
  onUpdateSuccess: () => void;
}

export function BankDetailsSheet({
  item,
  isOpen,
  onClose,
  familyMembers,
  onUpdateFamilyMember,
  onDisconnect,
  onUpdateSuccess,
}: BankDetailsSheetProps) {
  const [linkingAccountId, setLinkingAccountId] = React.useState<string | null>(
    null,
  );

  if (!item) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-slate-950 border-white/10 text-white">
        <SheetHeader className="space-y-4 pb-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BankLogo
                name={item.institutionName}
                bankId={item.bankId}
                size="lg"
              />
              <div>
                <SheetTitle className="text-2xl font-bold text-white">
                  {item.institutionName || "Unknown Bank"}
                </SheetTitle>
                <SheetDescription className="text-slate-400">
                  {item.accounts.length} connected account
                  {item.accounts.length !== 1 ? "s" : ""}
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDisconnect(item.id)}
                className="text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                title="Disconnect Bank"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
            <span className="text-sm text-slate-400">Assigned to:</span>
            <FamilyMemberSelector
              currentMemberId={item.familyMemberId}
              members={familyMembers}
              onSelect={(memberId) => onUpdateFamilyMember(item.id, memberId)}
            />
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Status Alert */}
          {item.status === "needs_reauth" && (
            <Alert
              variant="destructive"
              className="bg-red-500/10 border-red-500/20"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription className="mt-2 space-y-3">
                <p>
                  Your connection to {item.institutionName} needs to be updated.
                  This usually happens when you change your password.
                </p>
                <PlaidLinkUpdate
                  itemId={item.id}
                  institutionName={item.institutionName || "this bank"}
                  onSuccess={onUpdateSuccess}
                  variant="destructive"
                  size="sm"
                />
              </AlertDescription>
            </Alert>
          )}

          {/* Accounts List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Connected Cards
            </h3>

            <div className="grid gap-4">
              {item.accounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {account.extended?.nickname ??
                            account.officialName ??
                            account.name}
                        </p>
                        <p className="text-sm text-slate-400">
                          •••• {account.mask}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-white">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: account.isoCurrencyCode || "USD",
                        }).format(account.currentBalance || 0)}
                      </p>
                      <p className="text-xs text-slate-500">Current Balance</p>
                    </div>
                  </div>

                  {/* Card Product Matcher */}
                  <div className="pt-4 border-t border-white/5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-dashed border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-400"
                      onClick={() => setLinkingAccountId(account.id)}
                    >
                      {account.extended?.cardProduct
                        ? "Change Linked Card"
                        : "Link to Credit Card Product"}
                    </Button>

                    <CardProductMatcher
                      isOpen={linkingAccountId === account.id}
                      onClose={() => setLinkingAccountId(null)}
                      accountId={account.id}
                      accountName={account.name}
                      institutionName={item.institutionName}
                      bankId={item.bankId}
                      currentProductId={account.extended?.cardProductId}
                      onSuccess={() => {
                        setLinkingAccountId(null);
                        onUpdateSuccess();
                      }}
                    />
                  </div>

                  {/* Linked Card Display (Benefits) */}
                  {account.extended?.cardProduct && (
                    <div className="pt-2">
                      <LinkedCardDisplay
                        product={account.extended.cardProduct}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
