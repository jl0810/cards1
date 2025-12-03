/**
 * Get the display name for an account
 * Uses nickname if available, otherwise falls back to official name or account name
 *
 * @param account - PlaidAccount with optional extended data
 * @returns Display name for the account
 */
export function getAccountDisplayName(account: {
  name: string;
  officialName?: string | null;
  extended?: {
    nickname?: string | null;
  } | null;
}): string {
  // Priority: nickname > officialName > name
  return account.extended?.nickname || account.officialName || account.name;
}

/**
 * Format account identifier (last 4 digits)
 *
 * @param mask - Account mask (e.g., "1234")
 * @returns Formatted string (e.g., "••1234")
 */
export function formatAccountMask(mask: string | null): string {
  if (!mask) return "";
  return `••${mask}`;
}
