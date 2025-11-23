-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'MAINTENANCE', 'FEATURE', 'BILLING', 'SECURITY');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "BenefitType" AS ENUM ('STATEMENT_CREDIT', 'EXTERNAL_CREDIT', 'INSURANCE', 'PERK');

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "avatar" TEXT,
    "color" TEXT,
    "role" TEXT DEFAULT 'Member',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banks" (
    "id" TEXT NOT NULL,
    "plaidId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "brandColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "website" TEXT,
    "location" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT false,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "defaultDashboard" TEXT NOT NULL DEFAULT 'main',
    "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "compactMode" BOOLEAN NOT NULL DEFAULT false,
    "betaFeatures" BOOLEAN NOT NULL DEFAULT false,
    "analyticsSharing" BOOLEAN NOT NULL DEFAULT true,
    "crashReporting" BOOLEAN NOT NULL DEFAULT true,
    "autoSave" BOOLEAN NOT NULL DEFAULT true,
    "keyboardShortcuts" BOOLEAN NOT NULL DEFAULT true,
    "soundEffects" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "AlertType" NOT NULL DEFAULT 'INFO',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "actionUrl" TEXT,
    "actionText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plaid_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "accessTokenId" TEXT NOT NULL,
    "institutionId" TEXT,
    "institutionName" TEXT,
    "bank_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastSyncedAt" TIMESTAMP(3),
    "nextCursor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plaid_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plaid_accounts" (
    "id" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "officialName" TEXT,
    "mask" TEXT,
    "type" TEXT,
    "subtype" TEXT,
    "currentBalance" DOUBLE PRECISION,
    "availableBalance" DOUBLE PRECISION,
    "limit" DOUBLE PRECISION,
    "isoCurrencyCode" TEXT,
    "apr" DOUBLE PRECISION,
    "aprType" TEXT,
    "aprBalanceSubjectToApr" DOUBLE PRECISION,
    "aprInterestChargeAmount" DOUBLE PRECISION,
    "minPaymentAmount" DOUBLE PRECISION,
    "lastStatementBalance" DOUBLE PRECISION,
    "nextPaymentDueDate" TIMESTAMP(3),
    "lastStatementIssueDate" TIMESTAMP(3),
    "lastPaymentAmount" DOUBLE PRECISION,
    "lastPaymentDate" TIMESTAMP(3),
    "isOverdue" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plaid_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_extended" (
    "id" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "cardProductId" TEXT,
    "nickname" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER,
    "color" TEXT,
    "notes" TEXT,
    "dateOpened" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_extended_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plaid_transactions" (
    "id" TEXT NOT NULL,
    "plaidItemId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "merchantName" TEXT,
    "category" TEXT[],
    "pending" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plaid_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_extended" (
    "id" TEXT NOT NULL,
    "plaidTransactionId" TEXT NOT NULL,
    "matchedBenefitId" TEXT,
    "benefitUsageId" TEXT,
    "coveredAmount" DOUBLE PRECISION,
    "customCategory" TEXT,
    "notes" TEXT,
    "tags" TEXT[],
    "isExcludedFromBudget" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_extended_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_products" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "bank_id" TEXT,
    "productName" TEXT NOT NULL,
    "cardType" TEXT,
    "annualFee" DOUBLE PRECISION,
    "signupBonus" TEXT,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_benefits" (
    "id" TEXT NOT NULL,
    "cardProductId" TEXT NOT NULL,
    "benefitName" TEXT NOT NULL,
    "type" "BenefitType" NOT NULL DEFAULT 'STATEMENT_CREDIT',
    "description" TEXT,
    "timing" TEXT NOT NULL,
    "maxAmount" DOUBLE PRECISION,
    "keywords" TEXT[],
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "changeNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_benefits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benefit_usage" (
    "id" TEXT NOT NULL,
    "cardBenefitId" TEXT NOT NULL,
    "plaidAccountId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "maxAmount" DOUBLE PRECISION NOT NULL,
    "usedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remainingAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benefit_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banks_plaidId_key" ON "banks"("plaidId");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_clerkId_key" ON "user_profiles"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "plaid_items_itemId_key" ON "plaid_items"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "plaid_items_accessTokenId_key" ON "plaid_items"("accessTokenId");

-- CreateIndex
CREATE UNIQUE INDEX "plaid_accounts_accountId_key" ON "plaid_accounts"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "account_extended_plaidAccountId_key" ON "account_extended"("plaidAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "plaid_transactions_transactionId_key" ON "plaid_transactions"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_extended_plaidTransactionId_key" ON "transaction_extended"("plaidTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "card_products_issuer_productName_key" ON "card_products"("issuer", "productName");

-- CreateIndex
CREATE UNIQUE INDEX "benefit_usage_cardBenefitId_plaidAccountId_periodStart_key" ON "benefit_usage"("cardBenefitId", "plaidAccountId", "periodStart");

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_alerts" ADD CONSTRAINT "user_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plaid_items" ADD CONSTRAINT "plaid_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plaid_items" ADD CONSTRAINT "plaid_items_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plaid_items" ADD CONSTRAINT "plaid_items_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plaid_accounts" ADD CONSTRAINT "plaid_accounts_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "plaid_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plaid_accounts" ADD CONSTRAINT "plaid_accounts_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_extended" ADD CONSTRAINT "account_extended_plaidAccountId_fkey" FOREIGN KEY ("plaidAccountId") REFERENCES "plaid_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_extended" ADD CONSTRAINT "account_extended_cardProductId_fkey" FOREIGN KEY ("cardProductId") REFERENCES "card_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plaid_transactions" ADD CONSTRAINT "plaid_transactions_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "plaid_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plaid_transactions" ADD CONSTRAINT "plaid_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "plaid_accounts"("accountId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_extended" ADD CONSTRAINT "transaction_extended_plaidTransactionId_fkey" FOREIGN KEY ("plaidTransactionId") REFERENCES "plaid_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_extended" ADD CONSTRAINT "transaction_extended_matchedBenefitId_fkey" FOREIGN KEY ("matchedBenefitId") REFERENCES "card_benefits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_extended" ADD CONSTRAINT "transaction_extended_benefitUsageId_fkey" FOREIGN KEY ("benefitUsageId") REFERENCES "benefit_usage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_products" ADD CONSTRAINT "card_products_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_benefits" ADD CONSTRAINT "card_benefits_cardProductId_fkey" FOREIGN KEY ("cardProductId") REFERENCES "card_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_usage" ADD CONSTRAINT "benefit_usage_cardBenefitId_fkey" FOREIGN KEY ("cardBenefitId") REFERENCES "card_benefits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benefit_usage" ADD CONSTRAINT "benefit_usage_plaidAccountId_fkey" FOREIGN KEY ("plaidAccountId") REFERENCES "plaid_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
