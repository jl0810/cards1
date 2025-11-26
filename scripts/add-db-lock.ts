import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import { prisma } from '../lib/prisma';

async function addDbLock() {
    console.log('🔒 Adding database lock to prevent Plaid Item deletion...\n');

    try {
        // 1. Create the function
        await prisma.$executeRawUnsafe(`
            CREATE OR REPLACE FUNCTION prevent_deletion() RETURNS TRIGGER AS $$
            BEGIN
                RAISE EXCEPTION 'Deletion from this table is not allowed. Set status to inactive instead.';
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('✅ Function prevent_deletion created.');

        // 2. Create the trigger
        // Drop if exists to avoid errors on re-run
        await prisma.$executeRawUnsafe(`
            DROP TRIGGER IF EXISTS trigger_prevent_plaid_item_delete ON "plaid_items";
        `);

        await prisma.$executeRawUnsafe(`
            CREATE TRIGGER trigger_prevent_plaid_item_delete
            BEFORE DELETE ON "plaid_items"
            FOR EACH ROW
            EXECUTE FUNCTION prevent_deletion();
        `);
        console.log('✅ Trigger trigger_prevent_plaid_item_delete created.');
        console.log('🛡️ Plaid Items are now protected from deletion.');

    } catch (error) {
        console.error('❌ Failed to add lock:', error);
    }
}

addDbLock().catch(console.error);
