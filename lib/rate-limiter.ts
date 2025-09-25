/**
 * Simple in-memory rate limiter
 * In production, use Redis or DynamoDB for distributed rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit configuration
 */
const RATE_LIMITS = {
  LOGIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5, // 5 attempts per window
  },
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 100, // 100 requests per window
  },
  REFRESH: {
    windowMs: 60 * 1000, // 1 minute
    maxAttempts: 10, // 10 refresh attempts per minute
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Check if request exceeds rate limit
 */
export function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'API'
): { allowed: boolean; remainingAttempts: number; resetTime: number } {
  const now = Date.now();
  const limitConfig = RATE_LIMITS[type];
  const key = `${type}:${identifier}`;
  const entry = rateLimitStore.get(key);

  // Clean up expired entries
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(key);
  }

  const currentEntry = rateLimitStore.get(key);

  if (!currentEntry) {
    // First request in window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + limitConfig.windowMs,
    };

    rateLimitStore.set(key, newEntry);

    return {
      allowed: true,
      remainingAttempts: limitConfig.maxAttempts - 1,
      resetTime: newEntry.resetTime,
    };
  }

  if (currentEntry.count >= limitConfig.maxAttempts) {
    return {
      allowed: false,
      remainingAttempts: 0,
      resetTime: currentEntry.resetTime,
    };
  }

  // Increment counter
  currentEntry.count++;
  rateLimitStore.set(key, currentEntry);

  return {
    allowed: true,
    remainingAttempts: limitConfig.maxAttempts - currentEntry.count,
    resetTime: currentEntry.resetTime,
  };
}

/**
 * Get client IP address for rate limiting
 */
export function getClientIP(req: any): string {
  // Check common headers for IP
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const clientIP = req.headers['x-client-ip'];

  if (forwardedFor) {
    return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
  }

  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }

  if (clientIP) {
    return Array.isArray(clientIP) ? clientIP[0] : clientIP;
  }

  // Fallback to connection remote address
  return req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.connection?.socket?.remoteAddress ||
         'unknown';
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(
  remainingAttempts: number,
  resetTime: number,
  type: RateLimitType = 'API'
): Record<string, string> {
  const limitConfig = RATE_LIMITS[type];
  const resetDate = new Date(resetTime).toUTCString();

  return {
    'X-RateLimit-Limit': limitConfig.maxAttempts.toString(),
    'X-RateLimit-Remaining': Math.max(0, remainingAttempts).toString(),
    'X-RateLimit-Reset': resetTime.toString(),
    'X-RateLimit-Reset-Date': resetDate,
    'Retry-After': remainingAttempts <= 0 ? Math.ceil((resetTime - Date.now()) / 1000).toString() : '0',
  };
}

/**
 * Clean up old rate limit entries
 * Call this periodically to prevent memory leaks
 */
export function cleanupRateLimits(): void {
  const now = Date.now();

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);
