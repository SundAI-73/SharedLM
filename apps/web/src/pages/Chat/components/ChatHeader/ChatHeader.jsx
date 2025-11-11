import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreVertical, Edit3, Star, Trash2, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../../../assets/images/logo main.svg';

const ChatHeader = ({
  chatTitle,
  selectedProject,
  isEditingTitle,
  editedTitle,
  setEditedTitle,
  showOptions,
  setShowOptions,
  titleInputRef,
  optionsRef,
  handleRename,
  handleSaveTitle,
  handleStarChat,
  handleDelete,
  setIsEditingTitle
}) => {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      <motion.div 
        className="chat-top-bar-with-content"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="chat-left-section">
          {selectedProject && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <motion.button 
                className="chat-project-badge" 
                onClick={() => navigate(`/projects/${selectedProject.id}`)}
                whileHover={{ scale: 1.05, x: 2 }}
                whileTap={{ scale: 0.95 }}
              >
                <FolderOpen size={14} />
                <span>{selectedProject.name}</span>
              </motion.button>
              <div className="title-divider">/</div>
            </motion.div>
          )}

          <motion.div 
            className="chat-title-wrapper" 
            ref={optionsRef}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                onBlur={handleSaveTitle}
                className="chat-title-input"
              />
            ) : (
              <h1 className="chat-title-display">{chatTitle || 'NEW CHAT'}</h1>
            )}

            <motion.button
              className="chat-title-dropdown-btn"
              onClick={() => setShowOptions(!showOptions)}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <MoreVertical size={16} />
            </motion.button>

            <AnimatePresence>
              {showOptions && !isEditingTitle && (
                <motion.div 
                  className="chat-title-options-menu"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.button 
                    className="option-item" 
                    onClick={handleRename}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Edit3 size={16} />
                    <span>Rename</span>
                  </motion.button>
                  <motion.button 
                    className="option-item" 
                    onClick={handleStarChat}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Star size={16} />
                    <span>Star</span>
                  </motion.button>
                  <motion.button 
                    className="option-item danger" 
                    onClick={handleDelete}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <motion.img 
          src={logo} 
          alt="SharedLM" 
          className="chat-top-bar-logo"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default ChatHeader;

