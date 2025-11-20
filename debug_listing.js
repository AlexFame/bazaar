const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function checkListing() {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .ilike('title', '%диван%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Found listings:', data.length);
  data.forEach(l => {
    console.log('---');
    console.log('ID:', l.id);
    console.log('Title:', l.title);
    console.log('Category Key:', l.category_key);
    console.log('Location Text:', l.location_text);
    console.log('Lat/Lng:', l.latitude, l.longitude);
  });
}

checkListing();
