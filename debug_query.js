
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectColumns() {
  console.log('--- Inspecting columns ---');
  
  // 1. listing_images
  const { data: images, error: imgError } = await supabase
    .from('listing_images')
    .select('*')
    .limit(1);

  if (imgError) {
    console.error('listing_images Error:', imgError);
  } else if (images.length > 0) {
    console.log('listing_images columns:', Object.keys(images[0]));
  } else {
    console.log('listing_images is empty');
  }

  // 2. profiles
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profError) {
    console.error('profiles Error:', profError);
  } else if (profiles.length > 0) {
    console.log('profiles columns:', Object.keys(profiles[0]));
  } else {
    console.log('profiles is empty');
  }
}

inspectColumns();
