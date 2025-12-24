const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const sql = fs.readFileSync('migrations/relax_draft_constraints.sql', 'utf8');
  console.log("Applying migration...");
  
  if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL missing in .env.local");
      return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Supabase/Heroku usually need this
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log("Migration applied successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

run();
