/**
 * Bank and Institution Utilities for Plaid
 * Handles fetching institution metadata and ensuring Bank rows exist.
 * 
 * @module lib/plaid-bank
 * @implements BR-100 - Institution Metadata
 * @satisfies US-011 - Fetch Bank Logo/Colors
 */

import { db, schema, eq } from "@/db";
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode } from "plaid";
import { plaidClient as sharedPlaidClient } from "./plaid";

type PlaidInstitutionExtended = {
  logo?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  [key: string]: unknown;
};

// Use shared client
const plaidClient = sharedPlaidClient;

/**
 * Helper to get a properly configured Plaid client
 * @deprecated Use shared plaidClient from @/lib/plaid instead
 */
export function getPlaidClient() {
  return sharedPlaidClient;
}

/** Fetch logo & colour from Plaid (optional) */
export async function fetchInstitutionInfo(
  institutionId: string,
  institutionName?: string | null,
) {
  let logoUrl: string | null = null;
  let brandColor: string | null = null;

  try {
    const resp = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us],
    });
    const { institution } = resp.data;
    const inst = institution as unknown as PlaidInstitutionExtended;

    // Prefer Plaid's logo (Base64) or URL
    logoUrl = inst.logo
      ? `data:image/png;base64,${inst.logo}`
      : (inst.logo_url ?? null);
    brandColor = inst.primary_color ?? null;
  } catch (_e) {
    console.warn("Plaid institution fetch failed", _e);
  }

  // Fallback to Logo.dev if no logo found and we have a name
  if (!logoUrl && institutionName) {
    let domain: string | null = null;

    try {
      const resp = await plaidClient.institutionsGetById({
        institution_id: institutionId,
        country_codes: [CountryCode.Us],
        options: { include_optional_metadata: true },
      });
      if (resp.data.institution.url) {
        domain = new URL(resp.data.institution.url).hostname.replace(
          "www.",
          "",
        );
      }
    } catch (_e) {
      // ignore fetch error
    }

    if (!domain) {
      const cleanName = institutionName
        .toLowerCase()
        .replace(/ bank/g, "")
        .replace(/ credit union/g, "")
        .replace(/ federal/g, "")
        .replace(/[^a-z0-9]/g, "");
      domain = `${cleanName}.com`;
    }

    if (domain) {
      const logoDevToken = process.env.LOGO_DEV_TOKEN;
      if (logoDevToken) {
        logoUrl = `https://img.logo.dev/${domain}?token=${logoDevToken}&size=128&format=png`;
      } else {
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

  // Try to find existing bank using Drizzle
  let bank = await db.query.banks.findFirst({
    where: eq(schema.banks.plaidId, plaidItem.institutionId),
  });

  if (!bank) {
    const { logoUrl, brandColor } = await fetchInstitutionInfo(
      plaidItem.institutionId,
      plaidItem.institutionName,
    );

    const [newBank] = await db.insert(schema.banks)
      .values({
        plaidId: plaidItem.institutionId,
        name: plaidItem.institutionName ?? plaidItem.institutionId,
        logoUrl,
        brandColor,
        updatedAt: new Date(),
      })
      .returning();

    bank = newBank;
  }

  // Update PlaidItem with bankId if not set
  await db.update(schema.plaidItems)
    .set({
      bankId: bank.id,
      updatedAt: new Date(),
    })
    .where(eq(schema.plaidItems.id, plaidItem.id));

  return bank.id;
}
