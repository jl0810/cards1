/**
 * Validation schemas for API requests using Zod
 * 
 * @module lib/validations
 * 
 * @implements BR-026 - Input Validation Required
 * @implements BR-027 - Data Sanitization
 * @satisfies US-015 - Input Validation
 * @tested __tests__/lib/validations.test.ts
 * 
 * @example
 * ```typescript
 * import { CreateFamilyMemberSchema } from '@/lib/validations';
 * 
 * const result = CreateFamilyMemberSchema.safeParse(body);
 * if (!result.success) {
 *   return Errors.badRequest(result.error.message);
 * }
 * const { name, email } = result.data;
 * ```
 */

import { z } from 'zod';

/**
 * Family Member validation schemas
 * 
 * @implements BR-004 - Family Member Name Requirements
 * @satisfies US-003 - Add Family Members
 * @tested __tests__/lib/validations.test.ts (lines 12-72)
 */
export const CreateFamilyMemberSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z.string()
    .email('Invalid email address')
    .optional()
    .nullable(),
  avatar: z.string()
    .url('Invalid avatar URL')
    .optional()
    .nullable(),
  role: z.string()
    .optional()
    .default('Member'),
});

/**
 * @implements BR-005 - Partial Updates Allowed
 * @satisfies US-004 - Update Family Member
 * @tested __tests__/lib/validations.test.ts (lines 74-88)
 */
export const UpdateFamilyMemberSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  email: z.string()
    .email('Invalid email address')
    .optional()
    .nullable(),
  avatar: z.string()
    .url('Invalid avatar URL')
    .optional()
    .nullable(),
});

/**
 * Plaid sync validation schemas
 */
export const SyncTransactionsSchema = z.object({
  itemId: z.string()
    .min(1, 'Item ID is required'),
  cursor: z.string()
    .optional()
    .nullable(),
});

/**
 * Account nickname validation schema
 * 
 * @implements BR-016 - Account Nickname Persistence
 * @satisfies US-009 - Nickname Accounts
 * @tested __tests__/lib/validations.test.ts (lines 100-118)
 */
export const UpdateAccountNicknameSchema = z.object({
  nickname: z.string()
    .max(50, 'Nickname must be less than 50 characters')
    .trim()
    .nullable(),
});

/**
 * Card product validation schemas
 */
export const CreateCardProductSchema = z.object({
  issuer: z.string()
    .min(1, 'Issuer is required')
    .max(100, 'Issuer must be less than 100 characters'),
  productName: z.string()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be less than 200 characters'),
  cardType: z.string()
    .optional()
    .nullable(),
  annualFee: z.number()
    .nonnegative('Annual fee must be non-negative')
    .optional()
    .nullable(),
  signupBonus: z.string()
    .max(500, 'Signup bonus description too long')
    .optional()
    .nullable(),
  imageUrl: z.string()
    .url('Invalid image URL')
    .optional()
    .nullable(),
  bankId: z.string()
    .optional()
    .nullable(),
});

/**
 * User preferences validation schemas
 */
export const UpdateUserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  defaultDashboard: z.string().max(50).optional(),
  sidebarCollapsed: z.boolean().optional(),
  compactMode: z.boolean().optional(),
  betaFeatures: z.boolean().optional(),
  analyticsSharing: z.boolean().optional(),
  crashReporting: z.boolean().optional(),
  autoSave: z.boolean().optional(),
  keyboardShortcuts: z.boolean().optional(),
  soundEffects: z.boolean().optional(),
});

/**
 * Benefit matching validation schemas
 */
export const CreateCardBenefitSchema = z.object({
  cardProductId: z.string()
    .min(1, 'Card product ID is required'),
  benefitName: z.string()
    .min(1, 'Benefit name is required')
    .max(200, 'Benefit name must be less than 200 characters'),
  type: z.enum(['STATEMENT_CREDIT', 'EXTERNAL_CREDIT', 'INSURANCE', 'PERK']),
  description: z.string()
    .max(1000, 'Description too long')
    .optional()
    .nullable(),
  timing: z.string()
    .min(1, 'Timing is required'),
  maxAmount: z.number()
    .nonnegative('Max amount must be non-negative')
    .optional()
    .nullable(),
  keywords: z.array(z.string())
    .min(1, 'At least one keyword is required'),
  ruleConfig: z.record(z.unknown())
    .optional()
    .nullable(),
  active: z.boolean()
    .optional()
    .default(true),
});

/**
 * Helper function to validate and parse request body
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and parsed data
 * @throws Error if validation fails
 * 
 * @example
 * ```typescript
 * const validatedData = validateSchema(CreateFamilyMemberSchema, body);
 * ```
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Helper function to safely validate and parse request body
 * Returns validation result without throwing
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns SafeParseResult containing either success data or error
 * 
 * @example
 * ```typescript
 * const result = safeValidateSchema(CreateFamilyMemberSchema, body);
 * if (!result.success) {
 *   return Errors.badRequest(result.error.message);
 * }
 * const { name } = result.data;
 * ```
 */
export function safeValidateSchema<T>(schema: z.ZodSchema<T>, data: unknown) {
  return schema.safeParse(data);
}
