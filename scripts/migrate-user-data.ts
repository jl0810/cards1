#!/usr/bin/env tsx
/**
 * Migrate all data from wrong user to correct user
 * FROM: user_361r4D5m6HlrRyhKgYkU6EyqfKO (wrong account with all data)
 * TO: user_35OjAzCb1MEWc5KrvjCnLFYAUb0 (correct jefflawson@gmail.com account)
 */

import 'dotenv/config';
import { prisma } from '../lib/prisma';

const FROM_CLERK_ID = 'user_361r4D5m6HlrRyhKgYkU6EyqfKO';
const TO_CLERK_ID = 'user_35OjAzCb1MEWc5KrvjCnLFYAUb0';

async function main() {
  console.log('🔄 Starting user data migration...\n');

  // Get both users
  const fromUser = await prisma.userProfile.findUnique({
    where: { clerkId: FROM_CLERK_ID },
    include: {
      familyMembers: true,
      plaidItems: true,
      alerts: true,
    },
  });

  const toUser = await prisma.userProfile.findUnique({
    where: { clerkId: TO_CLERK_ID },
  });

  if (!fromUser) {
    console.error('❌ Source user not found!');
    process.exit(1);
  }

  if (!toUser) {
    console.error('❌ Destination user not found!');
    process.exit(1);
  }

  console.log('📊 Source user (old account):');
  console.log(`   Clerk ID: ${fromUser.clerkId}`);
  console.log(`   Family Members: ${fromUser.familyMembers.length}`);
  console.log(`   Plaid Items: ${fromUser.plaidItems.length}`);
  console.log(`   Alerts: ${fromUser.alerts.length}`);

  console.log('\n📊 Destination user (jefflawson@gmail.com):');
  console.log(`   Clerk ID: ${toUser.clerkId}`);
  console.log(`   Name: ${toUser.name}`);

  console.log('\n🔄 Migrating data...\n');

  // 1. Migrate Family Members
  console.log('1️⃣ Migrating family members...');
  const familyMemberUpdate = await prisma.familyMember.updateMany({
    where: { userId: fromUser.id },
    data: { userId: toUser.id },
  });
  console.log(`   ✅ Migrated ${familyMemberUpdate.count} family members`);

  // 2. Migrate Plaid Items
  console.log('2️⃣ Migrating Plaid items...');
  const plaidItemUpdate = await prisma.plaidItem.updateMany({
    where: { userId: fromUser.id },
    data: { userId: toUser.id },
  });
  console.log(`   ✅ Migrated ${plaidItemUpdate.count} Plaid items`);

  // 3. Migrate Alerts
  console.log('3️⃣ Migrating alerts...');
  const alertUpdate = await prisma.userAlert.updateMany({
    where: { userId: fromUser.id },
    data: { userId: toUser.id },
  });
  console.log(`   ✅ Migrated ${alertUpdate.count} alerts`);

  // 4. Delete the old user profile
  console.log('4️⃣ Deleting old user profile...');
  await prisma.userProfile.delete({
    where: { id: fromUser.id },
  });
  console.log('   ✅ Deleted old user profile');

  console.log('\n✅ Migration complete!');
  console.log('\n📊 Final state:');
  
  const finalUser = await prisma.userProfile.findUnique({
    where: { clerkId: TO_CLERK_ID },
    include: {
      familyMembers: true,
      plaidItems: { include: { accounts: true } },
    },
  });

  console.log(`   User: ${finalUser?.name} (${finalUser?.clerkId})`);
  console.log(`   Family Members: ${finalUser?.familyMembers.length}`);
  finalUser?.familyMembers.forEach(m => console.log(`     - ${m.name} (${m.role})`));
  console.log(`   Plaid Items: ${finalUser?.plaidItems.length}`);
  const totalAccounts = finalUser?.plaidItems.reduce((sum, item) => sum + item.accounts.length, 0) || 0;
  console.log(`   Total Accounts: ${totalAccounts}`);
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
