import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUserData() {
  try {
    console.log("🔍 Checking user data...\n");

    // Get all user profiles
    const users = await prisma.userProfile.findMany({
      include: {
        familyMembers: true,
      },
    });

    console.log(`Found ${users.length} user profile(s):\n`);

    for (const user of users) {
      console.log(`📧 User: ${user.name} (${user.clerkId})`);
      console.log(`   Family Members: ${user.familyMembers.length}`);

      // Get Plaid items for this user
      const items = await prisma.plaidItem.findMany({
        where: { userId: user.id },
        include: {
          accounts: true,
        },
      });

      console.log(`   Plaid Items: ${items.length}`);

      if (items.length > 0) {
        for (const item of items) {
          console.log(
            `   - ${item.institutionName || "Unknown Bank"}: ${item.accounts.length} accounts`,
          );
        }
      }
      console.log("");
    }

    if (users.length === 0) {
      console.log("❌ No users found in database!");
      console.log(
        "   This means the Clerk webhook hasn't created a user profile yet.",
      );
      console.log("   Try logging in to trigger user creation.");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserData();
