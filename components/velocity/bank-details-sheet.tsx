"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, RefreshCw, Link as LinkIcon } from "lucide-react";
import { PlaidLinkUpdate } from "@/components/shared/plaid-link-update";
import { FamilyMemberSelector } from "./family-member-selector";
import { BankLogo } from "./bank-logo";
import { LinkedCardDisplay } from "./linked-card-display";
import { CardProductMatcher } from "./card-product-matcher";
import { InlineEditableAccountName } from "./inline-editable-account-name";
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
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                item.status === 'active' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {item.status === 'active' ? 'Connected' : 'Needs Update'}
              </span>
              {item.status === "needs_reauth" && (
                <PlaidLinkUpdate
                  itemId={item.id}
                  institutionName={item.institutionName || "this bank"}
                  onSuccess={onUpdateSuccess}
                  variant="default"
                  size="sm"
                  className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700"
                />
              )}
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
                      <div className="flex-1">
                        <InlineEditableAccountName
                          account={account}
                          onUpdate={onUpdateSuccess}
                        />
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

        {/* Danger Zone */}
        <div className="pt-6 mt-6 border-t border-white/10">
          <h3 className="text-sm font-medium text-red-400 mb-4">Danger Zone</h3>
          <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Disconnect Bank</p>
              <p className="text-xs text-slate-400 mt-1">
                Stop syncing data from this bank. Your existing data will be
                preserved.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              title="Disconnect Bank"
              onClick={() => onDisconnect(item.id)}
            >
              Disconnect
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
