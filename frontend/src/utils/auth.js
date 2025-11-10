/**
 * Authentication utility functions
 * Handles authentication state and token management
 */

import { isSessionValid, createSession, clearSession, extendSession } from './sessionManager';

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return isSessionValid();
};

/**
 * Get current user ID
 * @returns {string|null}
 */
export const getUserId = () => {
  return localStorage.getItem('sharedlm_user_id');
};

/**
 * Get authentication token (JWT or session token)
 * @returns {string|null}
 */
export const getAuthToken = () => {
  // Check for JWT token in sessionStorage (preferred)
  const token = sessionStorage.getItem('auth_token');
  if (token) {
    return token;
  }
  
  // Fallback: check for token in localStorage (legacy)
  const legacyToken = localStorage.getItem('auth_token');
  if (legacyToken) {
    // Migrate to sessionStorage
    sessionStorage.setItem('auth_token', legacyToken);
    localStorage.removeItem('auth_token');
    return legacyToken;
  }
  
  return null;
};

/**
 * Get authorization header for API requests
 * @returns {object}
 */
export const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };

  const userId = getUserId();
  const token = getAuthToken();

  // Add user ID header (temporary until JWT is implemented)
  if (userId) {
    headers['X-User-ID'] = userId;
  }

  // Add authorization token if available (for future JWT implementation)
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Clear authentication data
 */
export const clearAuth = () => {
  clearSession();
  // Clear token if using JWT
  sessionStorage.removeItem('auth_token');
  localStorage.removeItem('auth_token');
};

/**
 * Set authentication data after login
 * @param {object} userData - User data from login response
 */
export const setAuth = (userData) => {
  // Use sessionManager to create session with expiration
  createSession(userData);
  
  // Store JWT token if provided (preferred method)
  if (userData.token) {
    sessionStorage.setItem('auth_token', userData.token);
    // Remove legacy token from localStorage if exists
    localStorage.removeItem('auth_token');
  }
};

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * Enhanced validation with common password checks
 * @param {string} password
 * @returns {object} - { valid: boolean, errors: string[], strength: string }
 */
export const validatePassword = (password) => {
  const errors = [];
  let strength = 'weak';
  let score = 0;

  // Length checks
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
    if (password.length >= 12) {
      score += 1;
    }
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  // Character diversity checks
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else if (password.length >= 8) {
    errors.push('Password should contain at least one uppercase letter');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else if (password.length >= 8) {
    errors.push('Password should contain at least one lowercase letter');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else if (password.length >= 8) {
    errors.push('Password should contain at least one number');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else if (password.length >= 8) {
    errors.push('Password should contain at least one special character');
  }

  // Check for common patterns (weak passwords)
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters (aaa, 111)
    /(012|123|234|345|456|567|678|789|890)/, // Sequential numbers
    /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i, // Sequential letters
    /password/i,
    /123456/,
    /qwerty/i
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common patterns that are easy to guess');
      break;
    }
  }

  // Determine strength
  if (score >= 5 && password.length >= 12) {
    strength = 'strong';
  } else if (score >= 3 && password.length >= 8) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score
  };
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input
 * @returns {string}
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // Remove potentially dangerous characters
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

