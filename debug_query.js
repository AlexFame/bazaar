const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findCroatiaListing() {
  console.log('--- Searching for Croatia listing ---');
  
  // Search by title
  const { data: byTitle, error: titleError } = await supabase
    .from('listings')
    .select('id, title, type, category_key')
    .ilike('title', '%хорват%');

  if (titleError) {
    console.error('Title search error:', titleError);
  } else {
    console.log('Found by title:', byTitle);
  }

  // Search all services
  const { data: services, error: servError } = await supabase
    .from('listings')
    .select('id, title, type, category_key')
    .eq('type', 'services')
    .limit(10);

  if (servError) {
    console.error('Services search error:', servError);
  } else {
    console.log('\nAll services (first 10):', services);
  }
}

findCroatiaListing();
