/**
 * Diagnostic script to check user data
 * Run with: npx tsx scripts/check-user-data.ts
 */

import { prisma } from '../lib/prisma';

async function checkUserData() {
  try {
    console.log('🔍 Checking data for jefflawson@gmail.com...\n');

    // Find user profile by email (via Clerk)
    const userProfile = await prisma.userProfile.findFirst({
      include: {
        familyMembers: true,
      }
    });

    if (!userProfile) {
      console.log('❌ No user profile found');
      return;
    }

    console.log('✅ User Profile:', {
      id: userProfile.id,
      clerkId: userProfile.clerkId,
      name: userProfile.name,
      familyMembers: userProfile.familyMembers.length,
    });

    // Check Plaid items
    const plaidItems = await prisma.plaidItem.findMany({
      where: { userId: userProfile.id },
      include: {
        accounts: {
          include: {
            extended: true,
          }
        }
      }
    });

    console.log(`\n📊 Plaid Items: ${plaidItems.length}`);
    
    plaidItems.forEach((item, i) => {
      console.log(`\n  Item ${i + 1}:`, {
        id: item.id,
        institutionName: item.institutionName,
        accounts: item.accounts.length,
      });

      item.accounts.forEach((acc, j) => {
        console.log(`    Account ${j + 1}:`, {
          id: acc.id,
          name: acc.name,
          balance: acc.currentBalance,
          type: acc.type,
          subtype: acc.subtype,
        });
      });
    });

    // Check transactions
    const txCount = await prisma.plaidTransaction.count({
      where: {
        plaidItem: {
          userId: userProfile.id
        }
      }
    });

    console.log(`\n💳 Total Transactions: ${txCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserData();
