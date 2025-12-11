
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://phhgutvyirqdgeeclmqg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaGd1dHZ5aXJxZGdlZWNsbXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMzk4NDIsImV4cCI6MjA3ODYxNTg0Mn0.4D2SBWD1geyb63XM4FwzV6OHQ8U3MOpCpKl3_l1WsHE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStats() {
  console.log("Checking listings columns...");
  
  // 1. Check if views_count exists by selecting it
  const { data, error } = await supabase
    .from('listings')
    .select('id, views_count, contacts_count')
    .limit(1);

  if (error) {
    console.log("❌ Error selecting stats columns:", error.message);
  } else {
    console.log("✅ Stats columns exist. Sample:", data);
  }

  // 2. Check RPC
  console.log("Checking increment_listing_views RPC...");
  // We can try to call it on a dummy ID or a valid one if we have it?
  // Calling on invalid ID usually just updates 0 rows, no error.
  const { error: rpcError } = await supabase.rpc('increment_listing_views', { listing_id: '00000000-0000-0000-0000-000000000000' });
  
  if (rpcError) {
     console.log("❌ RPC increment_listing_views failed:", rpcError.message);
  } else {
     console.log("✅ RPC increment_listing_views exists and works.");
  }
}

checkStats();
