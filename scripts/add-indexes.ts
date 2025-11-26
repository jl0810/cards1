import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({});

async function addPerformanceIndexes() {
    console.log('Adding performance indexes...');

    try {
        // Index for PlaidTransaction lookups by account
        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_plaid_transactions_account_id 
      ON plaid_transactions("accountId")
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_plaid_transactions_item_id 
      ON plaid_transactions("plaidItemId")
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_plaid_accounts_item_id 
      ON plaid_accounts("plaidItemId")
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_plaid_accounts_family_member_id 
      ON plaid_accounts("familyMemberId")
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id 
      ON plaid_items("userId")
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_plaid_items_family_member_id 
      ON plaid_items("familyMemberId")
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_family_members_user_id 
      ON family_members("userId")
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_transaction_extended_benefit_id 
      ON transaction_extended("matchedBenefitId")
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_transaction_extended_usage_id 
      ON transaction_extended("benefitUsageId")
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_benefit_usage_account_id 
      ON benefit_usage("plaidAccountId")
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_benefit_usage_benefit_id 
      ON benefit_usage("cardBenefitId")
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_user_alerts_user_id 
      ON user_alerts("userId")
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_plaid_transactions_date 
      ON plaid_transactions(date DESC)
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_plaid_transactions_account_date 
      ON plaid_transactions("accountId", date DESC)
    `;

        await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_user_alerts_unread 
      ON user_alerts("userId", "isRead") WHERE "isRead" = false
    `;

        console.log('✅ All indexes created successfully!');

        // Show created indexes
        const indexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `;

        console.log('\nCreated indexes:');
        console.table(indexes);

    } catch (error) {
        console.error('Error creating indexes:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

addPerformanceIndexes()
    .then(() => {
        console.log('\n✅ Database indexes added successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Failed to add indexes:', error);
        process.exit(1);
    });
