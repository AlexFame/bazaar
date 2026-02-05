const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function checkStemming() {
  console.log("Checking stemming/matching logic...");

  // query 1: Does 'Детский столик' match 'столик для ребенка'?
  const q1 = "select to_tsvector('russian', 'Детский столик') @@ websearch_to_tsquery('russian', 'столик для ребенка') as match;";
  
  // query 2: Check lexemes
  const q2 = "select to_tsvector('russian', 'Детский столик') as v1, websearch_to_tsquery('russian', 'столик для ребенка') as q1;";

  const { data: d1, error: e1 } = await supabase.rpc('debug_exec_sql', { sql_query: q1 }); 
  // Wait, I probably don't have an arbitrary SQL exec function exposed. 
  // I should use .from().select() with a modifier or just a raw query if assuming specific setup?
  // Supabase JS client doesn't support raw SQL easily unless I have an RPC for it.
  
  // Alternative: Use RPC if I can create one, or just assume the behavior based on standard Postgres.
  // Actually, I can create a temp RPC in migrations if needed, OR just trust my analysis.
  // BUT, I can use the `search_listings` function if I insert a dummy listing!
  
  console.log("Creating dummy listing 'Детский столик'...");
  const { data: insert, error: iErr } = await supabase.from('listings').insert({
    title: 'Детский столик',
    description: 'Отличный столик.',
    type: 'sell',
    price: 100,
    contacts: 'test',
    created_by: '28db66d4-2534-40e0-b25d-1a568d71a4c2' // Using the known debug user ID from previous steps
  }).select().single();
  
  if (iErr) { console.error("Insert failed:", iErr); return; }
  console.log('Inserted:', insert.id);

  console.log("Searching for 'столик для ребенка'...");
  const { data: s1, error: sErr1 } = await supabase.rpc('search_listings', { search_query: 'столик для ребенка' });
  
  console.log("Match found?", !!s1?.find(x => x.id === insert.id));
  if (s1?.length) console.log("Results:", s1.map(x=>x.title));

  console.log("Cleaning up...");
  await supabase.from('listings').delete().eq('id', insert.id);
}

checkStemming();
