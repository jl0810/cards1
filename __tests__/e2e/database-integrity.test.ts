/**
 * @jest-environment node
 *
 * Database Integrity Tests
 * Verifies database schema, constraints, and data integrity
 */

import { prisma } from "@/lib/prisma";

describe("Database Integrity Tests", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Schema Validation", () => {
    it("should have all required tables", async () => {
      // Test that we can query each critical table
      const tables = [
        prisma.userProfile.findMany({ take: 1 }),
        prisma.familyMember.findMany({ take: 1 }),
        prisma.plaidItem.findMany({ take: 1 }),
        prisma.plaidAccount.findMany({ take: 1 }),
        prisma.plaidTransaction.findMany({ take: 1 }),
        prisma.cardProduct.findMany({ take: 1 }),
      ];

      await expect(Promise.all(tables)).resolves.toBeDefined();
    });
  });

  describe("Unique Constraints", () => {
    it("should enforce unique constraint on PlaidAccount (familyMemberId + mask + officialName)", async () => {
      let testUser, testMember, testItem, secretId;
      try {
        testUser = await prisma.userProfile.create({
          data: {
            clerkId: "user_constraint_test_" + Date.now(),
            name: "Constraint Test",
          },
        });

        testMember = await prisma.familyMember.create({
          data: {
            userId: testUser.id,
            name: "Test Member",
            isPrimary: true,
          },
        });

        const vaultResult = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT vault.create_secret('test-token-' || ${Date.now()}, 'Constraint test ' || ${Date.now()}, 'Test') as id;
        `;
        secretId = vaultResult[0]?.id;

        testItem = await prisma.plaidItem.create({
          data: {
            userId: testUser.id,
            familyMemberId: testMember.id,
            itemId: "constraint_item_" + Date.now(),
            institutionId: "ins_constraint",
            institutionName: "Constraint Bank",
            accessTokenId: secretId,
            isTest: true,
          },
        });

        // Create first account
        await prisma.plaidAccount.create({
          data: {
            plaidItemId: testItem.id,
            accountId: "acc_constraint_1_" + Date.now(),
            name: "Test Account",
            mask: "1234",
            officialName: "Test Official",
            type: "depository",
            subtype: "checking",
            familyMemberId: testMember.id,
          },
        });

        // Try to create duplicate - should fail
        await expect(
          prisma.plaidAccount.create({
            data: {
              plaidItemId: testItem.id,
              accountId: "acc_constraint_2_" + Date.now(),
              name: "Test Account Duplicate",
              mask: "1234", // Same mask
              officialName: "Test Official", // Same official name
              type: "depository",
              subtype: "checking",
              familyMemberId: testMember.id, // Same family member
            },
          }),
        ).rejects.toThrow();
      } finally {
        // Cleanup
        if (testItem) {
          await prisma.plaidAccount.deleteMany({
            where: { plaidItemId: testItem.id },
          });
          await prisma.plaidItem.delete({ where: { id: testItem.id } });
        }
        if (testMember) {
          await prisma.familyMember.delete({ where: { id: testMember.id } });
        }
        if (testUser) {
          await prisma.userProfile.delete({ where: { id: testUser.id } });
        }
        if (secretId) {
          try {
            await prisma.$queryRaw`DELETE FROM vault.secrets WHERE id = ${secretId}::uuid`;
          } catch (e) {
            console.error("Failed to clean up secret", e);
          }
        }
      }
    });
  });

  describe("Foreign Key Constraints", () => {
    it("should cascade delete PlaidAccounts when PlaidItem is deleted", async () => {
      let testUser, testMember, testItem, testAccount, secretId;
      try {
        testUser = await prisma.userProfile.create({
          data: {
            clerkId: "user_cascade_test_" + Date.now(),
            name: "Cascade Test",
          },
        });

        testMember = await prisma.familyMember.create({
          data: {
            userId: testUser.id,
            name: "Test Member",
            isPrimary: true,
          },
        });

        const vaultResult = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT vault.create_secret('test-token-cascade-' || ${Date.now()}, 'Cascade test ' || ${Date.now()}, 'Test') as id;
        `;
        secretId = vaultResult[0]?.id;

        testItem = await prisma.plaidItem.create({
          data: {
            userId: testUser.id,
            familyMemberId: testMember.id,
            itemId: "cascade_item_" + Date.now(),
            institutionId: "ins_cascade",
            institutionName: "Cascade Bank",
            accessTokenId: secretId,
            isTest: true,
          },
        });

        testAccount = await prisma.plaidAccount.create({
          data: {
            plaidItemId: testItem.id,
            accountId: "acc_cascade_" + Date.now(),
            name: "Test Account",
            mask: "5678",
            type: "depository",
            subtype: "checking",
            familyMemberId: testMember.id,
          },
        });

        // Delete PlaidItem - should cascade to PlaidAccount
        await prisma.plaidItem.delete({ where: { id: testItem.id } });

        // Verify account was deleted
        const deletedAccount = await prisma.plaidAccount.findUnique({
          where: { id: testAccount.id },
        });

        expect(deletedAccount).toBeNull();
      } finally {
        // Cleanup
        if (testMember) {
          await prisma.familyMember.delete({ where: { id: testMember.id } });
        }
        if (testUser) {
          await prisma.userProfile.delete({ where: { id: testUser.id } });
        }
        if (secretId) {
          try {
            await prisma.$queryRaw`DELETE FROM vault.secrets WHERE id = ${secretId}::uuid`;
          } catch (e) {
            console.error("Failed to clean up secret", e);
          }
        }
        // Note: testItem is already deleted by the test logic itself, but if it failed before deletion:
        if (testItem) {
          const exists = await prisma.plaidItem.findUnique({
            where: { id: testItem.id },
          });
          if (exists) {
            await prisma.plaidItem.delete({ where: { id: testItem.id } });
          }
        }
      }
    });
  });
});
