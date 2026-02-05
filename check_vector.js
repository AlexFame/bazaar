const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function checkExtensions() {
  console.log("Checking available extensions...");
  const { data, error } = await supabase.rpc('debug_exec_sql', { 
      sql_query: "select name, default_version, installed_version from pg_available_extensions where name = 'vector';" 
  }); 
  // Wait, I can't exec arbitrary SQL usually. 
  // Let's just try to create the extension in a transaction block within a migration script simulation, 
  // OR just check if I can use a known function. 
  // Actually, standard way: just look at migrations folder if we ever tried.
  
  // Checking if 'vector' is already there?
  const { error: matchErr } = await supabase.from('listings').select('embedding').limit(1);
  if (matchErr && matchErr.message.includes('column "embedding" does not exist')) {
     console.log("Vector column does not exist yet.");
  } else {
     console.log("Vector column might exist or other error:", matchErr);
  }
}
checkExtensions();
