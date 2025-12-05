import { supabase } from "./supabaseClient";

/**
 * Smart search for listings
 * @param {string} query - Search query
 * @param {object} filters - Additional filters (category, price, etc.)
 * @returns {Promise<{data: any[], error: any}>}
 */
export async function searchListings(query, filters = {}) {
  // Use Smart Search RPC if query is present, otherwise fallback to simple select
  if (query && query.trim()) {
      const { data, error } = await supabase.rpc('search_listings', {
        search_query: query.trim(),
        filter_category: filters.category === 'all' ? null : filters.category,
        min_price: filters.minPrice || null,
        max_price: filters.maxPrice || null,
        limit_count: 50,
        offset_count: 0
      });
      
      if (query.trim().length > 2) {
         recordSearch(query.trim());
      }
      
      return { data, error };
  }

  // Fallback for empty query (filtering only)
  let dbQuery = supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (filters.category && filters.category !== 'all') {
    dbQuery = dbQuery.eq('category', filters.category);
  }

  if (filters.minPrice) {
    dbQuery = dbQuery.gte('price', filters.minPrice);
  }

  if (filters.maxPrice) {
    dbQuery = dbQuery.lte('price', filters.maxPrice);
  }

  return await dbQuery;
}

/**
 * Get autocomplete suggestions
 * @param {string} query 
 * @returns {Promise<string[]>}
 */
export async function getAutocomplete(query) {
  if (!query || query.length < 2) return [];

  const cleanQuery = query.trim().toLowerCase();
  const suggestions = [];

  // 1. Categories (Match localized or key)
  // We don't have a DB table for this, we use constant. 
  // Ideally this should be passed in or imported, but for now let's skip or import if possible.
  // Actually, let's keep it simple: strict DB matches first.

  // 2. Listings (with images!)
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, main_image_path, category_key, price')
    .ilike('title', `%${cleanQuery}%`)
    .limit(5);

  if (listings) {
      listings.forEach(l => {
          let imageUrl = null;
          if (l.main_image_path) {
              const { data } = supabase.storage.from('listing-images').getPublicUrl(l.main_image_path);
              imageUrl = data?.publicUrl;
          }

          suggestions.push({
              type: 'listing',
              id: l.id,
              text: l.title,
              subText: `${l.price} €`,
              image: imageUrl,
              category: l.category_key
          });
      });
  }

  // 3. Popular searches (if few listings found)
  if (suggestions.length < 5) {
      const { data: stats } = await supabase
        .from('search_stats')
        .select('query')
        .ilike('query', `%${cleanQuery}%`)
        .order('count', { ascending: false })
        .limit(3);
      
      stats?.forEach(s => {
          // Avoid duplicates
          if (!suggestions.some(existing => existing.text.toLowerCase() === s.query.toLowerCase())) {
             suggestions.push({
                 type: 'query',
                 text: s.query,
                 image: null
             });
          }
      });
  }

  return suggestions.slice(0, 7);
}

/**
 * Get popular searches
 * @returns {Promise<string[]>}
 */
export async function getPopularSearches() {
  const { data } = await supabase
    .from('search_stats')
    .select('query')
    .order('count', { ascending: false })
    .limit(5);
    
  return data?.map(s => s.query) || [];
}

/**
 * Record a search query
 * @param {string} query 
 */
export async function recordSearch(query) {
  if (!query || query.length < 3) return;
  
  await supabase.rpc('increment_search_stat', { search_query: query });
}
