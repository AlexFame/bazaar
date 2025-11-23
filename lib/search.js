import { supabase } from "./supabaseClient";

/**
 * Smart search for listings
 * @param {string} query - Search query
 * @param {object} filters - Additional filters (category, price, etc.)
 * @returns {Promise<{data: any[], error: any}>}
 */
export async function searchListings(query, filters = {}) {
  let rpcName = 'search_listings'; // We might need a custom RPC for complex search
  
  // For now, let's use standard query building
  let dbQuery = supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (query && query.trim()) {
    const cleanQuery = query.trim();
    // Try websearch first (if supported by Supabase config)
    // or fallback to ilike with wildcards
    
    // Simple approach: title or description contains query
    // dbQuery = dbQuery.or(`title.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`);
    
    // Better approach: textSearch (requires FTS setup, but usually works out of box for simple cases)
    // dbQuery = dbQuery.textSearch('title', cleanQuery, { type: 'websearch', config: 'russian' });
    
    // Hybrid approach for best results without complex setup:
    dbQuery = dbQuery.ilike('title', `%${cleanQuery}%`);
    
    // Record search stat (fire and forget)
    recordSearch(cleanQuery);
  }

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

  // 1. Get from search stats (popular queries)
  const { data: stats } = await supabase
    .from('search_stats')
    .select('query')
    .ilike('query', `%${cleanQuery}%`)
    .order('count', { ascending: false })
    .limit(3);

  // 2. Get from listings titles (distinct)
  const { data: listings } = await supabase
    .from('listings')
    .select('title')
    .ilike('title', `%${cleanQuery}%`)
    .limit(5);

  const suggestions = new Set();
  
  stats?.forEach(s => suggestions.add(s.query));
  listings?.forEach(l => suggestions.add(l.title));

  return Array.from(suggestions).slice(0, 5);
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
