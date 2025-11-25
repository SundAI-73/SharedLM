/**
 * Client-side audit logging utility
 * Logs security-relevant events for monitoring and debugging
 */

const AUDIT_LOG_KEY = 'sharedlm_audit_log';
const MAX_LOG_ENTRIES = 100; // Keep last 100 log entries

/**
 * Log levels
 */
export const LogLevel = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SECURITY: 'security'
};

/**
 * Event types
 */
export const EventType = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  SIGNUP: 'signup',
  PASSWORD_CHANGE: 'password_change',
  ACCOUNT_DELETED: 'account_deleted',
  API_KEY_SAVED: 'api_key_saved',
  API_KEY_DELETED: 'api_key_deleted',
  FILE_UPLOAD: 'file_upload',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SESSION_EXPIRED: 'session_expired',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  XSS_ATTEMPT: 'xss_attempt',
  INVALID_INPUT: 'invalid_input'
};

/**
 * Create audit log entry
 * @param {string} eventType - Type of event
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {object} metadata - Additional metadata
 */
export const logEvent = (eventType, level = LogLevel.INFO, message = '', metadata = {}) => {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      level,
      message,
      metadata: {
        ...metadata,
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: localStorage.getItem('sharedlm_user_id')
      }
    };

    // Get existing logs
    const existingLogs = getLogs();
    
    // Add new log entry
    existingLogs.push(logEntry);
    
    // Keep only last MAX_LOG_ENTRIES entries
    if (existingLogs.length > MAX_LOG_ENTRIES) {
      existingLogs.splice(0, existingLogs.length - MAX_LOG_ENTRIES);
    }
    
    // Store logs
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(existingLogs));
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUDIT ${level.toUpperCase()}]`, logEntry);
    }
    
    // For security events, also log to server (if endpoint exists)
    if (level === LogLevel.SECURITY || level === LogLevel.ERROR) {
      // Optionally send to backend for server-side logging
      // This would require a backend endpoint
    }
  } catch (error) {
    // Fail silently to avoid breaking the app
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to log audit event:', error);
    }
  }
};

/**
 * Get audit logs
 * @param {number} limit - Maximum number of logs to return
 * @returns {array}
 */
export const getLogs = (limit = MAX_LOG_ENTRIES) => {
  try {
    const logs = localStorage.getItem(AUDIT_LOG_KEY);
    if (!logs) {
      return [];
    }
    
    const parsedLogs = JSON.parse(logs);
    return parsedLogs.slice(-limit);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to get audit logs:', error);
    }
    return [];
  }
};

/**
 * Clear audit logs
 */
export const clearLogs = () => {
  try {
    localStorage.removeItem(AUDIT_LOG_KEY);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to clear audit logs:', error);
    }
  }
};

/**
 * Get logs by event type
 * @param {string} eventType - Event type to filter by
 * @returns {array}
 */
export const getLogsByType = (eventType) => {
  const logs = getLogs();
  return logs.filter(log => log.eventType === eventType);
};

/**
 * Get logs by level
 * @param {string} level - Log level to filter by
 * @returns {array}
 */
export const getLogsByLevel = (level) => {
  const logs = getLogs();
  return logs.filter(log => log.level === level);
};

/**
 * Get security-related logs
 * @returns {array}
 */
export const getSecurityLogs = () => {
  return getLogsByLevel(LogLevel.SECURITY);
};

