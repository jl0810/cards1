import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { plaidClient } from '@/lib/plaid';
import { prisma } from '@/lib/prisma';
import { assertFamilyMemberOwnership, ensurePrimaryFamilyMember } from '@/lib/family';

export async function POST(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { public_token, metadata, familyMemberId } = await req.json();

        // 1. Exchange public token
        const exchangeResponse = await plaidClient.itemPublicTokenExchange({
            public_token,
        });

        const accessToken = exchangeResponse.data.access_token;
        const itemId = exchangeResponse.data.item_id;

        // 2. Get UserProfile
        const userProfile = await prisma.userProfile.findUnique({
            where: { clerkId: userId },
        });

        if (!userProfile) {
            return new NextResponse("User profile not found", { status: 404 });
        }

        // 3. Determine which family member this item belongs to (required)
        let familyMember;
        if (familyMemberId) {
            familyMember = await assertFamilyMemberOwnership(userProfile.id, familyMemberId);
        } else {
            familyMember = await ensurePrimaryFamilyMember({
                id: userProfile.id,
                name: userProfile.name,
                avatar: userProfile.avatar,
            });
        }

        // 4. Get Accounts info
        let accounts;
        let itemInfo;
        let liabilitiesData: Record<string, any> = {};

        try {
            const liabilitiesResponse = await plaidClient.liabilitiesGet({
                access_token: accessToken,
            });
            accounts = liabilitiesResponse.data.accounts;
            itemInfo = liabilitiesResponse.data.item;
            
            // Map liabilities by account_id for easy lookup
            if (liabilitiesResponse.data.liabilities?.credit) {
                liabilitiesResponse.data.liabilities.credit.forEach((l: any) => {
                    liabilitiesData[l.account_id] = l;
                });
            }
        } catch (err) {
            console.log("Failed to fetch liabilities, falling back to accountsGet", err);
            const accountsResponse = await plaidClient.accountsGet({
                access_token: accessToken,
            });
            accounts = accountsResponse.data.accounts;
            itemInfo = accountsResponse.data.item;
        }

        const institutionId = itemInfo.institution_id;

        // Get institution name from metadata or fetch it
        const institutionName = metadata?.institution?.name || "Unknown Institution";

        // 5. Save to Vault
        // We use a raw query to insert into the vault.secrets table via the create_secret function
        const vaultResult = await prisma.$queryRaw<{ id: string }[]>`
      SELECT vault.create_secret(${accessToken}, ${itemId}, 'Plaid Access Token') as id;
    `;

        const secretId = vaultResult[0]?.id;

        if (!secretId) {
            throw new Error("Failed to store access token in vault");
        }

        // 6. Save to DB
        const plaidItem = await prisma.plaidItem.create({
            data: {
                userId: userProfile.id,
                familyMemberId: familyMember.id,
                itemId: itemId,
                accessTokenId: secretId,
                institutionId: institutionId,
                institutionName: institutionName,
                accounts: {
                    create: accounts.map((acc) => {
                        const creditLiability = liabilitiesData[acc.account_id];
                        // Find purchase APR or take the first one
                        const apr = creditLiability?.aprs?.find((a: any) => a.apr_type === 'purchase_apr')?.apr_percentage 
                            || creditLiability?.aprs?.[0]?.apr_percentage;

                        return {
                            accountId: acc.account_id,
                            name: acc.name,
                            mask: acc.mask,
                            type: acc.type,
                            subtype: acc.subtype,
                            currentBalance: acc.balances.current,
                            availableBalance: acc.balances.available,
                            limit: acc.balances.limit,
                            isoCurrencyCode: acc.balances.iso_currency_code,
                            familyMemberId: familyMember.id,
                            // Liability fields
                            apr: apr,
                            minPaymentAmount: creditLiability?.minimum_payment_amount,
                            lastStatementBalance: creditLiability?.last_statement_balance,
                            nextPaymentDueDate: creditLiability?.next_payment_due_date ? new Date(creditLiability.next_payment_due_date) : null,
                            lastStatementIssueDate: creditLiability?.last_statement_issue_date ? new Date(creditLiability.last_statement_issue_date) : null,
                        };
                    }),
                },
            },
        });

        // 7. Trigger Initial Transaction Sync (Async)
        // We pass the itemId (Plaid ID) or our DB ID. Let's pass our DB ID for better lookup.
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/sync-transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: plaidItem.itemId, cursor: null }), // Changed to send itemId
        }).catch(err => console.error("Failed to trigger initial sync", err));

        return NextResponse.json({ ok: true, itemId: plaidItem.id });
    } catch (error) {
        console.error('Error exchanging public token:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
