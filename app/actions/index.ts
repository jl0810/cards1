/**
 * Server Actions Index
 * Re-exports all server actions for convenient importing
 *
 * @module app/actions
 *
 * Usage:
 * import { markAccountPaid, addFamilyMember } from '@/app/actions'
 */

// Account actions
export { updateAccountNickname } from "./accounts";

// Benefit actions
export { matchBenefits } from "./benefits";

// Family actions
export {
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  listFamilyMembers,
} from "./family";

// Preferences actions
export { updatePreferences, getPreferences } from "./preferences";
