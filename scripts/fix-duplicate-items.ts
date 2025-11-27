/**
 * Fix duplicate PlaidItems before applying unique constraint
 * 
 * This script finds and removes duplicate PlaidItems (same userId + institutionId)
 * keeping only the most recent one
 */

import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

async function fixDuplicates() {
  console.log('🔍 Finding duplicate PlaidItems...');

  // Find all PlaidItems grouped by userId and institutionId
  const allItems = await prisma.plaidItem.findMany({
    where: {
      institutionId: { not: null },
    },
    orderBy: {
      createdAt: 'desc', // Most recent first
    },
    include: {
      accounts: true,
      transactions: true,
    },
  });

  // Group by userId + institutionId
  const grouped = new Map<string, typeof allItems>();
  
  for (const item of allItems) {
    const key = `${item.userId}:${item.institutionId}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  }

  // Find duplicates
  const duplicates = Array.from(grouped.entries()).filter(([_, items]) => items.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} duplicate groups:`);

  for (const [key, items] of duplicates) {
    const [userId, institutionId] = key.split(':');
    console.log(`\n📍 User: ${userId}, Institution: ${institutionId}`);
    console.log(`   ${items.length} items found:`);
    
    items.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ID: ${item.id}, Created: ${item.createdAt}, Accounts: ${item.accounts.length}, Txns: ${item.transactions.length}`);
    });

    // Keep the most recent one (first in array due to orderBy desc)
    const [keep, ...remove] = items;
    
    console.log(`   ✅ Keeping: ${keep.id} (most recent)`);
    console.log(`   ❌ Removing: ${remove.map(i => i.id).join(', ')}`);

    // Delete the older duplicates
    for (const item of remove) {
      // Delete related data first (cascade should handle this, but being explicit)
      await prisma.plaidTransaction.deleteMany({
        where: { plaidItemId: item.id },
      });
      
      await prisma.plaidAccount.deleteMany({
        where: { plaidItemId: item.id },
      });

      // Delete the item
      await prisma.plaidItem.delete({
        where: { id: item.id },
      });

      console.log(`   🗑️  Deleted item ${item.id}`);
    }
  }

  console.log('\n✅ All duplicates removed!');
  console.log('Now run: npx prisma db push');
}

fixDuplicates()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
