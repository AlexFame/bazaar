const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function updateListing() {
  const { data, error } = await supabase
    .from('listings')
    .update({ category_key: 'furniture' })
    .ilike('title', '%диван%')
    .select();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Updated listings:', data.length);
  data.forEach(l => {
    console.log('Updated ID:', l.id, 'to category:', l.category_key);
  });
}

updateListing();
