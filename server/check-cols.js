const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'api_config'"))
  .then(res => {
    console.log(res.rows.map(r => r.column_name));
    return client.end();
  })
  .catch(console.error);
