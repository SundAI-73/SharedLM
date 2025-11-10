import DOMPurify from 'dompurify';
import { logEvent, EventType, LogLevel } from './auditLogger';

// Enhanced formatter matching Claude's style with XSS protection
export const formatMessage = (text) => {
  if (!text) return '';
  
  // Check for potential XSS attempts before formatting
  const xssPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /onclick=/i,
    /onmouseover=/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i
  ];
  
  const hasXSSAttempt = xssPatterns.some(pattern => pattern.test(text));
  if (hasXSSAttempt) {
    // Log XSS attempt
    logEvent(EventType.XSS_ATTEMPT, LogLevel.SECURITY, 'Potential XSS attempt detected in message', {
      messagePreview: text.substring(0, 100)
    });
  }
  
  let formatted = text;
  
  // Convert bold markdown: **text** or **number** -> <strong>text</strong>
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic: *text* -> <em>text</em>
  formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Code blocks: `code` -> <code>code</code>
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Double line breaks -> paragraph breaks
  formatted = formatted.split('\n\n').map(para => {
    return para.trim() ? `<p>${para.replace(/\n/g, ' ')}</p>` : '';
  }).join('');
  
  // Single line breaks within text (preserve them)
  formatted = formatted.replace(/<p>([^<]+)<\/p>/g, (match, content) => {
    return `<p>${content.replace(/\s+/g, ' ')}</p>`;
  });
  
  // Sanitize HTML to prevent XSS attacks
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
};

// Parse emojis
export const parseEmojis = (text) => {
  const emojiMap = {
    ':)': '😊',
    ':-)': '😊',
    '😊': '😊',
    ':D': '😄',
    ':-D': '😄',
    ':(': '😢',
    ':-(': '😢',
    ';)': '😉',
    ';-)': '😉',
    '❤️': '❤️',
    '👍': '👍',
    '🌙': '🌙',
    '🌍': '🌍',
  };
  
  let parsed = text;
  Object.entries(emojiMap).forEach(([key, emoji]) => {
    parsed = parsed.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emoji);
  });
  
  return parsed;
};