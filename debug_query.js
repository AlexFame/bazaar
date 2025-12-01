const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPopular() {
  console.log('--- Checking popular listings ---');
  
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, views_count')
    .order('views_count', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Found listings:', data.length);
    data.forEach(l => console.log(`- ${l.title} (views: ${l.views_count || 0})`));
  }
}

checkPopular();
