#!/usr/bin/env tsx
/**
 * Cleanup script to remove test users with invalid Clerk IDs
 * before applying the database constraint
 */

import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('🔍 Checking for users with invalid Clerk IDs...\n');

  // Find users that don't match Clerk ID format
  const allUsers = await prisma.userProfile.findMany({
    select: {
      id: true,
      clerkId: true,
      name: true,
      createdAt: true,
    },
  });

  const invalidUsers = allUsers.filter(
    (user) => !user.clerkId.startsWith('user_') || user.clerkId.length < 6
  );

  if (invalidUsers.length === 0) {
    console.log('✅ No invalid users found! All users have valid Clerk IDs.');
    return;
  }

  console.log(`❌ Found ${invalidUsers.length} user(s) with invalid Clerk IDs:\n`);
  
  invalidUsers.forEach((user) => {
    console.log(`  - ID: ${user.id}`);
    console.log(`    Clerk ID: ${user.clerkId}`);
    console.log(`    Name: ${user.name || 'N/A'}`);
    console.log(`    Created: ${user.createdAt.toISOString()}`);
    console.log('');
  });

  console.log('🗑️  Deleting invalid users and their related data...\n');

  for (const user of invalidUsers) {
    console.log(`Cleaning up user ${user.id} (${user.clerkId})...`);

    // Set PlaidItems to inactive (can't delete due to trigger)
    await prisma.plaidItem.updateMany({
      where: { userId: user.id },
      data: { status: 'inactive' },
    });

    // Delete related data that CAN be deleted
    await prisma.plaidTransaction.deleteMany({
      where: { plaidItem: { userId: user.id } },
    });

    await prisma.plaidAccount.deleteMany({
      where: { plaidItem: { userId: user.id } },
    });

    await prisma.familyMember.deleteMany({
      where: { userId: user.id },
    });

    await prisma.userAlert.deleteMany({
      where: { userId: user.id },
    });

    // Now delete the user (PlaidItems are inactive, not deleted)
    await prisma.userProfile.delete({
      where: { id: user.id },
    });

    console.log(`  ✅ Cleaned up user ${user.id}`);
  }

  console.log(`\n✅ Cleanup complete! Deleted ${invalidUsers.length} invalid user(s).`);
}

main()
  .catch((error) => {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
