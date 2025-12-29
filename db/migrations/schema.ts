import { pgTable, foreignKey, text, boolean, timestamp, uniqueIndex, doublePrecision, jsonb, integer, check, varchar, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const alertType = pgEnum("AlertType", ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'MAINTENANCE', 'FEATURE', 'BILLING', 'SECURITY'])
export const benefitType = pgEnum("BenefitType", ['STATEMENT_CREDIT', 'EXTERNAL_CREDIT', 'INSURANCE', 'PERK'])
export const priority = pgEnum("Priority", ['LOW', 'MEDIUM', 'HIGH', 'URGENT'])


export const familyMembers = pgTable("family_members", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	name: text().notNull(),
	email: text(),
	avatar: text(),
	color: text(),
	role: text().default('Member'),
	isPrimary: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfiles.id],
			name: "family_members_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const plaidItems = pgTable("plaid_items", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	itemId: text().notNull(),
	institutionId: text(),
	institutionName: text(),
	status: text().default('active').notNull(),
	nextCursor: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	accessTokenId: text().notNull(),
	familyMemberId: text().notNull(),
	lastSyncedAt: timestamp({ precision: 3, mode: 'string' }),
	bankId: text("bank_id"),
	isTest: boolean().default(false).notNull(),
}, (table) => [
	uniqueIndex("plaid_items_accessTokenId_key").using("btree", table.accessTokenId.asc().nullsLast().op("text_ops")),
	uniqueIndex("plaid_items_itemId_key").using("btree", table.itemId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.bankId],
			foreignColumns: [banks.id],
			name: "plaid_items_bank_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.familyMemberId],
			foreignColumns: [familyMembers.id],
			name: "plaid_items_familyMemberId_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfiles.id],
			name: "plaid_items_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const cardProducts = pgTable("card_products", {
	id: text().primaryKey().notNull(),
	issuer: text().notNull(),
	productName: text().notNull(),
	cardType: text(),
	annualFee: doublePrecision(),
	signupBonus: text(),
	imageUrl: text(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	bankId: text("bank_id"),
}, (table) => [
	uniqueIndex("card_products_issuer_productName_key").using("btree", table.issuer.asc().nullsLast().op("text_ops"), table.productName.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.bankId],
			foreignColumns: [banks.id],
			name: "card_products_bank_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const benefitUsage = pgTable("benefit_usage", {
	id: text().primaryKey().notNull(),
	cardBenefitId: text().notNull(),
	plaidAccountId: text().notNull(),
	periodStart: timestamp({ precision: 3, mode: 'string' }).notNull(),
	periodEnd: timestamp({ precision: 3, mode: 'string' }).notNull(),
	maxAmount: doublePrecision().notNull(),
	usedAmount: doublePrecision().default(0).notNull(),
	remainingAmount: doublePrecision().notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("benefit_usage_cardBenefitId_plaidAccountId_periodStart_key").using("btree", table.cardBenefitId.asc().nullsLast().op("timestamp_ops"), table.plaidAccountId.asc().nullsLast().op("text_ops"), table.periodStart.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.cardBenefitId],
			foreignColumns: [cardBenefits.id],
			name: "benefit_usage_cardBenefitId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.plaidAccountId],
			foreignColumns: [plaidAccounts.id],
			name: "benefit_usage_plaidAccountId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const userAlerts = pgTable("user_alerts", {
	id: text().primaryKey().notNull(),
	userId: text().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	type: alertType().default('INFO').notNull(),
	priority: priority().default('MEDIUM').notNull(),
	isRead: boolean().default(false).notNull(),
	expiresAt: timestamp({ precision: 3, mode: 'string' }),
	actionUrl: text(),
	actionText: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [userProfiles.id],
			name: "user_alerts_userId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const transactionExtended = pgTable("transaction_extended", {
	id: text().primaryKey().notNull(),
	plaidTransactionId: text().notNull(),
	matchedBenefitId: text(),
	benefitUsageId: text(),
	coveredAmount: doublePrecision(),
	customCategory: text(),
	notes: text(),
	tags: text().array(),
	isExcludedFromBudget: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	uniqueIndex("transaction_extended_plaidTransactionId_key").using("btree", table.plaidTransactionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.benefitUsageId],
			foreignColumns: [benefitUsage.id],
			name: "transaction_extended_benefitUsageId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.matchedBenefitId],
			foreignColumns: [cardBenefits.id],
			name: "transaction_extended_matchedBenefitId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.plaidTransactionId],
			foreignColumns: [plaidTransactions.id],
			name: "transaction_extended_plaidTransactionId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const plaidTransactions = pgTable("plaid_transactions", {
	id: text().primaryKey().notNull(),
	plaidItemId: text().notNull(),
	transactionId: text().notNull(),
	accountId: text().notNull(),
	amount: doublePrecision().notNull(),
	date: timestamp({ precision: 3, mode: 'string' }).notNull(),
	name: text().notNull(),
	merchantName: text(),
	category: text().array(),
	pending: boolean().default(false).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	originalDescription: text(),
	paymentChannel: text(),
	personalFinanceCategoryDetailed: text(),
	personalFinanceCategoryPrimary: text(),
	transactionCode: text(),
}, (table) => [
	uniqueIndex("plaid_transactions_transactionId_key").using("btree", table.transactionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [plaidAccounts.accountId],
			name: "plaid_transactions_accountId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.plaidItemId],
			foreignColumns: [plaidItems.id],
			name: "plaid_transactions_plaidItemId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const cardBenefits = pgTable("card_benefits", {
	id: text().primaryKey().notNull(),
	cardProductId: text().notNull(),
	benefitName: text().notNull(),
	timing: text().notNull(),
	maxAmount: doublePrecision(),
	keywords: text().array(),
	active: boolean().default(true).notNull(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	description: text(),
	type: benefitType().default('STATEMENT_CREDIT').notNull(),
	isApproved: boolean().default(true).notNull(),
	changeNotes: text(),
	ruleConfig: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.cardProductId],
			foreignColumns: [cardProducts.id],
			name: "card_benefits_cardProductId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const plaidAccounts = pgTable("plaid_accounts", {
	id: text().primaryKey().notNull(),
	plaidItemId: text().notNull(),
	accountId: text().notNull(),
	name: text().notNull(),
	mask: text(),
	type: text(),
	subtype: text(),
	currentBalance: doublePrecision(),
	availableBalance: doublePrecision(),
	limit: doublePrecision(),
	isoCurrencyCode: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	apr: doublePrecision(),
	lastStatementBalance: doublePrecision(),
	lastStatementIssueDate: timestamp({ precision: 3, mode: 'string' }),
	minPaymentAmount: doublePrecision(),
	nextPaymentDueDate: timestamp({ precision: 3, mode: 'string' }),
	aprBalanceSubjectToApr: doublePrecision(),
	aprInterestChargeAmount: doublePrecision(),
	aprType: text(),
	isOverdue: boolean(),
	lastPaymentAmount: doublePrecision(),
	lastPaymentDate: timestamp({ precision: 3, mode: 'string' }),
	familyMemberId: text().notNull(),
	officialName: text(),
	status: text().default('active').notNull(),
}, (table) => [
	uniqueIndex("plaid_accounts_familyMemberId_mask_officialName_key").using("btree", table.familyMemberId.asc().nullsLast().op("text_ops"), table.mask.asc().nullsLast().op("text_ops"), table.officialName.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.familyMemberId],
			foreignColumns: [familyMembers.id],
			name: "plaid_accounts_familyMemberId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.plaidItemId],
			foreignColumns: [plaidItems.id],
			name: "plaid_accounts_plaidItemId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const accountExtended = pgTable("account_extended", {
	id: text().primaryKey().notNull(),
	plaidAccountId: text().notNull(),
	cardProductId: text(),
	nickname: text(),
	isFavorite: boolean().default(false).notNull(),
	sortOrder: integer(),
	color: text(),
	notes: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	dateOpened: timestamp({ precision: 3, mode: 'string' }),
	paymentMarkedPaidAmount: doublePrecision(),
	paymentMarkedPaidDate: timestamp({ precision: 3, mode: 'string' }),
	paymentCycleStatus: text(),
}, (table) => [
	uniqueIndex("account_extended_plaidAccountId_key").using("btree", table.plaidAccountId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.cardProductId],
			foreignColumns: [cardProducts.id],
			name: "account_extended_cardProductId_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.plaidAccountId],
			foreignColumns: [plaidAccounts.id],
			name: "account_extended_plaidAccountId_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const userProfiles = pgTable("user_profiles", {
	id: text().primaryKey().notNull(),
	clerkId: text().notNull(),
	name: text(),
	avatar: text(),
	bio: text(),
	website: text(),
	location: text(),
	theme: text().default('system').notNull(),
	language: text().default('en').notNull(),
	timezone: text().default('UTC').notNull(),
	emailNotifications: boolean().default(true).notNull(),
	pushNotifications: boolean().default(false).notNull(),
	onboardingCompleted: boolean().default(false).notNull(),
	lastLoginAt: timestamp({ precision: 3, mode: 'string' }),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	analyticsSharing: boolean().default(true).notNull(),
	autoSave: boolean().default(true).notNull(),
	betaFeatures: boolean().default(false).notNull(),
	compactMode: boolean().default(false).notNull(),
	crashReporting: boolean().default(true).notNull(),
	defaultDashboard: text().default('main').notNull(),
	keyboardShortcuts: boolean().default(true).notNull(),
	marketingEmails: boolean().default(false).notNull(),
	sidebarCollapsed: boolean().default(false).notNull(),
	soundEffects: boolean().default(false).notNull(),
	deletedAt: timestamp({ precision: 3, mode: 'string' }),
}, (table) => [
	uniqueIndex("user_profiles_clerkId_key").using("btree", table.clerkId.asc().nullsLast().op("text_ops")),
	check("valid_clerk_id", sql`("clerkId" ~~ 'user_%'::text) AND (length("clerkId") >= 6)`),
]);

export const prismaMigrations = pgTable("_prisma_migrations", {
	id: varchar({ length: 36 }).primaryKey().notNull(),
	checksum: varchar({ length: 64 }).notNull(),
	finishedAt: timestamp("finished_at", { withTimezone: true, mode: 'string' }),
	migrationName: varchar("migration_name", { length: 255 }).notNull(),
	logs: text(),
	rolledBackAt: timestamp("rolled_back_at", { withTimezone: true, mode: 'string' }),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	appliedStepsCount: integer("applied_steps_count").default(0).notNull(),
});

export const banks = pgTable("banks", {
	id: text().primaryKey().notNull(),
	plaidId: text().notNull(),
	name: text().notNull(),
	logoUrl: text(),
	brandColor: text(),
	createdAt: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ precision: 3, mode: 'string' }).notNull(),
	logoSvg: text(),
}, (table) => [
	uniqueIndex("banks_plaidId_key").using("btree", table.plaidId.asc().nullsLast().op("text_ops")),
]);
