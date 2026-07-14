const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => client.query("SELECT * FROM pg_policies WHERE tablename = 'api_config'"))
  .then(res => { console.log(res.rows); client.end(); })
  .catch(console.error);
