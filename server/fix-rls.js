const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixRLS() {
  try {
    await client.connect();
    
    // Drop old policies
    await client.query('drop policy if exists "Allow auth read config" on public.api_config;');
    await client.query('drop policy if exists "Allow auth write config" on public.api_config;');
    
    // Create new policies for anon
    await client.query('create policy "Allow anon read config" on public.api_config for select to anon using (true);');
    await client.query('create policy "Allow anon write config" on public.api_config for all to anon using (true);');
    
    console.log('RLS policies updated for anon access.');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
fixRLS();
