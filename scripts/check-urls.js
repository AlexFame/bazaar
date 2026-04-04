const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('id, title, before_after_images, main_image_path, listing_images(file_path)')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching listings:', error);
    return;
  }

  console.log('Recent Listings:');
  data.forEach(l => {
    if (l.before_after_images || (l.listing_images && l.listing_images.length > 0)) {
      console.log(`\nID: ${l.id} | Title: ${l.title}`);
      
      if (l.before_after_images) {
        console.log(`Before: ${l.before_after_images.before}`);
        console.log(`After:  ${l.before_after_images.after}`);
      }
      
      const images = l.listing_images.map(i => i.file_path);
      if (images.length > 0) {
          console.log(`Images: ${JSON.stringify(images)}`);
      }
    }
  });
}

checkListings();
