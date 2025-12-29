
import postgres from 'postgres';

// Source: Cloud Supabase
const sourceUrl = 'postgresql://postgres.eiqtqmjhxswrbyidexwk:1427Turnberry!@aws-1-us-east-2.pooler.supabase.com:5432/postgres';

// Target: Local Tunnel -> Hetzner
const targetUrl = 'postgresql://postgres:jYFQgvTt6wEnzNg918F7UQB5OO4QcVpB@127.0.0.1:54322/postgres';

const sqlSource = postgres(sourceUrl, { ssl: 'require', max: 1 });
const sqlTarget = postgres(targetUrl, { max: 1 });

async function migrate() {
    console.log('🔗 Connecting to DBs...');

    try {
        const users = await sqlSource`SELECT * FROM user_profiles LIMIT 5`;
        console.log('✅ Connected to Source! Found', users.length, 'users.');
        console.log('Sample User:', users[0]);
    } catch (e) {
        console.error('❌ Source Connection Failed:', e);
    }

    try {
        const targetTest = await sqlTarget`SELECT count(*) FROM cardsgonecrazy.user_profiles`;
        console.log('✅ Connected to Target! Existing users:', targetTest[0].count);
    } catch (e) {
        console.error('❌ Target Connection Failed:', e);
    }

    process.exit(0);
}

migrate();
