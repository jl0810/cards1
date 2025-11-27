#!/usr/bin/env tsx
/**
 * Manual Clerk sync script
 * Use when webhooks fail or for recovery
 * 
 * Usage:
 *   npx tsx scripts/sync-clerk.ts                    # Sync all users
 *   npx tsx scripts/sync-clerk.ts <clerk_user_id>    # Sync specific user
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first, then .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { syncClerkUser, syncAllClerkUsers } from '../lib/clerk-sync';

async function main() {
  const clerkId = process.argv[2];

  if (clerkId) {
    // Sync specific user
    console.log(`🔄 Syncing user: ${clerkId}\n`);
    
    try {
      const profile = await syncClerkUser(clerkId);
      
      console.log('✅ Sync successful!\n');
      console.log('User Profile:');
      console.log(`  Clerk ID: ${profile.clerkId}`);
      console.log(`  Profile ID: ${profile.id}`);
      console.log(`  Name: ${profile.name || 'Not set'}`);
      console.log(`  Family Members: ${profile.familyMembers?.length || 0}`);
      
      if (profile.familyMembers && profile.familyMembers.length > 0) {
        profile.familyMembers.forEach(m => {
          console.log(`    - ${m.name} (${m.role})${m.isPrimary ? ' [PRIMARY]' : ''}`);
        });
      }
    } catch (error) {
      console.error('❌ Sync failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  } else {
    // Sync all users
    console.log('🔄 Syncing all Clerk users...\n');
    
    try {
      const results = await syncAllClerkUsers();
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      console.log('\n✅ Sync complete!\n');
      console.log(`Total: ${results.length}`);
      console.log(`Successful: ${successful.length}`);
      console.log(`Failed: ${failed.length}`);
      
      if (failed.length > 0) {
        console.log('\n❌ Failed users:');
        failed.forEach(f => {
          console.log(`  - ${f.clerkId}: ${f.error}`);
        });
      }
    } catch (error) {
      console.error('❌ Bulk sync failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
