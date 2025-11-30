#!/usr/bin/env tsx
/**
 * Sync missing Clerk users to database
 * Finds users in Clerk that don't exist in DB and creates them
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClerkClient } from '@clerk/backend';
import pkg from 'pg';
import { DatabaseRowSchema, ClerkUserSchema } from '../lib/validations';
import type { z } from 'zod';
const { Pool } = pkg;

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

type DatabaseRow = z.infer<typeof DatabaseRowSchema>;
type ClerkUser = z.infer<typeof ClerkUserSchema>;

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
});

async function main() {
  console.log('🔍 Fetching Clerk users...');
  const clerkUsers = await clerkClient.users.getUserList();
  
  console.log('🔍 Fetching database users...');
  const dbResult = await pool.query('SELECT "clerkId" FROM user_profiles');
  const dbClerkIds = new Set(dbResult.rows.map((r: DatabaseRow) => r.clerkId));

  // Find missing users
  const missingUsers = clerkUsers.data.filter((u: ClerkUser) => !dbClerkIds.has(u.id));

  if (missingUsers.length === 0) {
    console.log('✅ All Clerk users exist in database!');
    await pool.end();
    return;
  }

  console.log(`⚠️  Found ${missingUsers.length} user(s) missing from database:\n`);

  for (const clerkUser of missingUsers) {
    console.log(`Syncing: ${clerkUser.id}`);
    console.log(`  Email: ${clerkUser.emailAddresses[0]?.emailAddress}`);
    console.log(`  Name: ${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`);

    try {
      // Create UserProfile (generate cuid for id)
      const { createId } = await import('@paralleldrive/cuid2');
      const userId = createId();
      
      await pool.query(
        `INSERT INTO user_profiles (id, "clerkId", name, avatar, "lastLoginAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())`,
        [
          userId,
          clerkUser.id,
          clerkUser.firstName || null,
          clerkUser.imageUrl || null,
        ]
      );


      // Create primary FamilyMember
      const familyMemberId = createId();
      await pool.query(
        `INSERT INTO family_members (id, "userId", name, email, "isPrimary", role, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, true, 'Owner', NOW(), NOW())`,
        [
          familyMemberId,
          userId,
          clerkUser.firstName || 'Primary',
          clerkUser.emailAddresses[0]?.emailAddress || null,
        ]
      );

      console.log(`  ✅ Created UserProfile and primary FamilyMember\n`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`  ❌ Failed: ${errorMessage}\n`);
    }
  }

  console.log('✅ Sync complete!');
  await pool.end();
}

main()
  .catch((error) => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });
