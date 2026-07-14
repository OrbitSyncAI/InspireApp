const { Client } = require('pg');
require('dotenv').config();

async function reloadSchemaCache() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');
    
    // Send NOTIFY to pgrst channel to reload schema cache
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log("Successfully sent NOTIFY pgrst, 'reload schema' command.");
    console.log('The Supabase PostgREST schema cache has been reloaded.');
  } catch (error) {
    console.error('Error reloading schema cache:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

reloadSchemaCache();
