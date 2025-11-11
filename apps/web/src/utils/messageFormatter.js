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
  
  // Store code blocks temporarily to preserve them
  const codeBlocks = [];
  let codeBlockIndex = 0;
  
  // Extract multi-line code blocks (```language\ncode\n``` or ```\ncode\n```)
  // This regex matches code blocks with optional language specification
  // Handles various formats: ```python\ncode\n```, ```\ncode\n```, ```python\ncode\n```
  // Uses a more robust pattern to handle edge cases
  formatted = formatted.replace(/```(\w+)?([\s\S]*?)```/g, (match, language, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlockIndex}__`;
    // Remove leading newline after language spec, but preserve all other formatting
    // This handles: ```python\ncode``` and ```\ncode```
    let cleanedCode = code;
    if (cleanedCode.startsWith('\n')) {
      cleanedCode = cleanedCode.substring(1);
    }
    // Remove trailing newlines but keep the code content intact
    cleanedCode = cleanedCode.replace(/\n+$/, '');
    
    codeBlocks.push({
      placeholder,
      language: (language || '').trim(),
      code: cleanedCode
    });
    codeBlockIndex++;
    return placeholder;
  });
  
  // Convert bold markdown: **text** or **number** -> <strong>text</strong>
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic: *text* -> <em>text</em>
  formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Inline code: `code` -> <code>code</code> (but not if it's part of a code block placeholder)
  formatted = formatted.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  
  // Process text into paragraphs, but preserve code block placeholders
  const parts = formatted.split(/(__CODE_BLOCK_\d+__)/);
  let result = '';
  
  for (const part of parts) {
    if (part.match(/^__CODE_BLOCK_\d+__$/)) {
      // This is a code block placeholder, restore it
      const blockIndex = parseInt(part.match(/\d+/)[0]);
      const codeBlock = codeBlocks[blockIndex];
      if (codeBlock) {
        // Escape HTML in code
        const escapedCode = codeBlock.code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        
        // Create code block with language class if specified
        const langClass = codeBlock.language ? ` class="language-${codeBlock.language}"` : '';
        result += `<pre><code${langClass}>${escapedCode}</code></pre>`;
      }
    } else {
      // This is regular text, process as paragraphs
      if (part.trim()) {
        // Split by double line breaks for paragraphs
        const paragraphs = part.split(/\n\n+/).filter(p => p.trim());
        if (paragraphs.length > 0) {
          paragraphs.forEach(para => {
            // Convert single line breaks to <br> within paragraphs
            const paraWithBreaks = para.trim().replace(/\n/g, '<br>');
            result += `<p>${paraWithBreaks}</p>`;
          });
        } else {
          // Single paragraph with line breaks
          const paraWithBreaks = part.trim().replace(/\n/g, '<br>');
          result += `<p>${paraWithBreaks}</p>`;
        }
      }
    }
  }
  
  formatted = result;
  
  // If no paragraphs were created, wrap everything in a paragraph
  if (!formatted.includes('<p>') && !formatted.includes('<pre>')) {
    formatted = `<p>${formatted}</p>`;
  }
  
  // Clean up empty paragraphs
  formatted = formatted.replace(/<p>\s*<\/p>/g, '');
  
  // Sanitize HTML to prevent XSS attacks, but allow pre and code tags
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'pre', 'br'],
    ALLOWED_ATTR: ['class'],
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