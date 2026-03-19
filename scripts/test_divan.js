const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
);

async function testDivan() {
  console.log("Searching for 'диван'...");
  const { data: s1, error: sErr1 } = await supabase.rpc('search_listings', { search_query: 'диван', limit_count: 5 });
  
  if (sErr1) {
      console.error("RPC Error:", sErr1);
      return;
  }
  
  console.log("RPC Results for 'диван':", s1?.length);
  if (s1?.length) {
      console.table(s1.map(x=>({title: x.title})));
  } else {
      console.log("No RPC results found! Let's check if 'диван' exists in title directly.");
      const { data: direct } = await supabase.from('listings').select('id, title, status').ilike('title', '%диван%').limit(5);
      console.log("Direct ilike matches:", direct);
      
      if (direct?.length > 0) {
          console.log("Checking how FTS behaves on the first match...");
          const q = `SELECT title, fts, to_tsvector('russian', title) as ru_vec, websearch_to_tsquery('russian', 'диван') as query, fts @@ websearch_to_tsquery('russian', 'диван') as match FROM listings WHERE id = '${direct[0].id}'`;
          const { data: ftsCheck } = await supabase.rpc('debug_exec_sql', { sql_query: q }).catch(() => ({data: 'No exec rpc available'}));
          console.log(ftsCheck);
      }
  }
}

testDivan();
