const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE is missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPC() {
  console.log('--- Checking Database RPCs ---');

  // Try calling the RPC with a dummy UUID. 
  // If it exists, it might return success (even if 0 rows updated) or a specific error.
  // If it does NOT exist, it will return an error like "function ... does not exist"
  const dummyId = '00000000-0000-0000-0000-000000000000';

  console.log(`Attempting to call 'increment_listing_views' with id: ${dummyId}...`);
  const { error: viewError } = await supabase.rpc('increment_listing_views', { listing_id: dummyId });

  if (viewError) {
    if (viewError.message && viewError.message.includes('function') && viewError.message.includes('does not exist')) {
        console.error('❌ RPC "increment_listing_views" DOES NOT EXIST.');
    } else {
        console.error('⚠️  RPC "increment_listing_views" exists but returned error:', viewError.message);
    }
  } else {
    console.log('✅ RPC "increment_listing_views" exists and is callable.');
  }

  console.log(`\nAttempting to call 'increment_listing_contacts' with id: ${dummyId}...`);
  const { error: contactError } = await supabase.rpc('increment_listing_contacts', { listing_id: dummyId });

    if (contactError) {
    if (contactError.message && contactError.message.includes('function') && contactError.message.includes('does not exist')) {
        console.error('❌ RPC "increment_listing_contacts" DOES NOT EXIST.');
    } else {
        console.error('⚠️  RPC "increment_listing_contacts" exists but returned error:', contactError.message);
    }
  } else {
    console.log('✅ RPC "increment_listing_contacts" exists and is callable.');
  }
}

checkRPC();
