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
  
  // IMPORTANT: Extract code blocks FIRST to preserve # and other markdown inside code
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
    // DO NOT process headers inside code - keep it exactly as is
    cleanedCode = cleanedCode.replace(/\n+$/, '');
    
    codeBlocks.push({
      placeholder,
      language: (language || '').trim(),
      code: cleanedCode
    });
    codeBlockIndex++;
    return placeholder;
  });
  
  // NOW process headers ONLY in the non-code parts
  // Convert markdown headers (lines starting with #, ##, ###, etc.) to bold text
  // Preserves the header content but formats it as bold
  formatted = formatted.replace(/^#{1,6}\s+(.+)$/gm, (match, headerText) => {
    // Convert header to bold text, preserving the content
    // Use a special marker so we can identify headers during paragraph processing
    return `__HEADER__${headerText.trim()}__END_HEADER__`;
  });
  
  // Convert bold markdown: **text** or **number** -> <strong>text</strong>
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic: *text* -> <em>text</em>
  formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Inline code: `code` -> <code>code</code> (but not if it's part of a code block placeholder)
  formatted = formatted.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  
  // Process text into paragraphs, but preserve code block placeholders
  const parts = formatted.split(/(__CODE_BLOCK_\d+__)/);
  const processTextPart = (part, codeBlocksArray) => {
    let partResult = '';
    if (part.match(/^__CODE_BLOCK_\d+__$/)) {
      // This is a code block placeholder, restore it
      const blockIndex = parseInt(part.match(/\d+/)[0]);
      const codeBlock = codeBlocksArray[blockIndex];
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
        partResult = `<pre><code${langClass}>${escapedCode}</code></pre>`;
      }
    } else {
      // This is regular text, process as paragraphs
      if (part.trim()) {
        // Split by lines first to identify headers on their own lines
        const lines = part.split('\n');
        let currentParagraph = [];
        const paragraphs = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();
          
          // Check if this line is a header
          if (trimmedLine.match(/^__HEADER__.+?__END_HEADER__$/)) {
            // If we have accumulated paragraph text, output it first
            if (currentParagraph.length > 0) {
              const paraText = currentParagraph.join('\n').trim();
              if (paraText) {
                // Process any remaining header markers in the paragraph as bold
                const processedPara = paraText.replace(/__HEADER__(.+?)__END_HEADER__/g, '<strong>$1</strong>');
                // Convert line breaks to <br> within the paragraph
                const paraWithBreaks = processedPara.replace(/\n/g, '<br>');
                paragraphs.push(`<p>${paraWithBreaks}</p>`);
              }
              currentParagraph = [];
            }
            
            // Extract and format the header
            const headerMatch = trimmedLine.match(/__HEADER__(.+?)__END_HEADER__/);
            if (headerMatch) {
              const headerText = headerMatch[1];
              // Format header as bold paragraph with extra spacing
              paragraphs.push(`<p style="font-weight: bold; margin-top: 1.2em; margin-bottom: 0.6em;"><strong>${headerText}</strong></p>`);
            }
          } else if (trimmedLine === '') {
            // Empty line - if we have a paragraph, output it and start a new one
            if (currentParagraph.length > 0) {
              const paraText = currentParagraph.join('\n').trim();
              if (paraText) {
                // Process any header markers in the paragraph as bold
                const processedPara = paraText.replace(/__HEADER__(.+?)__END_HEADER__/g, '<strong>$1</strong>');
                // Convert line breaks to <br> within the paragraph
                const paraWithBreaks = processedPara.replace(/\n/g, '<br>');
                paragraphs.push(`<p>${paraWithBreaks}</p>`);
              }
              currentParagraph = [];
            }
          } else {
            // Regular line - add to current paragraph (preserve original line for line breaks)
            currentParagraph.push(line);
          }
        }
        
        // Output any remaining paragraph
        if (currentParagraph.length > 0) {
          const paraText = currentParagraph.join('\n').trim();
          if (paraText) {
            // Process any header markers in the paragraph as bold
            const processedPara = paraText.replace(/__HEADER__(.+?)__END_HEADER__/g, '<strong>$1</strong>');
            // Convert line breaks to <br> within the paragraph
            const paraWithBreaks = processedPara.replace(/\n/g, '<br>');
            paragraphs.push(`<p>${paraWithBreaks}</p>`);
          }
        }
        
        partResult = paragraphs.join('');
      }
    }
    return partResult;
  };
  
  let result = '';
  for (const part of parts) {
    result += processTextPart(part, codeBlocks);
  }
  
  formatted = result;
  
  // If no paragraphs were created, wrap everything in a paragraph
  if (!formatted.includes('<p>') && !formatted.includes('<pre>')) {
    formatted = `<p>${formatted}</p>`;
  }
  
  // Clean up empty paragraphs
  formatted = formatted.replace(/<p>\s*<\/p>/g, '');
  
  // Sanitize HTML to prevent XSS attacks, but allow pre and code tags
  // Allow style attribute for header formatting
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'code', 'pre', 'br'],
    ALLOWED_ATTR: ['class', 'style'],
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