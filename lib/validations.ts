/**
 * Validation schemas for API requests using Zod
 *
 * @module lib/validations
 *
 * @implements BR-026 - Input Validation Required
 * @implements BR-027 - Data Sanitization
 * @satisfies US-015 - Input Validation
 */

import { z } from "zod";

/**
 * Plaid API validation schemas
 */

export const PlaidAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  mask: z.string().nullable().optional(),
  type: z.string(),
  subtype: z
    .union([z.string(), z.array(z.string())])
    .nullable()
    .optional(),
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
      institution_id: z.string(),
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
  error: z.any().optional(),
});

/**
 * UI Component validation schemas
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
  accounts: z.array(z.any()).optional(),
});

export const SyncTransactionsSchema = z.object({
  itemId: z.string().min(1, "Item ID is required"),
  cursor: z.string().optional(),
});

export const AssignPlaidItemSchema = z.object({
  familyMemberId: z.string().min(1, "Family member ID is required"),
});

export const AccountSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  bank: z.string(),
  bankId: z.string().optional(),
  bankData: z
    .object({
      id: z.string(),
      name: z.string(),
      logoUrl: z.string().nullable(),
      logoSvg: z.string().nullable(),
      brandColor: z.string().nullable(),
    })
    .optional(),
  balance: z.number(),
  userId: z.string(),
  due: z.string(),
  color: z.string(),
  liabilities: z
    .object({
      apr: z.string(),
      aprType: z.string(),
      aprBalanceSubjectToApr: z.string(),
      aprInterestChargeAmount: z.string(),
      limit: z.string(),
      min_due: z.string(),
      last_statement: z.string(),
      last_statement_balance: z.string().optional(),
      next_due_date: z.string(),
      last_statement_date: z.string(),
      last_payment_amount: z.string(),
      last_payment_date: z.string(),
      status: z.string(),
    })
    .optional(),
  lastStatementBalance: z.number().optional(),
  lastStatementIssueDate: z.string().optional(),
  currentBalance: z.number().optional(),
  lastPaymentAmount: z.number().optional(),
  lastPaymentDate: z.string().optional(),
  nextPaymentDueDate: z.string().optional(),
  subtype: z.string().optional(),
  apr: z.number().optional(),
  isoCurrencyCode: z.string().optional(),
  limit: z.number().optional(),
  minPaymentAmount: z.number().optional(),
  isOverdue: z.boolean().optional(),
  familyMemberId: z.string().optional(),
  officialName: z.string().optional(),
  aprType: z.string().optional(),
  aprBalanceSubjectToApr: z.union([z.string(), z.number()]).optional(),
  aprInterestChargeAmount: z.union([z.string(), z.number()]).optional(),
  extended: z
    .object({
      paymentCycleStatus: z.string().optional(),
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

/**
 * Benefit matching validation schemas
 */

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
 * Test & App validation schemas
 */

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const CreateFamilyMemberSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  email: z.string().email().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  role: z.string().optional().default("Member"),
});

export const UpdateFamilyMemberSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  email: z.string().email().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
});

export const UpdateAccountNicknameSchema = z.object({
  nickname: z.string().max(50).trim().nullable(),
});

export const CreateCardProductSchema = z.object({
  issuer: z.string().min(1).max(100),
  productName: z.string().min(1).max(200),
  cardType: z.string().optional().nullable(),
  annualFee: z.number().nonnegative().optional().nullable(),
  signupBonus: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  bankId: z.string().optional().nullable(),
});

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

export const CreateCardBenefitSchema = z.object({
  cardProductId: z.string().min(1),
  benefitName: z.string().min(1).max(200),
  type: z.enum(["STATEMENT_CREDIT", "EXTERNAL_CREDIT", "INSURANCE", "PERK"]),
  description: z.string().max(1000).optional().nullable(),
  timing: z.string().min(1),
  maxAmount: z.number().nonnegative().optional().nullable(),
  keywords: z.array(z.string()).min(1),
  ruleConfig: z.record(z.string(), z.unknown()).optional().nullable(),
  active: z.boolean().optional().default(true),
});

/**
 * Helper function to validate and parse request body
 */
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function safeValidateSchema<T>(schema: z.ZodSchema<T>, data: unknown) {
  return schema.safeParse(data);
}
