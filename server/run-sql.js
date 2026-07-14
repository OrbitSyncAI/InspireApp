const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runSQL() {
  try {
    await client.connect();
    const sqlPath = path.join(__dirname, 'setup-supabase.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query(sql);
    console.log('Database updated successfully with setup-supabase.sql!');
    
    // Also notify pgrst just in case
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('Schema cache reloaded.');
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

runSQL();
