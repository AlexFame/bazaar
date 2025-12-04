/**
 * Simple in-memory cache with TTL support
 * For production scale (50k+ users), migrate to Redis
 */

class SimpleCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Set a value in cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
   */
  set(key, value, ttl = 5 * 60 * 1000) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/not found
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Async function to fetch data if not cached
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise<any>} Cached or freshly fetched value
   */
  async getOrSet(key, fetchFn, ttl = 5 * 60 * 1000) {
    const cached = this.get(key);
    
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Clean up expired entries
   * Call this periodically to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
const cache = new SimpleCache();

// Cleanup expired entries every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => cache.cleanup(), 10 * 60 * 1000);
}

export default cache;

/**
 * Usage examples:
 * 
 * // Simple set/get
 * cache.set('popular_listings', listings, 5 * 60 * 1000); // 5 min TTL
 * const listings = cache.get('popular_listings');
 * 
 * // Get or fetch pattern
 * const listings = await cache.getOrSet(
 *   'popular_listings',
 *   async () => {
 *     const { data } = await supabase.from('listings').select('*').limit(10);
 *     return data;
 *   },
 *   5 * 60 * 1000
 * );
 */
