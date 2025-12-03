/**
 * Fix Family Member Names Script
 *
 * This script fixes family member names that may have been incorrectly set
 * to Clerk IDs or other invalid values during user creation.
 */

import { prisma } from "../lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

async function fixFamilyMemberNames() {
  console.log("Starting family member name fix...");

  try {
    // Get all family members
    const familyMembers = await prisma.familyMember.findMany({
      include: {
        user: true,
      },
    });

    console.log(`Found ${familyMembers.length} family members to check`);

    let fixed = 0;

    for (const member of familyMembers) {
      // Check if name looks like a Clerk ID (starts with "user_" or is very long)
      const nameNeedsFixing =
        member.name.startsWith("user_") ||
        member.name.length > 50 ||
        (member.name.includes("Z") && member.name.length > 20); // Likely a hash/ID

      if (nameNeedsFixing && member.isPrimary) {
        console.log(
          `Fixing primary member: ${member.id} (current name: ${member.name.substring(0, 20)}...)`,
        );

        try {
          // Get the user's actual name from Clerk
          const clerkUser = await clerkClient.users.getUser(
            member.user.clerkId,
          );
          const properName =
            clerkUser.firstName || clerkUser.username || "Primary";

          // Update the family member name
          await prisma.familyMember.update({
            where: { id: member.id },
            data: { name: properName },
          });

          // Also update the user profile name if needed
          if (member.user.name === member.name) {
            await prisma.userProfile.update({
              where: { id: member.user.id },
              data: { name: properName },
            });
          }

          console.log(`✓ Fixed: ${member.id} -> ${properName}`);
          fixed++;
        } catch (error) {
          console.error(`✗ Failed to fix ${member.id}:`, error);
        }
      }
    }

    console.log(`\n✅ Fixed ${fixed} family member names`);
  } catch (error) {
    console.error("Error fixing family member names:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixFamilyMemberNames()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
