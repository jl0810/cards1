import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function backfill() {
  // First, ensure primary family members exist for all users
  await prisma.$queryRaw`
    WITH up AS (
      SELECT id, COALESCE(name, 'Primary Member') AS name, avatar
      FROM user_profiles
    )
    INSERT INTO family_members (id, user_id, name, avatar, role, is_primary, created_at, updated_at)
    SELECT gen_random_uuid(), up.id, up.name, up.avatar, 'Owner', true, now(), now()
    FROM up
    LEFT JOIN family_members fm ON fm.user_id = up.id AND fm.is_primary = true
    WHERE fm.id IS NULL
  `;

  // Update plaid_items with family_member_id
  await prisma.$queryRaw`
    UPDATE plaid_items
    SET family_member_id = fm.id
    FROM family_members fm
    WHERE plaid_items.user_id = fm.user_id
      AND fm.is_primary = true
      AND plaid_items.family_member_id IS NULL
  `;

  // Update plaid_accounts with family_member_id
  await prisma.$queryRaw`
    UPDATE plaid_accounts
    SET family_member_id = pi.family_member_id
    FROM plaid_items pi
    WHERE plaid_accounts.plaid_item_id = pi.id
      AND plaid_accounts.family_member_id IS NULL
  `;

  console.log('Backfill complete');
}

backfill().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
