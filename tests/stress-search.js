require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const QUERIES = [
  { term: 'iphone' }, 
  { term: 'диван', minPrice: 1000 }, 
  { term: 'yamaha', category: 'transport' }, 
  { term: 'квартира', maxPrice: 50000 }, 
  { term: 'nothing_here' },
  { term: '', category: 'electronics' } // Filter only
];
const REQUESTS = 1000;

async function runTest() {
  console.log(`🚀 Starting Stress Test: ${REQUESTS} concurrent requests...`);
  const start = Date.now();
  let errors = 0;
  let successes = 0;

  const promises = Array.from({ length: REQUESTS }).map(async (_, i) => {
    const queryData = QUERIES[i % QUERIES.length];
    const reqStart = Date.now();
    try {
      let query = supabase
        .from('listings')
        .select('id, title')
        .limit(10);

      if (queryData.term) query = query.ilike('title', `%${queryData.term}%`);
      if (queryData.minPrice) query = query.gte('price', queryData.minPrice);
      if (queryData.maxPrice) query = query.lte('price', queryData.maxPrice);
      if (queryData.category) query = query.eq('category_key', queryData.category);

      const { data, error } = await query;

      if (error) throw error;
      successes++;
      return { status: 'ok', duration: Date.now() - reqStart };
    } catch (e) {
      console.error(`Request ${i} failed:`, e.message);
      errors++;
      return { status: 'error', duration: Date.now() - reqStart };
    }
  });

  const results = await Promise.all(promises);
  const totalTime = Date.now() - start;
  const avgDuration = results.reduce((acc, r) => acc + r.duration, 0) / results.length;

  console.log('\n📊 Results:');
  console.log(`Total Requests: ${REQUESTS}`);
  console.log(`Success: ${successes}`);
  console.log(`Failed: ${errors}`);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Avg Latency: ${avgDuration.toFixed(2)}ms`);

  if (errors > 0) process.exit(1);
}

runTest();
