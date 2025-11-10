/**
 * Client-side rate limiting utility
 * Prevents abuse by limiting API calls per time window
 */

class RateLimiter {
  constructor() {
    this.requests = new Map(); // Store request timestamps by endpoint
    this.config = {
      defaultLimit: 100, // requests per window
      defaultWindow: 60000, // 1 minute in milliseconds
      limits: {
        '/auth/login': { limit: 5, window: 60000 }, // 5 login attempts per minute
        '/auth/signup': { limit: 3, window: 60000 }, // 3 signups per minute
        '/chat': { limit: 30, window: 60000 }, // 30 messages per minute
        '/upload': { limit: 10, window: 60000 }, // 10 uploads per minute
        '/api-keys': { limit: 20, window: 60000 }, // 20 API key operations per minute
      }
    };
  }

  /**
   * Check if request is allowed
   * @param {string} endpoint - API endpoint
   * @returns {object} - { allowed: boolean, remaining: number, resetAt: number }
   */
  checkLimit(endpoint) {
    const now = Date.now();
    const config = this.config.limits[endpoint] || {
      limit: this.config.defaultLimit,
      window: this.config.defaultWindow
    };

    // Get or create request history for this endpoint
    if (!this.requests.has(endpoint)) {
      this.requests.set(endpoint, []);
    }

    const requests = this.requests.get(endpoint);
    
    // Remove requests outside the time window
    const windowStart = now - config.window;
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    this.requests.set(endpoint, recentRequests);

    // Check if limit exceeded
    const remaining = Math.max(0, config.limit - recentRequests.length);
    const allowed = recentRequests.length < config.limit;
    const resetAt = recentRequests.length > 0 
      ? recentRequests[0] + config.window 
      : now + config.window;

    if (allowed) {
      // Add current request timestamp
      recentRequests.push(now);
      this.requests.set(endpoint, recentRequests);
    }

    return {
      allowed,
      remaining,
      resetAt,
      limit: config.limit
    };
  }

  /**
   * Clear rate limit for an endpoint
   * @param {string} endpoint - API endpoint
   */
  clearLimit(endpoint) {
    this.requests.delete(endpoint);
  }

  /**
   * Clear all rate limits
   */
  clearAll() {
    this.requests.clear();
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

export default rateLimiter;

