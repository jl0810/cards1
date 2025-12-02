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

import { z } from "zod";

/**
 * Plaid API validation schemas
 *
 * @implements BR-008 - Duplicate Detection
 * @implements BR-009 - Secure Token Storage
 * @satisfies US-006 - Link Bank Account
 * @tested __tests__/lib/validations.test.ts (lines 380-387)
 */

export const PlaidAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  mask: z.string().nullable().optional(), // Mask might be null/missing
  type: z.string(),
  subtype: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(), // Accept string or array
  verification_status: z.string().nullable().optional(),
});

export const PlaidCreditLiabilitySchema = z.object({
  account_id: z.string().nullable(),
  aprs: z.array(
    z.object({
      apr_type: z.string(),
      apr_percentage: z.number(),
      balance_subject_to_apr: z.number().nullable().optional(),
    }),
  ),
  minimum_payment_amount: z.number().nullable().optional(),
  last_statement_balance: z.number().nullable().optional(),
  next_payment_due_date: z.string().nullable().optional(),
  last_statement_issue_date: z.string().nullable().optional(),
  last_payment_amount: z.number().nullable().optional(),
  last_payment_date: z.string().nullable().optional(),
});

export const PlaidExchangeTokenSchema = z.object({
  public_token: z.string().min(1, "Public token is required"),
  familyMemberId: z.string().optional(),
  metadata: z.object({
    institution: z.object({
      id: z.string(),
      name: z.string(),
    }),
    accounts: z.array(PlaidAccountSchema),
    link_session_id: z.string().optional(),
  }),
});

export const PlaidWebhookSchema = z.object({
  webhook_type: z.string(),
  webhook_code: z.string(),
  item_id: z.string(),
  error: z.any().optional(), // Plaid errors can vary
});

/**
 * UI Component validation schemas
 *
 * @implements BR-026 - Input Validation Required
 * @satisfies US-015 - Input Validation
 * @tested __tests__/lib/validations.test.ts (lines 387-400)
 */

export const TransactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  date: z.string(),
  category: z.string().optional(),
  pending: z.boolean(),
  accountName: z.string().optional(),
  merchantName: z.string().optional(),
  plaidItem: z
    .object({
      id: z.string(),
      itemId: z.string(),
      institutionName: z.string(),
      familyMemberId: z.string(),
    })
    .optional(),
});

export const PlaidItemSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  institutionName: z.string(),
  familyMemberId: z.string().optional(),
  bankId: z.string().optional(),
  accounts: z.array(z.any()).optional(), // Complex nested structure
});

export const AccountSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  bank: z.string(),
  balance: z.number(),
  userId: z.string(),
  due: z.string(),
  color: z.string(),
  liabilities: z.object({
    apr: z.string(),
    aprType: z.string(),
    aprBalanceSubjectToApr: z.string(),
    aprInterestChargeAmount: z.string(),
    limit: z.string(),
    min_due: z.string(),
    last_statement: z.string(),
    next_due_date: z.string(),
    last_statement_date: z.string(),
    last_payment_amount: z.string(),
    last_payment_date: z.string(),
    status: z.string(),
  }),
  // Extended account properties
  lastStatementBalance: z.number().optional(),
  lastStatementIssueDate: z.string().optional(),
  currentBalance: z.number().optional(),
  lastPaymentAmount: z.number().optional(),
  lastPaymentDate: z.string().optional(),
  nextPaymentDueDate: z.string().optional(),
  subtype: z.string().optional(),
  apr: z.number().optional(),
  aprType: z.string().optional(),
  aprBalanceSubjectToApr: z.number().optional(),
  aprInterestChargeAmount: z.number().optional(),
  isoCurrencyCode: z.string().optional(),
  limit: z.number().optional(),
  minPaymentAmount: z.number().optional(),
  isOverdue: z.boolean().optional(),
  familyMemberId: z.string().optional(),
  officialName: z.string().optional(),
  extended: z
    .object({
      paymentMarkedPaidDate: z.string().optional(),
      nickname: z.string().optional(),
    })
    .optional(),
});

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  avatar: z.string().optional(),
  role: z.string().optional(),
});

export const FamilyMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().optional(),
  role: z.string().optional(),
  color: z.string().optional(),
});

export const BenefitSchema = z.object({
  id: z.string().optional(),
  benefitName: z.string(),
  isApproved: z.boolean(),
});

export const ProductSchema = z.object({
  id: z.string(),
  issuer: z.string(),
  productName: z.string(),
  cardType: z.string().nullable(),
  annualFee: z.number().nullable(),
  signupBonus: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  active: z.boolean(),
  benefits: z.array(BenefitSchema),
});

/**
 * Analytics validation schemas
 *
 * @implements BR-026 - Input Validation Required
 * @satisfies US-015 - Input Validation
 * @tested __tests__/lib/validations.test.ts (lines 387-400)
 */

/**
 * Script validation schemas
 *
 * @implements BR-026 - Input Validation Required
 * @satisfies US-015 - Input Validation
 * @tested __tests__/lib/validations.test.ts (lines 387-400)
 */

export const ScriptPlaidItemSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  institutionId: z.string().nullable(),
  institutionName: z.string().nullable(),
  isTest: z.boolean(),
  nextCursor: z.string().nullable(),
  accessTokenId: z.string(),
  familyMemberId: z.string().nullable(),
  lastSyncedAt: z.date().nullable(),
  bankId: z.string().nullable(),
  status: z.string(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const DatabaseRowSchema = z.object({
  clerkId: z.string(),
});

export const ClerkUserSchema = z.object({
  id: z.string(),
});

/**
 * Test validation schemas
 *
 * @implements BR-026 - Input Validation Required
 * @satisfies US-015 - Input Validation
 * @tested __tests__/lib/validations.test.ts (lines 387-400)
 */

export const JestMockSchema = z.object({
  mockRejectedValue: z.function().args(z.any()).returns(z.any()),
  mockResolvedValue: z.function().args(z.any()).returns(z.any()),
});

export const ClerkAuthMockSchema = z.any(); // Clerk auth functions have complex types, using any for mock compatibility

export const EnvObjectSchema = z.record(z.unknown()); // For iterating over environment keys

export const PlaidProductSchema = z.enum([
  "transactions",
  "auth",
  "identity",
  "income",
  "assets",
  "investments",
  "liabilities",
  "payment_initiation",
  "transfer",
]);

export const DateTimeFormatOptionsSchema = z.object({
  year: z.string().optional(),
  month: z.string().optional(),
  day: z.string().optional(),
});

export const BenefitRuleConfigSchema = z.record(z.unknown()); // Flexible rule configuration for benefits

// Prisma-compatible JSON type
export const PrismaJsonSchema = z.unknown(); // For Prisma JSON fields

export const BenefitUsageSchema = z.object({
  id: z.string(),
  benefitName: z.string(),
  description: z.string().nullable().optional(),
  type: z.string().optional(),
  timing: z.string().optional(),
  maxAmount: z.number().nullable().optional(),
  keywords: z.array(z.string()).optional(),
  ruleConfig: z.unknown().optional(), // More flexible for Prisma JSONValue
  // Additional runtime properties
  cardProductName: z.string().optional(),
  cardIssuer: z.string().optional(),
  accountId: z.string().optional(),
});

export const UserProfileExtendedSchema = z.object({
  defaultDashboard: z.string().optional(),
  sidebarCollapsed: z.boolean().optional(),
  betaFeatures: z.boolean().optional(),
  analyticsSharing: z.boolean().optional(),
});

export const ReactErrorInfoSchema = z.string(); // React's onError receives errorInfo as a string

export const PlaidInstitutionExtendedSchema = z.object({
  institution_id: z.string(),
  name: z.string(),
  logo: z.string().optional(),
  logo_url: z.string().optional(),
  primary_color: z.string().optional(),
});

export const ClerkPrivateMetadataSchema = z.object({
  role: z.string().optional(),
});

export const MockPlaidModuleSchema = z.object({
  __mockItemPublicTokenExchange: z.any(),
  __mockLiabilitiesGet: z.any(),
  __mockAccountsGet: z.any(),
  __mockTransactionsSync: z.any(),
  __mockItemGet: z.any(),
  __mockAccountsBalanceGet: z.any(),
});

export const TestClerkUserSchema = z.object({
  id: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  emailAddresses: z
    .array(
      z.object({
        emailAddress: z.string(),
      }),
    )
    .optional(),
});

export const TestUserProfileSchema = z.object({
  id: z.string(),
  clerkId: z.string(),
  role: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TestFamilyMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  role: z.string(),
  color: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TestUserDataSchema = z.object({
  clerkUser: TestClerkUserSchema,
  userProfile: TestUserProfileSchema,
  primaryFamilyMember: TestFamilyMemberSchema,
  clerkId: z.string(),
  userId: z.string(),
  familyMemberId: z.string(),
});

export const AnalyticsEventSchema = z.record(z.unknown());
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

/**
 * Family Member validation schemas
 *
 * @implements BR-004 - Family Member Name Requirements
 * @satisfies US-003 - Add Family Members
 * @tested __tests__/lib/validations.test.ts (lines 12-72)
 */
export const CreateFamilyMemberSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim(),
  email: z.string().email("Invalid email address").optional().nullable(),
  avatar: z.string().url("Invalid avatar URL").optional().nullable(),
  role: z.string().optional().default("Member"),
});

/**
 * @implements BR-005 - Partial Updates Allowed
 * @satisfies US-004 - Update Family Member
 * @tested __tests__/lib/validations.test.ts (lines 74-88)
 */
export const UpdateFamilyMemberSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim()
    .optional(),
  email: z.string().email("Invalid email address").optional().nullable(),
  avatar: z.string().url("Invalid avatar URL").optional().nullable(),
});

/**
 * Plaid sync validation schemas
 */
export const SyncTransactionsSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  cursor: z.string().optional().nullable(),
});

/**
 * Account nickname validation schema
 *
 * @implements BR-016 - Account Nickname Persistence
 * @satisfies US-009 - Nickname Accounts
 * @tested __tests__/lib/validations.test.ts (lines 100-118)
 */
export const UpdateAccountNicknameSchema = z.object({
  nickname: z
    .string()
    .max(50, "Nickname must be less than 50 characters")
    .trim()
    .nullable(),
});

/**
 * Card product validation schemas
 */
export const CreateCardProductSchema = z.object({
  issuer: z
    .string()
    .min(1, "Issuer is required")
    .max(100, "Issuer must be less than 100 characters"),
  productName: z
    .string()
    .min(1, "Product name is required")
    .max(200, "Product name must be less than 200 characters"),
  cardType: z.string().optional().nullable(),
  annualFee: z
    .number()
    .nonnegative("Annual fee must be non-negative")
    .optional()
    .nullable(),
  signupBonus: z
    .string()
    .max(500, "Signup bonus description too long")
    .optional()
    .nullable(),
  imageUrl: z.string().url("Invalid image URL").optional().nullable(),
  bankId: z.string().optional().nullable(),
});

/**
 * User preferences validation schemas
 */
export const UpdateUserPreferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
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
  cardProductId: z.string().min(1, "Card product ID is required"),
  benefitName: z
    .string()
    .min(1, "Benefit name is required")
    .max(200, "Benefit name must be less than 200 characters"),
  type: z.enum(["STATEMENT_CREDIT", "EXTERNAL_CREDIT", "INSURANCE", "PERK"]),
  description: z
    .string()
    .max(1000, "Description too long")
    .optional()
    .nullable(),
  timing: z.string().min(1, "Timing is required"),
  maxAmount: z
    .number()
    .nonnegative("Max amount must be non-negative")
    .optional()
    .nullable(),
  keywords: z.array(z.string()).min(1, "At least one keyword is required"),
  ruleConfig: z.record(z.unknown()).optional().nullable(),
  active: z.boolean().optional().default(true),
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
    email_addresses: z
      .array(
        z.object({
          email_address: z.string().email(),
          id: z.string(),
        }),
      )
      .optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    image_url: z.string().url().optional(),
    public_metadata: z.record(z.unknown()).optional(),
  }),
});

export const ClerkWebhookHeadersSchema = z.object({
  "svix-id": z.string().min(1),
  "svix-timestamp": z.string().min(1),
  "svix-signature": z.string().min(1),
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
  benefitId: z.string().min(1, "Benefit ID is required"),
});

/**
 * Plaid Item Assignment Schema
 */
export const AssignPlaidItemSchema = z.object({
  familyMemberId: z.string().min(1, "Family member ID is required"),
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

/**
 * Pagination schemas
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

/**
 * ID validation schemas
 */
export const IdSchema = z.string().uuid("Invalid ID format");

/**
 * Date range schemas
 */
export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Family Member API schemas
 */
export const FamilyMemberParamsSchema = z.object({
  familyMemberId: IdSchema,
});

/**
 * Account API schemas
 */
export const AccountParamsSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
});

/**
 * Plaid Item schemas
 */
export const PlaidItemParamsSchema = z.object({
  itemId: IdSchema,
});

/**
 * Sync Transactions schemas (enhanced)
 */
export const SyncTransactionsEnhancedSchema = SyncTransactionsSchema.extend({
  count: z.coerce.number().min(1).max(1000).optional(),
});

/**
 * Card Product Query schemas
 */
export const CardProductQuerySchema = z.object({
  issuer: z.string().optional(),
  cardType: z.string().optional(),
  activeOnly: z
    .string()
    .transform((val) => val === "true")
    .optional(),
});

/**
 * User Profile Update schemas
 */
export const UserProfileUpdateSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  avatar: z.string().url().nullable().optional(),
  preferences: z.record(z.unknown()).optional(),
});

/**
 * Transaction Search schemas
 */
export const TransactionSearchSchema = z.object({
  query: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  ...PaginationSchema.shape,
});

/**
 * Bulk Operations schemas
 */
export const BulkOperationSchema = z.object({
  operation: z.enum(["delete", "update", "create"]),
  items: z.array(z.record(z.unknown())).min(1).max(100),
});

/**
 * Webhook signature validation schema
 */
export const WebhookSignatureSchema = z.object({
  signature: z.string().min(1),
  timestamp: z.string().min(1),
  payload: z.string().min(1),
});
