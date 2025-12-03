/**
 * Fix Family Member Names Script
 * 
 * This script fixes family member names that may have been incorrectly set
 * to Clerk IDs or other invalid values during user creation.
 * 
 * @implements BR-001A - Clerk Sync (Self-Healing)
 */

import { prisma } from '../lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';

async function fixFamilyMemberNames() {
    console.log('Starting family member name fix...\n');

    try {
        // Get all family members
        const familyMembers = await prisma.familyMember.findMany({
            include: {
                user: true,
            },
        });

        console.log(`Found ${familyMembers.length} family members to check\n`);

        let fixed = 0;
        let skipped = 0;
        let errors = 0;

        for (const member of familyMembers) {
            // Check if name looks like a Clerk ID or hash
            const nameNeedsFixing =
                member.name.startsWith('user_') ||
                member.name.length > 50 ||
                (member.name.includes('Z') && member.name.length > 20) || // Likely a hash/ID
                member.name === 'Primary'; // Generic fallback

            if (nameNeedsFixing && member.isPrimary) {
                console.log(`🔍 Checking: ${member.id}`);
                console.log(`   Current name: ${member.name.substring(0, 30)}${member.name.length > 30 ? '...' : ''}`);

                try {
                    // Get the user's actual name from Clerk API
                    const client = await clerkClient();
                    const clerkUser = await client.users.getUser(member.user.clerkId);

                    // Determine best name to use
                    const properName = clerkUser.firstName ||
                        clerkUser.username ||
                        clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] ||
                        'User';

                    console.log(`   Clerk name: ${properName}`);

                    // Update the family member name
                    await prisma.familyMember.update({
                        where: { id: member.id },
                        data: { name: properName },
                    });

                    // Also update the user profile name if it has the same bad name
                    if (member.user.name === member.name || !member.user.name) {
                        await prisma.userProfile.update({
                            where: { id: member.user.id },
                            data: { name: properName },
                        });
                        console.log(`   ✅ Fixed both family member and user profile -> "${properName}"\n`);
                    } else {
                        console.log(`   ✅ Fixed family member -> "${properName}"\n`);
                    }

                    fixed++;
                } catch (error) {
                    console.error(`   ❌ Failed to fix ${member.id}:`, (error as Error).message);
                    errors++;
                }
            } else {
                skipped++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✅ Fixed: ${fixed}`);
        console.log(`⏭️  Skipped (already good): ${skipped}`);
        console.log(`❌ Errors: ${errors}`);
        console.log('='.repeat(50) + '\n');
    } catch (error) {
        console.error('Error fixing family member names:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
fixFamilyMemberNames()
    .then(() => {
        console.log('✨ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
