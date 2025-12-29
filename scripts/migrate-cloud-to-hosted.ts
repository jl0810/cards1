
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Source: Cloud Supabase
const sourceUrl = 'postgresql://postgres.eiqtqmjhxswrbyidexwk:1427Turnberry!@aws-1-us-east-2.pooler.supabase.com:5432/postgres';

// Target: Local Tunnel (Cards project)
const targetUrl = (process.env.DATABASE_URL || 'postgresql://postgres:jYFQgvTt6wEnzNg918F7UQB5OO4QcVpB@127.0.0.1:54322/postgres').split('?')[0];

// Note: Source likely has camelCase columns (based on previous logs). Target has snake_case.

const sqlSource = postgres(sourceUrl, { ssl: 'require', max: 1 });
const sqlTarget = postgres(targetUrl, { max: 1 });

const ID_MAP = new Map<string, string>(); // Old ID -> New UUID

function toSnake(key: string): string {
    if (key === 'clerkId') return 'supabase_id';
    return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

async function migrateTable(table: string) {
    console.log(`📥 Fetching ${table}...`);
    let rows;
    try {
        rows = await sqlSource`SELECT * FROM ${sqlSource(table)}`;
    } catch (e: any) {
        // Fallback: maybe source table name is different? (e.g. "UserProfiles"?)
        // Assuming snake_case table names in Source query, but checked earlier it worked.
        console.error(`❌ Failed to fetch ${table}:`, e.message);
        return;
    }

    if (rows.length === 0) {
        console.log(`   (Empty)`);
        return;
    }

    const newRows = rows.map(row => {
        const newRow: any = {};

        // 1. Convert Keys snake_case
        for (const k in row) {
            newRow[toSnake(k)] = row[k];
        }

        // 2. Handle ID (Primary Key)
        if (newRow.id) {
            const oldId = newRow.id;
            let newId = ID_MAP.get(oldId);
            if (!newId) {
                // If it's already a valid UUID, keep it. Else generate.
                if (typeof oldId === 'string' && oldId.length === 36 && oldId.split('-').length === 5) {
                    newId = oldId;
                } else {
                    newId = randomUUID();
                }
                ID_MAP.set(oldId, newId);
            }
            newRow.id = newId;
        }

        // 3. Handle Foreign Keys (Remap)
        // List of FK columns to check
        const fkCols = [
            'user_id', 'bank_id', 'card_product_id', 'card_benefit_id',
            'plaid_item_id', 'plaid_account_id', 'plaid_transaction_id',
            'family_member_id', 'matched_benefit_id', 'benefit_usage_id'
        ];

        for (const col of fkCols) {
            if (newRow[col]) {
                const mapped = ID_MAP.get(newRow[col]);
                if (mapped) newRow[col] = mapped;
                // If not found in map, maybe it refers to a static ID or missing data? 
                // Keep original if not found (risky if it's CUID)
            }
        }

        return newRow;
    });

    console.log(`📤 Inserting ${newRows.length} rows into cardsgonecrazy.${table}...`);

    // Batch insert
    try {
        await sqlTarget`INSERT INTO cardsgonecrazy.${sqlTarget(table)} ${sqlTarget(newRows)}`;
    } catch (e: any) {
        console.error(`❌ Error inserting into ${table}:`, e.message);
        console.error('Sample Data:', newRows[0]);
        // Don't exit, try next table? No, FKs will fail.
        process.exit(1);
    }
}

async function run() {
    console.log('🚀 Starting Migration...');

    const tables = [
        'banks',
        'user_profiles',
        'family_members',
        'plaid_items',
        'plaid_accounts',
        'plaid_transactions',
        'card_products',
        'card_benefits',
        'benefit_usage',
        'transaction_extended',
        'account_extended',
        'user_alerts'
    ];

    for (const t of tables) {
        await migrateTable(t);
    }

    console.log('✅ Migration Complete!');
    process.exit(0);
}

run();
