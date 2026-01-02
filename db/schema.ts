import {
  pgSchema,
  text,
  timestamp,
  boolean,
  uuid,
  doublePrecision,
  json,
  integer,
  uniqueIndex,
  primaryKey,
} from "@jl0810/db-client";
import { relations } from "drizzle-orm";
import { publicSchema } from "@jl0810/db-client";

export const cardsSchema = pgSchema("cardsgonecrazy");

// Enums
export const alertTypeEnum = cardsSchema.enum("alert_type", [
  "INFO",
  "SUCCESS",
  "WARNING",
  "ERROR",
  "MAINTENANCE",
  "FEATURE",
  "BILLING",
  "SECURITY",
]);

export const priorityEnum = cardsSchema.enum("priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

export const benefitTypeEnum = cardsSchema.enum("benefit_type", [
  "STATEMENT_CREDIT",
  "EXTERNAL_CREDIT",
  "INSURANCE",
  "PERK",
]);

// Tables
export const userProfiles = cardsSchema.table("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  supabaseId: text("supabase_id").unique().notNull(), // Replacing clerkId
  name: text("name"),
  avatar: text("avatar"),
  bio: text("bio"),
  website: text("website"),
  location: text("location"),
  theme: text("theme").default("system").notNull(),
  language: text("language").default("en").notNull(),
  timezone: text("timezone").default("UTC").notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  pushNotifications: boolean("push_notifications").default(false).notNull(),
  analyticsSharing: boolean("analytics_sharing").default(true).notNull(),
  autoSave: boolean("auto_save").default(true).notNull(),
  betaFeatures: boolean("beta_features").default(false).notNull(),
  compactMode: boolean("compact_mode").default(false).notNull(),
  crashReporting: boolean("crash_reporting").default(true).notNull(),
  defaultDashboard: text("default_dashboard").default("main").notNull(),
  keyboardShortcuts: boolean("keyboard_shortcuts").default(true).notNull(),
  marketingEmails: boolean("marketing_emails").default(false).notNull(),
  sidebarCollapsed: boolean("sidebar_collapsed").default(false).notNull(),
  soundEffects: boolean("sound_effects").default(false).notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const familyMembers = cardsSchema.table("family_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => userProfiles.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  email: text("email"),
  avatar: text("avatar"),
  color: text("color"),
  role: text("role").default("Member"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const banks = cardsSchema.table("banks", {
  id: uuid("id").primaryKey().defaultRandom(),
  plaidId: text("plaid_id").unique().notNull(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  logoSvg: text("logo_svg"),
  brandColor: text("brand_color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const plaidItems = cardsSchema.table("plaid_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => userProfiles.id, { onDelete: "cascade" })
    .notNull(),
  itemId: text("item_id").unique().notNull(),
  institutionId: text("institution_id"),
  institutionName: text("institution_name"),
  status: text("status").default("active").notNull(),
  isTest: boolean("is_test").default(false).notNull(),
  nextCursor: text("next_cursor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  accessTokenId: text("access_token_id").unique().notNull(),
  familyMemberId: uuid("family_member_id")
    .references(() => familyMembers.id)
    .notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  bankId: uuid("bank_id").references(() => banks.id),
});

export const plaidAccounts = cardsSchema.table(
  "plaid_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plaidItemId: uuid("plaid_item_id")
      .references(() => plaidItems.id, { onDelete: "cascade" })
      .notNull(),
    accountId: text("account_id").unique().notNull(),
    name: text("name").notNull(),
    mask: text("mask"),
    type: text("type"),
    subtype: text("subtype"),
    currentBalance: doublePrecision("current_balance"),
    availableBalance: doublePrecision("available_balance"),
    limit: doublePrecision("limit"),
    isoCurrencyCode: text("iso_currency_code"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    apr: doublePrecision("apr"),
    lastStatementBalance: doublePrecision("last_statement_balance"),
    lastStatementIssueDate: timestamp("last_statement_issue_date"),
    minPaymentAmount: doublePrecision("min_payment_amount"),
    nextPaymentDueDate: timestamp("next_payment_due_date"),
    aprBalanceSubjectToApr: doublePrecision("apr_balance_subject_to_apr"),
    aprInterestChargeAmount: doublePrecision("apr_interest_charge_amount"),
    aprType: text("apr_type"),
    isOverdue: boolean("is_overdue"),
    lastPaymentAmount: doublePrecision("last_payment_amount"),
    lastPaymentDate: timestamp("last_payment_date"),
    familyMemberId: uuid("family_member_id")
      .references(() => familyMembers.id, { onDelete: "cascade" })
      .notNull(),
    officialName: text("official_name"),
    status: text("status").default("active").notNull(),
  },
  (table) => ({
    familyMaskOfficialUnique: uniqueIndex("family_mask_official_idx").on(
      table.familyMemberId,
      table.mask,
      table.officialName,
    ),
  }),
);

export const accountExtended = cardsSchema.table("account_extended", {
  id: uuid("id").primaryKey().defaultRandom(),
  plaidAccountId: uuid("plaid_account_id")
    .references(() => plaidAccounts.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  cardProductId: uuid("card_product_id").references(() => cardProducts.id),
  nickname: text("nickname"),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  sortOrder: integer("sort_order"),
  color: text("color"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  dateOpened: timestamp("date_opened"),
  paymentMarkedPaidDate: timestamp("payment_marked_paid_date"),
  paymentMarkedPaidAmount: doublePrecision("payment_marked_paid_amount"),
  paymentCycleStatus: text("payment_cycle_status"),
});

export const plaidTransactions = cardsSchema.table("plaid_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  plaidItemId: uuid("plaid_item_id")
    .references(() => plaidItems.id, { onDelete: "cascade" })
    .notNull(),
  transactionId: text("transaction_id").unique().notNull(),
  accountId: text("account_id")
    .references(() => plaidAccounts.accountId, { onDelete: "cascade" })
    .notNull(),
  amount: doublePrecision("amount").notNull(),
  date: timestamp("date").notNull(),
  name: text("name").notNull(),
  merchantName: text("merchant_name"),
  category: text("category").array(),
  pending: boolean("pending").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  originalDescription: text("original_description"),
  paymentChannel: text("payment_channel"),
  personalFinanceCategoryDetailed: text("personal_finance_category_detailed"),
  personalFinanceCategoryPrimary: text("personal_finance_category_primary"),
  transactionCode: text("transaction_code"),
});

export const transactionExtended = cardsSchema.table("transaction_extended", {
  id: uuid("id").primaryKey().defaultRandom(),
  plaidTransactionId: uuid("plaid_transaction_id")
    .references(() => plaidTransactions.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  matchedBenefitId: uuid("matched_benefit_id").references(
    () => cardBenefits.id,
  ),
  benefitUsageId: uuid("benefit_usage_id").references(() => benefitUsage.id),
  coveredAmount: doublePrecision("covered_amount"),
  customCategory: text("custom_category"),
  notes: text("notes"),
  tags: text("tags").array(),
  isExcludedFromBudget: boolean("is_excluded_from_budget")
    .default(false)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cardProducts = cardsSchema.table(
  "card_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issuer: text("issuer").notNull(),
    productName: text("product_name").notNull(),
    cardType: text("card_type"),
    annualFee: doublePrecision("annual_fee"),
    signupBonus: text("signup_bonus"),
    imageUrl: text("image_url"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    bankId: uuid("bank_id").references(() => banks.id),
  },
  (table) => ({
    issuerProductUnique: uniqueIndex("issuer_product_idx").on(
      table.issuer,
      table.productName,
    ),
  }),
);

// Now we can update accountExtended with reference to cardProducts
// But Drizzle kit might handle it better if defined in order.

export const cardBenefits = cardsSchema.table("card_benefits", {
  id: uuid("id").primaryKey().defaultRandom(),
  cardProductId: uuid("card_product_id")
    .references(() => cardProducts.id, { onDelete: "cascade" })
    .notNull(),
  benefitName: text("benefit_name").notNull(),
  timing: text("timing").notNull(),
  maxAmount: doublePrecision("max_amount"),
  keywords: text("keywords").array(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  description: text("description"),
  type: benefitTypeEnum("type").default("STATEMENT_CREDIT").notNull(),
  isApproved: boolean("is_approved").default(true).notNull(),
  changeNotes: text("change_notes"),
  ruleConfig: json("rule_config"),
});

export const benefitUsage = cardsSchema.table(
  "benefit_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardBenefitId: uuid("card_benefit_id")
      .references(() => cardBenefits.id, { onDelete: "cascade" })
      .notNull(),
    plaidAccountId: uuid("plaid_account_id")
      .references(() => plaidAccounts.id, { onDelete: "cascade" })
      .notNull(),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    maxAmount: doublePrecision("max_amount").notNull(),
    usedAmount: doublePrecision("used_amount").default(0).notNull(),
    remainingAmount: doublePrecision("remaining_amount").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    benefitAccountPeriodUnique: uniqueIndex("benefit_account_period_idx").on(
      table.cardBenefitId,
      table.plaidAccountId,
      table.periodStart,
    ),
  }),
);

export const userAlerts = cardsSchema.table("user_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => userProfiles.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: alertTypeEnum("type").default("INFO").notNull(),
  priority: priorityEnum("priority").default("MEDIUM").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  expiresAt: timestamp("expires_at"),
  actionUrl: text("action_url"),
  actionText: text("action_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Authentication tables have been moved to public schema

// Relations
export const userProfilesRelations = relations(
  userProfiles,
  ({ many, one }) => ({
    familyMembers: many(familyMembers),
    plaidItems: many(plaidItems),
    alerts: many(userAlerts),
    preferences: one(publicSchema.userPreferences, {
      fields: [userProfiles.supabaseId],
      references: [publicSchema.userPreferences.userId],
    }),
  }),
);

export const familyMembersRelations = relations(
  familyMembers,
  ({ one, many }) => ({
    user: one(userProfiles, {
      fields: [familyMembers.userId],
      references: [userProfiles.id],
    }),
    plaidItems: many(plaidItems),
    plaidAccounts: many(plaidAccounts),
  }),
);

export const banksRelations = relations(banks, ({ many }) => ({
  plaidItems: many(plaidItems),
  cardProducts: many(cardProducts),
}));

export const plaidItemsRelations = relations(plaidItems, ({ one, many }) => ({
  user: one(userProfiles, {
    fields: [plaidItems.userId],
    references: [userProfiles.id],
  }),
  bank: one(banks, {
    fields: [plaidItems.bankId],
    references: [banks.id],
  }),
  familyMember: one(familyMembers, {
    fields: [plaidItems.familyMemberId],
    references: [familyMembers.id],
  }),
  accounts: many(plaidAccounts),
  transactions: many(plaidTransactions),
}));

export const plaidAccountsRelations = relations(
  plaidAccounts,
  ({ one, many }) => ({
    plaidItem: one(plaidItems, {
      fields: [plaidAccounts.plaidItemId],
      references: [plaidItems.id],
    }),
    familyMember: one(familyMembers, {
      fields: [plaidAccounts.familyMemberId],
      references: [familyMembers.id],
    }),
    extended: one(accountExtended, {
      fields: [plaidAccounts.id],
      references: [accountExtended.plaidAccountId],
    }),
    transactions: many(plaidTransactions),
    benefitUsages: many(benefitUsage),
  }),
);

export const accountExtendedRelations = relations(
  accountExtended,
  ({ one }) => ({
    plaidAccount: one(plaidAccounts, {
      fields: [accountExtended.plaidAccountId],
      references: [plaidAccounts.id],
    }),
    cardProduct: one(cardProducts, {
      fields: [accountExtended.cardProductId],
      references: [cardProducts.id],
    }),
  }),
);

export const plaidTransactionsRelations = relations(
  plaidTransactions,
  ({ one }) => ({
    plaidItem: one(plaidItems, {
      fields: [plaidTransactions.plaidItemId],
      references: [plaidItems.id],
    }),
    account: one(plaidAccounts, {
      fields: [plaidTransactions.accountId],
      references: [plaidAccounts.accountId],
    }),
    extended: one(transactionExtended, {
      fields: [plaidTransactions.id],
      references: [transactionExtended.plaidTransactionId],
    }),
  }),
);

export const transactionExtendedRelations = relations(
  transactionExtended,
  ({ one }) => ({
    plaidTransaction: one(plaidTransactions, {
      fields: [transactionExtended.plaidTransactionId],
      references: [plaidTransactions.id],
    }),
    matchedBenefit: one(cardBenefits, {
      fields: [transactionExtended.matchedBenefitId],
      references: [cardBenefits.id],
    }),
    benefitUsage: one(benefitUsage, {
      fields: [transactionExtended.benefitUsageId],
      references: [benefitUsage.id],
    }),
  }),
);

export const cardProductsRelations = relations(
  cardProducts,
  ({ one, many }) => ({
    bank: one(banks, {
      fields: [cardProducts.bankId],
      references: [banks.id],
    }),
    benefits: many(cardBenefits),
    linkedAccounts: many(accountExtended),
  }),
);

export const cardBenefitsRelations = relations(
  cardBenefits,
  ({ one, many }) => ({
    cardProduct: one(cardProducts, {
      fields: [cardBenefits.cardProductId],
      references: [cardProducts.id],
    }),
    usages: many(benefitUsage),
    matchedTransactions: many(transactionExtended),
  }),
);

export const benefitUsageRelations = relations(
  benefitUsage,
  ({ one, many }) => ({
    cardBenefit: one(cardBenefits, {
      fields: [benefitUsage.cardBenefitId],
      references: [cardBenefits.id],
    }),
    plaidAccount: one(plaidAccounts, {
      fields: [benefitUsage.plaidAccountId],
      references: [plaidAccounts.id],
    }),
    matchedTransactions: many(transactionExtended),
  }),
);

export const userAlertsRelations = relations(userAlerts, ({ one }) => ({
  user: one(userProfiles, {
    fields: [userAlerts.userId],
    references: [userProfiles.id],
  }),
}));
// Authentication Tables (NextAuth.js)
export const users = cardsSchema.table("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const oauthAccounts = cardsSchema.table(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = cardsSchema.table("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = cardsSchema.table(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);
