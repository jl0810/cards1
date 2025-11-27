#!/usr/bin/env tsx
/**
 * Check all users in the database
 */

import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('🔍 Checking all users in database...\n');

  const allUsers = await prisma.userProfile.findMany({
    select: {
      id: true,
      clerkId: true,
      name: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`Total users: ${allUsers.length}\n`);

  if (allUsers.length === 0) {
    console.log('No users found.');
    return;
  }

  const validUsers = allUsers.filter(
    (user) => user.clerkId.startsWith('user_') && user.clerkId.length >= 6
  );

  const invalidUsers = allUsers.filter(
    (user) => !user.clerkId.startsWith('user_') || user.clerkId.length < 6
  );

  console.log(`✅ Valid users (${validUsers.length}):`);
  validUsers.forEach((user) => {
    console.log(`  - ${user.clerkId} | ${user.name || 'N/A'} | Created: ${user.createdAt.toISOString()}`);
  });

  if (invalidUsers.length > 0) {
    console.log(`\n❌ Invalid users (${invalidUsers.length}):`);
    invalidUsers.forEach((user) => {
      console.log(`  - ${user.clerkId} | ${user.name || 'N/A'} | Created: ${user.createdAt.toISOString()}`);
    });
  }
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
