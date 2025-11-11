import React, { useEffect, useRef, useCallback } from 'react';
import { Bot, User } from 'lucide-react';
import { formatMessage } from '../../../../utils/messageFormatter';
import { getModelLogo } from '../../utils/chatHelpers';

const Message = React.memo(({ msg, customIntegrations = [] }) => {
  const formattedContent = formatMessage(msg.content);
  const modelLogo = msg.role === 'assistant' && msg.model ? getModelLogo(msg.model, customIntegrations) : null;
  const messageTextRef = useRef(null);
  
  // Helper function to add copy buttons to code blocks
  const addCopyButtons = useCallback((messageTextEl, handlers, isCancelled) => {
    if (!messageTextEl || isCancelled) return;
    
    const codeBlocks = messageTextEl.querySelectorAll('pre');
    
    // Remove any existing copy buttons first (in case content changed)
    codeBlocks.forEach((pre) => {
      const existingBtn = pre.querySelector('.code-copy-btn');
      if (existingBtn) {
        existingBtn.remove();
      }
    });
    
    codeBlocks.forEach((pre) => {
      const codeElement = pre.querySelector('code');
      if (!codeElement) return;
      
      // Skip if button already exists
      if (pre.querySelector('.code-copy-btn')) return;
      
      // Create copy button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'code-copy-btn';
      copyBtn.setAttribute('aria-label', 'Copy code');
      copyBtn.setAttribute('title', 'Copy code');
      
      // Create button content wrapper
      const buttonContent = document.createElement('span');
      buttonContent.className = 'code-copy-btn-content';
      
      // Create icon container
      const iconContainer = document.createElement('span');
      iconContainer.className = 'code-copy-icon';
      buttonContent.appendChild(iconContainer);
      
      // Create text span
      const textSpan = document.createElement('span');
      textSpan.className = 'code-copy-text';
      textSpan.textContent = 'Copy code';
      buttonContent.appendChild(textSpan);
      
      copyBtn.appendChild(buttonContent);
      
      // Copy functionality
      const handleCopy = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const codeText = codeElement.textContent || codeElement.innerText;
        
        try {
          await navigator.clipboard.writeText(codeText);
          
          // Show checkmark temporarily
          copyBtn.classList.add('copied');
          iconContainer.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          textSpan.textContent = 'Copied!';
          
          setTimeout(() => {
            if (!isCancelled && copyBtn.parentNode) {
              copyBtn.classList.remove('copied');
              iconContainer.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
              textSpan.textContent = 'Copy code';
            }
          }, 2000);
        } catch (err) {
          console.error('Failed to copy code:', err);
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = codeText;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand('copy');
            copyBtn.classList.add('copied');
            iconContainer.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            textSpan.textContent = 'Copied!';
            setTimeout(() => {
              if (!isCancelled && copyBtn.parentNode) {
                copyBtn.classList.remove('copied');
                iconContainer.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                textSpan.textContent = 'Copy code';
              }
            }, 2000);
          } catch (fallbackErr) {
            console.error('Fallback copy failed:', fallbackErr);
          }
          document.body.removeChild(textArea);
        }
      };
      
      handlers.set(copyBtn, handleCopy);
      copyBtn.addEventListener('click', handleCopy);
      pre.appendChild(copyBtn);
      
      // Set initial icon (copy icon SVG)
      iconContainer.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    });
  }, []);
  
  // Add copy buttons to code blocks - robust implementation with multiple strategies
  useEffect(() => {
    let isCancelled = false;
    const handlers = new Map();
    const timeouts = [];
    const intervals = [];
    let observer = null;
    
    // Function to add buttons
    const tryAddButtons = () => {
      if (isCancelled) return;
      const messageTextEl = messageTextRef.current;
      if (!messageTextEl) return;
      addCopyButtons(messageTextEl, handlers, isCancelled);
    };
    
    // Strategy 1: Immediate attempts with multiple delays
    // This handles most cases including page refreshes and loaded conversations
    // Try immediately
    requestAnimationFrame(() => {
      setTimeout(tryAddButtons, 0);
    });
    
    // Try after various delays to catch different rendering scenarios
    const delays = [50, 100, 200, 400, 800, 1500];
    delays.forEach(delay => {
      const timeoutId = setTimeout(() => {
        if (!isCancelled) tryAddButtons();
      }, delay);
      timeouts.push(timeoutId);
    });
    
    // Strategy 2: MutationObserver to catch when pre elements are added to DOM
    // This is crucial for dynamically rendered content
    const setupObserver = () => {
      const messageTextEl = messageTextRef.current;
      if (!messageTextEl || isCancelled) return;
      
      // Disconnect existing observer if any
      if (observer) {
        observer.disconnect();
      }
      
      observer = new MutationObserver((mutations) => {
        if (isCancelled) return;
        
        // Check if any pre elements were added
        let hasNewPre = false;
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'PRE') {
                hasNewPre = true;
              } else if (node.querySelector && node.querySelector('pre')) {
                hasNewPre = true;
              }
            }
          });
        });
        
        if (hasNewPre) {
          // Debounce to avoid multiple rapid calls
          setTimeout(() => {
            if (!isCancelled) tryAddButtons();
          }, 100);
        }
      });
      
      observer.observe(messageTextEl, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false
      });
    };
    
    // Set up observer after a small delay to ensure ref is ready
    const observerTimeout = setTimeout(() => {
      setupObserver();
      // Also do a check after observer is set up
      tryAddButtons();
    }, 50);
    timeouts.push(observerTimeout);
    
    // Strategy 3: Periodic check as final fallback (for edge cases)
    // This ensures buttons are added even in edge cases like slow page loads
    const periodicCheckTimeout = setTimeout(() => {
      if (isCancelled) return;
      
      const periodicCheckInterval = setInterval(() => {
        if (isCancelled || !messageTextRef.current) {
          clearInterval(periodicCheckInterval);
          return;
        }
        
        const codeBlocks = messageTextRef.current.querySelectorAll('pre');
        const missingButtons = Array.from(codeBlocks).filter(pre => {
          return pre.querySelector('code') && !pre.querySelector('.code-copy-btn');
        });
        
        if (missingButtons.length > 0) {
          tryAddButtons();
        } else if (codeBlocks.length > 0) {
          // All buttons are present, stop periodic check
          clearInterval(periodicCheckInterval);
        }
      }, 1000);
      
      intervals.push(periodicCheckInterval);
    }, 2000);
    timeouts.push(periodicCheckTimeout);
    
    // Cleanup function
    return () => {
      isCancelled = true;
      timeouts.forEach(id => clearTimeout(id));
      intervals.forEach(id => clearInterval(id));
      if (observer) {
        observer.disconnect();
      }
      handlers.forEach((handler, btn) => {
        btn.removeEventListener('click', handler);
        if (btn.parentNode) {
          btn.remove();
        }
      });
      handlers.clear();
    };
  }, [formattedContent, addCopyButtons]);
  
  return (
    <div className={`chat-message ${msg.role}`}>
      <div className="message-avatar">
        {msg.role === 'user' ? (
          <User size={20} />
        ) : modelLogo ? (
          <img 
            src={modelLogo} 
            alt={`${msg.model || 'Model'} logo`}
            className="message-model-logo"
          />
        ) : (
          <Bot size={20} />
        )}
      </div>
      <div className="message-content">
        <div 
          ref={messageTextRef}
          className="message-text"
          dangerouslySetInnerHTML={{ __html: formattedContent }}
        />
        {msg.model && (
          <div className="message-meta">
            <span className="message-model">{msg.model.toUpperCase()}</span>
            <span className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

Message.displayName = 'Message';

export default Message;

