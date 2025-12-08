require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const QUERIES = ['iphone', 'диван', 'yamaha', 'квартира', 'nothing_here'];
const REQUESTS = 50;

async function runTest() {
  console.log(`🚀 Starting Stress Test: ${REQUESTS} concurrent requests...`);
  const start = Date.now();
  let errors = 0;
  let successes = 0;

  const promises = Array.from({ length: REQUESTS }).map(async (_, i) => {
    const term = QUERIES[i % QUERIES.length];
    const reqStart = Date.now();
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title')
        .ilike('title', `%${term}%`)
        .limit(10);

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
