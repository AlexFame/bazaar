const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

async function demoLocationSearch() {
  console.log("📍 Starting Location Search Demo...");

  // 1. Setup: Define Coordinates
  // Kyiv Independence Square
  const MY_LOC = { lat: 50.4501, lon: 30.5234 };
  
  // Close: Khreschatyk (500m away)
  const ITEM_NEAR = { latitude: 50.4470, longitude: 30.5210, title: 'DEMO: Item Nearby (Kyiv)' };
  
  // Far: Odesa (450km away)
  const ITEM_FAR = { latitude: 46.4825, longitude: 30.7233, title: 'DEMO: Item Far (Odesa)' };

  const userId = '28db66d4-2534-40e0-b25d-1a568d71a4c2'; // Debug user

  console.log(`\n👤 User is at: ${MY_LOC.lat}, ${MY_LOC.lon}`);

  // 2. Insert Test Data
  console.log("💾 Inserting test listings...");
  const { data: inserted, error: iErr } = await supabase.from('listings').insert([
    { ...ITEM_NEAR, description: 'Near item', price: 100, type: 'sell', created_by: userId, contacts: 'test' },
    { ...ITEM_FAR, description: 'Far item', price: 200, type: 'sell', created_by: userId, contacts: 'test' }
  ]).select();

  if (iErr) { console.error("Insert Error:", iErr); return; }
  const [nearItem, farItem] = inserted;
  console.log(`   ✅ Inserted: "${nearItem.title}" and "${farItem.title}"`);

  // 3. Test 1: Search with 5km Radius
  console.log("\n🔍 TEST 1: Searching within 5km...");
  
  // This mimics the Frontend Logic: call RPC first
  const { data: radiusIds, error: rpcErr } = await supabase.rpc('get_listings_within_radius', {
      lat: MY_LOC.lat,
      lon: MY_LOC.lon,
      radius_km: 5
  });

  if (rpcErr) console.error("RPC Error:", rpcErr);
  else {
      console.log(`   📡 RPC returned ${radiusIds.length} ID(s)`);
      
      // Simulate Frontend fetching the actual items
      const { data: results } = await supabase
        .from('listings')
        .select('title, latitude, longitude')
        .in('id', radiusIds.map(i => i.id));
        
      results.forEach(r => console.log(`   🎯 Found: ${r.title}`));
      
      if (results.find(r => r.title === ITEM_FAR.title)) {
          console.error("   ❌ FAIL: Found Odesa item in 5km search!");
      } else {
          console.log("   ✅ SUCCESS: Did NOT find Odesa item.");
      }
  }

  // 4. Test 2: Search with 1000km Radius
  console.log("\n🔍 TEST 2: Searching within 1000km...");
  const { data: radiusIds2 } = await supabase.rpc('get_listings_within_radius', {
      lat: MY_LOC.lat,
      lon: MY_LOC.lon,
      radius_km: 1000
  });
  
  console.log(`   📡 RPC returned ${radiusIds2.length} ID(s)`);
  if (radiusIds2.length >= 2) {
       console.log("   ✅ SUCCESS: Found both items (Kyiv & Odesa).");
  } else {
       console.log("   ❌ FAIL: Should have found both.");
  }

  // 5. Cleanup
  console.log("\n🧹 Cleaning up...");
  await supabase.from('listings').delete().in('id', [nearItem.id, farItem.id]);
  console.log("✨ Done.");
}

demoLocationSearch();
