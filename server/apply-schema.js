const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const SQL_FILE = path.join(__dirname, 'setup-supabase.sql');

async function run() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log('================================================================');
    console.log('DATABASE_URL is not set in server/.env.');
    console.log('Please copy the contents of "setup-supabase.sql" and run it');
    console.log('manually inside your Supabase dashboard SQL Editor.');
    console.log('================================================================');
    process.exit(0);
  }

  console.log('[Setup] Connecting to Supabase Postgres database...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[Setup] Connected successfully. Reading setup-supabase.sql...');
    const sql = fs.readFileSync(SQL_FILE, 'utf8');
    
    console.log('[Setup] Executing SQL script...');
    await client.query(sql);
    console.log('[Setup] Database tables and functions created successfully! 🎉');
  } catch (error) {
    console.error('[Setup] Error running SQL script:', error.message || error);
  } finally {
    await client.end();
  }
}

run();
