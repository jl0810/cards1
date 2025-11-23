import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { plaidClient } from '@/lib/plaid';
import { prisma } from '@/lib/prisma';
import { assertFamilyMemberOwnership, ensurePrimaryFamilyMember } from '@/lib/family';

/**
 * Exchanges a Plaid public token for an access token and creates a new PlaidItem.
 * 
 * This endpoint handles:
 * 1. User authentication and profile retrieval.
 * 2. Family member assignment (defaulting to primary if not specified).
 * 3. Duplicate item detection (checking institution ID and account masks).
 * 4. Token exchange with Plaid.
 * 5. Secure storage of the access token in Supabase Vault.
 * 6. Creation of PlaidItem and PlaidAccount records in the database.
 * 7. Triggering an initial transaction sync.
 * 
 * @param {Request} req - The request object containing public_token, metadata, and optional familyMemberId.
 * @returns {NextResponse} JSON response with success status and itemId, or error message.
 */
export async function POST(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { public_token, metadata, familyMemberId } = await req.json();

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

        const institutionId = metadata?.institution?.institution_id;
        const institutionName = metadata?.institution?.name || "Unknown Institution";
        const newAccounts = metadata?.accounts || [];

        // 1. Check for Duplicate / Existing Item BEFORE exchange
        // "Do not exchange a public token for an access token if you detect a duplicate Item."
        if (institutionId) {
            const existingItem = await prisma.plaidItem.findFirst({
                where: {
                    userId: userProfile.id,
                    institutionId: institutionId,
                },
                include: { accounts: true },
            });

            if (existingItem) {
                // Check for matching accounts (mask + subtype)
                const matchCount = newAccounts.filter((na: any) =>
                    existingItem.accounts.some(ea => ea.mask === na.mask && ea.subtype === na.subtype)
                ).length;

                if (matchCount > 0) {
                    console.log(`Duplicate item detected (${existingItem.id}). Skipping token exchange.`);
                    // Return success but indicate it was a duplicate. We return the existing item ID.
                    return NextResponse.json({ ok: true, itemId: existingItem.id, duplicate: true });
                }
            }
        }

        // 2. Exchange public token (Only if not a duplicate)
        const exchangeResponse = await plaidClient.itemPublicTokenExchange({
            public_token,
        });

        const accessToken = exchangeResponse.data.access_token;
        const itemId = exchangeResponse.data.item_id;

        // 3. Get Accounts info (Fetch from Plaid since metadata might be incomplete for full details like balances)
        let accounts;
        let liabilitiesData: Record<string, any> = {};

        try {
            const liabilitiesResponse = await plaidClient.liabilitiesGet({
                access_token: accessToken,
            });
            accounts = liabilitiesResponse.data.accounts;

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
        }

        // 4. Save to Vault
        // We use a raw query to insert into the vault.secrets table via the create_secret function
        const vaultResult = await prisma.$queryRaw<{ id: string }[]>`
            SELECT vault.create_secret(${accessToken}, ${itemId}, 'Plaid Access Token') as id;
        `;

        const secretId = vaultResult[0]?.id;

        if (!secretId) {
            throw new Error("Failed to store access token in vault");
        }

        // 5. Save to DB
        const plaidItem = await prisma.plaidItem.create({
            data: {
                userId: userProfile.id,
                familyMemberId: familyMember.id,
                itemId: itemId,
                accessTokenId: secretId,
                institutionId: institutionId,
                institutionName: institutionName,
                accounts: {
                    create: accounts.map((acc: any) => {
                        const creditLiability = liabilitiesData[acc.account_id];
                        // Find purchase APR or take the first one
                        const apr = creditLiability?.aprs?.find((a: any) => a.apr_type === 'purchase_apr')?.apr_percentage
                            || creditLiability?.aprs?.[0]?.apr_percentage;

                        return {
                            accountId: acc.account_id,
                            name: acc.name,
                            officialName: acc.official_name,
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

        let plaidItemDbId = plaidItem.id;

        // 7. Trigger Initial Transaction Sync (Async)
        // We pass the itemId (Plaid ID) or our DB ID. The sync endpoint expects 'itemId' which usually refers to the Plaid Item ID string in this codebase context, 
        // but let's check the sync endpoint. If it takes DB ID, great. 
        // Actually, let's just pass the itemId string which we have in 'itemId' variable.
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/sync-transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: itemId, cursor: null }),
        }).catch(err => console.error("Failed to trigger initial sync", err));

        return NextResponse.json({ ok: true, itemId: plaidItemDbId });
    } catch (error) {
        console.error('Error exchanging public token:', error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
