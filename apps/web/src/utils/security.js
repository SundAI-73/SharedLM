/**
 * Security utility functions
 */

/**
 * Enforce HTTPS in production
 */
export const enforceHTTPS = () => {
  if (process.env.NODE_ENV === 'production' && 
      window.location.protocol !== 'https:' && 
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1') {
    window.location.href = window.location.href.replace('http:', 'https:');
  }
};

/**
 * Check if running in secure context
 * @returns {boolean}
 */
export const isSecureContext = () => {
  return window.isSecureContext || window.location.protocol === 'https:';
};

