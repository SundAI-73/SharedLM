import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, SlidersHorizontal, Clock, ArrowUp, Paperclip, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CustomDropdown from '../../../../components/common/CustomDropdown/CustomDropdown';

const ChatInput = ({
  input,
  setInput,
  loading,
  attachedFiles,
  fileInputRef,
  handleFileSelect,
  handleRemoveFile,
  handleSend,
  modelProviders,
  modelVariants,
  currentModel,
  setCurrentModel,
  selectedModelVariant,
  setSelectedModelVariant,
  showSettingsMenu,
  setShowSettingsMenu,
  settingsMenuRef
}) => {
  const navigate = useNavigate();

  return (
    <motion.div 
      className="chat-input-wrapper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <AnimatePresence>
        {attachedFiles.length > 0 && (
          <motion.div 
            className="attached-files-container"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {attachedFiles.map((file, idx) => (
              <motion.div 
                key={idx} 
                className="attached-file-item"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                whileHover={{ scale: 1.05 }}
              >
                <Paperclip size={12} />
                <span>{file.filename}</span>
                <motion.button
                  onClick={() => handleRemoveFile(file.filename)}
                  className="remove-file-btn"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={14} />
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Row - Above Input */}
      <motion.div 
        className="chat-input-controls"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <div className="chat-controls-left">
          <motion.button 
            className="chat-control-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            title="Attach file"
          >
            <Plus size={18} />
          </motion.button>
          
          <motion.button 
            className="chat-control-btn"
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.45 }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            title="Settings"
          >
            <SlidersHorizontal size={18} />
          </motion.button>
          
          <motion.button 
            className="chat-control-btn"
            onClick={() => {
              navigate('/history');
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.9 }}
            title="History"
          >
            <Clock size={18} />
          </motion.button>
        </div>

        {/* Right Side - Model Dropdowns */}
        <motion.div 
          className="chat-controls-right"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          {modelProviders.length > 0 ? (
            <>
              <CustomDropdown
                value={currentModel || ''}
                onChange={setCurrentModel}
                options={modelProviders}
                className="chat-model-dropdown-inline"
              />
              
              {currentModel && modelVariants[currentModel]?.length > 0 && (
                <CustomDropdown
                  value={selectedModelVariant}
                  onChange={setSelectedModelVariant}
                  options={modelVariants[currentModel]}
                  className="chat-model-dropdown-inline"
                />
              )}
            </>
          ) : (
            <div style={{ 
              padding: '8px 16px', 
              color: '#888888', 
              fontFamily: 'Courier New, monospace',
              fontSize: '0.875rem'
            }}>
              No models available. Add API keys in Settings.
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Main Input Field with Send Button Inside */}
      <motion.div 
        className="chat-input-main"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="chat-input-container-main">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading && input.trim()) handleSend();
            }}
            placeholder="How can I help you today?"
            className="chat-input-field-main"
            disabled={loading}
            autoFocus
          />
          <motion.button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={`chat-send-btn-inside ${input.trim() ? 'active' : ''}`}
            whileHover={input.trim() && !loading ? { scale: 1.1, y: -2 } : {}}
            whileTap={input.trim() && !loading ? { scale: 0.9 } : {}}
            animate={input.trim() && !loading ? { scale: 1 } : { scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <ArrowUp size={18} />
          </motion.button>
        </div>
      </motion.div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.csv,.xlsx"
      />
    </motion.div>
  );
};

export default ChatInput;

