const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addColumns() {
  try {
    await client.connect();
    console.log('Connected to DB');

    const queries = [
      "ALTER TABLE public.api_config ADD COLUMN IF NOT EXISTS gemini_api_1_key text default '';",
      "ALTER TABLE public.api_config ADD COLUMN IF NOT EXISTS gemini_api_1_model text default 'gemini-3.1-flash-lite';",
      "ALTER TABLE public.api_config ADD COLUMN IF NOT EXISTS gemini_api_2_key text default '';",
      "ALTER TABLE public.api_config ADD COLUMN IF NOT EXISTS gemini_api_2_model text default 'gemini-3.1-flash-lite';",
      "ALTER TABLE public.api_config ADD COLUMN IF NOT EXISTS gemini_api_3_key text default '';",
      "ALTER TABLE public.api_config ADD COLUMN IF NOT EXISTS gemini_api_3_model text default 'gemini-3.1-flash-lite';",
      "ALTER TABLE public.api_config ADD COLUMN IF NOT EXISTS gemini_api_4_key text default '';",
      "ALTER TABLE public.api_config ADD COLUMN IF NOT EXISTS gemini_api_4_model text default 'gemini-3.1-flash-lite';",
      "ALTER TABLE public.api_config ADD COLUMN IF NOT EXISTS gemini_api_5_key text default '';",
      "ALTER TABLE public.api_config ADD COLUMN IF NOT EXISTS gemini_api_5_model text default 'gemini-3.1-flash-lite';"
    ];

    for (let q of queries) {
      await client.query(q);
      console.log('Executed:', q);
    }

    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('Schema cache reloaded.');
    
    // Check columns again
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'api_config'");
    console.log('Current columns:', res.rows.map(r => r.column_name));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

addColumns();
