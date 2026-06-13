import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/common';
import DOMPurify from 'dompurify';
import 'highlight.js/styles/atom-one-dark.css';
import { logEvent, EventType, LogLevel } from './auditLogger';

// Full GFM markdown rendering (lists, tables, headings, blockquotes, links,
// fenced code with syntax highlighting) — replaces the old hand-rolled regex
// parser, which couldn't do lists/tables and is what made replies look flat.
const md = new MarkdownIt({
  html: false,      // never trust raw HTML in model output
  linkify: true,    // auto-link bare URLs
  breaks: true,     // single newlines -> <br> (chat-friendly)
  typographer: false
});

// Custom fenced-code renderer: language label + copy button + highlighted body.
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const info = (token.info || '').trim();
  const lang = info.split(/\s+/g)[0];
  const code = token.content || '';
  const language = lang && hljs.getLanguage(lang) ? lang : null;

  let body;
  try {
    body = language
      ? hljs.highlight(code, { language }).value
      : md.utils.escapeHtml(code);
  } catch {
    body = md.utils.escapeHtml(code);
  }

  const label = language || 'text';
  return (
    `<div class="code-block">` +
      `<div class="code-block-header">` +
        `<span class="code-lang">${label}</span>` +
        `<button class="code-copy-btn" type="button" aria-label="Copy code">Copy</button>` +
      `</div>` +
      `<pre class="hljs"><code>${body}</code></pre>` +
    `</div>`
  );
};

// Open links in a new tab safely.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'del', 's', 'code', 'pre', 'div', 'span', 'button',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'a', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td'
];
const ALLOWED_ATTR = ['class', 'href', 'title', 'target', 'rel', 'type', 'aria-label', 'align'];

export const formatMessage = (text) => {
  if (!text) return '';

  const rendered = md.render(text);
  const clean = DOMPurify.sanitize(rendered, { ALLOWED_TAGS, ALLOWED_ATTR });

  // Surface anything the sanitizer stripped (potential injection in model output)
  if (DOMPurify.removed && DOMPurify.removed.length > 0) {
    logEvent(EventType.XSS_ATTEMPT, LogLevel.SECURITY, 'Sanitizer removed nodes from rendered message', {
      removedCount: DOMPurify.removed.length
    });
  }

  return clean;
};

// Kept for backward compatibility with any callers.
export const parseEmojis = (text) => text;
