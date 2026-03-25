/**
 * Server-side input sanitization utilities.
 * Strips HTML tags and dangerous content from user inputs.
 */

// Decode HTML entities (named and numeric)
function decodeEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(code))       // &#60; -> <
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))) // &#x3C; -> <
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

// Strip all HTML tags from input
export function stripHtml(str) {
  if (!str || typeof str !== 'string') return '';
  // First decode, then strip — prevents encoded tag bypass
  let clean = decodeEntities(str);
  clean = clean
    .replace(/<[^>]*>/g, '')         // Remove HTML tags
    .replace(/javascript:/gi, '')    // Remove javascript: URIs
    .replace(/on\w+\s*=/gi, '')      // Remove inline event handlers (onclick=, onerror=, etc.)
    .replace(/data:/gi, '')          // Remove data: URIs
    .trim();
  // Second pass: decode again and strip again for double-encoded attacks
  clean = decodeEntities(clean).replace(/<[^>]*>/g, '').trim();
  return clean;
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
