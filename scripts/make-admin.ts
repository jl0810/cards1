/**
 * Script to mark a user as admin in Clerk
 * Usage: npx tsx scripts/make-admin.ts <clerk_user_id>
 * 
 * Or run without arguments to see all users and pick one
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClerkClient } from '@clerk/backend';
import { ClerkPrivateMetadataSchema } from '../lib/validations';
import type { z } from 'zod';

type ClerkPrivateMetadata = z.infer<typeof ClerkPrivateMetadataSchema>;

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
    console.error('❌ CLERK_SECRET_KEY not found in environment variables');
    process.exit(1);
}

const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });

async function listUsers() {
    const response = await clerk.users.getUserList();

    console.log('\n📋 Clerk Users:\n');

    for (const user of response.data) {
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No name';
        const email = user.emailAddresses[0]?.emailAddress || 'No email';
        const role = (user.privateMetadata as ClerkPrivateMetadata)?.role || 'user';
        const isAdmin = role === 'admin';

        console.log(`${isAdmin ? '👑' : '👤'} ${name}`);
        console.log(`   Email: ${email}`);
        console.log(`   User ID: ${user.id}`);
        console.log(`   Role: ${role} ${isAdmin ? '(ADMIN)' : ''}`);
        console.log('');
    }

    console.log(`Total users: ${response.data.length}\n`);
}

async function makeAdmin(userId: string) {
    try {
        await clerk.users.updateUser(userId, {
            publicMetadata: {
                role: 'admin'
            },
            privateMetadata: {
                role: 'admin'
            }
        });

        console.log(`✅ User ${userId} is now an admin\n`);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error making user admin:', errorMessage);
        process.exit(1);
    }
}

async function main() {
    const userId = process.argv[2];

    if (!userId) {
        console.log('No user ID provided. Listing all users...\n');
        await listUsers();
        console.log('To make a user admin, run:');
        console.log('npx tsx scripts/make-admin.ts <user_id>\n');
        return;
    }

    await makeAdmin(userId);
}

main();
