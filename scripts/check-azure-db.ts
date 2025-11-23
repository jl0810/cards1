import { Client } from 'pg';

const config = {
  host: 'cards-db-azure.postgres.database.azure.com',
  user: 'postgres', // Trying postgres first
  password: '1427Turnberry!',
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false } // Required for Azure
};

async function main() {
  console.log(`Connecting to ${config.host} as ${config.user}...`);
  const client = new Client(config);
  try {
    await client.connect();
    console.log('Connected successfully!');
    
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Tables in Azure DB:');
    res.rows.forEach(row => console.log(`- ${row.table_name}`));
    
    // Check specifically for card_universe
    const hasCardUniverse = res.rows.some(r => r.table_name === 'card_universe');
    console.log(`\nFound 'card_universe' table? ${hasCardUniverse ? 'YES' : 'NO'}`);

  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await client.end();
  }
}

main();
