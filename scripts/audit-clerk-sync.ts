#!/usr/bin/env tsx
/**
 * Audit Clerk <-> Database sync
 * Finds mismatches between Clerk users and database users
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { createClerkClient } from '@clerk/backend';
import { PrismaClient } from '../generated/prisma/client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Auditing Clerk <-> Database sync...\n');

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

  // Get all Clerk users
  const clerkUsers = await clerk.users.getUserList({ limit: 100 });
  console.log(`📊 Found ${clerkUsers.data.length} users in Clerk\n`);

  // Get all database users
  const dbUsers = await prisma.userProfile.findMany({
    include: {
      familyMembers: true,
      plaidItems: true,
    },
  });
  console.log(`📊 Found ${dbUsers.length} users in database\n`);

  // Find mismatches
  const clerkIds = new Set(clerkUsers.data.map(u => u.id));
  const dbClerkIds = new Set(dbUsers.map(u => u.clerkId));

  // Users in Clerk but not in DB
  const missingInDb = clerkUsers.data.filter(u => !dbClerkIds.has(u.id));
  
  // Users in DB but not in Clerk
  const missingInClerk = dbUsers.filter(u => !clerkIds.has(u.clerkId));

  // Report
  console.log('═══════════════════════════════════════════════════\n');
  
  if (missingInDb.length > 0) {
    console.log(`⚠️  ${missingInDb.length} Clerk user(s) NOT in database:`);
    missingInDb.forEach(u => {
      console.log(`\n  Clerk ID: ${u.id}`);
      console.log(`  Email: ${u.emailAddresses[0]?.emailAddress}`);
      console.log(`  Name: ${u.firstName} ${u.lastName || ''}`);
      console.log(`  Created: ${new Date(u.createdAt).toISOString()}`);
      console.log(`  ⚡ Action: Run sync to create database profile`);
    });
    console.log('');
  }

  if (missingInClerk.length > 0) {
    console.log(`⚠️  ${missingInClerk.length} database user(s) NOT in Clerk:`);
    missingInClerk.forEach(u => {
      const isTest = u.clerkId.includes('test') || u.clerkId.includes('legacy');
      console.log(`\n  Clerk ID: ${u.clerkId}`);
      console.log(`  Name: ${u.name || 'Not set'}`);
      console.log(`  Family Members: ${u.familyMembers.length}`);
      console.log(`  Plaid Items: ${u.plaidItems.length}`);
      console.log(`  Created: ${u.createdAt.toISOString()}`);
      if (isTest) {
        console.log(`  ⚡ Action: DELETE (test user)`);
      } else {
        console.log(`  ⚡ Action: INVESTIGATE (orphaned real user)`);
      }
    });
    console.log('');
  }

  // Summary
  console.log('═══════════════════════════════════════════════════\n');
  console.log('📊 SUMMARY:');
  console.log(`  Clerk users: ${clerkUsers.data.length}`);
  console.log(`  Database users: ${dbUsers.length}`);
  console.log(`  In sync: ${clerkUsers.data.length - missingInDb.length}`);
  console.log(`  Missing in DB: ${missingInDb.length}`);
  console.log(`  Missing in Clerk: ${missingInClerk.length}`);
  
  if (missingInDb.length === 0 && missingInClerk.length === 0) {
    console.log('\n✅ All users are in sync!');
  } else {
    console.log('\n⚠️  Sync issues detected. Recommended actions:');
    if (missingInDb.length > 0) {
      console.log('  1. Run: npx tsx scripts/sync-clerk.ts (to create missing DB profiles)');
    }
    if (missingInClerk.length > 0) {
      const testUsers = missingInClerk.filter(u => 
        u.clerkId.includes('test') || u.clerkId.includes('legacy')
      );
      if (testUsers.length > 0) {
        console.log(`  2. Delete ${testUsers.length} test users from database`);
      }
    }
  }

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  });
