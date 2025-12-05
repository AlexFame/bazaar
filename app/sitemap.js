import { supabase } from "@/lib/supabaseClient";

const BASE_URL = 'https://bazaar-tawny-mu.vercel.app'; // Production URL

export default async function sitemap() {
  // Fetch all active listings
  const { data: listings } = await supabase
    .from('listings')
    .select('id, updated_at')
    .eq('status', 'active');

  const listingUrls = (listings || []).map((listing) => ({
    url: `${BASE_URL}/listing/${listing.id}`,
    lastModified: new Date(listing.updated_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...listingUrls,
  ];
}
