/**
 * Rate limiting middleware using Upstash Redis
 * Falls back gracefully if Redis is unavailable
 */

let ratelimit = null;
let isConfigured = false;

// Lazy initialization - only when first used
function getRateLimiter() {
  if (ratelimit) return ratelimit;
  
  // Check if Upstash is configured
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('⚠️ Rate limiting disabled: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured');
    isConfigured = false;
    return null;
  }

  try {
    const { Ratelimit } = require('@upstash/ratelimit');
    const { Redis } = require('@upstash/redis');

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
      analytics: true,
      prefix: 'bazaar',
    });

    isConfigured = true;
    console.log('✅ Rate limiting initialized');
    return ratelimit;
  } catch (error) {
    console.error('❌ Failed to initialize rate limiter:', error.message);
    isConfigured = false;
    return null;
  }
}

/**
 * Check rate limit for an identifier (IP, user ID, etc)
 * @param {string} identifier - Unique identifier (IP address, user ID, etc)
 * @param {Object} options - Rate limit options
 * @param {number} options.limit - Max requests (default: 10)
 * @param {string} options.window - Time window (default: '10 s')
 * @returns {Promise<{success: boolean, limit: number, remaining: number, reset: number}>}
 */
export async function checkRateLimit(identifier, options = {}) {
  const limiter = getRateLimiter();
  
  // If not configured, allow all requests (graceful degradation)
  if (!limiter) {
    return {
      success: true,
      limit: 999999,
      remaining: 999999,
      reset: Date.now() + 10000,
      bypassed: true, // Flag to indicate rate limiting was bypassed
    };
  }

  try {
    const result = await limiter.limit(identifier);
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      bypassed: false,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error.message);
    
    // On error, allow request (fail open, not fail closed)
    return {
      success: true,
      limit: 999999,
      remaining: 999999,
      reset: Date.now() + 10000,
      bypassed: true,
      error: error.message,
    };
  }
}

/**
 * Get identifier from request (IP or user ID)
 * @param {Request} req - Next.js request object
 * @returns {string} Identifier for rate limiting
 */
export function getIdentifier(req) {
  // Try to get IP from headers (Vercel, Cloudflare, etc)
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || '127.0.0.1';
  
  return ip;
}

/**
 * Middleware wrapper for API routes
 * Usage: export const POST = withRateLimit(handler, { limit: 5, window: '1 m' });
 */
export function withRateLimit(handler, options = {}) {
  return async (req, ...args) => {
    const identifier = getIdentifier(req);
    const result = await checkRateLimit(identifier, options);
    
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          limit: result.limit,
          remaining: result.remaining,
          reset: new Date(result.reset).toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }
    
    // Add rate limit info to response headers
    const response = await handler(req, ...args);
    
    if (response instanceof Response && !result.bypassed) {
      response.headers.set('X-RateLimit-Limit', result.limit.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', result.reset.toString());
    }
    
    return response;
  };
}

/**
 * Check if rate limiting is properly configured
 */
export function isRateLimitingEnabled() {
  getRateLimiter(); // Initialize if needed
  return isConfigured;
}
