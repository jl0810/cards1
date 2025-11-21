/**
 * List all Clerk users to find your user ID
 * Usage: npx tsx scripts/list-users.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { clerkClient } from '@clerk/nextjs/server';

async function listUsers() {
    try {
        const client = await clerkClient();
        const response = await client.users.getUserList();

        console.log('\n📋 Clerk Users:\n');

        for (const user of response.data) {
            console.log(`👤 ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No name');
            console.log(`   Email: ${user.emailAddresses[0]?.emailAddress || 'No email'}`);
            console.log(`   User ID: ${user.id}`);
            console.log(`   Role: ${(user.publicMetadata as any)?.role || 'user'}`);
            console.log('');
        }

        console.log(`Total users: ${response.data.length}\n`);
    } catch (error: any) {
        console.error('❌ Error listing users:', error.message);
    }
}

listUsers();
