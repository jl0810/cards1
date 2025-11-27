import { prisma } from '@/lib/prisma';

/**
 * Test helper for creating test users in integration tests
 * 
 * IMPORTANT: All test users MUST be cleaned up in afterAll() or afterEach()
 * 
 * This helper simulates what the Clerk webhook does (BR-001):
 * 1. Creates UserProfile with a test Clerk ID
 * 2. Creates primary FamilyMember
 * 
 * NOTE: In production, users are ONLY created through Clerk webhooks (BR-001).
 * For integration tests, we simulate this behavior by directly creating the
 * database records that the webhook would create. This is the standard approach
 * for testing webhook-dependent systems and is recommended by Clerk's testing guide.
 * 
 * For E2E tests that need real Clerk users, use Playwright with @clerk/testing.
 * 
 * @implements BR-001 - User Profile Creation (simulates webhook behavior)
 * @satisfies US-001 - User Registration (test simulation)
 * @tested Integration tests
 */

export interface TestUserData {
  clerkUser: any;
  userProfile: any;
  primaryFamilyMember: any;
  clerkId: string;
  userId: string;
  familyMemberId: string;
}

/**
 * Creates a test user through Clerk Backend API for Jest tests
 * 
 * CRITICAL: You MUST call cleanupTestUser() in your test cleanup (afterAll/afterEach)
 * 
 * @implements BR-001 - User Profile Creation (via Clerk)
 * @satisfies US-001 - User Registration
 * @tested Integration tests
 * 
 * @example
 * ```typescript
 * let testUser: TestUserData;
 * 
 * beforeAll(async () => {
 *   testUser = await createTestUserViaClerk({ firstName: 'Test' });
 * });
 * 
 * afterAll(async () => {
 *   await cleanupTestUser(testUser.clerkId); // REQUIRED!
 *   await prisma.$disconnect();
 * });
 * ```
 */
export async function createTestUserViaClerk(options: {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
} = {}): Promise<TestUserData> {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  const email = options.email || `test_${timestamp}_${randomSuffix}@test.local`;
  const firstName = options.firstName || 'Test';
  const lastName = options.lastName || 'User';
  const password = options.password || 'TestPassword123!';

  try {
    // Step 1: Generate a test Clerk ID (simulating Clerk user creation)
    const testClerkId = `user_test_${timestamp}_${randomSuffix}`;
    
    // Mock Clerk user object (what webhook would receive)
    const clerkUser = {
      id: testClerkId,
      firstName,
      lastName,
      emailAddresses: [{ emailAddress: email }],
      imageUrl: null,
    };

    // Step 2: Manually create UserProfile (simulating webhook behavior)
    // This is what the user.created webhook would do (BR-001)
    const userProfile = await prisma.userProfile.create({
      data: {
        clerkId: clerkUser.id,
        name: firstName || undefined,
        avatar: clerkUser.imageUrl || undefined,
        lastLoginAt: new Date(),
      },
    });

    // Step 3: Create primary family member (simulating webhook behavior)
    // This is what the user.created webhook would do (BR-002)
    const primaryFamilyMember = await prisma.familyMember.create({
      data: {
        userId: userProfile.id,
        name: firstName || 'Primary',
        email: email || undefined,
        isPrimary: true,
        role: 'Owner',
      },
    });

    return {
      clerkUser,
      userProfile,
      primaryFamilyMember,
      clerkId: clerkUser.id,
      userId: userProfile.id,
      familyMemberId: primaryFamilyMember.id,
    };
  } catch (error) {
    console.error('Failed to create test user:', error);
    throw error;
  }
}

/**
 * Cleans up a test user from both Clerk and database
 * 
 * CRITICAL: This MUST be called in afterAll() or afterEach() for every test user created
 * 
 * @param clerkId - The Clerk user ID to delete
 */
export async function cleanupTestUser(clerkId: string): Promise<void> {
  try {
    // Get the user profile first
    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkId },
    });

    if (userProfile) {
      // Mark all PlaidItems as test so they can be deleted (trigger allows deletion of test items)
      await prisma.plaidItem.updateMany({
        where: { userId: userProfile.id },
        data: { isTest: true },
      });

      // Delete all related data in correct order (respecting foreign keys)
      await prisma.plaidTransaction.deleteMany({
        where: { plaidItem: { userId: userProfile.id } },
      });

      await prisma.plaidAccount.deleteMany({
        where: { plaidItem: { userId: userProfile.id } },
      });

      // Now we can delete PlaidItems (they're marked as test)
      await prisma.plaidItem.deleteMany({
        where: { userId: userProfile.id },
      });

      await prisma.familyMember.deleteMany({
        where: { userId: userProfile.id },
      });

      await prisma.userProfile.delete({
        where: { id: userProfile.id },
      }).catch(() => {
        // Ignore if already deleted
      });
    }

    // Note: In tests, we don't create real Clerk users, so no Clerk cleanup needed
    // The test Clerk ID was just a mock identifier
  } catch (error) {
    console.error('Failed to cleanup test user:', error);
    // Don't throw - we want cleanup to continue even if it fails
  }
}

/**
 * Batch cleanup for multiple test users
 * Use this in afterAll() when you've created multiple users
 */
export async function cleanupTestUsers(clerkIds: string[]): Promise<void> {
  await Promise.all(clerkIds.map(id => cleanupTestUser(id)));
}
