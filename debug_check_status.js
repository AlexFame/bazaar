const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE // Use Admin key to bypass RLS
);

async function check() {
  console.log("Checking listings...");
  
  // Get latest 10 listings
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, status, created_at, created_by')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error(error);
  } else {
    console.table(data);
  }
}

check();
