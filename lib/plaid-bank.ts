import { prisma } from '@/lib/prisma';
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode } from 'plaid';

const plaidClient = new PlaidApi(
    new Configuration({
        basePath: process.env.PLAID_ENV === 'sandbox' ? PlaidEnvironments.sandbox :
            process.env.PLAID_ENV === 'development' ? PlaidEnvironments.development :
                PlaidEnvironments.production,
        baseOptions: {
            headers: {
                'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
                'PLAID-SECRET': process.env.PLAID_SECRET!,
            },
        },
    })
);

// Create a helper to get a properly configured Plaid client
export function getPlaidClient() {
    return new PlaidApi(
        new Configuration({
            basePath: process.env.PLAID_ENV === 'sandbox' ? PlaidEnvironments.sandbox :
                process.env.PLAID_ENV === 'development' ? PlaidEnvironments.development :
                    PlaidEnvironments.production,
            baseOptions: {
                headers: {
                    'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
                    'PLAID-SECRET': process.env.PLAID_SECRET!,
                },
            },
        })
    );
}

/** Fetch logo & colour from Plaid (optional) */
/** Fetch logo & colour from Plaid (optional) */
export async function fetchInstitutionInfo(institutionId: string, institutionName?: string | null) {
    let logoUrl: string | null = null;
    let brandColor: string | null = null;

    try {
        const resp = await plaidClient.institutionsGetById({
            client_id: process.env.PLAID_CLIENT_ID!,
            secret: process.env.PLAID_SECRET!,
            institution_id: institutionId,
            country_codes: [CountryCode.Us],
        });
        const { institution } = resp.data;
        // Cast to any because Plaid types might be missing logo_url
        const inst = institution as any;

        // Prefer Plaid's logo (Base64) or URL
        logoUrl = inst.logo ? `data:image/png;base64,${inst.logo}` : (inst.logo_url ?? null);
        brandColor = inst.primary_color ?? null;

    } catch (e) {
        console.warn('Plaid institution fetch failed', e);
    }

    // Fallback to Logo.dev if no logo found and we have a name
    if (!logoUrl && institutionName) {
        // Try to construct a domain from the name
        const cleanName = institutionName.toLowerCase()
            .replace(/ bank/g, '')
            .replace(/ credit union/g, '')
            .replace(/ federal/g, '')
            .replace(/[^a-z0-9]/g, '');

        // Use Logo.dev (formerly Clearbit)
        // Format: https://img.logo.dev/{domain}?token={public_key}
        // Since we don't have a domain, we can try to guess it.
        // If we have a URL from Plaid (fetched below), we use that.
        // Otherwise, we can try a best-guess domain.

        const domain = `${cleanName}.com`; // Naive guess
        // We need a public key for Logo.dev. If not present, this might fail or show a placeholder.
        // Assuming the user might have one or we use the free tier if available (Clearbit was free, Logo.dev requires token).
        // If the user meant "Clearbit was bought by Logo.dev" implies we should use the new endpoint.
        // However, without a token, img.logo.dev might not work.
        // Let's try to use the old clearbit endpoint if it still redirects or works, OR use the new one if we had a token.
        // Given the user's comment, let's try to use the most standard way.

        // Actually, let's wait for the re-fetch below which gets the real URL from Plaid.
    }

    // Re-fetch to get the URL if we missed it
    if (!logoUrl) {
        try {
            const resp = await plaidClient.institutionsGetById({
                institution_id: institutionId,
                country_codes: [CountryCode.Us],
            });
            const inst = resp.data.institution;
            if (inst.url) {
                try {
                    const domain = new URL(inst.url).hostname;
                    // Use Logo.dev
                    // Note: This requires a token in production usually.
                    // If the user has a token, it should be in env.
                    // For now, we will use the format: https://img.logo.dev/{domain}?token=pk_...
                    // If no token, we might fall back to a placeholder or the old clearbit URL if it still works (it often redirects).

                    const logoDevToken = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN || process.env.LOGO_DEV_TOKEN;

                    // Logo.dev is the official replacement for Clearbit Logo API
                    if (logoDevToken) {
                        logoUrl = `https://img.logo.dev/${domain}?token=${logoDevToken}`;
                    } else {
                        // Without a token, we can try the legacy Clearbit URL which often still works/redirects
                        // or we can leave it null. But since the user mentioned "definitive replacement",
                        // we should really encourage setting the token.
                        // For now, we'll try the legacy URL as a last resort.
                        logoUrl = `https://logo.clearbit.com/${domain}`;
                    }
                } catch (e) {
                    // invalid url
                }
            }
        } catch (e) {
            // ignore
        }
    }

    return { logoUrl, brandColor };
}

/** Ensure a Bank row exists for the given PlaidItem and return its id */
export async function ensureBankExists(plaidItem: {
    id: string;
    institutionId: string | null;
    institutionName: string | null;
}) {
    if (!plaidItem.institutionId) return null;

    // Try to find existing bank
    let bank = await prisma.bank.findUnique({
        where: { plaidId: plaidItem.institutionId },
    });

    if (!bank) {
        const { logoUrl, brandColor } = await fetchInstitutionInfo(plaidItem.institutionId, plaidItem.institutionName);
        bank = await prisma.bank.create({
            data: {
                plaidId: plaidItem.institutionId,
                name: plaidItem.institutionName ?? plaidItem.institutionId,
                logoUrl,
                brandColor,
            },
        });
    }

    // Update PlaidItem with bankId if not set
    await prisma.plaidItem.update({
        where: { id: plaidItem.id },
        data: { bankId: bank.id },
    });

    return bank.id;
}
