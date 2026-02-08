const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE is missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('--- Checking Referential Constraints ---');

  // Supabase Rest API (PostgREST) often fails on information_schema unless explicitly granted.
  // Using direct SQL via RPC if possible (requires 'exec_sql' or similar, unlikely).
  // OR querying information_schema tables if exposed.
  
  // Try querying information_schema.referential_constraints directly
  const { data, error } = await supabase
    .from('information_schema.referential_constraints')
    .select('*')
    .eq('constraint_name', 'listings_created_by_fkey'); // Standard name, might vary if customized.

  if (error) {
     if (error.code === '42P01') { // undefined_table
         console.log('⚠️  Cannot access information_schema directly (permission denied or not exposed via API).');
         console.log('   You likely need to check the SQL Editor in the dashboard.');
     } else {
         console.error('❌ Error querying schema:', error.message);
     }
  } else if (data && data.length > 0) {
      const constraint = data[0];
      console.log('Found constraint:', constraint.constraint_name);
      console.log('Delete Rule:', constraint.delete_rule); // CASCADE, SET NULL, NO ACTION, RESTRICT
      
      if (constraint.delete_rule === 'CASCADE') {
          console.error('⚠️  WARNING: Delete rule is CASCADE. Profiles deletion will delete listings!');
      } else if (constraint.delete_rule === 'SET NULL') {
          console.log('✅ Delete rule is SET NULL. Safe.');
      } else {
          console.log(`ℹ️  Delete rule is ${constraint.delete_rule}.`);
      }
  } else {
      console.log('ℹ️  Constraint "listings_created_by_fkey" not found via API (or limited access).');
      // Try to list all constraints on 'listings' to be sure
      // This is hard via just JS client without introspection permissions.
  }
}

checkSchema();
