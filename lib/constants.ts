/**
 * Application-wide constants
 *
 * @module lib/constants
 */

/**
 * Color palette for user avatars and UI elements
 */
export const USER_AVATAR_COLORS = Object.freeze([
  "bg-pink-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-purple-500",
]);

/**
 * Plaid transaction sync configuration
 */
export const PLAID_SYNC_CONFIG = Object.freeze({
  /** Maximum number of sync iterations to prevent infinite loops */
  MAX_ITERATIONS: 50,
  /** Database transaction timeout in milliseconds */
  DB_TIMEOUT_MS: 120000,
});

/**
 * Default currency for financial formatting
 */
export const DEFAULT_CURRENCY = "USD" as const;

/**
 * Date format configurations
 */
export const DATE_FORMATS = {
  SHORT: {
    month: "short" as const,
    day: "numeric" as const,
    year: "numeric" as const,
  },
  LONG: {
    weekday: "long" as const,
    year: "numeric" as const,
    month: "long" as const,
    day: "numeric" as const,
  },
} as const;

/**
 * API response messages
 */
export const API_MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  USER_NOT_FOUND: "User profile not found",
  INTERNAL_ERROR: "Internal Server Error",
  MISSING_ITEM_ID: "Missing item ID",
  ITEM_NOT_FOUND: "Item not found",
  ACCESS_TOKEN_FAILED: "Failed to retrieve access token",
  NAME_REQUIRED: "Name is required",
} as const;

/**
 * User roles
 */
export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "Member",
  OWNER: "Owner",
} as const;
