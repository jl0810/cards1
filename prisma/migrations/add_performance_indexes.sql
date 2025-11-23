-- Performance Indexes Migration
-- Run with: psql $DATABASE_URL -f prisma/migrations/add_performance_indexes.sql

-- Index for PlaidTransaction lookups by account
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_account_id 
ON plaid_transactions(accountId);

-- Index for PlaidTransaction lookups by item
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_item_id 
ON plaid_transactions(plaidItemId);

-- Index for PlaidAccount lookups by item
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_item_id 
ON plaid_accounts(plaidItemId);

-- Index for PlaidAccount lookups by family member
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_family_member_id 
ON plaid_accounts(familyMemberId);

-- Index for PlaidItem lookups by user
CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id 
ON plaid_items(userId);

-- Index for PlaidItem lookups by family member
CREATE INDEX IF NOT EXISTS idx_plaid_items_family_member_id 
ON plaid_items(familyMemberId);

-- Index for FamilyMember lookups by user
CREATE INDEX IF NOT EXISTS idx_family_members_user_id 
ON family_members(userId);

-- Index for TransactionExtended lookups by benefit
CREATE INDEX IF NOT EXISTS idx_transaction_extended_benefit_id 
ON transaction_extended(matchedBenefitId);

-- Index for TransactionExtended lookups by benefit usage
CREATE INDEX IF NOT EXISTS idx_transaction_extended_usage_id 
ON transaction_extended(benefitUsageId);

-- Index for BenefitUsage lookups by account
CREATE INDEX IF NOT EXISTS idx_benefit_usage_account_id 
ON benefit_usage(plaidAccountId);

-- Index for BenefitUsage lookups by benefit
CREATE INDEX IF NOT EXISTS idx_benefit_usage_benefit_id 
ON benefit_usage(cardBenefitId);

-- Index for UserAlert lookups by user
CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id 
ON user_alerts(userId);

-- Index for transactions by date (for time-based queries)
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_date 
ON plaid_transactions(date DESC);

-- Composite index for transaction queries (account + date)
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_account_date 
ON plaid_transactions(accountId, date DESC);

-- Index for unread alerts
CREATE INDEX IF NOT EXISTS idx_user_alerts_unread 
ON user_alerts(userId, isRead) WHERE isRead = false;

-- Performance stats
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
