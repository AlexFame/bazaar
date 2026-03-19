const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function apply() {
  const sql = fs.readFileSync('migrations/fix_strict_search.sql', 'utf8');
  console.log("Applying migration...");
  const { data, error } = await supabase.rpc('debug_exec_sql', { sql_query: sql });
  
  if (error) {
     console.error("Failed to apply migration automatically:", error.message);
     process.exit(1);
  } else {
     console.log("Migration applied successfully!");
  }
}

apply();
