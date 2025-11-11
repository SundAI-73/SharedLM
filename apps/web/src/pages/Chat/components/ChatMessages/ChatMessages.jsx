import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot } from 'lucide-react';
import Message from '../Message/Message';
import { getModelLogo } from '../../utils/chatHelpers';

const ChatMessages = ({
  messages,
  loading,
  messagesEndRef,
  currentModel,
  selectedModelVariant,
  customIntegrations
}) => {
  return (
    <motion.div 
      className="chat-messages-list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <AnimatePresence mode="popLayout">
        {messages.map((msg, idx) => (
          <motion.div
            key={`${msg.timestamp || Date.now()}-${idx}-${msg.role}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Message msg={msg} customIntegrations={customIntegrations} />
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {loading && (
          <motion.div 
            className="chat-message assistant"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="message-avatar">
              {(() => {
                // Try to get logo from model variant first, then provider
                const modelName = selectedModelVariant || currentModel || '';
                let loadingLogo = getModelLogo(modelName, customIntegrations);
                
                // If no logo found and we have a provider name, try that
                if (!loadingLogo && currentModel) {
                  loadingLogo = getModelLogo(currentModel, customIntegrations);
                }
                
                return loadingLogo ? (
                  <img 
                    src={loadingLogo} 
                    alt={`${modelName || currentModel || 'Model'} logo`}
                    className="message-model-logo"
                  />
                ) : (
                  <Bot size={20} />
                );
              })()}
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={messagesEndRef} />
    </motion.div>
  );
};

export default ChatMessages;

