/**
 * Fix orphaned PlaidItems - reconnect them to the correct user
 */

import { prisma } from '../lib/prisma.js';

async function fixUserData() {
  try {
    console.log('🔍 Finding all users and items...\n');

    const users = await prisma.userProfile.findMany();
    console.log(`Found ${users.length} users:`);
    users.forEach(u => console.log(`  - ${u.name} (${u.clerkId})`));

    const allItems = await prisma.plaidItem.findMany({
      include: {
        accounts: true
      }
    });
    console.log(`\nFound ${allItems.length} PlaidItems total`);

    // Check each user's items
    for (const user of users) {
      const userItems = allItems.filter(i => i.userId === user.id);
      console.log(`\n${user.name} has ${userItems.length} items`);
      userItems.forEach(i => console.log(`  - ${i.institutionName} (${i.accounts.length} accounts)`));
    }

    // Find orphaned items
    const orphaned = allItems.filter(i => !users.find(u => u.id === i.userId));
    if (orphaned.length > 0) {
      console.log(`\n⚠️  Found ${orphaned.length} orphaned items (no matching user)`);
      
      if (users.length === 1) {
        console.log(`\n🔧 Fixing: Assigning all orphaned items to ${users[0].name}...`);
        
        for (const item of orphaned) {
          await prisma.plaidItem.update({
            where: { id: item.id },
            data: { userId: users[0].id }
          });
          console.log(`  ✅ Fixed ${item.institutionName}`);
        }
        
        console.log('\n✅ All items fixed!');
      }
    } else {
      console.log('\n✅ No orphaned items found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserData();
