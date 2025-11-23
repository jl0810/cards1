import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking current database (Supabase)...');
    
    // Query to list all table names in the public schema
    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name LIKE '%universe%'
      ORDER BY table_name;
    `;
    
    if (tables.length > 0) {
      console.log('Found tables matching "*universe*":');
      tables.forEach(t => console.log(`- ${t.table_name}`));
    } else {
      console.log('No tables found matching "*universe*"');
    }

    // Also list ALL tables just in case
    const allTables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    console.log('\nAll Tables in DB:', allTables.map(t => t.table_name).join(', '));

  } catch (e) {
    console.error('Error listing tables:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
