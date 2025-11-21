import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function runSql() {
  // Create family_members table if not exists (without FKs first)
  await prisma.$queryRaw`
    CREATE TABLE IF NOT EXISTS "family_members" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "email" TEXT,
      "avatar" TEXT,
      "color" TEXT,
      "role" TEXT DEFAULT 'Member',
      "isPrimary" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Add FK constraint
  try {
    await prisma.$queryRaw`
      ALTER TABLE "family_members" ADD CONSTRAINT "family_members_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE
    `;
  } catch (e) {
    // Constraint might already exist
  }

  // Add familyMemberId columns if not exist
  await prisma.$queryRaw`
    ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "familyMemberId" TEXT
  `;

  await prisma.$queryRaw`
    ALTER TABLE "plaid_accounts" ADD COLUMN IF NOT EXISTS "familyMemberId" TEXT
  `;

  // Add FK constraints for plaid tables
  try {
    await prisma.$queryRaw`
      ALTER TABLE "plaid_items" ADD CONSTRAINT "plaid_items_familyMemberId_fkey"
      FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE
    `;
  } catch (e) {
    // Constraint might already exist
  }

  try {
    await prisma.$queryRaw`
      ALTER TABLE "plaid_accounts" ADD CONSTRAINT "plaid_accounts_familyMemberId_fkey"
      FOREIGN KEY ("familyMemberId") REFERENCES "family_members"("id") ON DELETE CASCADE
    `;
  } catch (e) {
    // Constraint might already exist
  }

  // Create primary family members
  await prisma.$queryRaw`
    INSERT INTO "family_members" ("id", "userId", "name", "avatar", "role", "isPrimary", "createdAt", "updatedAt")
    SELECT gen_random_uuid(), up."id", COALESCE(up."name", 'Primary Member'), up."avatar", 'Owner', true, now(), now()
    FROM "user_profiles" up
    LEFT JOIN "family_members" fm ON fm."userId" = up."id" AND fm."isPrimary" = true
    WHERE fm."id" IS NULL
  `;

  // Update plaid_items
  await prisma.$queryRaw`
    UPDATE "plaid_items"
    SET "familyMemberId" = fm."id"
    FROM "family_members" fm
    WHERE "plaid_items"."userId" = fm."userId"
      AND fm."isPrimary" = true
      AND "plaid_items"."familyMemberId" IS NULL
  `;

  // Update plaid_accounts
  await prisma.$queryRaw`
    UPDATE "plaid_accounts"
    SET "familyMemberId" = pi."familyMemberId"
    FROM "plaid_items" pi
    WHERE "plaid_accounts"."plaidItemId" = pi."id"
      AND "plaid_accounts"."familyMemberId" IS NULL
  `;

  console.log('Raw SQL backfill complete');
}

runSql().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
