import { prisma } from '@/lib/prisma';
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode } from 'plaid';
import { PlaidInstitutionExtendedSchema } from '@/lib/validations';
import type { z } from 'zod';

type PlaidInstitutionExtended = z.infer<typeof PlaidInstitutionExtendedSchema>;

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
        // Cast to PlaidInstitutionExtended because Plaid types might be missing logo_url
        const inst = institution as PlaidInstitutionExtended;

        // Prefer Plaid's logo (Base64) or URL
        logoUrl = inst.logo ? `data:image/png;base64,${inst.logo}` : (inst.logo_url ?? null);
        brandColor = inst.primary_color ?? null;

    } catch (e) {
        console.warn('Plaid institution fetch failed', e);
    }

    // Fallback to Logo.dev if no logo found and we have a name
    if (!logoUrl && institutionName) {
        // 1. Try to get the official URL from Plaid to find the domain
        let domain: string | null = null;

        // Check if we already fetched the full institution object above (likely not full details in getById if fetched elsewhere, but let's re-fetch to be safe if we didn't get it)
        // Actually, we fetched it above in the try/catch block. Let's check if we can extract the URL from the first call if possible, or re-fetch.
        // The first call was `institutionsGetById`. Plaid's `Institution` object has a `url` field.
        
        try {
             // We need to re-fetch or use the data if we stored it. The variable `inst` above is scoped to the try block.
             // Let's do a clean fetch here if we didn't get a logo, specifically for the URL.
             const resp = await plaidClient.institutionsGetById({
                client_id: process.env.PLAID_CLIENT_ID!,
                secret: process.env.PLAID_SECRET!,
                institution_id: institutionId,
                country_codes: [CountryCode.Us],
                options: { include_optional_metadata: true }
            });
            if (resp.data.institution.url) {
                domain = new URL(resp.data.institution.url).hostname.replace('www.', '');
            }
        } catch (e) {
            // ignore fetch error
        }

        // 2. If no domain from Plaid, try to guess it from the name
        if (!domain) {
            const cleanName = institutionName.toLowerCase()
                .replace(/ bank/g, '')
                .replace(/ credit union/g, '')
                .replace(/ federal/g, '')
                .replace(/[^a-z0-9]/g, '');
            domain = `${cleanName}.com`;
        }

        // 3. Construct Logo URL
        if (domain) {
            const logoDevToken = process.env.LOGO_DEV_TOKEN;
            if (logoDevToken) {
                // Use Logo.dev (authenticated)
                logoUrl = `https://img.logo.dev/${domain}?token=${logoDevToken}&size=128&format=png`;
            } else {
                // Fallback to public Clearbit (unauthenticated, might be rate limited or deprecated)
                // Since user asked for backend storage, this is fine as a fallback.
                logoUrl = `https://logo.clearbit.com/${domain}`;
            }
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
