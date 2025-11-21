import { PrismaClient } from '@prisma/client';
import { Client } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function migrate() {
    // Construct connection string
    const host = 'cards-db-azure.postgres.database.azure.com';
    const user = 'postgres';
    const database = 'cards_gone_crazy'; // ✅ CORRECT DB

    console.log(`🔌 Connecting to ${host} (DB: ${database})...`);

    // Prompt for password
    const readline = await import('readline/promises');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const password = await rl.question('🔑 Enter Azure Postgres Password: ');
    rl.close();

    const connectionString = `postgresql://${user}:${encodeURIComponent(password)}@${host}:5432/${database}?sslmode=require`;

    const azureClient = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await azureClient.connect();
        console.log('✅ Connected to Azure');

        // 1. Inspect tables to find the cards table
        console.log('🔍 Inspecting tables...');
        const tablesRes = await azureClient.query(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
        `);

        if (tablesRes.rows.length === 0) {
            console.error('❌ No tables found in the database!');
            return;
        }

        console.log('Found tables:');
        tablesRes.rows.forEach(r => console.log(` - ${r.table_schema}.${r.table_name}`));

        // Guess the table name
        const cardTableRow = tablesRes.rows.find(r =>
            r.table_name.includes('card') ||
            r.table_name.includes('product')
        );

        if (!cardTableRow) {
            console.error('❌ Could not find a table resembling "cards" or "products"');
            return;
        }

        const tableName = `"${cardTableRow.table_schema}"."${cardTableRow.table_name}"`;
        console.log(`👉 Using source table: ${tableName}`);

        // 2. Fetch cards
        const cardsRes = await azureClient.query(`SELECT * FROM ${tableName}`);
        const cards = cardsRes.rows;
        console.log(`📦 Found ${cards.length} cards in Azure`);

        // 3. Import to Supabase via Prisma
        console.log('🚀 Starting import to Supabase...');

        let imported = 0;
        let skipped = 0;

        for (const card of cards) {
            // Map Azure columns to Prisma schema
            // Correct mapping based on logs:
            const issuer = card.bank || card.issuer || 'Unknown';
            const name = card.card_name || card.name || card.product_name;

            if (!name) {
                console.warn('⚠️ Skipping card with no name:', card);
                skipped++;
                continue;
            }

            console.log(`Processing: ${issuer} - ${name}`);

            // Parse annual fee (e.g., "$95" -> 95)
            let fee = 0;
            if (card.annual_fee) {
                const feeString = String(card.annual_fee).replace(/[^0-9.]/g, '');
                fee = parseFloat(feeString) || 0;
            }

            try {
                await prisma.cardProduct.upsert({
                    where: {
                        issuer_productName: {
                            issuer: issuer,
                            productName: name
                        }
                    },
                    create: {
                        issuer: issuer,
                        productName: name,
                        cardType: card.card_type || 'Points',
                        annualFee: fee,
                        signupBonus: card.welcome_bonus || card.signup_bonus || null,
                        imageUrl: card.image_url || null
                    },
                    update: {
                        annualFee: fee,
                        signupBonus: card.welcome_bonus || undefined,
                        imageUrl: card.image_url || undefined
                    }
                });
                imported++;
            } catch (e: any) {
                console.error(`❌ Failed to import ${name}:`, e.message);
                skipped++;
            }
        }

        console.log('\n🎉 Migration Complete!');
        console.log(`✅ Imported/Updated: ${imported}`);
        console.log(`⚠️ Skipped/Failed: ${skipped}`);

    } catch (error: any) {
        console.error('❌ Migration failed:', error);
    } finally {
        await azureClient.end();
        await prisma.$disconnect();
    }
}

migrate();
