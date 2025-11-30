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

/**
 * Clerk Webhook Event Schemas
 * 
 * @implements BR-001 - User Profile Creation (via webhook validation)
 * @satisfies US-001 - User Registration
 * @tested __tests__/lib/validations.test.ts (webhook validation)
 */
export const ClerkWebhookEventSchema = z.object({
  type: z.string(),
  data: z.object({
    id: z.string(),
    email_addresses: z.array(z.object({
      email_address: z.string().email(),
      id: z.string(),
    })).optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    image_url: z.string().url().optional(),
    public_metadata: z.record(z.unknown()).optional(),
  }),
});

export const ClerkWebhookHeadersSchema = z.object({
  'svix-id': z.string().min(1),
  'svix-timestamp': z.string().min(1),
  'svix-signature': z.string().min(1),
});

/**
 * API Response Schemas
 */
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});

/**
 * Transaction Query Schemas
 */
export const TransactionQuerySchema = z.object({
  benefitId: z.string().min(1, 'Benefit ID is required'),
});

/**
 * Plaid Item Assignment Schema
 */
export const AssignPlaidItemSchema = z.object({
  familyMemberId: z.string().min(1, 'Family member ID is required'),
});

/**
 * Generic API Error type (replaces 'any')
 */
export type ApiError = {
  message: string;
  status?: number;
  details?: unknown;
};

/**
 * Generic Success Response type
 */
export type SuccessResponse<T = unknown> = {
  success: true;
  data: T;
  message?: string;
};
