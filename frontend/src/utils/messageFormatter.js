// Enhanced formatter matching Claude's style
export const formatMessage = (text) => {
  if (!text) return '';
  
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
  
  return formatted;
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