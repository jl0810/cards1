import { relations } from "drizzle-orm/relations";
import { userProfiles, familyMembers, banks, plaidItems, cardProducts, cardBenefits, benefitUsage, plaidAccounts, userAlerts, transactionExtended, plaidTransactions, accountExtended } from "./schema";

export const familyMembersRelations = relations(familyMembers, ({one, many}) => ({
	userProfile: one(userProfiles, {
		fields: [familyMembers.userId],
		references: [userProfiles.id]
	}),
	plaidItems: many(plaidItems),
	plaidAccounts: many(plaidAccounts),
}));

export const userProfilesRelations = relations(userProfiles, ({many}) => ({
	familyMembers: many(familyMembers),
	plaidItems: many(plaidItems),
	userAlerts: many(userAlerts),
}));

export const plaidItemsRelations = relations(plaidItems, ({one, many}) => ({
	bank: one(banks, {
		fields: [plaidItems.bankId],
		references: [banks.id]
	}),
	familyMember: one(familyMembers, {
		fields: [plaidItems.familyMemberId],
		references: [familyMembers.id]
	}),
	userProfile: one(userProfiles, {
		fields: [plaidItems.userId],
		references: [userProfiles.id]
	}),
	plaidTransactions: many(plaidTransactions),
	plaidAccounts: many(plaidAccounts),
}));

export const banksRelations = relations(banks, ({many}) => ({
	plaidItems: many(plaidItems),
	cardProducts: many(cardProducts),
}));

export const cardProductsRelations = relations(cardProducts, ({one, many}) => ({
	bank: one(banks, {
		fields: [cardProducts.bankId],
		references: [banks.id]
	}),
	cardBenefits: many(cardBenefits),
	accountExtendeds: many(accountExtended),
}));

export const benefitUsageRelations = relations(benefitUsage, ({one, many}) => ({
	cardBenefit: one(cardBenefits, {
		fields: [benefitUsage.cardBenefitId],
		references: [cardBenefits.id]
	}),
	plaidAccount: one(plaidAccounts, {
		fields: [benefitUsage.plaidAccountId],
		references: [plaidAccounts.id]
	}),
	transactionExtendeds: many(transactionExtended),
}));

export const cardBenefitsRelations = relations(cardBenefits, ({one, many}) => ({
	benefitUsages: many(benefitUsage),
	transactionExtendeds: many(transactionExtended),
	cardProduct: one(cardProducts, {
		fields: [cardBenefits.cardProductId],
		references: [cardProducts.id]
	}),
}));

export const plaidAccountsRelations = relations(plaidAccounts, ({one, many}) => ({
	benefitUsages: many(benefitUsage),
	plaidTransactions: many(plaidTransactions),
	familyMember: one(familyMembers, {
		fields: [plaidAccounts.familyMemberId],
		references: [familyMembers.id]
	}),
	plaidItem: one(plaidItems, {
		fields: [plaidAccounts.plaidItemId],
		references: [plaidItems.id]
	}),
	accountExtendeds: many(accountExtended),
}));

export const userAlertsRelations = relations(userAlerts, ({one}) => ({
	userProfile: one(userProfiles, {
		fields: [userAlerts.userId],
		references: [userProfiles.id]
	}),
}));

export const transactionExtendedRelations = relations(transactionExtended, ({one}) => ({
	benefitUsage: one(benefitUsage, {
		fields: [transactionExtended.benefitUsageId],
		references: [benefitUsage.id]
	}),
	cardBenefit: one(cardBenefits, {
		fields: [transactionExtended.matchedBenefitId],
		references: [cardBenefits.id]
	}),
	plaidTransaction: one(plaidTransactions, {
		fields: [transactionExtended.plaidTransactionId],
		references: [plaidTransactions.id]
	}),
}));

export const plaidTransactionsRelations = relations(plaidTransactions, ({one, many}) => ({
	transactionExtendeds: many(transactionExtended),
	plaidAccount: one(plaidAccounts, {
		fields: [plaidTransactions.accountId],
		references: [plaidAccounts.accountId]
	}),
	plaidItem: one(plaidItems, {
		fields: [plaidTransactions.plaidItemId],
		references: [plaidItems.id]
	}),
}));

export const accountExtendedRelations = relations(accountExtended, ({one}) => ({
	cardProduct: one(cardProducts, {
		fields: [accountExtended.cardProductId],
		references: [cardProducts.id]
	}),
	plaidAccount: one(plaidAccounts, {
		fields: [accountExtended.plaidAccountId],
		references: [plaidAccounts.id]
	}),
}));