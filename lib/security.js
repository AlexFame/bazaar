/**
 * Server-side input sanitization utilities.
 * Strips HTML tags and dangerous content from user inputs.
 */

// Strip all HTML tags from input
export function stripHtml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')         // Remove HTML tags
    .replace(/&lt;/g, '<')           // Decode common entities for re-strip
    .replace(/&gt;/g, '>')
    .replace(/<[^>]*>/g, '')         // Re-strip after decode
    .replace(/javascript:/gi, '')    // Remove javascript: URIs
    .replace(/on\w+\s*=/gi, '')      // Remove inline event handlers (onclick=, onerror=, etc.)
    .trim();
}

// Sanitize user content: strip HTML but preserve newlines and basic text
export function sanitizeContent(str) {
  if (!str || typeof str !== 'string') return '';
  return stripHtml(str)
    .slice(0, 5000); // Hard limit on content length
}

// Sanitize a title (shorter limit, single line)
export function sanitizeTitle(str) {
  if (!str || typeof str !== 'string') return '';
  return stripHtml(str)
    .replace(/[\r\n]+/g, ' ')  // No newlines in titles
    .slice(0, 200);            // Hard limit
}

// Simple in-memory rate limiter
// Usage: const limiter = createRateLimiter(30, 60000); // 30 requests per minute
export function createRateLimiter(maxRequests, windowMs) {
  const requests = new Map(); // IP -> [timestamps]
  
  // Cleanup old entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of requests) {
      const filtered = timestamps.filter(t => now - t < windowMs);
      if (filtered.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, filtered);
      }
    }
  }, 5 * 60 * 1000);

  return function isAllowed(identifier) {
    const now = Date.now();
    const timestamps = requests.get(identifier) || [];
    
    // Remove expired timestamps
    const valid = timestamps.filter(t => now - t < windowMs);
    
    if (valid.length >= maxRequests) {
      return false; // Rate limited
    }
    
    valid.push(now);
    requests.set(identifier, valid);
    return true; // Allowed
  };
}
