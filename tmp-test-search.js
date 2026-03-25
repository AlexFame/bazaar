import { ListingService } from './lib/services/ListingService.js';
import { supabase } from './lib/supabaseClient.js';

async function test() {
  console.log("Searching without location...");
  const res1 = await ListingService.search({ searchTerm: 'наушники', userLocation: null });
  console.log("No location results:", res1.length);
  
  console.log("Searching with location...");
  const res2 = await ListingService.search({ searchTerm: 'наушники', userLocation: {lat: 50, lng: 30} });
  console.log("With location results:", res2.length);

  const { data } = await supabase.from('listings').select('title, latitude, longitude').ilike('title', '%наушн%');
  console.log("Raw items in DB:", data);
}

test().catch(console.error);
